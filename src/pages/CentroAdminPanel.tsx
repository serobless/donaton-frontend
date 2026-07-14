import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../lib/axios'
import { useAuth } from '../contexts/AuthContext'
import type { CentroAcopio, Necesidad } from '../types'

const NEED_EMOJI: Record<string, string> = {
  Frazadas: '🧣', Ropa: '👕', Alimentos: '🥫', Medicamentos: '💊',
}
const NEED_TIPOS = ['Frazadas', 'Ropa', 'Alimentos', 'Medicamentos']

interface DonacionCentro {
  id: number
  monto: number
  fecha: string
  tipoDonacion: 'MONETARIA' | 'ROPA' | 'ALIMENTO' | 'MEDICA'
  donanteAlias: string | null
  nombreEmpresa?: string | null
  esEmpresa?: boolean
  estado: 'PENDIENTE' | 'EN_PROCESO' | 'COMPLETADA' | 'CANCELADA'
  descripcion?: string | null
  cantidad?: number | null
  items?: { descripcion: string; cantidad: number | null; unidad: string | null }[] | null
  requiereAprobacion?: boolean
}

const TIPO_EMOJI: Record<string, string> = {
  MONETARIA: '💵', ROPA: '👕', ALIMENTO: '🥫', MEDICA: '💊',
}
const TIPO_LABEL: Record<string, string> = {
  MONETARIA: 'Monetaria', ROPA: 'Ropa', ALIMENTO: 'Alimentos', MEDICA: 'Médica',
}

type TabEstado = 'PENDIENTE' | 'EN_PROCESO' | 'COMPLETADA'

function formatDate(fecha: unknown): string {
  if (!fecha) return '—'
  if (Array.isArray(fecha)) {
    const [y, m, d] = fecha as number[]
    return new Date(y, m - 1, d).toLocaleDateString('es-CL')
  }
  const d = new Date(fecha as string)
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-CL')
}

export default function CentroAdminPanel() {
  const { user } = useAuth()
  const [centro, setCentro] = useState<CentroAcopio | null>(null)
  const [donaciones, setDonaciones] = useState<DonacionCentro[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<TabEstado>('PENDIENTE')
  const [cambiandoEstadoId, setCambiandoEstadoId] = useState<number | null>(null)
  const [success, setSuccess] = useState('')

  // Necesidades
  const [necesidades, setNecesidades] = useState<Necesidad[]>([])
  const [needEditar, setNeedEditar] = useState<Necesidad | null>(null)
  const [needEliminar, setNeedEliminar] = useState<Necesidad | null>(null)
  const [showNuevaNeed, setShowNuevaNeed] = useState(false)

  useEffect(() => {
    async function fetchData() {
      try {
        let centroData: CentroAcopio | null = null

        if (user?.centroId) {
          const res = await api.get<CentroAcopio>(`/api/centros/${user.centroId}`)
          centroData = res.data
        }

        if (!centroData) {
          setError('Tu usuario no está vinculado a ningún centro de acopio. Contacta al administrador.')
          return
        }

        setCentro(centroData)

        // Donaciones asignadas a este centro
        const donRes = await api.get<DonacionCentro[]>(`/api/donaciones/centro/${centroData.id}`)
          .catch(() => ({ data: [] as DonacionCentro[] }))
        setDonaciones(donRes.data)

        const needRes = await api.get<Necesidad[]>(`/api/centros/${centroData.id}/necesidades`)
          .catch(() => ({ data: [] as Necesidad[] }))
        setNecesidades(needRes.data)
      } catch {
        setError('No se pudo cargar la información del centro.')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [user])

  async function toggleUrgente(n: Necesidad) {
    try {
      const { data } = await api.put<Necesidad>(`/api/necesidades/${n.id}`, {
        tipo: n.tipo, descripcion: n.descripcion,
        metaUnidades: n.metaUnidades, unidadesActuales: n.unidadesActuales,
        urgente: !n.urgente, diasRestantes: n.diasRestantes,
      })
      setNecesidades(prev => prev.map(x => x.id === n.id ? data : x))
      flash(data.urgente ? '🚨 Marcada como urgente — el pin del mapa se vuelve rojo' : 'Volvió a estado normal')
    } catch { alert('No se pudo actualizar.') }
  }

  async function actualizarUnidades(n: Necesidad, val: number) {
    if (val === n.unidadesActuales) return
    try {
      const { data } = await api.put<Necesidad>(`/api/necesidades/${n.id}`, {
        tipo: n.tipo, descripcion: n.descripcion,
        metaUnidades: n.metaUnidades, unidadesActuales: val,
        urgente: n.urgente, diasRestantes: n.diasRestantes,
      })
      setNecesidades(prev => prev.map(x => x.id === n.id ? data : x))
    } catch { /* silencioso */ }
  }

  async function handleAprobarDonacion(donacionId: number) {
    try {
      await api.patch(`/api/donaciones/${donacionId}/aprobar`, {})
      setDonaciones(prev =>
        prev.map(d => d.id === donacionId ? { ...d, requiereAprobacion: false } : d)
      )
      flash('Donación aprobada. El monto ya se contabiliza en la causa.')
    } catch {
      alert('Error al aprobar la donación.')
    }
  }

  async function handleCambiarEstado(donacionId: number, nuevoEstado: string) {
    setCambiandoEstadoId(donacionId)
    try {
      await api.patch(`/api/donaciones/${donacionId}/estado`, { estado: nuevoEstado })
      setDonaciones(prev =>
        prev.map(d => d.id === donacionId ? { ...d, estado: nuevoEstado as DonacionCentro['estado'] } : d)
      )
      flash('Estado actualizado')
    } catch {
      alert('No se pudo actualizar el estado')
    } finally {
      setCambiandoEstadoId(null)
    }
  }

  function flash(msg: string) {
    setSuccess(msg)
    setTimeout(() => setSuccess(''), 3000)
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !centro) {
    return (
      <div className="flex-1 flex items-center justify-center py-20 px-6">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Sin centro asignado</h2>
          <p className="text-gray-500 text-sm leading-relaxed">{error || 'No se encontró ningún centro vinculado a tu cuenta.'}</p>
          <Link to="/" className="mt-5 inline-block text-orange-500 hover:text-orange-600 text-sm font-semibold">
            ← Volver al inicio
          </Link>
        </div>
      </div>
    )
  }

  const pendientes   = donaciones.filter(d => d.estado === 'PENDIENTE')
  const enProceso    = donaciones.filter(d => d.estado === 'EN_PROCESO')
  const completadas  = donaciones.filter(d => d.estado === 'COMPLETADA')
  const canceladas   = donaciones.filter(d => d.estado === 'CANCELADA')
  const filtradas    = donaciones.filter(d => d.estado === tab)

  // Factores de espacio en dm³ por artículo (mismo que backend)
  const ESPACIO: Record<string, number> = { ROPA: 5, ALIMENTO: 3, MEDICA: 1, MONETARIA: 0 }
  const TIPO_NOMBRE: Record<string, string> = { ROPA: 'Ropa', ALIMENTO: 'Alimentos', MEDICA: 'Medicamentos', MONETARIA: 'Donación monetaria' }

  // Solo las donaciones EN_PROCESO están físicamente en el centro
  const enCentro = donaciones.filter(d => d.estado === 'EN_PROCESO')

  const desglose = (['ROPA', 'ALIMENTO', 'MEDICA'] as const).map(tipo => {
    const items = enCentro.filter(d => d.tipoDonacion === tipo)
    const cantidad = items.reduce((s, d) => s + (d.cantidad && d.cantidad > 0 ? d.cantidad : 1), 0)
    const espacio  = cantidad * ESPACIO[tipo]
    return { tipo, nombre: TIPO_NOMBRE[tipo], items: items.length, cantidad, espacio, factor: ESPACIO[tipo] }
  }).filter(d => d.items > 0)

  const espacioUsado = desglose.reduce((s, d) => s + d.espacio, 0)
  const pctCapacidad = centro.capacidadMax > 0 ? Math.min(Math.round((espacioUsado / centro.capacidadMax) * 100), 100) : 0

  const nivelOcupacion = pctCapacidad >= 90 ? 'Crítica' : pctCapacidad >= 70 ? 'Alta' : pctCapacidad >= 40 ? 'Media' : 'Baja'
  const colorOcupacion = pctCapacidad >= 90 ? 'text-red-600' : pctCapacidad >= 70 ? 'text-amber-600' : pctCapacidad >= 40 ? 'text-blue-600' : 'text-green-600'
  const barColor       = pctCapacidad >= 90 ? 'bg-red-500'  : pctCapacidad >= 70 ? 'bg-amber-400'  : pctCapacidad >= 40 ? 'bg-blue-400'  : 'bg-green-500'

  const TABS: { key: TabEstado; label: string; count: number; activeClass: string }[] = [
    { key: 'PENDIENTE',  label: 'Pendientes',  count: pendientes.length,  activeClass: 'text-yellow-600 border-yellow-500' },
    { key: 'EN_PROCESO', label: 'En proceso',  count: enProceso.length,   activeClass: 'text-blue-600   border-blue-500'   },
    { key: 'COMPLETADA', label: 'Completadas', count: completadas.length,  activeClass: 'text-green-600  border-green-500'  },
  ]

  return (
    <div className="flex-1 bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Toast */}
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-800 px-5 py-3 rounded-xl flex items-center gap-3 text-sm">
            <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {success}
          </div>
        )}

        {/* Header */}
        <div className="mb-8">
          <p className="text-xs font-semibold text-orange-500 uppercase tracking-widest mb-1">Panel de encargado</p>
          <h1 className="text-3xl font-extrabold text-gray-900">{centro.nombre}</h1>
          <p className="text-gray-500 mt-1 flex items-center gap-1.5 text-sm">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {centro.direccion} · {centro.ciudad}, {centro.region}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { value: pendientes.length,  label: 'Pendientes',  num: 'text-yellow-600', bg: 'bg-yellow-50'  },
            { value: enProceso.length,   label: 'En proceso',  num: 'text-blue-600',   bg: 'bg-blue-50'    },
            { value: completadas.length, label: 'Completadas', num: 'text-green-600',  bg: 'bg-green-50'   },
            { value: canceladas.length,  label: 'Canceladas',  num: 'text-gray-500',   bg: 'bg-gray-50'    },
          ].map(({ value, label, num, bg }) => (
            <div key={label} className={`${bg} rounded-2xl border border-gray-100 p-4 text-center`}>
              <p className={`text-2xl font-extrabold ${num}`}>{value}</p>
              <p className="text-xs text-gray-400 mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Capacidad — calculada automáticamente desde donaciones físicamente en el centro */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-bold text-gray-900">Ocupación del centro</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Calculada en tiempo real · Capacidad física: {centro.capacidadMax} dm³
              </p>
            </div>
            <span className={`text-2xl font-extrabold ${colorOcupacion}`}>{pctCapacidad}%</span>
          </div>

          <div className="h-3 bg-gray-100 rounded-full overflow-hidden mb-1">
            <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pctCapacidad}%` }} />
          </div>
          <div className="flex justify-between text-xs text-gray-400 mb-4">
            <span>0 dm³</span>
            <span className={`font-semibold ${colorOcupacion}`}>{nivelOcupacion} — {espacioUsado} / {centro.capacidadMax} dm³</span>
            <span>{centro.capacidadMax} dm³</span>
          </div>

          {desglose.length > 0 ? (
            <div className="border border-gray-100 rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 text-gray-400 uppercase tracking-wide">
                    <th className="px-3 py-2 text-left font-semibold">Tipo</th>
                    <th className="px-3 py-2 text-right font-semibold">Artículos</th>
                    <th className="px-3 py-2 text-right font-semibold">Factor</th>
                    <th className="px-3 py-2 text-right font-semibold">Espacio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {desglose.map(d => (
                    <tr key={d.tipo}>
                      <td className="px-3 py-2 font-medium text-gray-700">{d.nombre}</td>
                      <td className="px-3 py-2 text-right text-gray-500">{d.cantidad} artículos</td>
                      <td className="px-3 py-2 text-right text-gray-400">{d.factor} dm³ c/u</td>
                      <td className="px-3 py-2 text-right font-bold text-gray-800">{d.espacio} dm³</td>
                    </tr>
                  ))}
                  <tr className="bg-orange-50">
                    <td colSpan={3} className="px-3 py-2 font-bold text-gray-700">Total en centro</td>
                    <td className="px-3 py-2 text-right font-extrabold text-orange-600">{espacioUsado} dm³</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-gray-400 text-center py-3 italic">
              No hay donaciones físicas en el centro actualmente
            </p>
          )}

          <p className="text-xs text-gray-300 mt-3">
            Factores referenciales: Ropa 5 dm³/prenda · Alimentos 3 dm³/unidad · Medicamentos 1 dm³/unidad · Monetaria 0 dm³
          </p>
        </div>

        {/* Info del centro */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Información del centro</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Horario</p>
                <p className="text-gray-800 font-medium">{centro.horario || '—'}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.948V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Teléfono</p>
                {centro.telefono
                  ? <a href={`tel:${centro.telefono}`} className="text-blue-600 hover:underline font-medium">{centro.telefono}</a>
                  : <p className="text-gray-800 font-medium">—</p>
                }
              </div>
            </div>
            {centro.queRecibe && centro.queRecibe.length > 0 && (
              <div className="sm:col-span-2 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1.5">Acepta donaciones de</p>
                  <div className="flex flex-wrap gap-1.5">
                    {centro.queRecibe.map((item, i) => (
                      <span key={i} className="text-xs bg-orange-50 text-orange-700 border border-orange-100 px-2 py-0.5 rounded-full font-medium">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Necesidades del centro */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
          <div className="flex items-start justify-between gap-3 mb-5">
            <div>
              <h2 className="font-bold text-gray-900">Necesidades del centro</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Activa 🚨 Urgente → el pin del mapa se vuelve rojo para los donadores
              </p>
            </div>
            <button
              onClick={() => setShowNuevaNeed(true)}
              className="shrink-0 flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm px-4 py-2 rounded-xl transition-colors"
            >
              + Agregar
            </button>
          </div>

          {necesidades.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-4xl mb-2">📋</p>
              <p className="font-semibold text-gray-700">Sin necesidades registradas</p>
              <p className="text-xs text-gray-400 mt-1 mb-4">Agrega qué tipos de donaciones necesita tu centro ahora</p>
              <button onClick={() => setShowNuevaNeed(true)} className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm rounded-xl transition-colors">
                + Agregar primera necesidad
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {necesidades.map(n => {
                const pct = n.metaUnidades ? Math.min(Math.round((n.unidadesActuales / n.metaUnidades) * 100), 100) : 0
                return (
                  <div key={n.id} className={`rounded-2xl border-2 p-4 transition-all ${n.urgente ? 'border-red-300 bg-red-50' : 'border-gray-100 bg-gray-50'}`}>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{NEED_EMOJI[n.tipo] ?? '📦'}</span>
                        <span className="font-extrabold text-gray-900">{n.tipo}</span>
                      </div>
                      <button
                        onClick={() => toggleUrgente(n)}
                        className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-extrabold border-2 transition-all ${
                          n.urgente
                            ? 'bg-red-600 text-white border-red-600 shadow-sm'
                            : 'bg-white text-gray-400 border-gray-200 hover:border-red-300 hover:text-red-500'
                        }`}
                      >
                        🚨 {n.urgente ? 'URGENTE' : 'Normal'}
                      </button>
                    </div>

                    {n.descripcion && <p className="text-xs text-gray-500 mb-2">{n.descripcion}</p>}

                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>{n.unidadesActuales} recibidas</span>
                        <span className="font-semibold">{pct}% de {n.metaUnidades ?? '?'}</span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${pct >= 80 ? 'bg-green-500' : pct >= 40 ? 'bg-orange-400' : 'bg-red-500'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 items-center">
                      <input
                        type="number"
                        key={`${n.id}-${n.unidadesActuales}`}
                        defaultValue={n.unidadesActuales}
                        min={0}
                        className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
                        placeholder="Unidades recibidas"
                        onBlur={e => actualizarUnidades(n, Number(e.target.value))}
                      />
                      <button onClick={() => setNeedEditar(n)} className="p-1.5 border border-gray-200 rounded-lg text-gray-400 hover:text-orange-500 hover:border-orange-200 transition-colors" title="Editar">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button onClick={() => setNeedEliminar(n)} className="p-1.5 border border-red-100 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Eliminar">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Donaciones recibidas con tabs */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 pt-5 pb-0 border-b border-gray-100">
            <h2 className="font-bold text-gray-900 mb-4">Donaciones recibidas</h2>
            <div className="flex">
              {TABS.map(({ key, label, count, activeClass }) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-all -mb-px ${
                    tab === key
                      ? `${activeClass} bg-white`
                      : 'border-transparent text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {label}
                  <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${tab === key ? 'bg-gray-100' : 'bg-gray-50 text-gray-400'}`}>
                    {count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {filtradas.length === 0 ? (
            <div className="py-16 text-center text-gray-400 text-sm">
              No hay donaciones {tab === 'PENDIENTE' ? 'pendientes' : tab === 'EN_PROCESO' ? 'en proceso' : 'completadas'}
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {filtradas.map(d => (
                <div key={d.id} className="px-6 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <span className="text-lg">{TIPO_EMOJI[d.tipoDonacion] ?? '📦'}</span>
                        <span className="text-sm font-semibold text-gray-900">{TIPO_LABEL[d.tipoDonacion] ?? d.tipoDonacion}</span>
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                          {d.donanteAlias ?? 'Anónimo'}
                        </span>
                        <span className="text-xs text-gray-400">{formatDate(d.fecha)}</span>
                      </div>
                      {d.descripcion && (
                        <p className="text-xs text-gray-500 mb-2 leading-relaxed">{d.descripcion}</p>
                      )}
                      {d.items && d.items.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-1">
                          {d.items.map((item, i) => (
                            <span key={i} className="text-xs bg-orange-50 text-orange-700 border border-orange-100 px-2 py-0.5 rounded-full">
                              {item.cantidad}{item.unidad && item.unidad !== 'unidades' ? ` ${item.unidad}` : '×'} {item.descripcion}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex-shrink-0 text-right">
                      {d.monto > 0 && (
                        <p className="font-bold text-orange-500 text-sm mb-2">${d.monto.toLocaleString('es-CL')}</p>
                      )}
                      <div className="flex flex-col gap-1.5">
                        {d.requiereAprobacion && (
                          <button
                            onClick={() => handleAprobarDonacion(d.id)}
                            className="text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                          >
                            ✓ Aprobar donación empresarial
                          </button>
                        )}
                        {d.estado === 'PENDIENTE' && !d.requiereAprobacion && (
                          <button
                            onClick={() => handleCambiarEstado(d.id, 'EN_PROCESO')}
                            disabled={cambiandoEstadoId === d.id}
                            className="text-xs font-semibold bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
                          >
                            {cambiandoEstadoId === d.id ? '...' : 'Recibida → En proceso'}
                          </button>
                        )}
                        {d.estado === 'EN_PROCESO' && (
                          <button
                            onClick={() => handleCambiarEstado(d.id, 'COMPLETADA')}
                            disabled={cambiandoEstadoId === d.id}
                            className="text-xs font-semibold bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
                          >
                            {cambiandoEstadoId === d.id ? '...' : '✓ Marcar completada'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Modal: Nueva necesidad */}
      {showNuevaNeed && centro && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowNuevaNeed(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Agregar necesidad</h3>
              <button onClick={() => setShowNuevaNeed(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <form onSubmit={async e => {
              e.preventDefault()
              const fd = new FormData(e.currentTarget)
              const body = {
                tipo: fd.get('tipo') as string,
                descripcion: fd.get('descripcion') as string || undefined,
                metaUnidades: Number(fd.get('metaUnidades')) || undefined,
                unidadesActuales: Number(fd.get('unidadesActuales')) || 0,
                urgente: fd.get('urgente') === 'on',
                diasRestantes: Number(fd.get('diasRestantes')) || undefined,
              }
              try {
                const { data } = await api.post<Necesidad>(`/api/centros/${centro.id}/necesidades`, body)
                setNecesidades(prev => [...prev, data])
                setShowNuevaNeed(false)
                flash('Necesidad agregada')
              } catch { alert('Error al crear la necesidad.') }
            }} className="p-6 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de necesidad</label>
                <select name="tipo" required className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white">
                  {NEED_TIPOS.map(t => <option key={t} value={t}>{NEED_EMOJI[t]} {t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Descripción <span className="font-normal text-gray-400">(opcional)</span></label>
                <textarea name="descripcion" rows={2} placeholder="Ej: Frazadas dobles para adultos, talla única..." className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Meta (unidades)</label>
                  <input type="number" name="metaUnidades" min={1} placeholder="200" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Recibidas hasta ahora</label>
                  <input type="number" name="unidadesActuales" min={0} defaultValue={0} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-100 rounded-xl cursor-pointer" onClick={() => {
                const cb = document.getElementById('urgente-new-panel') as HTMLInputElement
                if (cb) cb.checked = !cb.checked
              }}>
                <input type="checkbox" name="urgente" id="urgente-new-panel" className="w-4 h-4 accent-red-500" onClick={e => e.stopPropagation()} />
                <label htmlFor="urgente-new-panel" className="text-sm font-semibold text-red-700 cursor-pointer select-none">
                  🚨 Marcar como URGENTE (pin rojo en el mapa)
                </label>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="submit" className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 rounded-xl text-sm transition-colors">Agregar</button>
                <button type="button" onClick={() => setShowNuevaNeed(false)} className="px-5 py-2.5 border border-gray-200 rounded-xl text-gray-600 text-sm hover:bg-gray-50 transition-colors">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar necesidad */}
      {needEditar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setNeedEditar(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Editar necesidad</h3>
              <button onClick={() => setNeedEditar(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <form onSubmit={async e => {
              e.preventDefault()
              const fd = new FormData(e.currentTarget)
              const body = {
                tipo: fd.get('tipo') as string,
                descripcion: fd.get('descripcion') as string || undefined,
                metaUnidades: Number(fd.get('metaUnidades')) || undefined,
                unidadesActuales: Number(fd.get('unidadesActuales')) || 0,
                urgente: fd.get('urgente') === 'on',
                diasRestantes: Number(fd.get('diasRestantes')) || undefined,
              }
              try {
                const { data } = await api.put<Necesidad>(`/api/necesidades/${needEditar.id}`, body)
                setNecesidades(prev => prev.map(x => x.id === needEditar.id ? data : x))
                setNeedEditar(null)
                flash('Necesidad actualizada')
              } catch { alert('Error al actualizar la necesidad.') }
            }} className="p-6 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de necesidad</label>
                <select name="tipo" defaultValue={needEditar.tipo} required className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white">
                  {NEED_TIPOS.map(t => <option key={t} value={t}>{NEED_EMOJI[t]} {t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Descripción</label>
                <textarea name="descripcion" rows={2} defaultValue={needEditar.descripcion ?? ''} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Meta (unidades)</label>
                  <input type="number" name="metaUnidades" min={1} defaultValue={needEditar.metaUnidades ?? ''} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Recibidas</label>
                  <input type="number" name="unidadesActuales" min={0} defaultValue={needEditar.unidadesActuales} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-100 rounded-xl">
                <input type="checkbox" name="urgente" id="urgente-edit-panel" defaultChecked={needEditar.urgente} className="w-4 h-4 accent-red-500" />
                <label htmlFor="urgente-edit-panel" className="text-sm font-semibold text-red-700 cursor-pointer">
                  🚨 URGENTE (pin rojo en el mapa)
                </label>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="submit" className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 rounded-xl text-sm transition-colors">Guardar</button>
                <button type="button" onClick={() => setNeedEditar(null)} className="px-5 py-2.5 border border-gray-200 rounded-xl text-gray-600 text-sm hover:bg-gray-50 transition-colors">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirmar eliminar necesidad */}
      {needEliminar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <p className="text-gray-700 mb-6">¿Eliminar la necesidad de <strong>{needEliminar.tipo}</strong>? El mapa ya no la reflejará.</p>
            <div className="flex gap-3">
              <button onClick={() => setNeedEliminar(null)} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm hover:bg-gray-50 transition-colors">Cancelar</button>
              <button onClick={async () => {
                try { await api.delete(`/api/necesidades/${needEliminar.id}`) } catch { /* silencioso */ }
                setNecesidades(prev => prev.filter(x => x.id !== needEliminar.id))
                setNeedEliminar(null)
                flash('Necesidad eliminada')
              }} className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
