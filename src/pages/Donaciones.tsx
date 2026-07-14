import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useDonacion } from '../contexts/DonacionContext'
import type { CentroAcopio, DonacionExtendida, EstadoDonacion, TipoDonacion } from '../types'
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
  causa: { id: number; titulo: string }
  centroAcopio?: { id: number; nombre: string } | null
  donadorId: string | null
  descripcion?: string | null
}

type ItemEntry = { descripcion: string; cantidad: string; unidad: string }

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
    causaTitulo: b.causa.titulo,
    centroNombre: b.centroAcopio?.nombre,
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

// ── Sub-sección: builder de ítems reutilizable ──
function ItemsList({ items, onRemove, emptyText }: {
  items: ItemEntry[]
  onRemove: (i: number) => void
  emptyText: string
}) {
  if (items.length === 0) return <p className="text-xs text-center text-gray-400 py-1">{emptyText}</p>
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
        En tu donación <span className="text-orange-500">({items.length})</span>
      </p>
      {items.map((item, i) => (
        <div key={i} className="flex items-center justify-between bg-orange-50 border border-orange-100 rounded-xl px-4 py-2.5">
          <div className="min-w-0 flex-1">
            <span className="text-sm font-medium text-gray-800">{item.descripcion}</span>
            <span className="ml-2 text-xs font-bold text-orange-500">
              {item.unidad === 'unidades' ? `×${item.cantidad}` : `${item.cantidad} ${item.unidad}`}
            </span>
          </div>
          <button type="button" onClick={() => onRemove(i)} className="text-gray-300 hover:text-red-500 transition-colors ml-3 flex-shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  )
}

// ── Guía aceptados / no aceptados (inspirada en DeBuenaFe) ──
const ACEPTA_GUIA: Record<string, { acepta: string[]; noAcepta: string[] }> = {
  ropa: {
    acepta: ['Abrigos y chaquetas', 'Ropa de invierno en buen estado', 'Calzado limpio sin deterioro', 'Ropa de cama y frazadas', 'Ropa infantil y adulto', 'Gorros, guantes y bufandas'],
    noAcepta: ['Ropa muy desgastada o rota', 'Ropa interior usada', 'Calzado muy deteriorado', 'Prendas sucias o con mal olor'],
  },
  alimento: {
    acepta: ['Arroz, fideos y legumbres', 'Conservas (fecha vigente)', 'Leche en polvo, cereales, café', 'Aceite, sal, azúcar sellados', 'Galletas y alimentos no perecederos'],
    noAcepta: ['Alimentos vencidos o por vencer', 'Productos abiertos sin envase', 'Perecederos sin cadena de frío', 'Bebidas alcohólicas'],
  },
  medica: {
    acepta: ['Medicamentos sin vencer (caja cerrada)', 'Vendas y apósitos estériles', 'Guantes y mascarillas selladas', 'Suero oral y kit primeros auxilios', 'Insumos de higiene sellados'],
    noAcepta: ['Medicamentos vencidos', 'Insumos ya abiertos o usados', 'Elementos cortopunzantes', 'Productos sin etiqueta o sin identificar'],
  },
}

function AcceptedGuide({ tipo }: { tipo: 'ropa' | 'alimento' | 'medica' }) {
  const [open, setOpen] = useState(false)
  const { acepta, noAcepta } = ACEPTA_GUIA[tipo]
  const label = tipo === 'ropa' ? 'prendas' : tipo === 'alimento' ? 'alimentos' : 'insumos'
  return (
    <div className="rounded-xl border border-blue-100 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-blue-50 hover:bg-blue-100 transition-colors"
      >
        <span className="flex items-center gap-2 text-blue-700 text-xs font-semibold">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          ¿Qué {label} aceptamos y qué no?
        </span>
        <svg className={`w-3.5 h-3.5 text-blue-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="grid grid-cols-2 text-xs">
          <div className="p-3 bg-green-50 border-r border-gray-100">
            <p className="font-bold text-green-700 mb-2">✓ Aceptamos</p>
            <ul className="space-y-1.5">
              {acepta.map((item, i) => (
                <li key={i} className="flex items-start gap-1.5 text-green-800 leading-snug">
                  <span className="text-green-500 flex-shrink-0 mt-0.5">✓</span>{item}
                </li>
              ))}
            </ul>
          </div>
          <div className="p-3 bg-red-50">
            <p className="font-bold text-red-600 mb-2">✕ No aceptamos</p>
            <ul className="space-y-1.5">
              {noAcepta.map((item, i) => (
                <li key={i} className="flex items-start gap-1.5 text-red-700 leading-snug">
                  <span className="text-red-400 flex-shrink-0 mt-0.5">✕</span>{item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Donaciones() {
  const { user, token } = useAuth()
  const { causasActivas } = useDonacion()
  const [searchParams] = useSearchParams()
  const [donaciones, setDonaciones] = useState<DonacionExtendida[]>([])
  const [historialLoading, setHistorialLoading] = useState(true)

  const [filtroEstado, setFiltroEstado] = useState<string>('todos')
  const [filtroCausa, setFiltroCausa] = useState<string>('todas')

  const [centros, setCentros] = useState<CentroAcopio[]>([])
  useEffect(() => {
    api.get<CentroAcopio[]>('/api/centros')
      .then(({ data }) => setCentros(data.filter(c => c.activo)))
      .catch(() => {})
  }, [])

  // Apertura automática si viene con ?tipo=
  const tipoParam = searchParams.get('tipo') as TipoDonacion | null
  const causaIdParam = searchParams.get('causaId') ?? ''
  const [showForm, setShowForm] = useState(!!(tipoParam || causaIdParam))

  // Campos comunes
  const [form, setForm] = useState({
    causaId: causaIdParam,
    centroAcopioId: '',
    monto: '',
    mensaje: '',
    anonima: false,
  })

  // Qué tipos están activos en esta donación combinada
  const [tiposActivos, setTiposActivos] = useState<Record<TipoDonacion, boolean>>({
    monetaria: tipoParam === 'monetaria',
    ropa: tipoParam === 'ropa',
    alimento: tipoParam === 'alimento',
    medica: tipoParam === 'medica',
  })

  // Items por tipo
  const [ropaItems, setRopaItems] = useState<ItemEntry[]>([])
  const [alimentoItems, setAlimentoItems] = useState<ItemEntry[]>([])
  const [medicaItems, setMedicaItems] = useState<ItemEntry[]>([])

  // Staging states para cada builder
  const [newPrenda, setNewPrenda] = useState({ tipo: 'Abrigo/Chaqueta', talla: 'M', estado: 'Muy bueno', cantidad: '1', color: '' })
  const [newAlimentoItem, setNewAlimentoItem] = useState({ tipo: '', cantidad: '', unidad: 'kg' })
  const [newMedicaItem, setNewMedicaItem] = useState({ insumo: '', cantidad: '' })

  // Campos especie comunes
  const [direccionDonante, setDireccionDonante] = useState('')
  const [nombreEmpresa, setNombreEmpresa] = useState('')

  // Errores
  const [formError, setFormError] = useState('')
  const [ropaError, setRopaError] = useState('')
  const [alimentoError, setAlimentoError] = useState('')
  const [medicaError, setMedicaError] = useState('')

  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  // Modals
  const [donacionDetalle, setDonacionDetalle] = useState<DonacionExtendida | null>(null)
  const [donacionEditar, setDonacionEditar] = useState<DonacionExtendida | null>(null)
  const [donacionCancelar, setDonacionCancelar] = useState<DonacionExtendida | null>(null)
  const [editForm, setEditForm] = useState({ causaId: '', monto: '', mensaje: '', tipo: 'monetaria' as TipoDonacion })

  useEffect(() => {
    if (!token) { setHistorialLoading(false); return }
    api.get<BackendDonacion[]>('/api/donaciones/mis-donaciones')
      .then(({ data }) => setDonaciones(data.map(mapBackendDonacion)))
      .catch(() => setDonaciones([]))
      .finally(() => setHistorialLoading(false))
  }, [token])

  const misDonaciones = donaciones.filter(d => !d.anonima)
  const donacionesFiltradas = misDonaciones.filter(d => {
    const matchEstado = filtroEstado === 'todos' || d.estado === filtroEstado
    const matchCausa = filtroCausa === 'todas' || String(d.causaId) === filtroCausa
    return matchEstado && matchCausa
  })
  const miTotal = misDonaciones.reduce((a, d) => a + d.monto, 0)
  const completadas = misDonaciones.filter(d => d.estado === 'completada').length
  const pendientes = misDonaciones.filter(d => d.estado === 'pendiente').length

  const hayEspecie = tiposActivos.ropa || tiposActivos.alimento || tiposActivos.medica

  function toggleTipo(tipo: TipoDonacion) {
    setTiposActivos(t => ({ ...t, [tipo]: !t[tipo] }))
    // Limpiar error del tipo
    if (tipo === 'ropa') setRopaError('')
    if (tipo === 'alimento') setAlimentoError('')
    if (tipo === 'medica') setMedicaError('')
  }

  function agregarPrenda() {
    if (!newPrenda.cantidad || Number(newPrenda.cantidad) < 1) return
    const desc = `${newPrenda.tipo} - Talla ${newPrenda.talla} - ${newPrenda.estado}${newPrenda.color ? ` - ${newPrenda.color}` : ''}`
    setRopaItems(prev => [...prev, { descripcion: desc, cantidad: newPrenda.cantidad, unidad: 'unidades' }])
    setNewPrenda(p => ({ ...p, cantidad: '1', color: '' }))
    setRopaError('')
  }

  function agregarAlimento() {
    if (!newAlimentoItem.tipo.trim() || !newAlimentoItem.cantidad) return
    setAlimentoItems(prev => [...prev, { descripcion: newAlimentoItem.tipo, cantidad: newAlimentoItem.cantidad, unidad: newAlimentoItem.unidad }])
    setNewAlimentoItem({ tipo: '', cantidad: '', unidad: 'kg' })
    setAlimentoError('')
  }

  function agregarMedica() {
    if (!newMedicaItem.insumo.trim() || !newMedicaItem.cantidad) return
    setMedicaItems(prev => [...prev, { descripcion: newMedicaItem.insumo, cantidad: newMedicaItem.cantidad, unidad: 'unidades' }])
    setNewMedicaItem({ insumo: '', cantidad: '' })
    setMedicaError('')
  }

  async function handleDonar(e: React.FormEvent) {
    e.preventDefault()
    if (!form.causaId || !user) return

    const activos = (Object.keys(tiposActivos) as TipoDonacion[]).filter(t => tiposActivos[t])
    if (activos.length === 0) {
      setFormError('Selecciona al menos un tipo de donación')
      return
    }
    setFormError('')

    if (tiposActivos.monetaria && !form.monto) {
      setFormError('Ingresa un monto para la donación monetaria')
      return
    }
    if (tiposActivos.ropa && ropaItems.length === 0) {
      setRopaError('Agrega al menos una prenda')
      return
    }
    if (tiposActivos.alimento && alimentoItems.length === 0) {
      setAlimentoError('Agrega al menos un alimento')
      return
    }
    if (tiposActivos.medica && medicaItems.length === 0) {
      setMedicaError('Agrega al menos un insumo médico')
      return
    }

    // Validación de monto máximo para usuarios no-empresa
    if (tiposActivos.monetaria && form.monto) {
      const monto = Number(form.monto)
      if (monto > 3_000_000 && user.rol !== 'empresa') {
        setFormError('Las donaciones monetarias tienen un límite de $3.000.000. Para montos mayores necesitas una cuenta de empresa.')
        return
      }
      if (monto > 3_000_000 && user.rol === 'empresa') {
        const ok = window.confirm(
          `Estás donando $${monto.toLocaleString('es-CL')}, que supera el límite de $3.000.000.\n\n` +
          `Esta donación quedará PENDIENTE DE APROBACIÓN por el administrador antes de contabilizarse.\n\n` +
          `¿Deseas continuar?`
        )
        if (!ok) return
      }
    }

    setLoading(true)
    const causa = causasActivas.find(c => c.id === Number(form.causaId))
    if (!causa) { setLoading(false); return }

    const base = {
      causaId: causa.id,
      centroAcopioId: form.centroAcopioId ? Number(form.centroAcopioId) : null,
      donanteAlias: form.anonima ? null : user.nombre,
      esEmpresa: user.rol === 'empresa',
      nombreEmpresa: user.rol === 'empresa' && nombreEmpresa ? nombreEmpresa : null,
      direccionDonante: hayEspecie && direccionDonante ? direccionDonante : null,
    }

    const toItems = (list: ItemEntry[]) =>
      list.map(i => ({ descripcion: i.descripcion, cantidad: Number(i.cantidad) || null, unidad: i.unidad || null }))

    const requests: Promise<unknown>[] = []

    if (tiposActivos.monetaria) {
      requests.push(api.post('/api/donaciones', { ...base, tipoDonacion: 'MONETARIA', monto: Number(form.monto), descripcion: null, cantidad: null, unidad: null, items: null }))
    }
    if (tiposActivos.ropa && ropaItems.length > 0) {
      requests.push(api.post('/api/donaciones', {
        ...base, tipoDonacion: 'ROPA', monto: 0,
        descripcion: ropaItems.map(i => `${i.cantidad}x ${i.descripcion}`).join('; '),
        cantidad: ropaItems.reduce((a, i) => a + (Number(i.cantidad) || 1), 0),
        unidad: 'unidades',
        items: toItems(ropaItems),
      }))
    }
    if (tiposActivos.alimento && alimentoItems.length > 0) {
      requests.push(api.post('/api/donaciones', {
        ...base, tipoDonacion: 'ALIMENTO', monto: 0,
        descripcion: alimentoItems.map(i => `${i.cantidad} ${i.unidad} de ${i.descripcion}`).join('; '),
        cantidad: alimentoItems.reduce((a, i) => a + (Number(i.cantidad) || 1), 0),
        unidad: alimentoItems[0]?.unidad ?? 'unidades',
        items: toItems(alimentoItems),
      }))
    }
    if (tiposActivos.medica && medicaItems.length > 0) {
      requests.push(api.post('/api/donaciones', {
        ...base, tipoDonacion: 'MEDICA', monto: 0,
        descripcion: medicaItems.map(i => `${i.descripcion} ×${i.cantidad}`).join('; '),
        cantidad: medicaItems.reduce((a, i) => a + (Number(i.cantidad) || 1), 0),
        unidad: 'unidades',
        items: toItems(medicaItems),
      }))
    }

    try {
      await Promise.all(requests)
      const { data } = await api.get<BackendDonacion[]>('/api/donaciones/mis-donaciones')
      setDonaciones(data.map(mapBackendDonacion))
    } catch (err: unknown) {
      setLoading(false)
      const msg = (err as { response?: { data?: { mensaje?: string } } })?.response?.data?.mensaje
      setFormError(msg ?? 'Error al registrar la donación. Verifica los datos e intenta de nuevo.')
      return
    }

    // Reset
    setLoading(false)
    setSuccess(true)
    setShowForm(false)
    setForm({ causaId: '', centroAcopioId: '', monto: '', mensaje: '', anonima: false })
    setTiposActivos({ monetaria: false, ropa: false, alimento: false, medica: false })
    setRopaItems([]); setAlimentoItems([]); setMedicaItems([])
    setNewPrenda({ tipo: 'Abrigo/Chaqueta', talla: 'M', estado: 'Muy bueno', cantidad: '1', color: '' })
    setNewAlimentoItem({ tipo: '', cantidad: '', unidad: 'kg' })
    setNewMedicaItem({ insumo: '', cantidad: '' })
    setDireccionDonante(''); setNombreEmpresa('')
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

  const TIPOS_CONFIG: { tipo: TipoDonacion; emoji: string; label: string; desc: string }[] = [
    { tipo: 'monetaria', emoji: '💵', label: 'Monetaria',  desc: 'Transferencia o aporte en dinero' },
    { tipo: 'ropa',      emoji: '👕', label: 'Ropa',       desc: 'Prendas en buen estado' },
    { tipo: 'alimento',  emoji: '🥫', label: 'Alimento',   desc: 'Comida no perecedera' },
    { tipo: 'medica',    emoji: '💊', label: 'Médica',     desc: 'Insumos y medicamentos' },
  ]

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

        {/* Stats */}
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

        {/* ════════════════════════════════
            FORMULARIO NUEVA DONACIÓN
        ════════════════════════════════ */}
        {showForm && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Nueva donación</h2>
            <p className="text-sm text-gray-400 mb-5">Puedes combinar varios tipos en una sola entrega</p>

            <form onSubmit={handleDonar} className="space-y-5">

              {/* ── Causa + Centro ── */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Causa</label>
                  <select value={form.causaId} onChange={e => setForm(f => ({ ...f, causaId: e.target.value }))} required className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white">
                    <option value="">Selecciona una causa...</option>
                    {causasActivas.map(c => <option key={c.id} value={c.id}>{c.titulo}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Centro de acopio</label>
                  <select value={form.centroAcopioId} onChange={e => setForm(f => ({ ...f, centroAcopioId: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white">
                    <option value="">Casa Central (por defecto)</option>
                    {centros.filter(c => c.nombre !== 'Casa Central').map(c => <option key={c.id} value={c.id}>{c.nombre} · {c.ciudad}</option>)}
                  </select>
                </div>
              </div>

              {/* ── Selector de tipos ── */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">¿Qué deseas donar? <span className="text-gray-400 font-normal">(puedes elegir varios)</span></label>
                <div className="grid grid-cols-2 gap-3">
                  {TIPOS_CONFIG.map(({ tipo, emoji, label, desc }) => (
                    <button
                      key={tipo}
                      type="button"
                      onClick={() => toggleTipo(tipo)}
                      className={`p-3.5 rounded-xl border-2 text-left transition-all ${
                        tiposActivos[tipo]
                          ? 'border-orange-400 bg-orange-50 shadow-sm'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-2xl">{emoji}</span>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${tiposActivos[tipo] ? 'border-orange-500 bg-orange-500' : 'border-gray-300'}`}>
                          {tiposActivos[tipo] && (
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                          )}
                        </div>
                      </div>
                      <p className="font-semibold text-sm text-gray-800">{label}</p>
                      <p className="text-xs text-gray-400">{desc}</p>
                    </button>
                  ))}
                </div>
                {formError && <p className="text-xs text-red-500 mt-2 font-medium">{formError}</p>}
              </div>

              {/* ── MONETARIA ── */}
              {tiposActivos.monetaria && (
                <div className="rounded-2xl border border-gray-200 overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2.5 flex items-center gap-2 border-b border-gray-200">
                    <span className="text-base">💵</span>
                    <span className="text-sm font-semibold text-gray-700">Donación monetaria</span>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {montosSugeridos.map(m => (
                        <button key={m} type="button" onClick={() => setForm(f => ({ ...f, monto: String(m) }))} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${form.monto === String(m) ? 'bg-orange-500 text-white border-orange-500' : 'border-gray-200 text-gray-600 hover:border-orange-300'}`}>
                          ${m.toLocaleString('es-CL')}
                        </button>
                      ))}
                    </div>
                    <input type="number" min="1000" max={user?.rol !== 'empresa' ? 3000000 : undefined} value={form.monto} onChange={e => setForm(f => ({ ...f, monto: e.target.value }))} placeholder="O ingresa otro monto en CLP..." className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                    {user?.rol !== 'empresa' && (
                      <p className="text-xs text-gray-400 mt-1">Límite: $3.000.000 por donación. ¿Quieres donar más? <span className="text-orange-500 font-medium">Regístrate como empresa.</span></p>
                    )}
                    {form.monto && Number(form.monto) >= 1000 && (
                      <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2 flex items-center gap-2">
                        <span className="text-base">💚</span>
                        Con ${Number(form.monto).toLocaleString('es-CL')} puedes{' '}
                        {Number(form.monto) < 3000
                          ? 'contribuir con útiles escolares para un niño'
                          : Number(form.monto) < 7000
                          ? 'alimentar a una familia completa por un día'
                          : Number(form.monto) < 15000
                          ? 'vestir a un adulto para el invierno'
                          : Number(form.monto) < 30000
                          ? 'cubrir medicamentos básicos para una persona por un mes'
                          : 'impactar significativamente en la vida de varias familias'}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* ── ROPA ── */}
              {tiposActivos.ropa && (
                <div className="rounded-2xl border border-gray-200 overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2.5 flex items-center gap-2 border-b border-gray-200">
                    <span className="text-base">👕</span>
                    <span className="text-sm font-semibold text-gray-700">Ropa</span>
                    <span className="text-xs text-gray-400 ml-1">— puedes mezclar tipos y tallas</span>
                  </div>
                  <div className="p-4 space-y-3">
                    <AcceptedGuide tipo="ropa" />
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de prenda</label>
                        <select value={newPrenda.tipo} onChange={e => setNewPrenda(p => ({ ...p, tipo: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white">
                          <option>Abrigo/Chaqueta</option>
                          <option>Camisa</option>
                          <option>Polera</option>
                          <option>Pantalón</option>
                          <option>Calzado</option>
                          <option>Frazada/Ropa de cama</option>
                          <option>Accesorios (gorros/guantes)</option>
                          <option>Otro</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Talla</label>
                        <select value={newPrenda.talla} onChange={e => setNewPrenda(p => ({ ...p, talla: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white">
                          <option>XS</option><option>S</option><option>M</option><option>L</option>
                          <option>XL</option><option>XXL</option><option>Única</option><option>Niño/a</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Estado</label>
                        <select value={newPrenda.estado} onChange={e => setNewPrenda(p => ({ ...p, estado: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white">
                          <option>Muy bueno</option>
                          <option>Bueno</option>
                          <option>Regular</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Cantidad</label>
                        <input type="number" min="1" value={newPrenda.cantidad} onChange={e => setNewPrenda(p => ({ ...p, cantidad: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                      </div>
                    </div>
                    <input type="text" value={newPrenda.color} onChange={e => setNewPrenda(p => ({ ...p, color: e.target.value }))} placeholder="Color (opcional: azul, negro, rojo...)" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                    <button type="button" onClick={agregarPrenda} className="w-full py-2.5 border-2 border-dashed border-orange-300 text-orange-500 hover:bg-orange-50 font-semibold text-sm rounded-xl transition-colors flex items-center justify-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                      Agregar prenda a la lista
                    </button>
                    <ItemsList items={ropaItems} onRemove={i => setRopaItems(prev => prev.filter((_, idx) => idx !== i))} emptyText="↑ Agrega las prendas que deseas donar" />
                    {ropaError && <p className="text-xs text-red-500 font-medium">{ropaError}</p>}
                  </div>
                </div>
              )}

              {/* ── ALIMENTO ── */}
              {tiposActivos.alimento && (
                <div className="rounded-2xl border border-gray-200 overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2.5 flex items-center gap-2 border-b border-gray-200">
                    <span className="text-base">🥫</span>
                    <span className="text-sm font-semibold text-gray-700">Alimentos</span>
                  </div>
                  <div className="p-4 space-y-3">
                    <AcceptedGuide tipo="alimento" />
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de alimento</label>
                      <input type="text" value={newAlimentoItem.tipo} onChange={e => setNewAlimentoItem(a => ({ ...a, tipo: e.target.value }))} placeholder="Ej: arroz, leche en polvo, conservas de atún..." className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Cantidad</label>
                        <input type="number" min="1" value={newAlimentoItem.cantidad} onChange={e => setNewAlimentoItem(a => ({ ...a, cantidad: e.target.value }))} placeholder="Ej: 5" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Unidad</label>
                        <select value={newAlimentoItem.unidad} onChange={e => setNewAlimentoItem(a => ({ ...a, unidad: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white">
                          <option value="kg">kg</option>
                          <option value="unidades">unidades</option>
                          <option value="cajas">cajas</option>
                          <option value="litros">litros</option>
                        </select>
                      </div>
                    </div>
                    <button type="button" onClick={agregarAlimento} className="w-full py-2.5 border-2 border-dashed border-orange-300 text-orange-500 hover:bg-orange-50 font-semibold text-sm rounded-xl transition-colors flex items-center justify-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                      Agregar alimento a la lista
                    </button>
                    <ItemsList items={alimentoItems} onRemove={i => setAlimentoItems(prev => prev.filter((_, idx) => idx !== i))} emptyText="↑ Agrega los alimentos que deseas donar" />
                    {alimentoError && <p className="text-xs text-red-500 font-medium">{alimentoError}</p>}
                  </div>
                </div>
              )}

              {/* ── MÉDICA ── */}
              {tiposActivos.medica && (
                <div className="rounded-2xl border border-gray-200 overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2.5 flex items-center gap-2 border-b border-gray-200">
                    <span className="text-base">💊</span>
                    <span className="text-sm font-semibold text-gray-700">Insumos médicos</span>
                  </div>
                  <div className="p-4 space-y-3">
                    <AcceptedGuide tipo="medica" />
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Insumo</label>
                      <input type="text" value={newMedicaItem.insumo} onChange={e => setNewMedicaItem(m => ({ ...m, insumo: e.target.value }))} placeholder="Ej: Paracetamol 500mg, vendas elásticas, guantes..." className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Cantidad</label>
                      <input type="number" min="1" value={newMedicaItem.cantidad} onChange={e => setNewMedicaItem(m => ({ ...m, cantidad: e.target.value }))} placeholder="Ej: 50" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                    </div>
                    <button type="button" onClick={agregarMedica} className="w-full py-2.5 border-2 border-dashed border-orange-300 text-orange-500 hover:bg-orange-50 font-semibold text-sm rounded-xl transition-colors flex items-center justify-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                      Agregar insumo a la lista
                    </button>
                    <ItemsList items={medicaItems} onRemove={i => setMedicaItems(prev => prev.filter((_, idx) => idx !== i))} emptyText="↑ Agrega los insumos médicos que deseas donar" />
                    {medicaError && <p className="text-xs text-red-500 font-medium">{medicaError}</p>}
                  </div>
                </div>
              )}

              {/* ── Campos comunes especie ── */}
              {hayEspecie && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Dirección de retiro <span className="text-gray-400 font-normal text-xs">(opcional — si prefieren ir a buscar)</span>
                    </label>
                    <input type="text" value={direccionDonante} onChange={e => setDireccionDonante(e.target.value)} placeholder="Av. Principal 123, Santiago..." className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                  </div>
                  {user?.rol === 'empresa' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre de la empresa</label>
                      <input type="text" value={nombreEmpresa} onChange={e => setNombreEmpresa(e.target.value)} placeholder="Mi Empresa S.A." className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                    </div>
                  )}
                </div>
              )}

              {/* ── Mensaje + Anónima ── */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Mensaje (opcional)</label>
                <textarea value={form.mensaje} onChange={e => setForm(f => ({ ...f, mensaje: e.target.value }))} placeholder="Un mensaje de aliento..." rows={2} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none" />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.anonima} onChange={e => setForm(f => ({ ...f, anonima: e.target.checked }))} className="w-4 h-4 accent-orange-500" />
                <span className="text-sm text-gray-700">Donar de forma anónima</span>
              </label>

              {/* Trust bar — GoFundMe style */}
              <div className="flex flex-wrap justify-center gap-5 py-3 bg-gray-50 rounded-xl border border-gray-100">
                {[
                  { d: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', color: 'text-green-500', label: 'Donación protegida' },
                  { d: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z', color: 'text-blue-500', label: 'Datos cifrados' },
                  { d: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', color: 'text-orange-500', label: '100% transparente' },
                ].map(({ d, color, label }) => (
                  <span key={label} className="flex items-center gap-1.5 text-xs text-gray-500">
                    <svg className={`w-4 h-4 ${color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={d} />
                    </svg>
                    {label}
                  </span>
                ))}
              </div>

              <div className="flex gap-3">
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
          <div className="px-6 py-4 border-b border-gray-100">
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
                      {d.centroNombre && (
                        <p className="text-xs text-orange-500 mt-0.5 flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                          {d.centroNombre}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">{formatDate(d.fecha)}</p>
                    </div>
                    <div className="flex items-start gap-2 flex-shrink-0">
                      <div className="text-right">
                        <p className="font-bold text-orange-500">${d.monto.toLocaleString('es-CL')}</p>
                        {d.anonima && <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Anónima</span>}
                      </div>
                      <div className="flex gap-1 ml-2">
                        <button onClick={() => setDonacionDetalle(d)} className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="Ver detalle">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        </button>
                        {d.estado === 'pendiente' && (
                          <>
                            <button onClick={() => handleAbrirEditar(d)} className="p-1.5 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors" title="Editar">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </button>
                            <button onClick={() => setDonacionCancelar(d)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Cancelar">
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
              {donacionDetalle.descripcion && <div className="col-span-2"><p className="text-xs text-gray-400 mb-1">Detalle</p><p className="text-gray-700 text-sm">{donacionDetalle.descripcion}</p></div>}
              {donacionDetalle.mensaje && <div className="col-span-2"><p className="text-xs text-gray-400 mb-1">Mensaje</p><p className="italic text-gray-600">"{donacionDetalle.mensaje}"</p></div>}
            </div>
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Estado de la donación</p>
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

      {/* ═══ MODAL: Editar ═══ */}
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

      {/* ═══ MODAL: Cancelar ═══ */}
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
