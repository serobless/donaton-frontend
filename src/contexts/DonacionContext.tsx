import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Causa, TopDonador } from '../types'
import { mockCausas, mockDonaciones, mockTopDonadores } from '../lib/mockData'
import api from '../lib/axios'

// Shape real del BFF /bff/portada
interface BackendCausa {
  id: number
  nombre: string
  meta: number
  recaudado: number
  activa: boolean
  categoria: string
  imagenUrl?: string
  imagen?: string
  diasRestantes?: number
  descripcion?: string
  fechaFin?: string
  destacada?: boolean
  urgencia?: string
}

interface PortadaResponse {
  causasActivas: BackendCausa[]
  topDonadores: TopDonador[]
  resumen?: {
    totalRecaudado?: number
    totalDonaciones?: number
    causasActivas?: number
  }
  // compatibilidad por si el backend cambia a estas claves
  causas?: BackendCausa[]
  totalRecaudado?: number
  totalDonaciones?: number
}

const CATEGORIA_MAP: Record<string, string> = {
  ALIMENTACION:   'Alimentación',
  EDUCACION:      'Educación',
  SALUD:          'Salud',
  ANIMALES:       'Animales',
  VIVIENDA:       'Vivienda',
  MEDIOAMBIENTE:  'Medioambiente',
  EMERGENCIA:     'Emergencia',
}

function mapCausa(b: BackendCausa): Causa {
  const diasRestantes = b.diasRestantes ?? 0
  let fechaFin = b.fechaFin ?? ''
  if (!fechaFin) {
    const d = new Date()
    d.setDate(d.getDate() + diasRestantes)
    fechaFin = d.toISOString()
  }
  return {
    id: b.id,
    titulo: b.nombre,
    descripcion: b.descripcion ?? '',
    imagen: b.imagenUrl ?? b.imagen ?? '',
    meta: b.meta,
    recaudado: b.recaudado,
    categoria: CATEGORIA_MAP[b.categoria] ?? b.categoria,
    activa: b.activa,
    fechaFin,
    diasRestantes,
    destacada: b.destacada ?? false,
    urgencia: b.urgencia,
  }
}

interface DonacionContextValue {
  causas: Causa[]
  causasActivas: Causa[]
  topDonadores: TopDonador[]
  totalRecaudado: number
  totalDonaciones: number
  isLoading: boolean
}

const DonacionContext = createContext<DonacionContextValue | null>(null)

export function DonacionProvider({ children }: { children: ReactNode }) {
  const [causas, setCausas] = useState<Causa[]>([])
  const [topDonadores, setTopDonadores] = useState<TopDonador[]>([])
  const [totalRecaudado, setTotalRecaudado] = useState(0)
  const [totalDonaciones, setTotalDonaciones] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchPortada() {
      try {
        const { data } = await api.get<PortadaResponse>('/bff/portada')

        console.log('[DonacionContext] respuesta raw /bff/portada:', data)

        // El BFF devuelve causasActivas (o causas como fallback de compatibilidad)
        const rawCausas = data.causasActivas ?? data.causas ?? []
        console.log('[DonacionContext] rawCausas antes de mapear:', rawCausas)
        const mapped = rawCausas.map(mapCausa)
        console.log('[DonacionContext] causas mapeadas:', mapped)
        setCausas(mapped)
        setTopDonadores(data.topDonadores ?? [])

        const rec =
          data.resumen?.totalRecaudado ??
          data.totalRecaudado ??
          mapped.reduce((s, c) => s + c.recaudado, 0)
        const don =
          data.resumen?.totalDonaciones ??
          data.totalDonaciones ??
          0
        setTotalRecaudado(rec)
        setTotalDonaciones(don)
      } catch {
        setCausas(mockCausas)
        setTopDonadores(mockTopDonadores)
        setTotalRecaudado(mockDonaciones.reduce((s, d) => s + d.monto, 0))
        setTotalDonaciones(mockDonaciones.length)
      } finally {
        setIsLoading(false)
      }
    }
    fetchPortada()
  }, [])

  const causasActivas = causas.filter((c) => c.activa)

  return (
    <DonacionContext.Provider
      value={{ causas, causasActivas, topDonadores, totalRecaudado, totalDonaciones, isLoading }}
    >
      {children}
    </DonacionContext.Provider>
  )
}

export function useDonacion() {
  const ctx = useContext(DonacionContext)
  if (!ctx) throw new Error('useDonacion must be used within DonacionProvider')
  return ctx
}
