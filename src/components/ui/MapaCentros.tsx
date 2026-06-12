import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import type { CentroAcopio } from '../../types'
import 'leaflet/dist/leaflet.css'

// Fix leaflet icon paths broken by Vite bundler
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

interface Props {
  centros: CentroAcopio[]
}

export default function MapaCentros({ centros }: Props) {
  const conCoordenadas = centros.filter((c) => c.coordenadas && c.activo)

  useEffect(() => {
    // Invalidate map size after mount to fix tile loading in hidden containers
    window.dispatchEvent(new Event('resize'))
  }, [])

  if (conCoordenadas.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-2xl border border-gray-200">
        <p className="text-gray-400 text-sm">No hay centros con coordenadas disponibles.</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm" style={{ height: 440 }}>
      <MapContainer
        center={[-35.675, -71.543]}
        zoom={5}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {conCoordenadas.map((centro) => (
          <Marker
            key={centro.id}
            position={[centro.coordenadas!.lat, centro.coordenadas!.lng]}
          >
            <Popup>
              <div className="min-w-[180px]">
                <p className="font-bold text-gray-900 mb-1">{centro.nombre}</p>
                <p className="text-xs text-gray-600 mb-1">{centro.direccion}</p>
                <p className="text-xs text-gray-500 mb-2">{centro.horario}</p>
                {centro.queRecibe.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-orange-600 mb-1">Recibe:</p>
                    <ul className="text-xs text-gray-600 list-disc list-inside space-y-0.5">
                      {centro.queRecibe.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
