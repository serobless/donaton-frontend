import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import api from '../lib/axios'
import type { CentroAcopio, Necesidad } from '../types'

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const TIPO_EMOJI: Record<string, string> = {
  Frazadas: '🧣',
  Ropa: '👕',
  Alimentos: '🥫',
  Medicamentos: '💊',
}

const TIPO_DONACION: Record<string, string> = {
  Frazadas: 'ropa',
  Ropa: 'ropa',
  Alimentos: 'alimento',
  Medicamentos: 'medica',
}

function tipoParaDonar(items: { tipo: string; urgente: boolean }[]): string {
  const urgente = items.find(n => n.urgente)
  const ref = urgente ?? items[0]
  return ref ? (TIPO_DONACION[ref.tipo] ?? 'monetaria') : 'monetaria'
}

const TIPOS = ['Todas', 'Frazadas', 'Ropa', 'Alimentos', 'Medicamentos']

const MOCK_CENTROS: CentroAcopio[] = [
  { id: 1, nombre: 'Centro Santiago Poniente', direccion: 'Av. Libertador B. OHiggins 1234', region: 'Metropolitana', ciudad: 'Santiago', horario: 'Lun-Vie 9:00-18:00', telefono: '', queRecibe: [], capacidadActual: 340, capacidadMax: 500, activo: true, latitud: -33.4489, longitud: -70.6693 },
  { id: 2, nombre: 'Centro Valparaíso', direccion: 'Av. Brasil 678', region: 'Valparaíso', ciudad: 'Valparaíso', horario: 'Lun-Vie 9:00-18:00', telefono: '', queRecibe: [], capacidadActual: 150, capacidadMax: 280, activo: true, latitud: -33.0472, longitud: -71.6127 },
  { id: 3, nombre: 'Centro Concepción Biobío', direccion: 'Av. Los Carrera 234', region: 'Biobío', ciudad: 'Concepción', horario: 'Lun-Vie 8:30-17:30', telefono: '', queRecibe: [], capacidadActual: 310, capacidadMax: 450, activo: true, latitud: -36.8201, longitud: -73.0444 },
]

const MOCK_NECESIDADES: Necesidad[] = [
  { id: 1, centro: { id: 1, nombre: 'Centro Santiago Poniente' }, tipo: 'Frazadas', descripcion: 'Frazadas para familias en situación de calle', metaUnidades: 200, unidadesActuales: 85, urgente: true, diasRestantes: 7, activa: true },
  { id: 2, centro: { id: 1, nombre: 'Centro Santiago Poniente' }, tipo: 'Ropa', descripcion: 'Ropa de abrigo talla adulto', metaUnidades: 300, unidadesActuales: 140, urgente: false, diasRestantes: 21, activa: true },
  { id: 3, centro: { id: 2, nombre: 'Centro Valparaíso' }, tipo: 'Alimentos', descripcion: 'Cajas de alimentos no perecibles', metaUnidades: 150, unidadesActuales: 45, urgente: true, diasRestantes: 5, activa: true },
  { id: 4, centro: { id: 2, nombre: 'Centro Valparaíso' }, tipo: 'Medicamentos', descripcion: 'Analgésicos y antifebriles', metaUnidades: 100, unidadesActuales: 60, urgente: false, activa: true },
  { id: 5, centro: { id: 3, nombre: 'Centro Concepción Biobío' }, tipo: 'Frazadas', descripcion: 'Frazadas dobles para clima frío del sur', metaUnidades: 250, unidadesActuales: 180, urgente: false, diasRestantes: 14, activa: true },
  { id: 6, centro: { id: 3, nombre: 'Centro Concepción Biobío' }, tipo: 'Alimentos', descripcion: 'Leche, aceite, arroz y legumbres', metaUnidades: 200, unidadesActuales: 30, urgente: true, diasRestantes: 3, activa: true },
]

function ProgressBar({ pct }: { pct: number }) {
  const color = pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-orange-400' : 'bg-red-500'
  return (
    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
      <div className={`${color} h-1.5 rounded-full transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  )
}

export default function MapaNecesidades() {
  const [centros, setCentros] = useState<CentroAcopio[]>([])
  const [necesidades, setNecesidades] = useState<Necesidad[]>([])
  const [tipoFiltro, setTipoFiltro] = useState('Todas')
  const [regionFiltro, setRegionFiltro] = useState('Todas')
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    async function cargar() {
      try {
        const [{ data: c }, { data: n }] = await Promise.all([
          api.get<CentroAcopio[]>('/api/centros'),
          api.get<Necesidad[]>('/api/necesidades'),
        ])
        setCentros(c.length > 0 ? c : MOCK_CENTROS)
        setNecesidades(n.length > 0 ? n : MOCK_NECESIDADES)
      } catch {
        setCentros(MOCK_CENTROS)
        setNecesidades(MOCK_NECESIDADES)
      } finally {
        setCargando(false)
      }
    }
    cargar()
  }, [])

  const regiones = ['Todas', ...Array.from(new Set(centros.map(c => c.region)))]

  const coordValida = (lat?: number | null, lng?: number | null) =>
    lat != null && lng != null && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180

  // Centros que pasan los filtros de región y tipo (para las tarjetas — incluye centros sin coords)
  const centrosFiltrados = centros.filter(c => {
    if (!c.activo) return false
    if (regionFiltro !== 'Todas' && c.region !== regionFiltro) return false
    if (tipoFiltro !== 'Todas') {
      const tieneNecesidad = necesidades.some(n => n.centro?.id === c.id && n.tipo === tipoFiltro && n.activa)
      if (!tieneNecesidad) return false
    }
    return true
  })

  // Sólo los que tienen coords válidas van al mapa
  const centrosParaMapa = centrosFiltrados.filter(c => coordValida(c.latitud, c.longitud))

  const necesidadesParaCentro = (centroId: number) =>
    necesidades.filter(n => n.centro?.id === centroId && n.activa &&
      (tipoFiltro === 'Todas' || n.tipo === tipoFiltro))

  const totalUrgentes = necesidades.filter(n => n.urgente && n.activa).length

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50">
      {/* Hero */}
      <section className="bg-gradient-to-r from-orange-500 to-amber-500 text-white py-14 px-4 text-center">
        <h1 className="text-3xl md:text-4xl font-extrabold mb-3">Mapa de Necesidades</h1>
        <p className="text-lg opacity-90 max-w-xl mx-auto mb-6">
          ¿Qué necesitan hoy los centros de acopio? Dona exactamente lo que hace falta.
        </p>
        {totalUrgentes > 0 && (
          <span className="inline-flex items-center gap-2 bg-red-600 text-white font-bold px-5 py-2 rounded-full text-sm animate-pulse">
            🚨 {totalUrgentes} necesidad{totalUrgentes > 1 ? 'es' : ''} urgente{totalUrgentes > 1 ? 's' : ''} ahora
          </span>
        )}
      </section>

      <div className="max-w-7xl mx-auto px-4 py-10">
        {/* Filtros */}
        <div className="flex flex-wrap gap-3 mb-6 items-center">
          <span className="text-sm font-semibold text-gray-600">Tipo:</span>
          {TIPOS.map(t => (
            <button
              key={t}
              onClick={() => setTipoFiltro(t)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                tipoFiltro === t
                  ? 'bg-orange-500 text-white border-orange-500'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300'
              }`}
            >
              {t !== 'Todas' ? `${TIPO_EMOJI[t] ?? ''} ` : ''}{t}
            </button>
          ))}
          <span className="text-sm font-semibold text-gray-600 ml-4">Región:</span>
          <select
            value={regionFiltro}
            onChange={e => setRegionFiltro(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
          >
            {regiones.map(r => <option key={r}>{r}</option>)}
          </select>
        </div>

        {/* Mapa */}
        <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-md mb-10" style={{ height: 520 }}>
          {cargando ? (
            <div className="flex items-center justify-center h-full bg-gray-50">
              <p className="text-gray-400">Cargando mapa...</p>
            </div>
          ) : centrosParaMapa.length === 0 ? (
            <div className="flex items-center justify-center h-full bg-gray-50">
              <p className="text-gray-400 text-sm">No hay centros con ubicación en el mapa para el filtro seleccionado.</p>
            </div>
          ) : (
            <MapContainer center={[-35.675, -71.543]} zoom={5} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              />
              {centrosParaMapa.map(centro => {
                const items = necesidadesParaCentro(centro.id)
                return (
                  <Marker key={centro.id} position={[centro.latitud!, centro.longitud!]}>
                    <Popup maxWidth={280}>
                      <div className="min-w-[240px] font-sans">
                        <p className="font-bold text-gray-900 text-sm mb-0.5">{centro.nombre}</p>
                        <p className="text-xs text-gray-500 mb-3">{centro.ciudad}, {centro.region}</p>
                        {items.length === 0 ? (
                          <p className="text-xs text-gray-400">Sin necesidades activas en este filtro.</p>
                        ) : (
                          <div className="space-y-3">
                            {items.map(n => {
                              const pct = Math.round((n.unidadesActuales / n.metaUnidades) * 100)
                              return (
                                <div key={n.id}>
                                  <div className="flex items-center justify-between mb-0.5">
                                    <span className="text-xs font-semibold text-gray-700">
                                      {TIPO_EMOJI[n.tipo] ?? '📦'} {n.tipo}
                                    </span>
                                    {n.urgente && (
                                      <span className="text-[10px] bg-red-100 text-red-700 font-bold px-1.5 py-0.5 rounded-full">URGENTE</span>
                                    )}
                                  </div>
                                  {n.descripcion && <p className="text-[11px] text-gray-500 mb-1">{n.descripcion}</p>}
                                  <div className="flex justify-between text-[11px] text-gray-500">
                                    <span>{n.unidadesActuales}/{n.metaUnidades} unidades ({pct}%)</span>
                                    {n.diasRestantes != null && <span>⏱ {n.diasRestantes}d</span>}
                                  </div>
                                  <ProgressBar pct={pct} />
                                </div>
                              )
                            })}
                          </div>
                        )}
                        <Link
                          to={`/donaciones?tipo=${tipoParaDonar(items)}`}
                          className="mt-4 block text-center bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold py-2 rounded-lg transition-colors"
                        >
                          Donar ahora →
                        </Link>
                      </div>
                    </Popup>
                  </Marker>
                )
              })}
            </MapContainer>
          )}
        </div>

        {/* Tarjetas resumen */}
        <h2 className="text-xl font-bold text-gray-800 mb-5">
          Centros activos ({centrosFiltrados.length})
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {centrosFiltrados.map(centro => {
            const items = necesidadesParaCentro(centro.id)
            const urgentes = items.filter(n => n.urgente)
            return (
              <div key={centro.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">{centro.nombre}</h3>
                    <p className="text-xs text-gray-500">{centro.ciudad}, {centro.region}</p>
                  </div>
                  {urgentes.length > 0 && (
                    <span className="text-[10px] bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-full shrink-0">
                      {urgentes.length} urgente{urgentes.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                {items.length === 0 ? (
                  <p className="text-xs text-gray-400">Sin necesidades en este filtro.</p>
                ) : (
                  <div className="space-y-2">
                    {items.map(n => {
                      const pct = Math.round((n.unidadesActuales / n.metaUnidades) * 100)
                      return (
                        <div key={n.id}>
                          <div className="flex justify-between text-xs text-gray-600">
                            <span>{TIPO_EMOJI[n.tipo] ?? '📦'} {n.tipo}</span>
                            <span className="font-medium">{pct}%</span>
                          </div>
                          <ProgressBar pct={pct} />
                        </div>
                      )
                    })}
                  </div>
                )}
                <Link
                  to={`/donaciones?tipo=${tipoParaDonar(items)}`}
                  className="mt-4 block text-center bg-orange-50 hover:bg-orange-100 text-orange-600 text-xs font-bold py-2 rounded-xl transition-colors border border-orange-200"
                >
                  {items.length > 0 ? `Donar ${TIPO_EMOJI[items.find(n=>n.urgente)?.tipo ?? items[0]?.tipo] ?? ''} ahora` : 'Donar ahora'}
                </Link>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
