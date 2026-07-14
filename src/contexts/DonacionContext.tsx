import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Causa, TopDonador } from '../types'
import api from '../lib/axios'

// Causa directa desde ms-donaciones /api/causas
interface BackendCausa {
  id: number
  titulo: string
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
  topDonadores: TopDonador[]
  resumen?: {
    totalRecaudado?: number
    totalDonaciones?: number
    causasActivas?: number
  }
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
    titulo: b.titulo,
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
    async function fetchData() {
      try {
        // Causas directo desde ms-donaciones (BFF devuelve nombre:null tras el rename)
        const { data: causasData } = await api.get<BackendCausa[]>('/api/causas')
        setCausas(causasData.map(mapCausa))
      } catch {
        setCausas([])
      }

      try {
        const { data } = await api.get<PortadaResponse>('/bff/portada')
        setTopDonadores(data.topDonadores ?? [])
        const rec = data.resumen?.totalRecaudado ?? data.totalRecaudado ?? 0
        const don = data.resumen?.totalDonaciones ?? data.totalDonaciones ?? 0
        setTotalRecaudado(rec)
        setTotalDonaciones(don)
      } catch {
        setTopDonadores([])
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
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
