import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import MapaCentros from './MapaCentros'
import type { CentroAcopio } from '../../types'

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="mapa">{children}</div>,
  TileLayer: () => null,
  Marker: ({ children }: { children: React.ReactNode }) => <div data-testid="marker">{children}</div>,
  Popup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))
vi.mock('leaflet/dist/leaflet.css', () => ({}))
vi.mock('leaflet', () => ({
  default: { Icon: { Default: { prototype: {}, mergeOptions: vi.fn() } } },
}))

const centros: CentroAcopio[] = [
  {
    id: 1, nombre: 'Centro Test', direccion: 'Av. Test 123', region: 'Metropolitana',
    ciudad: 'Santiago', horario: 'Lun-Vie 9-18', telefono: '+56 2 1234',
    queRecibe: ['Ropa'], capacidadActual: 100, capacidadMax: 200, activo: true,
    coordenadas: { lat: -33.44, lng: -70.65 },
  },
  {
    id: 2, nombre: 'Centro Inactivo', direccion: 'Av. X', region: 'Valparaíso',
    ciudad: 'Valparaíso', horario: '-', telefono: '-',
    queRecibe: [], capacidadActual: 0, capacidadMax: 100, activo: false,
    coordenadas: { lat: -33.04, lng: -71.61 },
  },
]

describe('MapaCentros', () => {
  it('renderiza el contenedor del mapa', () => {
    render(<MapaCentros centros={centros} />)
    expect(screen.getByTestId('mapa')).toBeInTheDocument()
  })

  it('solo muestra markers para centros activos', () => {
    render(<MapaCentros centros={centros} />)
    expect(screen.getAllByTestId('marker')).toHaveLength(1)
  })
})
