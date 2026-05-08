import { createContext, useContext, useState, type ReactNode } from 'react'
import type { Causa, Donacion, TopDonador } from '../types'
import { mockCausas, mockDonaciones, mockTopDonadores } from '../lib/mockData'

interface DonacionContextValue {
  causas: Causa[]
  causasActivas: Causa[]
  donaciones: Donacion[]
  topDonadores: TopDonador[]
  totalRecaudado: number
  addDonacion: (donacion: Omit<Donacion, 'id' | 'fecha'>) => void
}

const DonacionContext = createContext<DonacionContextValue | null>(null)

export function DonacionProvider({ children }: { children: ReactNode }) {
  const [causas] = useState<Causa[]>(mockCausas)
  const [donaciones, setDonaciones] = useState<Donacion[]>(mockDonaciones)
  const [topDonadores] = useState<TopDonador[]>(mockTopDonadores)

  const causasActivas = causas.filter((c) => c.activa)
  const totalRecaudado = donaciones.reduce((acc, d) => acc + d.monto, 0)

  function addDonacion(data: Omit<Donacion, 'id' | 'fecha'>) {
    const nueva: Donacion = {
      ...data,
      id: Date.now(),
      fecha: new Date().toISOString(),
    }
    setDonaciones((prev) => [nueva, ...prev])
  }

  return (
    <DonacionContext.Provider
      value={{ causas, causasActivas, donaciones, topDonadores, totalRecaudado, addDonacion }}
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
