import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useDonacion } from '../contexts/DonacionContext'
import type { DonacionExtendida, EstadoDonacion, TipoDonacion } from '../types'
import { mockDonaciones } from '../lib/mockData'
import api from '../lib/axios'

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
  monetaria: '💵 Monetaria',
  ropa: '👕 Ropa',
  alimento: '🥫 Alimento',
  medica: '💊 Médica',
}

interface BackendDonacion {
  id: number
  monto: number
  fecha: string
  tipoDonacion: 'MONETARIA' | 'ROPA' | 'ALIMENTO' | 'MEDICA'
  donanteAlias: string | null
  causa: { id: number; nombre: string }
  donadorId: string | null
  descripcion?: string | null
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

function mapBackendDonacion(b: BackendDonacion): DonacionExtendida {
  return {
    id: b.id,
    donadorNombre: b.donanteAlias ?? 'Anónimo',
    monto: b.monto,
    causaId: b.causa.id,
    causaTitulo: b.causa.nombre,
    fecha: b.fecha,
    anonima: b.donanteAlias === null,
    estado: 'pendiente',
    tipo: b.tipoDonacion.toLowerCase() as TipoDonacion,
    descripcion: b.descripcion ?? undefined,
  }
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

function ConfirmModal({ message, confirmLabel, confirmColor, onConfirm, onCancel }: {
  message: string; confirmLabel: string; confirmColor: string; onConfirm: () => void; onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>
        <p className="text-gray-700 mb-6 text-sm">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm hover:bg-gray-50 transition-colors">Volver</button>
          <button onClick={onConfirm} className={`flex-1 ${confirmColor} text-white py-2.5 rounded-xl text-sm font-semibold transition-colors`}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}

export default function Donaciones() {
  const { user, token } = useAuth()
  const { causasActivas } = useDonacion()
  const [donaciones, setDonaciones] = useState<DonacionExtendida[]>([])
  const [historialLoading, setHistorialLoading] = useState(true)

  // Filtros
  const [filtroEstado, setFiltroEstado] = useState<string>('todos')
  const [filtroCausa, setFiltroCausa] = useState<string>('todas')

  // Form nueva donación
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ causaId: '', monto: '', mensaje: '', anonima: false, tipo: 'monetaria' as TipoDonacion })
  const [formExtra, setFormExtra] = useState({
    cantidadPrendas: '', tipoPrenda: 'Abrigo/Chaqueta', talla: 'M', estadoPrenda: 'Muy bueno',
    cantidad: '', unidad: 'kg', tipoAlimento: '',
    descripcionMedica: '', cantidadMedica: '',
  })
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  // Modals
  const [donacionDetalle, setDonacionDetalle] = useState<DonacionExtendida | null>(null)
  const [donacionEditar, setDonacionEditar] = useState<DonacionExtendida | null>(null)
  const [donacionCancelar, setDonacionCancelar] = useState<DonacionExtendida | null>(null)
  const [editForm, setEditForm] = useState({ causaId: '', monto: '', mensaje: '', tipo: 'monetaria' as TipoDonacion })

  useEffect(() => {
    if (!token) {
      setHistorialLoading(false)
      return
    }
    async function fetchDonaciones() {
      try {
        const { data } = await api.get<BackendDonacion[]>('/api/donaciones/mis-donaciones')
        setDonaciones(data.map(mapBackendDonacion))
      } catch {
        const fallback = user
          ? mockDonaciones.filter(d => !d.anonima && (d.donadorEmail === user.email || d.donadorNombre === user.nombre))
          : []
        setDonaciones(fallback)
      } finally {
        setHistorialLoading(false)
      }
    }
    fetchDonaciones()
  }, [token])

  // /api/donaciones/mis-donaciones ya filtra por donadorId en el backend
  const misDonaciones = donaciones.filter(d => !d.anonima)

  const donacionesFiltradas = misDonaciones.filter(d => {
    const matchEstado = filtroEstado === 'todos' || d.estado === filtroEstado
    const matchCausa = filtroCausa === 'todas' || String(d.causaId) === filtroCausa
    return matchEstado && matchCausa
  })

  const miTotal = misDonaciones.reduce((a, d) => a + d.monto, 0)
  const completadas = misDonaciones.filter(d => d.estado === 'completada').length
  const pendientes = misDonaciones.filter(d => d.estado === 'pendiente').length

  async function handleDonar(e: React.FormEvent) {
    e.preventDefault()
    if (!form.causaId || !user) return
    if (form.tipo === 'monetaria' && !form.monto) return
    setLoading(true)

    const causa = causasActivas.find(c => c.id === Number(form.causaId))
    if (!causa) { setLoading(false); return }

    const descripcion = form.tipo === 'ropa'
      ? `${formExtra.cantidadPrendas} prendas | ${formExtra.tipoPrenda} | Talla ${formExtra.talla} | ${formExtra.estadoPrenda}`
      : form.tipo === 'alimento'
      ? `${formExtra.cantidad} ${formExtra.unidad} de ${formExtra.tipoAlimento}`
      : form.tipo === 'medica'
      ? `${formExtra.descripcionMedica} x${formExtra.cantidadMedica}`
      : null
    const cantidad = form.tipo === 'ropa' ? (Number(formExtra.cantidadPrendas) || null)
      : form.tipo === 'alimento' ? (Number(formExtra.cantidad) || null)
      : form.tipo === 'medica' ? (Number(formExtra.cantidadMedica) || null)
      : null
    const unidad = form.tipo === 'alimento' ? formExtra.unidad : null

    const payload = {
      causaId: causa.id,
      tipoDonacion: form.tipo.toUpperCase(),
      monto: form.tipo === 'monetaria' ? Number(form.monto) : 0,
      donanteAlias: form.anonima ? null : user.nombre,
      descripcion,
      cantidad,
      unidad,
    }

    try {
      await api.post<DonacionExtendida>('/api/donaciones', payload)
      const { data: lista } = await api.get<BackendDonacion[]>('/api/donaciones/mis-donaciones')
      setDonaciones(lista.map(mapBackendDonacion))
    } catch {
      const nueva: DonacionExtendida = {
        id: Date.now(),
        donadorNombre: form.anonima ? 'Anónimo' : user.nombre,
        donadorEmail: form.anonima ? undefined : user.email,
        monto: form.tipo === 'monetaria' ? Number(form.monto) : 0,
        causaId: causa.id,
        causaTitulo: causa.titulo,
        fecha: new Date().toISOString(),
        mensaje: form.mensaje,
        anonima: form.anonima,
        estado: 'pendiente',
        tipo: form.tipo,
        descripcion: descripcion ?? undefined,
      }
      setDonaciones(prev => [nueva, ...prev])
    }

    setLoading(false)
    setSuccess(true)
    setShowForm(false)
    setForm({ causaId: '', monto: '', mensaje: '', anonima: false, tipo: 'monetaria' })
    setFormExtra({ cantidadPrendas: '', tipoPrenda: 'Abrigo/Chaqueta', talla: 'M', estadoPrenda: 'Muy bueno', cantidad: '', unidad: 'kg', tipoAlimento: '', descripcionMedica: '', cantidadMedica: '' })
    setTimeout(() => setSuccess(false), 4000)
  }

  function handleAbrirEditar(d: DonacionExtendida) {
    setEditForm({ causaId: String(d.causaId), monto: String(d.monto), mensaje: d.mensaje ?? '', tipo: d.tipo })
    setDonacionEditar(d)
  }

  function handleGuardarEdicion(e: React.FormEvent) {
    e.preventDefault()
    if (!donacionEditar) return
    const causa = causasActivas.find(c => c.id === Number(editForm.causaId))
    setDonaciones(prev => prev.map(d =>
      d.id === donacionEditar.id
        ? { ...d, monto: Number(editForm.monto), mensaje: editForm.mensaje, tipo: editForm.tipo, causaId: Number(editForm.causaId), causaTitulo: causa?.titulo ?? d.causaTitulo }
        : d
    ))
    setDonacionEditar(null)
  }

  function handleCancelarDonacion() {
    if (!donacionCancelar) return
    setDonaciones(prev => prev.map(d => d.id === donacionCancelar.id ? { ...d, estado: 'cancelada' as EstadoDonacion } : d))
    setDonacionCancelar(null)
  }

  const montosSugeridos = [5000, 10000, 25000, 50000, 100000]

  return (
    <div className="flex-1 bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900">Mis donaciones</h1>
            <p className="text-gray-500 mt-1">Hola <strong>{user?.nombre}</strong> · Has aportado <strong className="text-orange-500">${miTotal.toLocaleString('es-CL')}</strong> en total</p>
          </div>
          <button onClick={() => setShowForm(v => !v)} className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Nueva donación
          </button>
        </div>

        {/* Stats rápidas */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
            <p className="text-2xl font-extrabold text-gray-900">{misDonaciones.length}</p>
            <p className="text-xs text-gray-400 mt-1">Total donaciones</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
            <p className="text-2xl font-extrabold text-green-600">{completadas}</p>
            <p className="text-xs text-gray-400 mt-1">Completadas</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
            <p className="text-2xl font-extrabold text-yellow-600">{pendientes}</p>
            <p className="text-xs text-gray-400 mt-1">Pendientes</p>
          </div>
        </div>

        {/* Toast éxito */}
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-800 px-5 py-4 rounded-xl flex items-center gap-3">
            <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            <p className="font-medium">¡Donación registrada con éxito! Gracias por tu generosidad.</p>
          </div>
        )}

        {/* Formulario nueva donación */}
        {showForm && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-5">Nueva donación</h2>
            <form onSubmit={handleDonar} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Causa</label>
                  <select value={form.causaId} onChange={e => setForm(f => ({ ...f, causaId: e.target.value }))} required className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white">
                    <option value="">Selecciona una causa...</option>
                    {causasActivas.map(c => <option key={c.id} value={c.id}>{c.titulo}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Tipo de donación</label>
                  <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value as TipoDonacion }))} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white">
                    <option value="monetaria">Monetaria</option>
                    <option value="ropa">Ropa</option>
                    <option value="alimento">Alimento</option>
                    <option value="medica">Médica</option>
                  </select>
                </div>
              </div>

              {form.tipo === 'monetaria' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Monto (CLP)</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {montosSugeridos.map(m => (
                      <button key={m} type="button" onClick={() => setForm(f => ({ ...f, monto: String(m) }))} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${form.monto === String(m) ? 'bg-orange-500 text-white border-orange-500' : 'border-gray-200 text-gray-600 hover:border-orange-300'}`}>
                        ${m.toLocaleString('es-CL')}
                      </button>
                    ))}
                  </div>
                  <input type="number" min="1000" value={form.monto} onChange={e => setForm(f => ({ ...f, monto: e.target.value }))} placeholder="Otro monto..." required className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                </div>
              )}

              {form.tipo === 'ropa' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Cantidad de prendas</label>
                    <input type="number" min="1" value={formExtra.cantidadPrendas} onChange={e => setFormExtra(f => ({ ...f, cantidadPrendas: e.target.value }))} placeholder="Ej: 5" required className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Tipo de prenda</label>
                    <select value={formExtra.tipoPrenda} onChange={e => setFormExtra(f => ({ ...f, tipoPrenda: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white">
                      <option>Abrigo/Chaqueta</option>
                      <option>Polera</option>
                      <option>Pantalón</option>
                      <option>Calzado</option>
                      <option>Frazada</option>
                      <option>Accesorios (gorros/guantes)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Talla</label>
                    <select value={formExtra.talla} onChange={e => setFormExtra(f => ({ ...f, talla: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white">
                      <option>XS</option><option>S</option><option>M</option><option>L</option>
                      <option>XL</option><option>XXL</option><option>Única</option><option>Niño</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Estado</label>
                    <select value={formExtra.estadoPrenda} onChange={e => setFormExtra(f => ({ ...f, estadoPrenda: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white">
                      <option>Muy bueno</option>
                      <option>Bueno</option>
                    </select>
                  </div>
                </div>
              )}

              {form.tipo === 'alimento' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Cantidad</label>
                      <input type="number" min="1" value={formExtra.cantidad} onChange={e => setFormExtra(f => ({ ...f, cantidad: e.target.value }))} placeholder="Ej: 10" required className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Unidad</label>
                      <select value={formExtra.unidad} onChange={e => setFormExtra(f => ({ ...f, unidad: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white">
                        <option value="kg">kg</option>
                        <option value="unidades">unidades</option>
                        <option value="cajas">cajas</option>
                        <option value="litros">litros</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Tipo de alimento</label>
                    <input type="text" value={formExtra.tipoAlimento} onChange={e => setFormExtra(f => ({ ...f, tipoAlimento: e.target.value }))} placeholder="Ej: arroz, leche, conservas..." required className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                  </div>
                </div>
              )}

              {form.tipo === 'medica' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Insumo médico</label>
                    <input type="text" value={formExtra.descripcionMedica} onChange={e => setFormExtra(f => ({ ...f, descripcionMedica: e.target.value }))} placeholder="Ej: Paracetamol 500mg, vendas, guantes..." required className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Cantidad</label>
                    <input type="number" min="1" value={formExtra.cantidadMedica} onChange={e => setFormExtra(f => ({ ...f, cantidadMedica: e.target.value }))} placeholder="Ej: 20" required className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Mensaje (opcional)</label>
                <textarea value={form.mensaje} onChange={e => setForm(f => ({ ...f, mensaje: e.target.value }))} placeholder="Un mensaje de aliento..." rows={2} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none" />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.anonima} onChange={e => setForm(f => ({ ...f, anonima: e.target.checked }))} className="w-4 h-4 accent-orange-500" />
                <span className="text-sm text-gray-700">Donar de forma anónima</span>
              </label>

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={loading} className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
                  {loading && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                  Confirmar donación
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="px-5 py-3 border border-gray-200 rounded-xl text-gray-600 text-sm hover:bg-gray-50 transition-colors">Cancelar</button>
              </div>
            </form>
          </div>
        )}

        {/* Filtros */}
        <div className="flex flex-wrap gap-3 mb-4">
          <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white">
            <option value="todos">Todos los estados</option>
            <option value="pendiente">Pendiente</option>
            <option value="en_proceso">En proceso</option>
            <option value="completada">Completada</option>
            <option value="cancelada">Cancelada</option>
          </select>
          <select value={filtroCausa} onChange={e => setFiltroCausa(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white">
            <option value="todas">Todas las causas</option>
            {causasActivas.map(c => <option key={c.id} value={String(c.id)}>{c.titulo}</option>)}
          </select>
          <span className="ml-auto text-xs text-gray-400 self-center">{donacionesFiltradas.length} registros</span>
        </div>

        {/* Historial */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-bold text-gray-900">Historial de donaciones</h2>
          </div>

          {historialLoading ? (
            <div className="py-16 text-center text-gray-400 text-sm">Cargando historial...</div>
          ) : donacionesFiltradas.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <p className="text-gray-500 text-sm">{misDonaciones.length === 0 ? 'Aún no has realizado donaciones.' : 'No hay donaciones con ese filtro.'}</p>
              {misDonaciones.length === 0 && (
                <button onClick={() => setShowForm(true)} className="mt-4 text-orange-500 hover:text-orange-600 font-semibold text-sm">Hacer mi primera donación →</button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {donacionesFiltradas.map(d => (
                <div key={d.id} className="px-6 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-semibold text-gray-900 text-sm truncate">{d.causaTitulo}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${ESTADO_COLOR[d.estado]}`}>{ESTADO_LABEL[d.estado]}</span>
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full flex-shrink-0">{TIPO_LABEL[d.tipo]}</span>
                      </div>
                      {d.descripcion && <p className="text-xs text-gray-400 mt-0.5">{d.descripcion}</p>}
                      {d.mensaje && <p className="text-xs text-gray-500 mt-0.5 italic">"{d.mensaje}"</p>}
                      <p className="text-xs text-gray-400 mt-1">
                        {formatDate(d.fecha)}
                        {d.destino && ` · ${d.destino}`}
                      </p>
                    </div>
                    <div className="flex items-start gap-2 flex-shrink-0">
                      <div className="text-right">
                        <p className="font-bold text-orange-500">${d.monto.toLocaleString('es-CL')}</p>
                        {d.anonima && <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Anónima</span>}
                      </div>
                      {/* Acciones */}
                      <div className="flex gap-1 ml-2">
                        <button onClick={() => setDonacionDetalle(d)} className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="Ver detalle">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        </button>
                        {d.estado === 'pendiente' && (
                          <>
                            <button onClick={() => handleAbrirEditar(d)} className="p-1.5 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors" title="Editar">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </button>
                            <button onClick={() => setDonacionCancelar(d)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Cancelar donación">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          </>
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

      {/* ═══ MODAL: Ver detalle ═══ */}
      {donacionDetalle && (
        <Modal title="Detalle de donación" onClose={() => setDonacionDetalle(null)}>
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-xs text-gray-400 mb-1">Causa</p><p className="font-semibold text-gray-900">{donacionDetalle.causaTitulo}</p></div>
              <div><p className="text-xs text-gray-400 mb-1">Monto</p><p className="font-bold text-orange-500 text-xl">${donacionDetalle.monto.toLocaleString('es-CL')}</p></div>
              <div><p className="text-xs text-gray-400 mb-1">Estado</p><span className={`text-xs px-2 py-1 rounded-full font-medium ${ESTADO_COLOR[donacionDetalle.estado]}`}>{ESTADO_LABEL[donacionDetalle.estado]}</span></div>
              <div><p className="text-xs text-gray-400 mb-1">Tipo</p><p className="font-medium">{TIPO_LABEL[donacionDetalle.tipo]}</p></div>
              <div><p className="text-xs text-gray-400 mb-1">Fecha</p><p className="font-medium">{formatDate(donacionDetalle.fecha)}</p></div>
              {donacionDetalle.destino && <div><p className="text-xs text-gray-400 mb-1">Destino</p><p className="font-medium">{donacionDetalle.destino}</p></div>}
              {donacionDetalle.descripcion && <div className="col-span-2"><p className="text-xs text-gray-400 mb-1">Detalle</p><p className="text-gray-700 text-sm">{donacionDetalle.descripcion}</p></div>}
              {donacionDetalle.mensaje && <div className="col-span-2"><p className="text-xs text-gray-400 mb-1">Mensaje</p><p className="italic text-gray-600">"{donacionDetalle.mensaje}"</p></div>}
            </div>
            {/* Timeline de estados */}
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Historial de estados</p>
              <div className="space-y-2">
                {(['pendiente', 'en_proceso', 'completada'] as EstadoDonacion[]).map((estado, i) => {
                  const estados: EstadoDonacion[] = ['pendiente', 'en_proceso', 'completada', 'cancelada']
                  const idxActual = estados.indexOf(donacionDetalle.estado)
                  const done = donacionDetalle.estado === 'cancelada' ? estado === 'pendiente' : i <= idxActual
                  return (
                    <div key={estado} className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${done ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                        {done ? '✓' : i + 1}
                      </div>
                      <span className={`text-sm ${done ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>{ESTADO_LABEL[estado]}</span>
                    </div>
                  )
                })}
                {donacionDetalle.estado === 'cancelada' && (
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center text-xs font-bold flex-shrink-0 text-red-600">✕</div>
                    <span className="text-sm text-red-600 font-medium">Cancelada</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ═══ MODAL: Editar donación ═══ */}
      {donacionEditar && (
        <Modal title="Editar donación" onClose={() => setDonacionEditar(null)}>
          <p className="text-xs text-gray-400 mb-4">Solo puedes editar donaciones en estado Pendiente.</p>
          <form onSubmit={handleGuardarEdicion} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Causa</label>
              <select value={editForm.causaId} onChange={e => setEditForm(f => ({ ...f, causaId: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white">
                {causasActivas.map(c => <option key={c.id} value={c.id}>{c.titulo}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Tipo</label>
              <select value={editForm.tipo} onChange={e => setEditForm(f => ({ ...f, tipo: e.target.value as TipoDonacion }))} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white">
                <option value="monetaria">Monetaria</option>
                <option value="ropa">Ropa</option>
                <option value="alimento">Alimento</option>
                <option value="medica">Médica</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Monto (CLP)</label>
              <input type="number" min="1000" value={editForm.monto} onChange={e => setEditForm(f => ({ ...f, monto: e.target.value }))} required className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Mensaje</label>
              <textarea value={editForm.mensaje} onChange={e => setEditForm(f => ({ ...f, mensaje: e.target.value }))} rows={2} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none" />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition-colors">Guardar cambios</button>
              <button type="button" onClick={() => setDonacionEditar(null)} className="px-5 py-3 border border-gray-200 rounded-xl text-gray-600 text-sm hover:bg-gray-50 transition-colors">Cancelar</button>
            </div>
          </form>
        </Modal>
      )}

      {/* ═══ MODAL: Cancelar donación ═══ */}
      {donacionCancelar && (
        <ConfirmModal
          message={`¿Cancelar tu donación de $${donacionCancelar.monto.toLocaleString('es-CL')} para "${donacionCancelar.causaTitulo}"? No se realizará ningún cargo.`}
          confirmLabel="Sí, cancelar"
          confirmColor="bg-red-500 hover:bg-red-600"
          onConfirm={handleCancelarDonacion}
          onCancel={() => setDonacionCancelar(null)}
        />
      )}
    </div>
  )
}
