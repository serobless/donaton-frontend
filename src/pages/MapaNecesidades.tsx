import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import api from '../lib/axios'
import type { Causa, CentroAcopio, Necesidad } from '../types'

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl

const TIPO_EMOJI: Record<string, string> = {
  Frazadas: '🧣',
  Ropa: '👕',
  Alimentos: '🥫',
  Medicamentos: '💊',
}

const TIPOS = ['Todas', 'Frazadas', 'Ropa', 'Alimentos', 'Medicamentos']

// Días restantes para considerar urgente o próximo a vencer
const DIAS_URGENTE = 7
const DIAS_PRONTO = 14

type UrgencyLevel = 'urgent' | 'soon' | 'active' | 'none'

function diasHastaFin(fechaFin?: string): number | null {
  if (!fechaFin) return null
  const fin = new Date(fechaFin)
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  fin.setHours(0, 0, 0, 0)
  return Math.ceil((fin.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
}

function getUrgencyOfNeed(n: Necesidad): UrgencyLevel {
  if (n.urgente || (n.diasRestantes != null && n.diasRestantes <= DIAS_URGENTE)) return 'urgent'
  if (n.diasRestantes != null && n.diasRestantes <= DIAS_PRONTO) return 'soon'
  if (n.activa) return 'active'
  return 'none'
}

function getCentroUrgency(needs: Necesidad[], causasVinculadas: Causa[]): UrgencyLevel {
  // Urgencia por necesidades
  const needLevel: UrgencyLevel =
    needs.some(n => getUrgencyOfNeed(n) === 'urgent') ? 'urgent' :
    needs.some(n => getUrgencyOfNeed(n) === 'soon')   ? 'soon'   :
    needs.length > 0                                   ? 'active' : 'none'

  // Urgencia por campañas vinculadas al centro
  const causaLevel: UrgencyLevel = (() => {
    const activas = causasVinculadas.filter(c => c.activa)
    if (activas.some(c => { const d = diasHastaFin(c.fechaFin); return d != null && d >= 0 && d <= DIAS_URGENTE })) return 'urgent'
    if (activas.some(c => { const d = diasHastaFin(c.fechaFin); return d != null && d >= 0 && d <= DIAS_PRONTO })) return 'soon'
    return activas.length > 0 ? 'active' : 'none'
  })()

  // Devuelve el nivel más crítico
  const order: Record<UrgencyLevel, number> = { urgent: 0, soon: 1, active: 2, none: 3 }
  return order[needLevel] <= order[causaLevel] ? needLevel : causaLevel
}

const URGENCY_ORDER: Record<UrgencyLevel, number> = { urgent: 0, soon: 1, active: 2, none: 3 }

// Colores de los pines del mapa
const PIN_COLORS: Record<UrgencyLevel, string> = {
  urgent: '#dc2626',
  soon:   '#d97706',
  active: '#f97316',
  none:   '#f97316', // igual que activo — sin necesidades sigue siendo activo
}

function createPinIcon(level: UrgencyLevel) {
  const color = PIN_COLORS[level]
  // Pin estilo gota clásico Leaflet, coloreado
  return L.divIcon({
    className: '',
    html: `<svg width="25" height="41" viewBox="0 0 25 41" xmlns="http://www.w3.org/2000/svg">
      <path d="M12.5 0C5.60 0 0 5.60 0 12.5c0 8.28 12.5 28.5 12.5 28.5S25 20.78 25 12.5C25 5.60 19.40 0 12.5 0z"
        fill="${color}" stroke="white" stroke-width="1.5"
        style="filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4))"/>
      <circle cx="12.5" cy="12.5" r="4.5" fill="white" opacity="0.95"/>
    </svg>`,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -38],
  })
}

function ProgressBar({ pct }: { pct: number }) {
  const color = pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-orange-400' : 'bg-red-500'
  return (
    <div className="w-full bg-gray-100 rounded-full h-2 mt-1">
      <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  )
}

function DaysBadge({ days, urgente }: { days?: number | null; urgente?: boolean }) {
  const isUrgent = urgente || (days != null && days <= DIAS_URGENTE)
  const isSoon = !isUrgent && days != null && days <= DIAS_PRONTO
  if (isUrgent && days != null)
    return <span className="text-[10px] bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-full">⚠ {days}d</span>
  if (isSoon && days != null)
    return <span className="text-[10px] bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full">📅 {days}d</span>
  if (days != null)
    return <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{days}d</span>
  return null
}

const HEADER_CLASSES: Record<UrgencyLevel, string> = {
  urgent: 'bg-gradient-to-r from-red-600 to-red-500',
  soon:   'bg-gradient-to-r from-amber-500 to-orange-400',
  active: 'bg-gradient-to-r from-orange-500 to-amber-400',
  none:   'bg-gradient-to-r from-orange-500 to-amber-400', // igual que activo
}

const URGENCY_LABEL: Record<UrgencyLevel, { label: string; cls: string } | null> = {
  urgent: { label: '🚨 URGENTE', cls: 'bg-white text-red-700 font-extrabold shadow' },
  soon:   { label: '⏳ Próximo a vencer', cls: 'bg-white/20 text-white border border-white/30' },
  active: null,
  none:   null,
}

export default function MapaNecesidades() {
  const [centros, setCentros] = useState<CentroAcopio[]>([])
  const [necesidades, setNecesidades] = useState<Necesidad[]>([])
  const [causas, setCausas] = useState<Causa[]>([])
  const [tipoFiltro, setTipoFiltro] = useState('Todas')
  const [regionFiltro, setRegionFiltro] = useState('Todas')
  const [cargando, setCargando] = useState(true)
  const [tabRegion, setTabRegion] = useState<string | null>(null)

  useEffect(() => {
    async function cargar() {
      try {
        const [{ data: c }, { data: n }, { data: ca }] = await Promise.all([
          api.get<CentroAcopio[]>('/api/centros'),
          api.get<Necesidad[]>('/api/necesidades'),
          api.get<Causa[]>('/api/causas'),
        ])
        setCentros(c)
        setNecesidades(n)
        setCausas(ca)
      } catch {
        setCentros([])
        setNecesidades([])
        setCausas([])
      } finally {
        setCargando(false)
      }
    }
    cargar()
  }, [])

  const centrosActivos = centros.filter(c => c.activo)
  const regiones = ['Todas', ...Array.from(new Set(centrosActivos.map(c => c.region))).sort()]
  const regionesDir = Array.from(new Set(centrosActivos.map(c => c.region))).sort()
  const tabActivo = tabRegion ?? regionesDir[0] ?? ''

  const causasUrgentes = causas.filter(c => {
    if (!c.activa) return false
    const dias = diasHastaFin(c.fechaFin)
    if (!(dias != null && dias <= 7 && dias >= 0)) return false
    if (regionFiltro !== 'Todas') {
      const linkedCentro = centros.find(ct => ct.id === (c.centro?.id ?? c.centroId))
      if (linkedCentro && linkedCentro.region !== regionFiltro) return false
    }
    if (tipoFiltro !== 'Todas' && c.tipo !== tipoFiltro) return false
    return true
  }).sort((a, b) => (diasHastaFin(a.fechaFin) ?? 99) - (diasHastaFin(b.fechaFin) ?? 99))

  const coordValida = (lat?: number | null, lng?: number | null) =>
    lat != null && lng != null && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180

  const needsParaCentro = (centroId: number) =>
    necesidades.filter(n => n.centro?.id === centroId && n.activa)

  const needsFiltradas = (centroId: number) =>
    necesidades.filter(n => n.centro?.id === centroId && n.activa &&
      (tipoFiltro === 'Todas' || n.tipo === tipoFiltro))

  // La API devuelve { centro: { id, nombre } } — usamos ese campo o el centroId mapeado
  const causasDelCentro = (centroId: number) =>
    causas.filter(c => c.activa && (c.centro?.id === centroId || c.centroId === centroId))

  const centroTieneTipo = (centroId: number, tipo: string) =>
    necesidades.some(n => n.centro?.id === centroId && n.tipo === tipo && n.activa) ||
    causas.some(ca => ca.activa && (ca.centro?.id === centroId || ca.centroId === centroId) && ca.tipo === tipo)

  const centrosFiltradosMapa = centrosActivos.filter(c => {
    if (!coordValida(c.latitud, c.longitud)) return false
    if (regionFiltro !== 'Todas' && c.region !== regionFiltro) return false
    if (tipoFiltro !== 'Todas') return centroTieneTipo(c.id, tipoFiltro)
    return true
  })

  const centrosDir = centrosActivos
    .filter(c => {
      if (c.region !== tabActivo) return false
      if (tipoFiltro !== 'Todas') return centroTieneTipo(c.id, tipoFiltro)
      return true
    })
    .sort((a, b) => {
      const la = getCentroUrgency(needsParaCentro(a.id), causasDelCentro(a.id))
      const lb = getCentroUrgency(needsParaCentro(b.id), causasDelCentro(b.id))
      return URGENCY_ORDER[la] - URGENCY_ORDER[lb]
    })

  const totalUrgentes = necesidades.filter(n => n.activa && getUrgencyOfNeed(n) === 'urgent').length

  const countForTipo = (tipo: string) =>
    tipo === 'Todas'
      ? centrosActivos.length
      : centrosActivos.filter(c => centroTieneTipo(c.id, tipo)).length

  const urgentForTipo = (tipo: string) => {
    if (tipo === 'Todas') return totalUrgentes
    const needUrgent = necesidades.filter(n => n.activa && n.tipo === tipo && getUrgencyOfNeed(n) === 'urgent').length
    const causaUrgent = causas.filter(ca => {
      if (!ca.activa || ca.tipo !== tipo) return false
      const d = diasHastaFin(ca.fechaFin)
      return d != null && d >= 0 && d <= DIAS_URGENTE
    }).length
    return needUrgent + causaUrgent
  }

  const filtersActive = tipoFiltro !== 'Todas' || regionFiltro !== 'Todas'

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50">
      {/* Hero */}
      <section className="bg-gradient-to-r from-orange-500 to-amber-500 text-white py-14 px-4 text-center">
        <h1 className="text-3xl md:text-4xl font-extrabold mb-3">Mapa de Necesidades</h1>
        <p className="text-lg opacity-90 max-w-xl mx-auto mb-6">
          ¿Qué necesitan hoy los centros de acopio? Dona exactamente lo que hace falta.
        </p>
        {totalUrgentes > 0 && (
          <span className="inline-flex items-center gap-2 bg-red-600 text-white font-bold px-5 py-2 rounded-full text-sm shadow-lg animate-pulse">
            🚨 {totalUrgentes} necesidad{totalUrgentes > 1 ? 'es' : ''} urgente{totalUrgentes > 1 ? 's' : ''} — tiempo limitado
          </span>
        )}
      </section>

      <div className="max-w-7xl mx-auto px-4 py-10">
        {/* Filtros */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
          <div className="flex flex-wrap gap-2 items-center mb-3">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wide w-full sm:w-auto sm:mr-1">Tipo de necesidad</span>
            {TIPOS.map(t => {
              const count = countForTipo(t)
              const urgent = urgentForTipo(t)
              const isActive = tipoFiltro === t
              return (
                <button
                  key={t}
                  onClick={() => setTipoFiltro(t)}
                  className={`relative flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium border transition-all ${
                    isActive
                      ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300 hover:bg-orange-50'
                  }`}
                >
                  {t !== 'Todas' && <span>{TIPO_EMOJI[t]}</span>}
                  {t}
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                    isActive ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {count}
                  </span>
                  {!isActive && urgent > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center px-1 shadow">
                      {urgent}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
          <div className="flex flex-wrap gap-2 items-center border-t border-gray-100 pt-3">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Región</span>
            <select
              value={regionFiltro}
              onChange={e => {
                const val = e.target.value
                setRegionFiltro(val)
                setTabRegion(val !== 'Todas' ? val : regionesDir[0] ?? null)
              }}
              className="border border-gray-200 rounded-xl px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
            >
              {regiones.map(r => (
                <option key={r} value={r}>
                  {r === 'Todas'
                    ? `Todas las regiones (${centrosActivos.length})`
                    : `${r} (${centrosActivos.filter(c => c.region === r).length})`}
                </option>
              ))}
            </select>
            {filtersActive && (
              <button
                onClick={() => { setTipoFiltro('Todas'); setRegionFiltro('Todas') }}
                className="ml-auto flex items-center gap-1.5 text-xs text-orange-600 hover:text-orange-800 font-semibold px-3 py-1.5 rounded-full border border-orange-200 hover:border-orange-400 hover:bg-orange-50 transition-colors"
              >
                × Limpiar filtros
              </button>
            )}
          </div>
        </div>

        {/* Resumen de filtros activos */}
        {filtersActive && (
          <div className="flex flex-wrap items-center gap-2 mb-4 px-4 py-2.5 bg-orange-50 border border-orange-100 rounded-xl text-sm">
            <span className="text-gray-700">
              📍 <strong>{centrosFiltradosMapa.length}</strong> centro{centrosFiltradosMapa.length !== 1 ? 's' : ''} en el mapa
              {tipoFiltro !== 'Todas' && <> · necesita <strong>{TIPO_EMOJI[tipoFiltro]} {tipoFiltro}</strong></>}
              {regionFiltro !== 'Todas' && <> · región <strong>{regionFiltro}</strong></>}
            </span>
            {centrosFiltradosMapa.some(c => getCentroUrgency(needsParaCentro(c.id), causasDelCentro(c.id)) === 'urgent') && (
              <span className="text-xs bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-full">🚨 con urgencias</span>
            )}
          </div>
        )}

        {/* Campañas urgentes */}
        {causasUrgentes.length > 0 && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 overflow-hidden">
            <div className="flex items-center gap-2 bg-red-600 px-5 py-3">
              <span className="text-white text-sm font-extrabold tracking-wide animate-pulse">🚨 CAMPAÑAS CON PLAZO URGENTE</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
              {causasUrgentes.map(c => {
                const dias = diasHastaFin(c.fechaFin)!
                const pct = c.meta > 0 ? Math.min(Math.round((c.recaudado / c.meta) * 100), 100) : 0
                return (
                  <div key={c.id} className="bg-white rounded-xl border border-red-100 shadow-sm p-4 flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900 text-sm leading-snug">{c.titulo}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {c.tipo && (
                            <span className="text-[11px] bg-orange-50 text-orange-700 border border-orange-100 px-2 py-0.5 rounded-full font-semibold">
                              {TIPO_EMOJI[c.tipo] ?? '📦'} {c.tipo}
                            </span>
                          )}
                          {c.centro?.nombre && (
                            <span className="text-[11px] text-gray-400 px-2 py-0.5 rounded-full bg-gray-50">
                              📍 {c.centro.nombre}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className={`shrink-0 text-xs font-extrabold px-2.5 py-1 rounded-full ${
                        dias <= 2 ? 'bg-red-600 text-white' : dias <= 5 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        ⏱ {dias === 0 ? '¡Hoy!' : dias === 1 ? 'Mañana' : `${dias} días`}
                      </span>
                    </div>
                    {c.descripcion && (
                      <p className="text-xs text-gray-500 line-clamp-2">{c.descripcion}</p>
                    )}
                    <div>
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>${c.recaudado.toLocaleString('es-CL')}</span>
                        <span className="font-medium">{pct}% de ${c.meta.toLocaleString('es-CL')}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-red-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <Link
                      to="/donaciones"
                      className="mt-1 block text-center bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-2 rounded-lg transition-colors"
                    >
                      Donar antes que termine →
                    </Link>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Mapa */}
        <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-md mb-3" style={{ height: 500 }}>
          {cargando ? (
            <div className="flex items-center justify-center h-full bg-gray-50">
              <div className="text-center">
                <div className="w-8 h-8 border-4 border-orange-300 border-t-orange-500 rounded-full animate-spin mx-auto mb-2" />
                <p className="text-gray-400 text-sm">Cargando mapa...</p>
              </div>
            </div>
          ) : centrosFiltradosMapa.length === 0 ? (
            <div className="flex items-center justify-center h-full bg-gray-50">
              <p className="text-gray-400 text-sm">No hay centros en el mapa para el filtro seleccionado.</p>
            </div>
          ) : (
            <MapContainer center={[-35.675, -71.543]} zoom={5} style={{ height: '100%', width: '100%' }} scrollWheelZoom={true}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              />
              {centrosFiltradosMapa.map(centro => {
                const needs = needsParaCentro(centro.id)
                const level = getCentroUrgency(needs, causasDelCentro(centro.id))
                const urgentes = needs.filter(n => getUrgencyOfNeed(n) === 'urgent')
                return (
                  <Marker key={centro.id} position={[centro.latitud!, centro.longitud!]} icon={createPinIcon(level)}>
                    <Popup maxWidth={280}>
                      <div className="min-w-[240px] font-sans">
                        {/* Popup header */}
                        <div className={`-mx-3 -mt-3 px-3 pt-3 pb-2 mb-2 rounded-t-lg ${
                          level === 'urgent' ? 'bg-red-50' : level === 'soon' ? 'bg-amber-50' : 'bg-orange-50'
                        }`}>
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-bold text-gray-900 text-sm leading-snug">{centro.nombre}</p>
                            {urgentes.length > 0 && (
                              <span className="text-[10px] bg-red-600 text-white font-bold px-1.5 py-0.5 rounded-full shrink-0">
                                {urgentes.length} URGENTE{urgentes.length > 1 ? 'S' : ''}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">{centro.ciudad}, {centro.region}</p>
                        </div>

                        {centro.direccion && <p className="text-[11px] text-gray-400 mb-1">📍 {centro.direccion}</p>}
                        {centro.horario && <p className="text-[11px] text-gray-400 mb-2">🕐 {centro.horario}</p>}

                        {/* Necesidades */}
                        {needs.length > 0 && (
                          <div className="space-y-2 mb-3">
                            {[...needs].sort((a, b) => URGENCY_ORDER[getUrgencyOfNeed(a)] - URGENCY_ORDER[getUrgencyOfNeed(b)]).map(n => {
                              const pct = n.metaUnidades ? Math.round((n.unidadesActuales / n.metaUnidades) * 100) : 0
                              const nLevel = getUrgencyOfNeed(n)
                              return (
                                <div key={n.id} className={`p-1.5 rounded-lg ${nLevel === 'urgent' ? 'bg-red-50' : nLevel === 'soon' ? 'bg-amber-50' : 'bg-gray-50'}`}>
                                  <div className="flex items-center justify-between mb-0.5">
                                    <span className="text-xs font-semibold text-gray-800">{TIPO_EMOJI[n.tipo] ?? '📦'} {n.tipo}</span>
                                    <DaysBadge days={n.diasRestantes} urgente={n.urgente} />
                                  </div>
                                  {n.descripcion && <p className="text-[11px] text-gray-500 mb-1">{n.descripcion}</p>}
                                  <ProgressBar pct={pct} />
                                  <p className="text-[10px] text-gray-400 mt-0.5">{n.unidadesActuales}/{n.metaUnidades} unidades ({pct}%)</p>
                                </div>
                              )
                            })}
                          </div>
                        )}
                        {/* Campañas vinculadas al centro */}
                        {causasDelCentro(centro.id).length > 0 && (
                          <div className="border-t border-gray-100 pt-2 mb-3">
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Campañas activas</p>
                            {causasDelCentro(centro.id).map(ca => {
                              const d = diasHastaFin(ca.fechaFin)
                              return (
                                <div key={ca.id} className={`text-[11px] flex items-center justify-between py-0.5 ${d != null && d <= DIAS_URGENTE ? 'text-red-700 font-semibold' : 'text-gray-600'}`}>
                                  <span className="truncate max-w-[160px]">{ca.titulo}</span>
                                  {d != null && <DaysBadge days={d} />}
                                </div>
                              )
                            })}
                          </div>
                        )}
                        {needs.length === 0 && causasDelCentro(centro.id).length === 0 && (
                          <p className="text-xs text-gray-500 mb-3">Centro activo — acepta donaciones en general.</p>
                        )}
                        <Link
                          to="/donaciones"
                          className="block text-center bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold py-2 rounded-lg transition-colors"
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

        {/* Leyenda del mapa */}
        <div className="flex flex-wrap items-center gap-4 mb-10 px-1">
          <span className="text-xs text-gray-500 font-semibold">Pines en el mapa:</span>
          {[
            { color: '#dc2626', label: 'Urgente — menos de 7 días' },
            { color: '#d97706', label: 'Próximo — menos de 14 días' },
            { color: '#f97316', label: 'Activo' },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              <svg width="14" height="20" viewBox="0 0 25 41" xmlns="http://www.w3.org/2000/svg">
                <path d="M12.5 0C5.60 0 0 5.60 0 12.5c0 8.28 12.5 28.5 12.5 28.5S25 20.78 25 12.5C25 5.60 19.40 0 12.5 0z" fill={color}/>
                <circle cx="12.5" cy="12.5" r="4.5" fill="white" opacity="0.9"/>
              </svg>
              <span className="text-xs text-gray-500">{label}</span>
            </div>
          ))}
        </div>

        {/* Directorio */}
        {centrosActivos.length > 0 && (
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-1 h-8 bg-orange-500 rounded-full" />
              <div>
                <h2 className="text-xl font-extrabold text-gray-900">Centros de Acopio</h2>
                <p className="text-sm text-gray-400">Ordenados por urgencia — los más críticos primero</p>
              </div>
            </div>

            {/* Tabs región */}
            <div className="flex gap-2 flex-wrap mt-5 mb-6 border-b border-gray-200">
              {regionesDir.map(region => {
                const count = centrosActivos.filter(c =>
                  c.region === region && (tipoFiltro === 'Todas' || centroTieneTipo(c.id, tipoFiltro))
                ).length
                return (
                  <button
                    key={region}
                    onClick={() => { setTabRegion(region); setRegionFiltro(region) }}
                    className={`px-4 py-2 text-sm font-semibold rounded-t-xl border-b-2 transition-all -mb-px ${
                      tabActivo === region
                        ? 'border-orange-500 text-orange-600 bg-orange-50'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {region}
                    <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${tabActivo === region ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>

            {centrosDir.length === 0 ? (
              <div className="text-center py-16 rounded-2xl bg-white border border-gray-100 shadow-sm">
                <div className="text-5xl mb-3">{tipoFiltro !== 'Todas' ? (TIPO_EMOJI[tipoFiltro] ?? '📭') : '📭'}</div>
                <p className="text-lg font-bold text-gray-700">
                  {tipoFiltro !== 'Todas'
                    ? `Sin necesidades de ${tipoFiltro} en ${tabActivo}`
                    : `No hay centros en ${tabActivo}`}
                </p>
                <p className="text-sm text-gray-400 mt-1 mb-5">Prueba cambiando el tipo de necesidad o la región</p>
                <div className="flex justify-center gap-3 flex-wrap">
                  {tipoFiltro !== 'Todas' && (
                    <button
                      onClick={() => setTipoFiltro('Todas')}
                      className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-xl transition-colors"
                    >
                      Ver todos los tipos
                    </button>
                  )}
                  {regionFiltro !== 'Todas' && (
                    <button
                      onClick={() => { setRegionFiltro('Todas'); setTabRegion(regionesDir[0] ?? null) }}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-xl transition-colors"
                    >
                      Ver todas las regiones
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {centrosDir.map(centro => {
                  const allNeeds = needsParaCentro(centro.id)
                  const visibleNeeds = [...needsFiltradas(centro.id)].sort(
                    (a, b) => URGENCY_ORDER[getUrgencyOfNeed(a)] - URGENCY_ORDER[getUrgencyOfNeed(b)]
                  )
                  const level = getCentroUrgency(allNeeds, causasDelCentro(centro.id))
                  const badge = URGENCY_LABEL[level]

                  return (
                    <div key={centro.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">
                      {/* Header coloreado por urgencia */}
                      <div className={`px-5 py-4 ${HEADER_CLASSES[level]}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-bold text-white text-base leading-snug">{centro.nombre}</h3>
                            <p className="text-white/80 text-xs mt-0.5">{centro.ciudad} · {centro.region}</p>
                          </div>
                          {badge && (
                            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0 ${badge.cls}`}>
                              {badge.label}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="p-5 flex flex-col flex-1 gap-3">
                        {/* Info básica */}
                        {centro.direccion && (
                          <div className="flex items-start gap-3">
                            <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <svg className="w-3.5 h-3.5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Dirección</p>
                              <p className="text-sm text-gray-800">{centro.direccion}</p>
                            </div>
                          </div>
                        )}

                        {centro.horario && (
                          <div className="flex items-start gap-3">
                            <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <svg className="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Horario</p>
                              <p className="text-sm text-gray-800">{centro.horario}</p>
                            </div>
                          </div>
                        )}

                        {centro.queRecibe && centro.queRecibe.length > 0 && (
                          <div className="flex items-start gap-3">
                            <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <svg className="w-3.5 h-3.5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Acepta donaciones de</p>
                              <div className="flex flex-wrap gap-1">
                                {centro.queRecibe.map((item, i) => (
                                  <span key={i} className="text-xs bg-orange-50 text-orange-700 border border-orange-100 px-2 py-0.5 rounded-full font-medium">
                                    {item}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Necesidades */}
                        {visibleNeeds.length > 0 && (
                          <div className="border-t border-gray-100 pt-3">
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Qué necesitan</p>
                            <div className="space-y-3">
                              {visibleNeeds.map(n => {
                                const pct = n.metaUnidades ? Math.round((n.unidadesActuales / n.metaUnidades) * 100) : 0
                                const nLevel = getUrgencyOfNeed(n)
                                return (
                                  <div key={n.id} className={`rounded-xl p-3 ${
                                    nLevel === 'urgent' ? 'bg-red-50 border border-red-100' :
                                    nLevel === 'soon'   ? 'bg-amber-50 border border-amber-100' :
                                                          'bg-gray-50 border border-gray-100'
                                  }`}>
                                    <div className="flex items-center justify-between mb-1">
                                      <span className={`text-sm font-bold ${
                                        nLevel === 'urgent' ? 'text-red-700' :
                                        nLevel === 'soon'   ? 'text-amber-700' :
                                                              'text-gray-800'
                                      }`}>
                                        {TIPO_EMOJI[n.tipo] ?? '📦'} {n.tipo}
                                      </span>
                                      <DaysBadge days={n.diasRestantes} urgente={n.urgente} />
                                    </div>
                                    {n.descripcion && (
                                      <p className="text-xs text-gray-500 mb-1.5">{n.descripcion}</p>
                                    )}
                                    <ProgressBar pct={pct} />
                                    <p className="text-[11px] text-gray-400 mt-1.5">
                                      {n.unidadesActuales} de {n.metaUnidades} unidades recibidas ({pct}%)
                                    </p>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}

                        {visibleNeeds.length === 0 && allNeeds.length === 0 && causasDelCentro(centro.id).length === 0 && (
                          <div className="rounded-xl bg-orange-50 border border-orange-100 p-3 text-center">
                            <p className="text-sm text-orange-700 font-medium">Centro activo</p>
                            <p className="text-xs text-orange-500 mt-0.5">Acepta donaciones generales de ropa, alimentos y más.</p>
                          </div>
                        )}

                        {/* Campañas vinculadas */}
                        {causasDelCentro(centro.id).length > 0 && (
                          <div className="border-t border-gray-100 pt-3">
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2.5">Campañas de recaudación</p>
                            <div className="space-y-2">
                              {causasDelCentro(centro.id).map(ca => {
                                const d = diasHastaFin(ca.fechaFin)
                                const pctCa = ca.meta > 0 ? Math.min(Math.round((ca.recaudado / ca.meta) * 100), 100) : 0
                                const isUrgentCa = d != null && d >= 0 && d <= DIAS_URGENTE
                                const isSoonCa  = !isUrgentCa && d != null && d >= 0 && d <= DIAS_PRONTO
                                return (
                                  <div key={ca.id} className={`rounded-xl p-3 ${isUrgentCa ? 'bg-red-50 border border-red-100' : isSoonCa ? 'bg-amber-50 border border-amber-100' : 'bg-gray-50 border border-gray-100'}`}>
                                    <div className="flex items-start justify-between gap-1 mb-1">
                                      <div className="flex-1 min-w-0">
                                        <span className={`text-sm font-bold block truncate ${isUrgentCa ? 'text-red-700' : isSoonCa ? 'text-amber-700' : 'text-gray-800'}`}>
                                          🎯 {ca.titulo}
                                        </span>
                                        {ca.tipo && (
                                          <span className="inline-block mt-0.5 text-[10px] bg-orange-50 text-orange-600 border border-orange-100 px-1.5 py-0.5 rounded-full font-semibold">
                                            {TIPO_EMOJI[ca.tipo] ?? '📦'} {ca.tipo}
                                          </span>
                                        )}
                                      </div>
                                      {d != null && d >= 0 && <DaysBadge days={d} />}
                                    </div>
                                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden mt-1">
                                      <div className={`h-full rounded-full ${isUrgentCa ? 'bg-red-500' : 'bg-orange-400'}`} style={{ width: `${pctCa}%` }} />
                                    </div>
                                    <p className="text-[11px] text-gray-400 mt-1">${ca.recaudado.toLocaleString('es-CL')} de ${ca.meta.toLocaleString('es-CL')} ({pctCa}%)</p>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}

                        {/* Capacidad */}
                        {centro.capacidadMax != null && centro.capacidadMax > 0 && (
                          <div className="border-t border-gray-100 pt-3">
                            <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                              <span>Capacidad del centro</span>
                              <span className={`font-semibold ${centro.capacidadActual > centro.capacidadMax ? 'text-red-500' : 'text-gray-700'}`}>
                                {centro.capacidadActual}/{centro.capacidadMax} {centro.unidadCapacidad ?? 'unidades'}
                              </span>
                            </div>
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  centro.capacidadActual > centro.capacidadMax ? 'bg-red-400'
                                  : centro.capacidadActual / centro.capacidadMax > 0.8 ? 'bg-amber-400'
                                  : 'bg-green-400'
                                }`}
                                style={{ width: `${Math.min(Math.round((centro.capacidadActual / centro.capacidadMax) * 100), 100)}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Botón */}
                        <div className="mt-auto pt-2">
                          <Link
                            to="/donaciones"
                            className={`w-full flex items-center justify-center gap-2 font-bold text-sm py-3 rounded-xl transition-colors text-white ${
                              level === 'urgent' ? 'bg-red-600 hover:bg-red-700' :
                              level === 'soon'   ? 'bg-amber-500 hover:bg-amber-600' :
                                                   'bg-orange-500 hover:bg-orange-600'
                            }`}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                            {level === 'urgent' ? 'Donar urgente ahora' : 'Donar a este centro'}
                          </Link>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
