import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import ProgressBar from '../components/ui/ProgressBar'
import type { Causa, DonacionExtendida, TopDonador, User, CentroAcopio, EstadoDonacion, TipoDonacion } from '../types'
import {
  mockCausas,
  mockDonaciones,
  mockTopDonadores,
  mockUsers,
  mockCentrosAcopio,
  mockChartData,
} from '../lib/mockData'
import api from '../lib/axios'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'

interface DashboardResponse {
  causas?: Causa[]
  donaciones?: DonacionExtendida[]
  topDonadores?: TopDonador[]
  totalRecaudado?: number
}

type Tab = 'resumen' | 'donaciones' | 'causas' | 'usuarios' | 'centros'

const ESTADO_LABEL: Record<EstadoDonacion, string> = {
  pendiente: 'Pendiente',
  en_proceso: 'En proceso',
  completada: 'Completada',
  cancelada: 'Cancelada',
}
const ESTADO_COLOR: Record<EstadoDonacion, string> = {
  pendiente: 'bg-yellow-100 text-yellow-700',
  en_proceso: 'bg-blue-100 text-blue-700',
  completada: 'bg-green-100 text-green-700',
  cancelada: 'bg-red-100 text-red-700',
}
const TIPO_LABEL: Record<TipoDonacion, string> = {
  monetaria: 'Monetaria',
  ropa: 'Ropa',
  alimento: 'Alimento',
  medica: 'Médica',
}
const PIE_COLORS = ['#F97316', '#3B82F6', '#10B981', '#8B5CF6']

function StatCard({ label, value, color, sub }: { label: string; value: string; color: string; sub?: string }) {
  return (
    <div className={`rounded-2xl p-6 ${color}`}>
      <p className="text-sm font-medium opacity-80 mb-1">{label}</p>
      <p className="text-3xl font-extrabold">{value}</p>
      {sub && <p className="text-xs opacity-70 mt-1">{sub}</p>}
    </div>
  )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

function ConfirmModal({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>
        <p className="text-gray-700 mb-6">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm hover:bg-gray-50 transition-colors">Cancelar</button>
          <button onClick={onConfirm} className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors">Eliminar</button>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const [tab, setTab] = useState<Tab>('resumen')
  const [causas, setCausas] = useState<Causa[]>([])
  const [donaciones, setDonaciones] = useState<DonacionExtendida[]>([])
  const [topDonadores, setTopDonadores] = useState<TopDonador[]>([])
  const [usuarios, setUsuarios] = useState<User[]>(mockUsers)
  const [centros, setCentros] = useState<CentroAcopio[]>(mockCentrosAcopio)
  const [totalRecaudado, setTotalRecaudado] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  // Filtros donaciones
  const [filtroEstado, setFiltroEstado] = useState<string>('todos')
  const [filtroTipo, setFiltroTipo] = useState<string>('todos')
  const [filtroCausa, setFiltroCausa] = useState<string>('todos')
  const [pagina, setPagina] = useState(1)
  const POR_PAGINA = 8

  // Modals donaciones
  const [donacionEditar, setDonacionEditar] = useState<DonacionExtendida | null>(null)
  const [donacionEliminar, setDonacionEliminar] = useState<DonacionExtendida | null>(null)
  const [donacionDetalle, setDonacionDetalle] = useState<DonacionExtendida | null>(null)

  // Modals causas
  const [causaEditar, setCausaEditar] = useState<Causa | null>(null)
  const [causaEliminar, setCausaEliminar] = useState<Causa | null>(null)
  const [showNuevaCausa, setShowNuevaCausa] = useState(false)

  // Modal centros
  const [centroEditar, setCentroEditar] = useState<CentroAcopio | null>(null)
  const [showNuevoCentro, setShowNuevoCentro] = useState(false)

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const { data } = await api.get<DashboardResponse>('/bff/dashboard')
        const loadedCausas = data.causas ?? []
        const loadedDonaciones = (data.donaciones ?? []) as DonacionExtendida[]
        setCausas(loadedCausas)
        setDonaciones(loadedDonaciones)
        setTopDonadores(data.topDonadores ?? [])
        setTotalRecaudado(data.totalRecaudado ?? loadedDonaciones.reduce((s, d) => s + d.monto, 0))
      } catch {
        setCausas(mockCausas)
        setDonaciones(mockDonaciones)
        setTopDonadores(mockTopDonadores)
        setTotalRecaudado(mockDonaciones.reduce((s, d) => s + d.monto, 0))
      } finally {
        setIsLoading(false)
      }
    }
    fetchDashboard()
  }, [])

  const causasActivas = causas.filter((c) => c.activa)
  const totalMetas = causas.reduce((a, c) => a + c.meta, 0)
  const pctGlobal = totalMetas > 0 ? Math.round((totalRecaudado / totalMetas) * 100) : 0
  const totalMesAnterior = mockChartData[mockChartData.length - 2]?.total ?? 0
  const totalMesActual = mockChartData[mockChartData.length - 1]?.total ?? 0
  const crecimiento = totalMesAnterior > 0 ? Math.round(((totalMesActual - totalMesAnterior) / totalMesAnterior) * 100) : 0

  // Pie chart data
  const pieData = [
    { name: 'Monetaria', value: donaciones.filter(d => d.tipo === 'monetaria').length },
    { name: 'Alimento', value: donaciones.filter(d => d.tipo === 'alimento').length },
    { name: 'Ropa', value: donaciones.filter(d => d.tipo === 'ropa').length },
    { name: 'Médica', value: donaciones.filter(d => d.tipo === 'medica').length },
  ].filter(d => d.value > 0)

  // Donaciones filtradas + paginadas
  const donacionesFiltradas = donaciones.filter(d => {
    const matchEstado = filtroEstado === 'todos' || d.estado === filtroEstado
    const matchTipo = filtroTipo === 'todos' || d.tipo === filtroTipo
    const matchCausa = filtroCausa === 'todos' || String(d.causaId) === filtroCausa
    return matchEstado && matchTipo && matchCausa
  })
  const totalPaginas = Math.ceil(donacionesFiltradas.length / POR_PAGINA)
  const donacionesPagina = donacionesFiltradas.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA)

  function handleEditarDonacion(nuevoEstado: EstadoDonacion) {
    if (!donacionEditar) return
    setDonaciones(prev => prev.map(d => d.id === donacionEditar.id ? { ...d, estado: nuevoEstado } : d))
    setDonacionEditar(null)
  }

  function handleEliminarDonacion() {
    if (!donacionEliminar) return
    setDonaciones(prev => prev.filter(d => d.id !== donacionEliminar.id))
    setDonacionEliminar(null)
  }

  function handleToggleCausa(id: number) {
    setCausas(prev => prev.map(c => c.id === id ? { ...c, activa: !c.activa } : c))
  }

  function handleEliminarCausa() {
    if (!causaEliminar) return
    setCausas(prev => prev.filter(c => c.id !== causaEliminar.id))
    setCausaEliminar(null)
  }

  function handleToggleCentro(id: number) {
    setCentros(prev => prev.map(c => c.id === id ? { ...c, activo: !c.activo } : c))
  }

  function handleCambiarRol(id: number) {
    setUsuarios(prev => prev.map(u =>
      u.id === id ? { ...u, rol: u.rol === 'admin' ? 'donador' : 'admin' } : u
    ))
  }

  if (isLoading) {
    return (
      <div className="flex-1 bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <span className="w-8 h-8 border-2 border-gray-200 border-t-orange-500 rounded-full animate-spin" />
          <p className="text-sm">Cargando dashboard...</p>
        </div>
      </div>
    )
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: 'resumen', label: 'Resumen' },
    { id: 'donaciones', label: `Donaciones (${donaciones.length})` },
    { id: 'causas', label: `Causas (${causas.length})` },
    { id: 'usuarios', label: `Usuarios (${usuarios.length})` },
    { id: 'centros', label: `Centros (${centros.length})` },
  ]

  return (
    <div className="flex-1 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900">Dashboard Admin</h1>
          <p className="text-gray-500 mt-1">Bienvenido, <strong>{user?.nombre}</strong> · Última actualización: hoy</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-gray-100 rounded-xl p-1 mb-8 overflow-x-auto">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${
                tab === t.id ? 'bg-orange-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ═══════ TAB: RESUMEN ═══════ */}
        {tab === 'resumen' && (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Total recaudado" value={`$${totalRecaudado.toLocaleString('es-CL')}`} color="bg-orange-500 text-white" sub={`${crecimiento >= 0 ? '+' : ''}${crecimiento}% vs mes ant.`} />
              <StatCard label="Donaciones" value={String(donaciones.length)} color="bg-white border border-gray-100 text-gray-900" />
              <StatCard label="Causas activas" value={String(causasActivas.length)} color="bg-white border border-gray-100 text-gray-900" />
              <StatCard label="% Meta global" value={`${pctGlobal}%`} color="bg-emerald-500 text-white" sub="de todas las causas" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Bar chart */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h2 className="font-bold text-gray-900 mb-4">Recaudación mensual 2025</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={mockChartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickFormatter={(v) => `$${(v/1000000).toFixed(1)}M`} width={50} />
                    <Tooltip formatter={(v: number) => [`$${v.toLocaleString('es-CL')}`, '']} labelStyle={{ fontWeight: 600 }} />
                    <Bar dataKey="monetario" name="Monetario" stackId="a" fill="#F97316" radius={[0,0,0,0]} />
                    <Bar dataKey="especie" name="En especie" stackId="a" fill="#FED7AA" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Pie chart */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h2 className="font-bold text-gray-900 mb-4">Tipos de donación</h2>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                      {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Legend iconSize={10} formatter={(v) => <span className="text-xs text-gray-600">{v}</span>} />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Causas progreso */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="font-bold text-gray-900">Estado de causas</h2>
                  <span className="text-xs text-gray-400">{causas.length} en total</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {causas.map((c) => {
                    const total = donaciones.filter(d => d.causaId === c.id).reduce((a, d) => a + d.monto, 0)
                    const count = donaciones.filter(d => d.causaId === c.id).length
                    return (
                      <div key={c.id} className="px-6 py-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0 pr-4">
                            <p className="font-semibold text-gray-900 text-sm truncate">{c.titulo}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{count} donaciones · {c.categoria}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="font-bold text-orange-500 text-sm">${total.toLocaleString('es-CL')}</p>
                            <span className={`inline-block mt-0.5 text-xs px-2 py-0.5 rounded-full font-medium ${c.activa ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                              {c.activa ? 'Activa' : 'Cerrada'}
                            </span>
                          </div>
                        </div>
                        <ProgressBar value={c.recaudado} max={c.meta} showLabel={false} />
                        <p className="text-xs text-gray-400 mt-1">${c.recaudado.toLocaleString('es-CL')} de ${c.meta.toLocaleString('es-CL')}</p>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Top donadores */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h2 className="font-bold text-gray-900">Top donadores</h2>
                </div>
                <div className="divide-y divide-gray-50">
                  {topDonadores.map((d, i) => (
                    <div key={d.id} className="px-6 py-3 flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${i === 0 ? 'bg-yellow-400 text-yellow-900' : 'bg-gray-100 text-gray-500'}`}>{i + 1}</span>
                      <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-sm flex-shrink-0">{d.nombre[0]}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{d.nombre}</p>
                      </div>
                      <p className="text-sm font-bold text-orange-500 flex-shrink-0">${d.totalDonado.toLocaleString('es-CL')}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════ TAB: DONACIONES ═══════ */}
        {tab === 'donaciones' && (
          <div className="space-y-4">
            {/* Filtros */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex flex-wrap gap-3">
                <select value={filtroEstado} onChange={e => { setFiltroEstado(e.target.value); setPagina(1) }} className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white">
                  <option value="todos">Todos los estados</option>
                  <option value="pendiente">Pendiente</option>
                  <option value="en_proceso">En proceso</option>
                  <option value="completada">Completada</option>
                  <option value="cancelada">Cancelada</option>
                </select>
                <select value={filtroTipo} onChange={e => { setFiltroTipo(e.target.value); setPagina(1) }} className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white">
                  <option value="todos">Todos los tipos</option>
                  <option value="monetaria">Monetaria</option>
                  <option value="ropa">Ropa</option>
                  <option value="alimento">Alimento</option>
                  <option value="medica">Médica</option>
                </select>
                <select value={filtroCausa} onChange={e => { setFiltroCausa(e.target.value); setPagina(1) }} className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white">
                  <option value="todos">Todas las causas</option>
                  {causas.map(c => <option key={c.id} value={String(c.id)}>{c.titulo}</option>)}
                </select>
                <span className="ml-auto text-xs text-gray-400 self-center">{donacionesFiltradas.length} resultados</span>
              </div>
            </div>

            {/* Tabla */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left">
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Donador</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Causa</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Monto</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tipo</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Fecha</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {donacionesPagina.map(d => (
                      <tr key={d.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-900">{d.anonima ? 'Anónimo' : d.donadorNombre}</td>
                        <td className="px-4 py-3 text-gray-600 max-w-[180px] truncate">{d.causaTitulo}</td>
                        <td className="px-4 py-3 font-bold text-orange-500">${d.monto.toLocaleString('es-CL')}</td>
                        <td className="px-4 py-3"><span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{TIPO_LABEL[d.tipo]}</span></td>
                        <td className="px-4 py-3"><span className={`text-xs px-2 py-1 rounded-full font-medium ${ESTADO_COLOR[d.estado]}`}>{ESTADO_LABEL[d.estado]}</span></td>
                        <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{new Date(d.fecha).toLocaleDateString('es-CL')}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <button onClick={() => setDonacionDetalle(d)} className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="Ver detalle">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            </button>
                            <button onClick={() => setDonacionEditar(d)} className="p-1.5 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors" title="Editar estado">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </button>
                            <button onClick={() => setDonacionEliminar(d)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Paginación */}
              {totalPaginas > 1 && (
                <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                  <p className="text-xs text-gray-400">Pág. {pagina} de {totalPaginas}</p>
                  <div className="flex gap-2">
                    <button disabled={pagina === 1} onClick={() => setPagina(p => p - 1)} className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors">Anterior</button>
                    <button disabled={pagina === totalPaginas} onClick={() => setPagina(p => p + 1)} className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors">Siguiente</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════ TAB: CAUSAS ═══════ */}
        {tab === 'causas' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button onClick={() => setShowNuevaCausa(true)} className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Nueva causa
              </button>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left">
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Causa</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Categoría</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Meta</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Avance</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {causas.map(c => {
                      const pct = Math.round((c.recaudado / c.meta) * 100)
                      return (
                        <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900 max-w-[220px] truncate">{c.titulo}</p>
                            <p className="text-xs text-gray-400">{new Date(c.fechaFin).toLocaleDateString('es-CL')}</p>
                          </td>
                          <td className="px-4 py-3"><span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{c.categoria}</span></td>
                          <td className="px-4 py-3 text-gray-600">${c.meta.toLocaleString('es-CL')}</td>
                          <td className="px-4 py-3 min-w-[140px]">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full bg-orange-500 rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
                              </div>
                              <span className="text-xs font-semibold text-gray-600">{pct}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${c.activa ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                              {c.activa ? 'Activa' : 'Cerrada'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              <button onClick={() => setCausaEditar(c)} className="p-1.5 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors" title="Editar">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                              </button>
                              <button onClick={() => handleToggleCausa(c.id)} className="p-1.5 text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors" title={c.activa ? 'Desactivar' : 'Activar'}>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                              </button>
                              <button onClick={() => setCausaEliminar(c)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ═══════ TAB: USUARIOS ═══════ */}
        {tab === 'usuarios' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Usuario</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Rol</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Registro</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Donaciones</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {usuarios.map(u => (
                    <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-sm">{u.nombre[0]}</div>
                          <span className="font-medium text-gray-900">{u.nombre}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${u.rol === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                          {u.rol === 'admin' ? 'Admin' : 'Donante'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400">{u.fechaRegistro ? new Date(u.fechaRegistro).toLocaleDateString('es-CL') : '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{u.totalDonaciones ?? 0}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleCambiarRol(u.id)}
                          className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors"
                        >
                          Cambiar rol
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ═══════ TAB: CENTROS ═══════ */}
        {tab === 'centros' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button onClick={() => setShowNuevoCentro(true)} className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Nuevo centro
              </button>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left">
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Nombre</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Región</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Dirección</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Capacidad</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {centros.map(c => {
                      const pct = Math.round((c.capacidadActual / c.capacidadMax) * 100)
                      return (
                        <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-3 font-medium text-gray-900">{c.nombre}</td>
                          <td className="px-4 py-3"><span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{c.region}</span></td>
                          <td className="px-4 py-3 text-gray-500 max-w-[200px] truncate">{c.direccion}</td>
                          <td className="px-4 py-3 min-w-[130px]">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${pct > 80 ? 'bg-red-400' : pct > 60 ? 'bg-yellow-400' : 'bg-emerald-400'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                              </div>
                              <span className="text-xs text-gray-500">{c.capacidadActual}/{c.capacidadMax}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${c.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                              {c.activo ? 'Activo' : 'Cerrado'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              <button onClick={() => setCentroEditar(c)} className="p-1.5 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                              </button>
                              <button onClick={() => handleToggleCentro(c.id)} className="p-1.5 text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ═══ MODAL: Ver detalle donación ═══ */}
      {donacionDetalle && (
        <Modal title="Detalle de donación" onClose={() => setDonacionDetalle(null)}>
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-xs text-gray-400">Donador</p><p className="font-medium">{donacionDetalle.anonima ? 'Anónimo' : donacionDetalle.donadorNombre}</p></div>
              <div><p className="text-xs text-gray-400">Monto</p><p className="font-bold text-orange-500 text-lg">${donacionDetalle.monto.toLocaleString('es-CL')}</p></div>
              <div><p className="text-xs text-gray-400">Causa</p><p className="font-medium">{donacionDetalle.causaTitulo}</p></div>
              <div><p className="text-xs text-gray-400">Tipo</p><p className="font-medium">{TIPO_LABEL[donacionDetalle.tipo]}</p></div>
              <div><p className="text-xs text-gray-400">Estado</p><span className={`text-xs px-2 py-1 rounded-full font-medium ${ESTADO_COLOR[donacionDetalle.estado]}`}>{ESTADO_LABEL[donacionDetalle.estado]}</span></div>
              <div><p className="text-xs text-gray-400">Fecha</p><p className="font-medium">{new Date(donacionDetalle.fecha).toLocaleDateString('es-CL', { dateStyle: 'long' })}</p></div>
              {donacionDetalle.destino && <div className="col-span-2"><p className="text-xs text-gray-400">Destino</p><p className="font-medium">{donacionDetalle.destino}</p></div>}
              {donacionDetalle.mensaje && <div className="col-span-2"><p className="text-xs text-gray-400">Mensaje</p><p className="italic text-gray-600">"{donacionDetalle.mensaje}"</p></div>}
            </div>
          </div>
        </Modal>
      )}

      {/* ═══ MODAL: Editar estado donación ═══ */}
      {donacionEditar && (
        <Modal title="Editar estado de donación" onClose={() => setDonacionEditar(null)}>
          <p className="text-sm text-gray-500 mb-4">Donación de <strong>{donacionEditar.anonima ? 'Anónimo' : donacionEditar.donadorNombre}</strong> · ${donacionEditar.monto.toLocaleString('es-CL')}</p>
          <div className="grid grid-cols-2 gap-3">
            {(['pendiente', 'en_proceso', 'completada', 'cancelada'] as EstadoDonacion[]).map(estado => (
              <button
                key={estado}
                onClick={() => handleEditarDonacion(estado)}
                className={`py-3 rounded-xl text-sm font-semibold border-2 transition-colors ${
                  donacionEditar.estado === estado
                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                {ESTADO_LABEL[estado]}
              </button>
            ))}
          </div>
        </Modal>
      )}

      {/* ═══ MODAL: Confirmar eliminar donación ═══ */}
      {donacionEliminar && (
        <ConfirmModal
          message={`¿Eliminar la donación de ${donacionEliminar.anonima ? 'Anónimo' : donacionEliminar.donadorNombre} por $${donacionEliminar.monto.toLocaleString('es-CL')}? Esta acción no se puede deshacer.`}
          onConfirm={handleEliminarDonacion}
          onCancel={() => setDonacionEliminar(null)}
        />
      )}

      {/* ═══ MODAL: Editar causa ═══ */}
      {causaEditar && (
        <Modal title="Editar causa" onClose={() => setCausaEditar(null)}>
          <form onSubmit={e => {
            e.preventDefault()
            const fd = new FormData(e.currentTarget)
            setCausas(prev => prev.map(c => c.id === causaEditar.id ? {
              ...c,
              titulo: fd.get('titulo') as string,
              descripcion: fd.get('descripcion') as string,
              meta: Number(fd.get('meta')),
              fechaFin: fd.get('fechaFin') as string,
            } : c))
            setCausaEditar(null)
          }} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Título</label>
              <input name="titulo" defaultValue={causaEditar.titulo} required className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Descripción</label>
              <textarea name="descripcion" defaultValue={causaEditar.descripcion} rows={3} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Meta ($)</label>
                <input type="number" name="meta" defaultValue={causaEditar.meta} required className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Fecha fin</label>
                <input type="date" name="fechaFin" defaultValue={causaEditar.fechaFin} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 rounded-xl text-sm transition-colors">Guardar</button>
              <button type="button" onClick={() => setCausaEditar(null)} className="px-5 py-2.5 border border-gray-200 rounded-xl text-gray-600 text-sm hover:bg-gray-50 transition-colors">Cancelar</button>
            </div>
          </form>
        </Modal>
      )}

      {/* ═══ MODAL: Nueva causa ═══ */}
      {showNuevaCausa && (
        <Modal title="Nueva causa" onClose={() => setShowNuevaCausa(false)}>
          <form onSubmit={e => {
            e.preventDefault()
            const fd = new FormData(e.currentTarget)
            const nueva: Causa = {
              id: Date.now(),
              titulo: fd.get('titulo') as string,
              descripcion: fd.get('descripcion') as string,
              imagen: 'https://images.unsplash.com/photo-1593113616828-6f22bca04804?w=600&auto=format',
              meta: Number(fd.get('meta')),
              recaudado: 0,
              categoria: fd.get('categoria') as string,
              activa: true,
              fechaFin: fd.get('fechaFin') as string,
            }
            setCausas(prev => [...prev, nueva])
            setShowNuevaCausa(false)
          }} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Título</label>
              <input name="titulo" required placeholder="Nombre de la causa..." className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Descripción</label>
              <textarea name="descripcion" rows={3} placeholder="Descripción de la causa..." className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Meta ($)</label>
                <input type="number" name="meta" required placeholder="5000000" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Categoría</label>
                <select name="categoria" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white">
                  <option>Educación</option>
                  <option>Salud</option>
                  <option>Alimentación</option>
                  <option>Animales</option>
                  <option>Vivienda</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Fecha fin</label>
                <input type="date" name="fechaFin" required className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 rounded-xl text-sm transition-colors">Crear causa</button>
              <button type="button" onClick={() => setShowNuevaCausa(false)} className="px-5 py-2.5 border border-gray-200 rounded-xl text-gray-600 text-sm hover:bg-gray-50 transition-colors">Cancelar</button>
            </div>
          </form>
        </Modal>
      )}

      {/* ═══ MODAL: Confirmar eliminar causa ═══ */}
      {causaEliminar && (
        <ConfirmModal
          message={`¿Eliminar la causa "${causaEliminar.titulo}"? Esta acción no se puede deshacer.`}
          onConfirm={handleEliminarCausa}
          onCancel={() => setCausaEliminar(null)}
        />
      )}

      {/* ═══ MODAL: Editar centro ═══ */}
      {centroEditar && (
        <Modal title="Editar centro de acopio" onClose={() => setCentroEditar(null)}>
          <form onSubmit={e => {
            e.preventDefault()
            const fd = new FormData(e.currentTarget)
            setCentros(prev => prev.map(c => c.id === centroEditar.id ? {
              ...c,
              nombre: fd.get('nombre') as string,
              direccion: fd.get('direccion') as string,
              horario: fd.get('horario') as string,
              telefono: fd.get('telefono') as string,
            } : c))
            setCentroEditar(null)
          }} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nombre</label>
              <input name="nombre" defaultValue={centroEditar.nombre} required className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Dirección</label>
              <input name="direccion" defaultValue={centroEditar.direccion} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Horario</label>
              <input name="horario" defaultValue={centroEditar.horario} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Teléfono</label>
              <input name="telefono" defaultValue={centroEditar.telefono} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 rounded-xl text-sm transition-colors">Guardar</button>
              <button type="button" onClick={() => setCentroEditar(null)} className="px-5 py-2.5 border border-gray-200 rounded-xl text-gray-600 text-sm hover:bg-gray-50 transition-colors">Cancelar</button>
            </div>
          </form>
        </Modal>
      )}

      {/* ═══ MODAL: Nuevo centro ═══ */}
      {showNuevoCentro && (
        <Modal title="Nuevo centro de acopio" onClose={() => setShowNuevoCentro(false)}>
          <form onSubmit={e => {
            e.preventDefault()
            const fd = new FormData(e.currentTarget)
            const nuevo: CentroAcopio = {
              id: Date.now(),
              nombre: fd.get('nombre') as string,
              direccion: fd.get('direccion') as string,
              region: fd.get('region') as string,
              ciudad: fd.get('ciudad') as string,
              horario: fd.get('horario') as string,
              telefono: fd.get('telefono') as string,
              queRecibe: ['Ropa de abrigo'],
              capacidadActual: 0,
              capacidadMax: Number(fd.get('capacidadMax')),
              activo: true,
            }
            setCentros(prev => [...prev, nuevo])
            setShowNuevoCentro(false)
          }} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Nombre</label>
                <input name="nombre" required placeholder="Centro Santiago..." className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Región</label>
                <select name="region" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white">
                  <option>Metropolitana</option>
                  <option>Valparaíso</option>
                  <option>Biobío</option>
                  <option>Araucanía</option>
                  <option>Maule</option>
                  <option>Coquimbo</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Ciudad</label>
                <input name="ciudad" required placeholder="Santiago..." className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Dirección</label>
                <input name="direccion" placeholder="Av. Principal 123..." className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Horario</label>
                <input name="horario" placeholder="Lun-Vie 9:00-18:00" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Capacidad máx.</label>
                <input type="number" name="capacidadMax" defaultValue={300} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 rounded-xl text-sm transition-colors">Crear centro</button>
              <button type="button" onClick={() => setShowNuevoCentro(false)} className="px-5 py-2.5 border border-gray-200 rounded-xl text-gray-600 text-sm hover:bg-gray-50 transition-colors">Cancelar</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
