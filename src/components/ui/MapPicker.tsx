import { useState } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

interface Props {
  onSelect: (lat: number, lng: number) => void
}

function ClickHandler({ onSelect }: { onSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onSelect(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

export default function MapPicker({ onSelect }: Props) {
  const [marker, setMarker] = useState<[number, number] | null>(null)

  function handleClick(lat: number, lng: number) {
    setMarker([lat, lng])
    onSelect(lat, lng)
  }

  return (
    <div className="rounded-xl overflow-hidden border border-orange-300" style={{ height: 260 }}>
      <p className="text-xs text-center text-orange-600 bg-orange-50 py-1 font-medium">
        Haz clic en el mapa para colocar el pin
      </p>
      <MapContainer
        center={[-33.4489, -70.6693]}
        zoom={12}
        style={{ height: 230, width: '100%', cursor: 'crosshair' }}
        scrollWheelZoom
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <ClickHandler onSelect={handleClick} />
        {marker && <Marker position={marker} />}
      </MapContainer>
    </div>
  )
}
