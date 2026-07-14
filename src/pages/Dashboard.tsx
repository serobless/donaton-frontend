import { useEffect, useState } from 'react'
import MapPicker from '../components/ui/MapPicker'
import { useAuth } from '../contexts/AuthContext'
import ProgressBar from '../components/ui/ProgressBar'
import type { Causa, DonacionExtendida, TopDonador, User, CentroAcopio, EstadoDonacion, TipoDonacion } from '../types'
import { mockChartData } from '../lib/mockData'
import api from '../lib/axios'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'

// Shapes reales del BFF /bff/dashboard
interface BffDonacion {
  id: number
  donadorNombre: string | null
  causaNombre: string | null
  monto: number
  fecha: string
  estado: string | null
}

interface BffTopDonador {
  nombre: string
  totalDonado: number
  cantidadDonaciones?: number
}


interface ApiCausa {
  id: number
  titulo: string
  descripcion?: string
  meta: number
  recaudado: number
  activa: boolean
  categoria: string
  imagenUrl?: string
  diasRestantes?: number
  destacada?: boolean
  urgencia?: string
  fechaInicio?: string
  fechaFin?: string
  centro?: { id: number; nombre: string }
  tipo?: string
}

interface BackendUsuario {
  id: number
  nombre: string
  email: string
  rol: string
  fechaRegistro?: string
  centroId?: number
}

interface DashboardResponse {
  totalDonado?: number
  totalDonaciones?: number
  causasActivas?: number
  topDonadores?: BffTopDonador[]
  ultimasDonaciones?: BffDonacion[]
  mensajeError?: string
}


interface BackendDonacion {
  id: number
  monto: number
  fecha: string
  tipoDonacion: 'MONETARIA' | 'ROPA' | 'ALIMENTO' | 'MEDICA'
  donanteAlias: string | null
  causa: { id: number; titulo: string }
  centroAcopio?: { id: number; nombre: string } | null
  estado?: string | null
  descripcion?: string | null
  esEmpresa?: boolean
  nombreEmpresa?: string | null
  requiereAprobacion?: boolean
}

function mapBackendDonacion(b: BackendDonacion): DonacionExtendida {
  return {
    id: b.id,
    donadorNombre: b.nombreEmpresa ?? b.donanteAlias ?? 'Anónimo',
    monto: b.monto,
    causaId: b.causa.id,
    causaTitulo: b.causa.titulo,
    centroNombre: b.centroAcopio?.nombre,
    fecha: b.fecha,
    anonima: b.donanteAlias === null,
    estado: ((b.estado ?? 'pendiente').toLowerCase()) as EstadoDonacion,
    tipo: b.tipoDonacion.toLowerCase() as TipoDonacion,
    descripcion: b.descripcion ?? undefined,
    esEmpresa: b.esEmpresa ?? false,
    nombreEmpresa: b.nombreEmpresa ?? undefined,
    requiereAprobacion: b.requiereAprobacion ?? false,
  }
}

function mapBffTopDonador(b: BffTopDonador, index: number): TopDonador {
  return {
    id: index,
    nombre: b.nombre,
    totalDonado: b.totalDonado,
    cantidadDonaciones: b.cantidadDonaciones ?? 0,
  }
}

function mapApiCausa(c: ApiCausa): Causa {
  return {
    id: c.id,
    titulo: c.titulo,
    descripcion: c.descripcion ?? '',
    imagen: c.imagenUrl ?? '',
    meta: c.meta,
    recaudado: c.recaudado,
    categoria: c.categoria,
    activa: c.activa,
    fechaFin: c.fechaFin ?? '',
    fechaInicio: c.fechaInicio,
    diasRestantes: c.diasRestantes,
    destacada: c.destacada,
    urgencia: c.urgencia,
    centroId: c.centro?.id,
    centroNombre: c.centro?.nombre,
    tipo: c.tipo,
  }
}

function mapBackendUsuario(u: BackendUsuario): User {
  const r = u.rol.toUpperCase()
  const rol: User['rol'] = r === 'ADMIN' ? 'admin' : r === 'EMPRESA' ? 'empresa' : r === 'CENTRO_ADMIN' ? 'centro_admin' : 'donador'
  return { id: u.id, nombre: u.nombre, email: u.email, rol, fechaRegistro: u.fechaRegistro, centroId: u.centroId }
}

interface TestimonioPendiente {
  id: number
  titulo: string
  autorNombre: string
  fechaCreacion: string
}

function formatDate(fecha: unknown): string {
  if (!fecha) return '—'
  if (Array.isArray(fecha)) {
    const [year, month, day] = fecha as number[]
    const d = new Date(year, month - 1, day)
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-CL')
  }
  const d = new Date(fecha as string)
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-CL')
}

type Tab = 'resumen' | 'donaciones' | 'causas' | 'usuarios' | 'centros' | 'testimonios' | 'mi-centro'

const NECESIDAD_EMOJI: Record<string, string> = {
  Frazadas: '🧣', Ropa: '👕', Alimentos: '🥫', Medicamentos: '💊',
}
const NECESIDAD_TIPOS = ['Frazadas', 'Ropa', 'Alimentos', 'Medicamentos']

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
  const { user, token } = useAuth()
  const [tab, setTab] = useState<Tab>(() => user?.rol === 'centro_admin' ? 'mi-centro' : 'resumen')
  const [causas, setCausas] = useState<Causa[]>([])
  const [donaciones, setDonaciones] = useState<DonacionExtendida[]>([])
  const [topDonadores, setTopDonadores] = useState<TopDonador[]>([])
  const [usuarios, setUsuarios] = useState<User[]>([])
  const [centros, setCentros] = useState<CentroAcopio[]>([])
  const [totalRecaudado, setTotalRecaudado] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [testimoniosPendientes, setTestimoniosPendientes] = useState<TestimonioPendiente[]>([])
  const [cambiandoRolId, setCambiandoRolId] = useState<number | null>(null)

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

  // Mi Centro — necesidades
  const [miCentroNeeds, setMiCentroNeeds] = useState<import('../types').Necesidad[]>([])
  const [needEditar, setNeedEditar] = useState<import('../types').Necesidad | null>(null)
  const [needEliminar, setNeedEliminar] = useState<import('../types').Necesidad | null>(null)
  const [showNuevaNeed, setShowNuevaNeed] = useState(false)

  // Modal centros
  const [centroEditar, setCentroEditar] = useState<CentroAcopio | null>(null)
  const [centroEditarError, setCentroEditarError] = useState('')
  const [showNuevoCentro, setShowNuevoCentro] = useState(false)
  const [nuevoCentroError, setNuevoCentroError] = useState('')
  const [nuevoCentroLat, setNuevoCentroLat] = useState('')
  const [nuevoCentroLng, setNuevoCentroLng] = useState('')
  const [nuevoCentroDireccion, setNuevoCentroDireccion] = useState('')
  const [nuevoCiudadSeleccionada, setNuevoCiudadSeleccionada] = useState('')
  const [nuevoCentroRegion, setNuevoCentroRegion] = useState('')
  const [geoMensaje, setGeoMensaje] = useState('')
  const [guardandoCentro, setGuardandoCentro] = useState(false)
  const [mostrarMapaPicker, setMostrarMapaPicker] = useState(false)
  const [horarioDias, setHorarioDias] = useState('Lun-Vie')
  const [horarioAbre, setHorarioAbre] = useState('09:00')
  const [horarioCierra, setHorarioCierra] = useState('18:00')

  useEffect(() => {
    if (!token) {
      setIsLoading(false)
      return
    }
    async function fetchDashboard() {
      let donacionesRaw: BackendDonacion[] = []

      // Causas reales — nunca caen a mock
      try {
        const { data: causasRaw } = await api.get<ApiCausa[]>('/api/causas')
        setCausas(causasRaw.map(mapApiCausa))
      } catch { /* lista vacía */ }

      // Donaciones reales
      try {
        const { data } = await api.get<BackendDonacion[]>('/api/donaciones')
        donacionesRaw = data
        setDonaciones(data.map(mapBackendDonacion))
      } catch { /* lista vacía */ }

      // BFF es opcional — si falla calculamos desde datos reales
      try {
        const { data } = await api.get<DashboardResponse>('/bff/dashboard')
        setTopDonadores((data.topDonadores ?? []).map(mapBffTopDonador))
        setTotalRecaudado(data.totalDonado ?? 0)
      } catch {
        const totalLocal = donacionesRaw
          .filter(d => d.tipoDonacion === 'MONETARIA')
          .reduce((s, d) => s + (d.monto ?? 0), 0)
        setTotalRecaudado(totalLocal)
      }

      setIsLoading(false)
    }
    fetchDashboard()
  }, [token])

  useEffect(() => {
    if (!token) return
    // Cargas independientes: si una falla, la otra no se ve afectada
    api.get<BackendUsuario[]>('/admin/usuarios')
      .then(({ data }) => setUsuarios(data.map(mapBackendUsuario)))
      .catch(() => { /* usuarios no disponibles */ })
    api.get<CentroAcopio[]>('/api/centros')
      .then(({ data }) => setCentros(data))
      .catch(() => { /* centros no disponibles */ })
    api.get<TestimonioPendiente[]>('/api/testimonios/pendientes')
      .then(({ data }) => setTestimoniosPendientes(data))
      .catch(() => { /* no disponibles o no es admin */ })
  }, [token])

  useEffect(() => {
    if (!token || !user?.centroId) return
    api.get<import('../types').Necesidad[]>(`/api/centros/${user.centroId}/necesidades`)
      .then(({ data }) => setMiCentroNeeds(data))
      .catch(() => {})
  }, [token, user?.centroId])

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

  async function handleEditarDonacion(nuevoEstado: EstadoDonacion) {
    if (!donacionEditar) return
    try {
      await api.patch(`/api/donaciones/${donacionEditar.id}/estado`, { estado: nuevoEstado.toUpperCase() })
      setDonaciones(prev => prev.map(d => d.id === donacionEditar!.id ? { ...d, estado: nuevoEstado } : d))
    } catch {
      alert('No se pudo actualizar el estado.')
    }
    setDonacionEditar(null)
  }

  async function handleEliminarDonacion() {
    if (!donacionEliminar) return
    try {
      await api.delete(`/api/donaciones/${donacionEliminar.id}`)
    } catch {
      // Si el backend falla, igual reflejamos en UI para no bloquear al admin
    }
    setDonaciones(prev => prev.filter(d => d.id !== donacionEliminar.id))
    setDonacionEliminar(null)
  }

  async function handleToggleCausa(id: number) {
    try {
      const { data } = await api.patch<ApiCausa>(`/api/causas/${id}/toggle`, {})
      setCausas(prev => prev.map(c => c.id === id ? mapApiCausa(data) : c))
    } catch {
      alert('No se pudo cambiar el estado de la causa.')
    }
  }

  async function handleToggleDestacada(id: number) {
    try {
      const { data } = await api.patch<ApiCausa>(`/api/causas/${id}/destacar`, {})
      setCausas(prev => prev.map(c => {
        if (c.id === id) return { ...c, destacada: data.destacada }
        // Si se activó esta, desactivar las demás en el estado local
        // (solo 1 puede aparecer en el banner de inicio a la vez)
        if (data.destacada) return { ...c, destacada: false }
        return c
      }))
    } catch {
      alert('No se pudo actualizar la causa.')
    }
  }

  async function handleEliminarCausa() {
    if (!causaEliminar) return
    try {
      await api.delete(`/api/causas/${causaEliminar.id}`)
    } catch {
      // eliminar igual en UI
    }
    setCausas(prev => prev.filter(c => c.id !== causaEliminar.id))
    setCausaEliminar(null)
  }



  async function handleEliminarCentro(id: number) {
    try {
      await api.delete(`/api/centros/${id}`)
    } catch {
      // eliminar igual en UI
    }
    setCentros(prev => prev.filter(c => c.id !== id))
  }

  async function handleAprobarDonacion(id: number) {
    try {
      await api.patch(`/api/donaciones/${id}/aprobar`, {})
      setDonaciones(prev => prev.map(d =>
        d.id === id ? { ...d, requiereAprobacion: false } as typeof d : d
      ))
      // Refrescar causas para mostrar el recaudado actualizado
      const { data: causasRaw } = await api.get<ApiCausa[]>('/api/causas')
      setCausas(causasRaw.map(mapApiCausa))
    } catch {
      alert('Error al aprobar la donación.')
    }
  }

  async function handleAprobarTestimonio(id: number) {
    try {
      await api.put(`/api/testimonios/${id}/aprobar`, {})
      setTestimoniosPendientes(prev => prev.filter(t => t.id !== id))
    } catch {
      alert('Error al aprobar el testimonio.')
    }
  }

  async function uploadImagen(file: File): Promise<string | null> {
    const fd = new FormData()
    fd.append('file', file)
    try {
      const { data } = await api.post<{ url: string }>('/api/imagenes/upload', fd, {
        headers: { 'Content-Type': undefined },
      })
      return data.url
    } catch {
      return null
    }
  }

  async function handleAsignarCentro(id: number, centroId: number | null) {
    try {
      await api.patch(`/admin/usuarios/${id}/centro`, { centroId })
      setUsuarios(prev => prev.map(u => u.id === id ? { ...u, centroId: centroId ?? undefined } : u))
    } catch {
      alert('Error al asignar el centro.')
    }
  }

  async function handleCambiarRol(id: number, nuevoRolBackend: string) {
    setCambiandoRolId(id)
    try {
      await api.patch(`/admin/usuarios/${id}/rol`, { rol: nuevoRolBackend })
      const rolFrontend: User['rol'] =
        nuevoRolBackend === 'ADMIN'        ? 'admin' :
        nuevoRolBackend === 'EMPRESA'      ? 'empresa' :
        nuevoRolBackend === 'CENTRO_ADMIN' ? 'centro_admin' : 'donador'
      setUsuarios(prev => prev.map(u => u.id === id ? { ...u, rol: rolFrontend } : u))
    } catch {
      alert('Error al cambiar el rol.')
    } finally {
      setCambiandoRolId(null)
    }
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

  const isCentroAdmin = user?.rol === 'centro_admin'
  const TABS: { id: Tab; label: string; badge?: number }[] = [
    ...(!isCentroAdmin ? [
      { id: 'resumen' as Tab, label: 'Resumen' },
      { id: 'donaciones' as Tab, label: `Donaciones (${donaciones.length})` },
      { id: 'causas' as Tab, label: `Causas (${causas.length})` },
      { id: 'usuarios' as Tab, label: `Usuarios (${usuarios.length})` },
      { id: 'centros' as Tab, label: `Centros (${centros.length})` },
      { id: 'testimonios' as Tab, label: 'Testimonios', badge: testimoniosPendientes.length },
    ] : []),
    ...(user?.centroId ? [
      { id: 'mi-centro' as Tab, label: '🏪 Mi Centro', badge: miCentroNeeds.filter(n => n.urgente).length || undefined },
    ] : []),
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
              className={`relative px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${
                tab === t.id ? 'bg-orange-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              {t.label}
              {t.badge != null && t.badge > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {t.badge}
                </span>
              )}
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
                    <Tooltip formatter={(v) => [`$${Number(v).toLocaleString('es-CL')}`, '']} labelStyle={{ fontWeight: 600 }} />
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
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Centro</th>
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
                        <td className="px-4 py-3">
                          <span className="font-medium text-gray-900">{d.anonima ? 'Anónimo' : d.donadorNombre}</span>
                          {d.esEmpresa && <span className="ml-1.5 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">🏢 Empresa</span>}
                          {d.requiereAprobacion && <span className="ml-1 text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded font-medium">⏳ Aprobación</span>}
                        </td>
                        <td className="px-4 py-3 max-w-[180px]">
                          <p className="text-gray-600 truncate">{d.causaTitulo}</p>
                          {d.descripcion && <p className="text-xs text-gray-400 truncate mt-0.5">{d.descripcion}</p>}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 max-w-[140px]">
                          {d.centroNombre
                            ? <span className="flex items-center gap-1"><span className="text-orange-400">📍</span><span className="truncate">{d.centroNombre}</span></span>
                            : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3 font-bold text-orange-500">${d.monto.toLocaleString('es-CL')}</td>
                        <td className="px-4 py-3"><span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{TIPO_LABEL[d.tipo]}</span></td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${ESTADO_COLOR[d.estado]}`}>{ESTADO_LABEL[d.estado]}</span>
                          {(d as DonacionExtendida & { requiereAprobacion?: boolean }).requiereAprobacion && (
                            <span className="ml-1 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">Requiere aprobación</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{formatDate(d.fecha)}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1 items-center">
                            {(d as DonacionExtendida & { requiereAprobacion?: boolean }).requiereAprobacion && (
                              <button
                                onClick={() => handleAprobarDonacion(d.id)}
                                className="px-2 py-1 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors"
                                title="Aprobar donación empresarial"
                              >
                                Aprobar
                              </button>
                            )}
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
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Centro</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tipo</th>
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
                            <p className="text-xs text-gray-400">{formatDate(c.fechaFin)}</p>
                          </td>
                          <td className="px-4 py-3">
                            {c.centroNombre
                              ? <span className="text-xs text-orange-700 bg-orange-50 border border-orange-100 px-2 py-0.5 rounded-full">📍 {c.centroNombre}</span>
                              : <span className="text-xs text-gray-300">—</span>}
                          </td>
                          <td className="px-4 py-3">
                            {c.tipo
                              ? <span className="text-xs bg-orange-50 text-orange-700 border border-orange-100 px-2 py-1 rounded-full">{c.tipo}</span>
                              : <span className="text-xs text-gray-300">—</span>}
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
                              <button onClick={() => handleToggleDestacada(c.id)} className={`p-1.5 rounded-lg transition-colors ${c.destacada ? 'text-yellow-500 bg-yellow-50' : 'text-gray-300 hover:text-yellow-400 hover:bg-yellow-50'}`} title={c.destacada ? 'Quitar urgente' : 'Marcar como urgente'}>
                                ⭐
                              </button>
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
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Centro asignado</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Registro</th>
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
                        <div className="relative inline-block">
                          <select
                            value={u.rol === 'admin' ? 'ADMIN' : u.rol === 'empresa' ? 'EMPRESA' : u.rol === 'centro_admin' ? 'CENTRO_ADMIN' : 'DONANTE'}
                            onChange={e => handleCambiarRol(u.id, e.target.value)}
                            disabled={cambiandoRolId === u.id}
                            className={`text-xs font-medium pl-2.5 pr-6 py-1 rounded-full appearance-none cursor-pointer border-0 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-orange-400 transition-colors disabled:opacity-50 disabled:cursor-wait ${
                              u.rol === 'admin'        ? 'bg-purple-100 text-purple-700 hover:bg-purple-200' :
                              u.rol === 'empresa'      ? 'bg-blue-100   text-blue-700   hover:bg-blue-200'   :
                              u.rol === 'centro_admin' ? 'bg-teal-100   text-teal-700   hover:bg-teal-200'   :
                                                         'bg-gray-100   text-gray-600   hover:bg-gray-200'
                            }`}
                          >
                            <option value="DONANTE">Donante</option>
                            <option value="EMPRESA">Empresa</option>
                            <option value="CENTRO_ADMIN">Encargado de Centro</option>
                            <option value="ADMIN">Admin</option>
                          </select>
                          <svg
                            className={`pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 ${
                              u.rol === 'admin' ? 'text-purple-500' : u.rol === 'empresa' ? 'text-blue-500' : 'text-gray-400'
                            }`}
                            fill="none" stroke="currentColor" viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {u.rol === 'centro_admin' ? (
                          <select
                            value={u.centroId ?? ''}
                            onChange={e => handleAsignarCentro(u.id, e.target.value ? Number(e.target.value) : null)}
                            className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white max-w-[200px]"
                          >
                            <option value="">— Sin asignar —</option>
                            {centros.map(c => (
                              <option key={c.id} value={c.id}>{c.nombre}</option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-400">{u.fechaRegistro ? new Date(u.fechaRegistro).toLocaleDateString('es-CL') : '—'}</td>
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
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Donaciones</th>
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
                          <td className="px-4 py-3 min-w-[150px]">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${pct > 100 ? 'bg-red-500' : pct > 80 ? 'bg-red-400' : pct > 60 ? 'bg-yellow-400' : 'bg-emerald-400'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                              </div>
                              <span className={`text-xs ${pct > 100 ? 'text-red-500 font-semibold' : 'text-gray-500'}`}>
                                {c.capacidadActual}/{c.capacidadMax}{c.unidadCapacidad ? ` ${c.unidadCapacidad}` : ''}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {(() => {
                              const count = donaciones.filter(d => d.centroNombre === c.nombre).length
                              return count > 0
                                ? <span className="text-xs font-semibold text-orange-600 bg-orange-50 px-2 py-1 rounded-full">{count}</span>
                                : <span className="text-xs text-gray-300">—</span>
                            })()}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${c.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                              {c.activo ? 'Activo' : 'Cerrado'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              <button onClick={() => setCentroEditar(c)} className="p-1.5 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors" title="Editar">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                              </button>
                              <button onClick={() => handleEliminarCentro(c.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar">
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
        {/* ═══════ TAB: MI CENTRO ═══════ */}
        {tab === 'mi-centro' && user?.centroId && (() => {
          const miCentro = centros.find(c => c.id === user.centroId)

          async function toggleUrgente(n: import('../types').Necesidad) {
            try {
              const { data } = await api.put<import('../types').Necesidad>(`/api/necesidades/${n.id}`, {
                tipo: n.tipo, descripcion: n.descripcion,
                metaUnidades: n.metaUnidades, unidadesActuales: n.unidadesActuales,
                urgente: !n.urgente, diasRestantes: n.diasRestantes,
              })
              setMiCentroNeeds(prev => prev.map(x => x.id === n.id ? data : x))
            } catch { /* silencioso */ }
          }

          async function actualizarUnidades(n: import('../types').Necesidad, val: number) {
            if (val === n.unidadesActuales) return
            try {
              const { data } = await api.put<import('../types').Necesidad>(`/api/necesidades/${n.id}`, {
                tipo: n.tipo, descripcion: n.descripcion,
                metaUnidades: n.metaUnidades, unidadesActuales: val,
                urgente: n.urgente, diasRestantes: n.diasRestantes,
              })
              setMiCentroNeeds(prev => prev.map(x => x.id === n.id ? data : x))
            } catch { /* silencioso */ }
          }

          return (
            <div className="space-y-6">
              {/* Header del centro */}
              {miCentro ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-5">
                    <h2 className="text-xl font-extrabold text-white">{miCentro.nombre}</h2>
                    <p className="text-white/80 text-sm mt-1">
                      {miCentro.direccion && `${miCentro.direccion} · `}{miCentro.ciudad}, {miCentro.region}
                    </p>
                  </div>
                  <div className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-4 items-center">
                    <div className="text-center">
                      <p className="text-3xl font-extrabold text-gray-900">{miCentroNeeds.length}</p>
                      <p className="text-xs text-gray-400 mt-1">Tipos de necesidad</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-extrabold text-red-600">{miCentroNeeds.filter(n => n.urgente).length}</p>
                      <p className="text-xs text-gray-400 mt-1">Urgentes ahora</p>
                    </div>
                    {miCentro.capacidadMax > 0 && (
                      <div className="col-span-2">
                        <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                          <span>Capacidad del centro</span>
                          <span className={`font-semibold ${miCentro.capacidadActual > miCentro.capacidadMax ? 'text-red-500' : 'text-gray-700'}`}>
                            {miCentro.capacidadActual}/{miCentro.capacidadMax} {miCentro.unidadCapacidad ?? 'unidades'}
                          </span>
                        </div>
                        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${
                            miCentro.capacidadActual > miCentro.capacidadMax ? 'bg-red-400'
                            : miCentro.capacidadActual / miCentro.capacidadMax > 0.8 ? 'bg-amber-400'
                            : 'bg-green-400'
                          }`} style={{ width: `${Math.min(Math.round((miCentro.capacidadActual / miCentro.capacidadMax) * 100), 100)}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm text-amber-700">
                  No se encontró la información de tu centro. Contacta al administrador.
                </div>
              )}

              {/* Gestión de necesidades */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-start justify-between gap-4 mb-6">
                  <div>
                    <h3 className="font-extrabold text-gray-900 text-lg">Necesidades del centro</h3>
                    <p className="text-sm text-gray-400 mt-0.5">
                      Activa el modo urgente → el pin del mapa se vuelve 🔴 rojo para los donadores
                    </p>
                  </div>
                  <button
                    onClick={() => setShowNuevaNeed(true)}
                    className="shrink-0 flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm px-4 py-2.5 rounded-xl transition-colors"
                  >
                    + Agregar
                  </button>
                </div>

                {miCentroNeeds.length === 0 ? (
                  <div className="text-center py-14">
                    <div className="text-5xl mb-3">📋</div>
                    <p className="font-bold text-gray-700 text-lg">No hay necesidades registradas</p>
                    <p className="text-sm text-gray-400 mt-1 mb-5">Agrega los tipos de donaciones que tu centro necesita ahora</p>
                    <button
                      onClick={() => setShowNuevaNeed(true)}
                      className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm rounded-xl transition-colors"
                    >
                      + Agregar primera necesidad
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {miCentroNeeds.map(n => {
                      const pct = n.metaUnidades ? Math.min(Math.round((n.unidadesActuales / n.metaUnidades) * 100), 100) : 0
                      return (
                        <div key={n.id} className={`rounded-2xl border-2 p-5 transition-all ${
                          n.urgente ? 'border-red-300 bg-red-50' : 'border-gray-100 bg-gray-50'
                        }`}>
                          {/* Cabecera: tipo + botón urgente */}
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex items-center gap-2">
                              <span className="text-2xl">{NECESIDAD_EMOJI[n.tipo] ?? '📦'}</span>
                              <h4 className="font-extrabold text-gray-900 text-base">{n.tipo}</h4>
                            </div>
                            <button
                              onClick={() => toggleUrgente(n)}
                              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold border-2 transition-all ${
                                n.urgente
                                  ? 'bg-red-600 text-white border-red-600 shadow-sm'
                                  : 'bg-white text-gray-400 border-gray-200 hover:border-red-300 hover:text-red-500'
                              }`}
                            >
                              🚨 {n.urgente ? 'URGENTE' : 'Normal'}
                            </button>
                          </div>

                          {n.descripcion && (
                            <p className="text-sm text-gray-500 mb-3">{n.descripcion}</p>
                          )}

                          {/* Barra progreso */}
                          <div className="mb-3">
                            <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                              <span>{n.unidadesActuales} recibidas</span>
                              <span className="font-semibold">{pct}% de {n.metaUnidades ?? '?'}</span>
                            </div>
                            <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${pct >= 80 ? 'bg-green-500' : pct >= 40 ? 'bg-orange-400' : 'bg-red-500'}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>

                          {/* Actualizar unidades + acciones */}
                          <div className="flex gap-2 items-center">
                            <input
                              type="number"
                              key={`units-${n.id}-${n.unidadesActuales}`}
                              defaultValue={n.unidadesActuales}
                              min={0}
                              className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
                              placeholder="Unidades recibidas"
                              onBlur={e => actualizarUnidades(n, Number(e.target.value))}
                            />
                            <button
                              onClick={() => setNeedEditar(n)}
                              className="p-2 border border-gray-200 rounded-lg text-gray-500 hover:text-orange-500 hover:border-orange-300 hover:bg-orange-50 transition-colors"
                              title="Editar"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => setNeedEliminar(n)}
                              className="p-2 border border-red-100 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              title="Eliminar"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )
        })()}

        {/* ═══════ TAB: TESTIMONIOS ═══════ */}
        {tab === 'testimonios' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-bold text-gray-900">Testimonios pendientes de aprobación</h2>
                <span className="text-xs text-gray-400">{testimoniosPendientes.length} pendientes</span>
              </div>
              {testimoniosPendientes.length === 0 ? (
                <div className="py-16 text-center text-gray-400 text-sm">
                  No hay testimonios pendientes de aprobación.
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {testimoniosPendientes.map(t => (
                    <div key={t.id} className="px-6 py-4 flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm truncate">{t.titulo}</p>
                        <p className="text-xs text-gray-400 mt-0.5">Por {t.autorNombre} · {formatDate(t.fechaCreacion)}</p>
                      </div>
                      <button
                        onClick={() => handleAprobarTestimonio(t.id)}
                        className="flex-shrink-0 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors"
                      >
                        Aprobar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ═══ MODAL: Nueva necesidad ═══ */}
      {showNuevaNeed && user?.centroId && (
        <Modal title="Agregar necesidad" onClose={() => setShowNuevaNeed(false)}>
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
              const { data } = await api.post<import('../types').Necesidad>(
                `/api/centros/${user.centroId}/necesidades`, body
              )
              setMiCentroNeeds(prev => [...prev, data])
              setShowNuevaNeed(false)
            } catch { alert('Error al crear la necesidad.') }
          }} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de necesidad</label>
              <select name="tipo" required className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white">
                {NECESIDAD_TIPOS.map(t => <option key={t} value={t}>{NECESIDAD_EMOJI[t]} {t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Descripción <span className="font-normal text-gray-400">(opcional)</span></label>
              <textarea name="descripcion" rows={2} placeholder="Ej: Frazadas dobles para adultos..." className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none" />
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
            <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-100 rounded-xl">
              <input type="checkbox" name="urgente" id="urgente-new" className="w-4 h-4 accent-red-500" />
              <label htmlFor="urgente-new" className="text-sm font-semibold text-red-700 cursor-pointer">
                🚨 Marcar como URGENTE (pin rojo en el mapa)
              </label>
            </div>
            <div className="flex gap-3 pt-1">
              <button type="submit" className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 rounded-xl text-sm transition-colors">Agregar</button>
              <button type="button" onClick={() => setShowNuevaNeed(false)} className="px-5 py-2.5 border border-gray-200 rounded-xl text-gray-600 text-sm hover:bg-gray-50 transition-colors">Cancelar</button>
            </div>
          </form>
        </Modal>
      )}

      {/* ═══ MODAL: Editar necesidad ═══ */}
      {needEditar && (
        <Modal title="Editar necesidad" onClose={() => setNeedEditar(null)}>
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
              const { data } = await api.put<import('../types').Necesidad>(`/api/necesidades/${needEditar.id}`, body)
              setMiCentroNeeds(prev => prev.map(x => x.id === needEditar.id ? data : x))
              setNeedEditar(null)
            } catch { alert('Error al actualizar la necesidad.') }
          }} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de necesidad</label>
              <select name="tipo" defaultValue={needEditar.tipo} required className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white">
                {NECESIDAD_TIPOS.map(t => <option key={t} value={t}>{NECESIDAD_EMOJI[t]} {t}</option>)}
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
              <input type="checkbox" name="urgente" id="urgente-edit" defaultChecked={needEditar.urgente} className="w-4 h-4 accent-red-500" />
              <label htmlFor="urgente-edit" className="text-sm font-semibold text-red-700 cursor-pointer">
                🚨 URGENTE (pin rojo en el mapa)
              </label>
            </div>
            <div className="flex gap-3 pt-1">
              <button type="submit" className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 rounded-xl text-sm transition-colors">Guardar</button>
              <button type="button" onClick={() => setNeedEditar(null)} className="px-5 py-2.5 border border-gray-200 rounded-xl text-gray-600 text-sm hover:bg-gray-50 transition-colors">Cancelar</button>
            </div>
          </form>
        </Modal>
      )}

      {/* ═══ MODAL: Confirmar eliminar necesidad ═══ */}
      {needEliminar && (
        <ConfirmModal
          message={`¿Eliminar la necesidad de ${needEliminar.tipo}? El mapa ya no la reflejará.`}
          onConfirm={async () => {
            try {
              await api.delete(`/api/necesidades/${needEliminar.id}`)
            } catch { /* silencioso */ }
            setMiCentroNeeds(prev => prev.filter(x => x.id !== needEliminar.id))
            setNeedEliminar(null)
          }}
          onCancel={() => setNeedEliminar(null)}
        />
      )}

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
              <div><p className="text-xs text-gray-400">Fecha</p><p className="font-medium">{formatDate(donacionDetalle.fecha)}</p></div>
              {donacionDetalle.centroNombre && <div className="col-span-2"><p className="text-xs text-gray-400">Centro de acopio</p><p className="font-medium text-orange-600">📍 {donacionDetalle.centroNombre}</p></div>}
              {donacionDetalle.destino && <div className="col-span-2"><p className="text-xs text-gray-400">Destino</p><p className="font-medium">{donacionDetalle.destino}</p></div>}
              {donacionDetalle.mensaje && <div className="col-span-2"><p className="text-xs text-gray-400">Mensaje</p><p className="italic text-gray-600">"{donacionDetalle.mensaje}"</p></div>}
              {donacionDetalle.descripcion && <div className="col-span-2"><p className="text-xs text-gray-400">Detalle</p><p className="text-gray-700">{donacionDetalle.descripcion}</p></div>}
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
          <form onSubmit={async e => {
            e.preventDefault()
            const fd = new FormData(e.currentTarget)
            const fileInput = (e.currentTarget.querySelector('input[type="file"]') as HTMLInputElement)
            const file = fileInput?.files?.[0] ?? null
            const nuevaImagenUrl = file ? (await uploadImagen(file)) : null
            const today      = new Date().toISOString().split('T')[0]
            const fechaInicio = fd.get('fechaInicio') as string || undefined
            const fechaFin    = fd.get('fechaFin')    as string || undefined
            if (fechaFin && fechaFin < today) {
              alert('La fecha de fin debe ser hoy o una fecha futura.')
              return
            }
            if (fechaInicio && fechaFin && fechaFin < fechaInicio) {
              alert('La fecha de fin no puede ser anterior a la fecha de inicio.')
              return
            }
            const centroIdEditRaw = fd.get('centroId') as string
            const tipoEdit = fd.get('tipo') as string
            const body = {
              titulo: fd.get('titulo') as string,
              descripcion: fd.get('descripcion') as string,
              meta: Number(fd.get('meta')),
              categoria: causaEditar.categoria,
              tipo: tipoEdit || undefined,
              fechaInicio,
              fechaFin,
              centroId: centroIdEditRaw ? Number(centroIdEditRaw) : undefined,
              imagenUrl: nuevaImagenUrl ?? (causaEditar.imagen || undefined),
            }
            try {
              const { data } = await api.put<ApiCausa>(`/api/causas/${causaEditar.id}`, body)
              setCausas(prev => prev.map(c => c.id === causaEditar.id ? mapApiCausa(data) : c))
            } catch {
              setCausas(prev => prev.map(c => c.id === causaEditar.id ? { ...c, ...body } : c))
            }
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
                <label className="block text-xs font-medium text-gray-600 mb-1">Fecha inicio</label>
                <input type="date" name="fechaInicio" defaultValue={causaEditar.fechaInicio ?? ''} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Fecha fin</label>
                <input type="date" name="fechaFin" defaultValue={causaEditar.fechaFin ?? ''} min={new Date().toISOString().split('T')[0]} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Centro de acopio vinculado <span className="font-normal text-gray-400">(opcional)</span>
              </label>
              <select name="centroId" defaultValue={causaEditar.centroId ?? ''} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white">
                <option value="">Sin centro específico</option>
                {centros.filter(c => c.activo).map(c => (
                  <option key={c.id} value={c.id}>{c.nombre} — {c.ciudad}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Tipo de necesidad <span className="font-normal text-gray-400">(aparece en el filtro del mapa)</span>
              </label>
              <select name="tipo" defaultValue={causaEditar.tipo ?? ''} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white">
                <option value="">Sin tipo específico</option>
                <option value="Frazadas">🧣 Frazadas</option>
                <option value="Ropa">👕 Ropa</option>
                <option value="Alimentos">🥫 Alimentos</option>
                <option value="Medicamentos">💊 Medicamentos</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Nueva imagen <span className="font-normal text-gray-400">(opcional — reemplaza la actual)</span>
              </label>
              {causaEditar.imagen && (
                <p className="text-xs text-gray-400 mb-1 truncate">Actual: {causaEditar.imagen}</p>
              )}
              <input type="file" accept="image/*" className="w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-orange-50 file:text-orange-600 hover:file:bg-orange-100" />
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
          <form onSubmit={async e => {
            e.preventDefault()
            const fd = new FormData(e.currentTarget)
            const fileInput = (e.currentTarget.querySelector('input[type="file"]') as HTMLInputElement)
            const file = fileInput?.files?.[0] ?? null
            const imagenUrl = file ? (await uploadImagen(file)) : null
            const today       = new Date().toISOString().split('T')[0]
            const fechaInicio = fd.get('fechaInicio') as string || undefined
            const fechaFin    = fd.get('fechaFin')    as string || undefined
            if (fechaInicio && fechaInicio < today) {
              alert('La fecha de inicio debe ser hoy o una fecha futura.')
              return
            }
            if (fechaFin && fechaFin < today) {
              alert('La fecha de fin debe ser hoy o una fecha futura.')
              return
            }
            if (fechaInicio && fechaFin && fechaFin < fechaInicio) {
              alert('La fecha de fin no puede ser anterior a la fecha de inicio.')
              return
            }
            const centroIdRaw = fd.get('centroId') as string
            const tipoRaw = fd.get('tipo') as string
            const body = {
              titulo: fd.get('titulo') as string,
              descripcion: fd.get('descripcion') as string,
              meta: Number(fd.get('meta')),
              categoria: fd.get('categoria') as string,
              tipo: tipoRaw || undefined,
              fechaInicio,
              fechaFin,
              ...(centroIdRaw ? { centroId: Number(centroIdRaw) } : {}),
              ...(imagenUrl && { imagenUrl }),
            }
            try {
              const { data } = await api.post<ApiCausa>('/api/causas', body)
              setCausas(prev => [...prev, mapApiCausa(data)])
            } catch {
              alert('Error al crear la causa. Verifica que ms-donaciones esté activo.')
            }
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
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Fecha inicio</label>
                <input type="date" name="fechaInicio" required min={new Date().toISOString().split('T')[0]} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Fecha fin</label>
                <input type="date" name="fechaFin" min={new Date().toISOString().split('T')[0]} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Centro de acopio vinculado <span className="font-normal text-gray-400">(opcional — el pin en el mapa reflejará urgencia)</span>
                </label>
                <select name="centroId" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white">
                  <option value="">Sin centro específico</option>
                  {centros.filter(c => c.activo).map(c => (
                    <option key={c.id} value={c.id}>{c.nombre} — {c.ciudad}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Tipo de necesidad <span className="font-normal text-gray-400">(aparece en el filtro del mapa)</span>
                </label>
                <select name="tipo" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white">
                  <option value="">Sin tipo específico</option>
                  <option value="Frazadas">🧣 Frazadas</option>
                  <option value="Ropa">👕 Ropa</option>
                  <option value="Alimentos">🥫 Alimentos</option>
                  <option value="Medicamentos">💊 Medicamentos</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Imagen de portada <span className="font-normal text-gray-400">(opcional)</span></label>
                <input type="file" accept="image/*" className="w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-orange-50 file:text-orange-600 hover:file:bg-orange-100" />
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
          <form onSubmit={async e => {
            e.preventDefault()
            const fd = new FormData(e.currentTarget)
            const body = {
              nombre: fd.get('nombre') as string,
              direccion: fd.get('direccion') as string,
              region: centroEditar.region,
              ciudad: centroEditar.ciudad,
              horario: fd.get('horario') as string,
              telefono: fd.get('telefono') as string,
              queRecibe: centroEditar.queRecibe,
              capacidadActual: centroEditar.capacidadActual,
              capacidadMax: centroEditar.capacidadMax,
              unidadCapacidad: 'dm³',
              latitud: centroEditar.latitud,
              longitud: centroEditar.longitud,
            }
            setCentroEditarError('')
            try {
              const { data } = await api.put<CentroAcopio>(`/api/centros/${centroEditar.id}`, body)
              setCentros(prev => prev.map(c => c.id === centroEditar.id ? data : c))
              setCentroEditar(null)
            } catch (err: unknown) {
              const msg = (err as { response?: { data?: { mensaje?: string; message?: string } } })?.response?.data
              setCentroEditarError(msg?.mensaje ?? msg?.message ?? 'Error al guardar el centro.')
            }
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
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Unidad de almacenamiento</label>
              <p className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                dm³ — Volumen universal. Ropa: 5 dm³/prenda · Alimento: 3 dm³/item · Medicamento: 1 dm³/item
              </p>
            </div>
            {centroEditarError && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{centroEditarError}</p>
            )}
            <div className="flex gap-3 pt-2">
              <button type="submit" className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 rounded-xl text-sm transition-colors">Guardar</button>
              <button type="button" onClick={() => { setCentroEditar(null); setCentroEditarError('') }} className="px-5 py-2.5 border border-gray-200 rounded-xl text-gray-600 text-sm hover:bg-gray-50 transition-colors">Cancelar</button>
            </div>
          </form>
        </Modal>
      )}

      {/* ═══ MODAL: Nuevo centro ═══ */}
      {showNuevoCentro && (
        <Modal title="Nuevo centro de acopio" onClose={() => { setShowNuevoCentro(false); setNuevoCentroLat(''); setNuevoCentroLng(''); setNuevoCentroDireccion(''); setNuevoCiudadSeleccionada(''); setNuevoCentroRegion(''); setGeoMensaje(''); setNuevoCentroError(''); setMostrarMapaPicker(false); setHorarioDias('Lun-Vie'); setHorarioAbre('09:00'); setHorarioCierra('18:00') }}>
          <form onSubmit={async e => {
            e.preventDefault()
            if (guardandoCentro) return
            if (!nuevoCentroLat || !nuevoCentroLng) {
              setNuevoCentroError('Debes verificar la dirección con el botón "📍 Verificar" antes de guardar.')
              return
            }
            const fd = new FormData(e.currentTarget)
            const body = {
              nombre: fd.get('nombre') as string,
              direccion: nuevoCentroDireccion,
              region: nuevoCentroRegion || nuevoCiudadSeleccionada,
              ciudad: nuevoCiudadSeleccionada,
              horario: `${horarioDias} ${horarioAbre}-${horarioCierra}`,
              telefono: fd.get('telefono') as string,
              queRecibe: ['Ropa de abrigo'],
              capacidadActual: 0,
              capacidadMax: Number(fd.get('capacidadMax')),
              unidadCapacidad: 'dm³',
              latitud: Number(nuevoCentroLat),
              longitud: Number(nuevoCentroLng),
            }
            setNuevoCentroError('')
            setGuardandoCentro(true)
            try {
              const { data } = await api.post<CentroAcopio>('/api/centros', body)
              setCentros(prev => [...prev, data])
              setShowNuevoCentro(false)
              setNuevoCentroLat('')
              setNuevoCentroLng('')
              setNuevoCentroDireccion('')
              setNuevoCiudadSeleccionada('')
              setNuevoCentroRegion('')
              setGeoMensaje('')
              setMostrarMapaPicker(false)
              setHorarioDias('Lun-Vie')
              setHorarioAbre('09:00')
              setHorarioCierra('18:00')
            } catch (err: unknown) {
              const msg = (err as { response?: { data?: { mensaje?: string; message?: string } } })?.response?.data
              setNuevoCentroError(msg?.mensaje ?? msg?.message ?? 'Error al crear el centro. Verifica que ms-donaciones esté activo.')
            } finally {
              setGuardandoCentro(false)
            }
          }} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Nombre del centro</label>
                <input name="nombre" required placeholder="Centro Santiago Poniente..." className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Ubicación</label>
                {!mostrarMapaPicker && !nuevoCentroLat && (
                  <button
                    type="button"
                    onClick={() => setMostrarMapaPicker(true)}
                    className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-orange-300 hover:border-orange-400 bg-orange-50 hover:bg-orange-100 text-orange-600 font-semibold rounded-xl px-3 py-4 text-sm transition-colors"
                  >
                    📍 Clic aquí para seleccionar la ubicación en el mapa
                  </button>
                )}
                {mostrarMapaPicker && (
                  <MapPicker
                    onSelect={async (lat, lng) => {
                      setNuevoCentroLat(String(lat.toFixed(6)))
                      setNuevoCentroLng(String(lng.toFixed(6)))
                      setGeoMensaje('⏳ Detectando dirección…')
                      try {
                        const res = await fetch(
                          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&countrycodes=cl`,
                          { headers: { 'Accept-Language': 'es' } }
                        )
                        const d = await res.json()
                        const addr = d.address ?? {}
                        const calle = addr.road ?? addr.pedestrian ?? ''
                        const numero = addr.house_number ?? ''
                        const comuna = addr.municipality ?? addr.suburb ?? addr.city_district ?? ''
                        const ciudad = addr.city ?? addr.town ?? addr.county ?? comuna
                        const region = (addr.state ?? '').replace(/^Región\s+(de\s+)?/i, '')
                        const dir = [numero ? `${calle} ${numero}` : calle, comuna].filter(Boolean).join(', ')
                        setNuevoCentroDireccion(dir || d.display_name?.split(',').slice(0, 2).join(', ') || '')
                        setNuevoCiudadSeleccionada(ciudad)
                        setNuevoCentroRegion(region)
                        setGeoMensaje(`✓ ${dir || 'Ubicación seleccionada'}`)
                        setMostrarMapaPicker(false)
                      } catch {
                        setGeoMensaje('✓ Ubicación seleccionada en el mapa')
                        setMostrarMapaPicker(false)
                      }
                    }}
                  />
                )}
                {nuevoCentroLat && (
                  <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-3 py-2 mt-1">
                    <div>
                      <p className="text-sm font-medium text-green-700">📍 {nuevoCentroDireccion || 'Ubicación seleccionada'}</p>
                      {geoMensaje.startsWith('✓') && (
                        <p className="text-xs text-green-600 mt-0.5">{nuevoCentroLat}, {nuevoCentroLng}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => { setMostrarMapaPicker(true); setNuevoCentroLat(''); setNuevoCentroLng(''); setNuevoCentroDireccion(''); setGeoMensaje('') }}
                      className="text-xs text-gray-400 hover:text-gray-600 underline ml-3 flex-shrink-0"
                    >
                      cambiar
                    </button>
                  </div>
                )}
                {!nuevoCentroLat && geoMensaje && !geoMensaje.startsWith('✓') && (
                  <p className="text-xs text-amber-600 mt-1">{geoMensaje}</p>
                )}
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Horario de atención</label>
                <div className="flex gap-2 items-center">
                  <select
                    value={horarioDias}
                    onChange={e => setHorarioDias(e.target.value)}
                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  >
                    <option>Lun-Vie</option>
                    <option>Lun-Sáb</option>
                    <option>Lun-Dom</option>
                    <option>Mar-Sáb</option>
                    <option>Todos los días</option>
                  </select>
                  <input
                    type="time"
                    value={horarioAbre}
                    onChange={e => setHorarioAbre(e.target.value)}
                    className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                  <span className="text-gray-400 text-sm flex-shrink-0">a</span>
                  <input
                    type="time"
                    value={horarioCierra}
                    onChange={e => setHorarioCierra(e.target.value)}
                    className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">Vista previa: {horarioDias} {horarioAbre}-{horarioCierra}</p>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Capacidad máxima de almacenamiento</label>
                <div className="flex items-center gap-2">
                  <input type="number" name="capacidadMax" defaultValue={300} min={1} className="w-32 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                  <span className="text-sm font-semibold text-gray-600">dm³</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Volumen total disponible. Cada donación ocupa: ropa 5 dm³/prenda · alimento 3 dm³/item · medicamento 1 dm³/item
                </p>
              </div>
            </div>
            {nuevoCentroError && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{nuevoCentroError}</p>
            )}
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={guardandoCentro} className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-sm transition-colors">{guardandoCentro ? 'Guardando…' : 'Crear centro'}</button>
              <button type="button" onClick={() => { setShowNuevoCentro(false); setNuevoCentroLat(''); setNuevoCentroLng(''); setNuevoCentroDireccion(''); setNuevoCiudadSeleccionada(''); setNuevoCentroRegion(''); setGeoMensaje(''); setNuevoCentroError(''); setMostrarMapaPicker(false) }} className="px-5 py-2.5 border border-gray-200 rounded-xl text-gray-600 text-sm hover:bg-gray-50 transition-colors">Cancelar</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
