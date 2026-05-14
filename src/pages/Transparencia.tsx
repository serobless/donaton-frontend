import { useState, useEffect } from 'react'
import { useDonacion } from '../contexts/DonacionContext'
import type { DonacionExtendida, EvidenciaCampana } from '../types'
import { mockDonaciones, mockEvidencias } from '../lib/mockData'
import api from '../lib/axios'

interface BffDonacion {
  id: number
  donadorNombre: string | null
  causaNombre: string | null
  monto: number
  fecha: string
  tipoDonacion?: string
  estado?: string
}

interface TransparenciaResponse {
  donaciones?: BffDonacion[]
  totalRegistros?: number
  mensajeError?: string | null
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

function mapBffDonacion(b: BffDonacion): DonacionExtendida {
  return {
    id: b.id,
    donadorNombre: b.donadorNombre ?? 'Anónimo',
    monto: b.monto,
    causaId: 0,
    causaTitulo: b.causaNombre ?? '',
    fecha: b.fecha,
    anonima: b.donadorNombre === null,
    estado: (b.estado as DonacionExtendida['estado']) ?? 'completada',
    tipo: (b.tipoDonacion?.toLowerCase() as DonacionExtendida['tipo']) ?? 'monetaria',
  }
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h3 className="font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

const TIPO_ICONO: Record<string, string> = {
  ropa: '👕',
  alimento: '🥫',
  monetario: '💵',
  medicamento: '💊',
}

function downloadCSV(donaciones: DonacionExtendida[]) {
  const headers = ['ID', 'Donador', 'Causa', 'Monto', 'Tipo', 'Estado', 'Destino', 'Fecha', 'Mensaje']
  const rows = donaciones.map(d => [
    d.id,
    d.anonima ? 'Anónimo' : d.donadorNombre,
    d.causaTitulo,
    d.monto,
    d.tipo ?? 'monetaria',
    d.estado ?? 'completada',
    d.destino ?? '',
    new Date(d.fecha).toLocaleDateString('es-CL'),
    d.mensaje ?? '',
  ])
  const csv = [headers, ...rows].map(r => r.map(String).map(v => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `donaciones-transparencia-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function downloadPlaceholderPDF(nombre: string) {
  const content = `DONATON - ${nombre}\n\nEste documento es un placeholder generado por la plataforma Donaton.\n\nFecha de generación: ${new Date().toLocaleDateString('es-CL')}\n\nPara el documento oficial, contactar a transparencia@donaton.cl`
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${nombre.replace(/\s+/g, '-')}.txt`
  a.click()
  URL.revokeObjectURL(url)
}

export default function Transparencia() {
  const { causas } = useDonacion()
  const [donaciones, setDonaciones] = useState<DonacionExtendida[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [filtroNombre, setFiltroNombre] = useState('')
  const [filtroCausa, setFiltroCausa] = useState('todas')
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [evidenciaDetalle, setEvidenciaDetalle] = useState<EvidenciaCampana | null>(null)
  const [seccion, setSeccion] = useState<'tabla' | 'evidencias' | 'fiscal'>('tabla')

  useEffect(() => {
    async function fetchData() {
      try {
        const { data } = await api.get<TransparenciaResponse | BffDonacion[]>('/bff/transparencia')
        const rawList: BffDonacion[] = Array.isArray(data) ? data : (data.donaciones ?? [])
        setDonaciones(rawList.map(mapBffDonacion))
      } catch {
        setDonaciones(mockDonaciones)
      } finally {
        setDataLoading(false)
      }
    }
    fetchData()
  }, [])

  const donacionesFiltradas = donaciones.filter(d => {
    const matchNombre = filtroNombre === '' || d.donadorNombre.toLowerCase().includes(filtroNombre.toLowerCase())
    const matchCausa = filtroCausa === 'todas' || d.causaTitulo === filtroCausa
    const matchEstado = filtroEstado === 'todos' || (d.estado ?? 'completada') === filtroEstado
    return matchNombre && matchCausa && matchEstado
  })

  const totalRecaudado = donaciones.reduce((acc, d) => acc + d.monto, 0)
  const totalDonadores = new Set(donaciones.map(d => d.donadorEmail ?? d.donadorNombre)).size
  const promedio = donaciones.length > 0 ? Math.round(totalRecaudado / donaciones.length) : 0
  const completadas = donaciones.filter(d => (d.estado ?? 'completada') === 'completada').length

  const causasParaFiltro = causas.length > 0 ? causas : []

  const ESTADO_COLOR: Record<string, string> = {
    pendiente: 'bg-yellow-100 text-yellow-700',
    en_proceso: 'bg-blue-100 text-blue-700',
    completada: 'bg-green-100 text-green-700',
    cancelada: 'bg-red-100 text-red-700',
  }
  const ESTADO_LABEL: Record<string, string> = {
    pendiente: 'Pendiente',
    en_proceso: 'En proceso',
    completada: 'Completada',
    cancelada: 'Cancelada',
  }

  return (
    <div className="flex-1 bg-gray-50">
      {/* Hero */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h1 className="text-3xl font-extrabold text-gray-900">Transparencia</h1>
          </div>
          <p className="text-gray-500 text-lg max-w-2xl mb-8">
            Registro público de todas las donaciones. En Donaton no hay secretos: cada peso es trazable y verificable.
          </p>

          {dataLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => <div key={i} className="rounded-xl p-4 bg-gray-50 border border-gray-100 animate-pulse h-20" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Total recaudado', value: `$${totalRecaudado.toLocaleString('es-CL')}`, accent: true },
                { label: 'Donaciones', value: String(donaciones.length), accent: false },
                { label: 'Donadores únicos', value: String(totalDonadores), accent: false },
                { label: 'Completadas', value: String(completadas), accent: false },
              ].map(m => (
                <div key={m.label} className={`rounded-xl p-4 ${m.accent ? 'bg-orange-500 text-white' : 'bg-gray-50 border border-gray-100'}`}>
                  <p className={`text-xs font-medium mb-1 ${m.accent ? 'text-orange-100' : 'text-gray-500'}`}>{m.label}</p>
                  <p className={`text-2xl font-extrabold ${m.accent ? 'text-white' : 'text-gray-900'}`}>{m.value}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Tabs internos */}
        <div className="flex gap-1 bg-white border border-gray-100 rounded-xl p-1 mb-8 overflow-x-auto w-fit">
          {[
            { id: 'tabla', label: 'Registro de donaciones' },
            { id: 'evidencias', label: 'Evidencias de campaña' },
            { id: 'fiscal', label: 'Documentos fiscales' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setSeccion(t.id as typeof seccion)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${seccion === t.id ? 'bg-orange-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ═══ SECCIÓN: TABLA ═══ */}
        {seccion === 'tabla' && (
          <>
            {/* Filtros + Export */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <input
                type="text"
                placeholder="Buscar por nombre..."
                value={filtroNombre}
                onChange={e => setFiltroNombre(e.target.value)}
                className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
              />
              <select value={filtroCausa} onChange={e => setFiltroCausa(e.target.value)} className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white">
                <option value="todas">Todas las causas</option>
                {causasParaFiltro.map(c => <option key={c.id} value={c.titulo}>{c.titulo}</option>)}
              </select>
              <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white">
                <option value="todos">Todos los estados</option>
                <option value="pendiente">Pendiente</option>
                <option value="en_proceso">En proceso</option>
                <option value="completada">Completada</option>
                <option value="cancelada">Cancelada</option>
              </select>
              <button
                onClick={() => downloadCSV(donacionesFiltradas)}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors flex-shrink-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                Exportar CSV
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-bold text-gray-900">Registro de donaciones</h2>
                <span className="text-xs text-gray-400">{donacionesFiltradas.length} resultados</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left">
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Donador</th>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Causa</th>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Monto</th>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Destino</th>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Mensaje</th>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Fecha</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {dataLoading ? (
                      <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-400">Cargando donaciones...</td></tr>
                    ) : donacionesFiltradas.length === 0 ? (
                      <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-400">No se encontraron donaciones con ese filtro.</td></tr>
                    ) : (
                      donacionesFiltradas.map(d => (
                        <tr key={d.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-xs flex-shrink-0">
                                {d.anonima || !d.donadorNombre ? '?' : d.donadorNombre[0]}
                              </div>
                              <span className="font-medium text-gray-900">{d.anonima ? 'Anónimo' : d.donadorNombre}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-gray-600 max-w-[160px]"><span className="truncate block">{d.causaTitulo}</span></td>
                          <td className="px-6 py-4"><span className="font-bold text-orange-500">${d.monto.toLocaleString('es-CL')}</span></td>
                          <td className="px-6 py-4 text-gray-500 text-xs">{d.destino ?? '—'}</td>
                          <td className="px-6 py-4">
                            {d.estado ? (
                              <span className={`text-xs px-2 py-1 rounded-full font-medium ${ESTADO_COLOR[d.estado] ?? ''}`}>
                                {ESTADO_LABEL[d.estado] ?? d.estado}
                              </span>
                            ) : <span className="text-xs text-gray-400">—</span>}
                          </td>
                          <td className="px-6 py-4 text-gray-500 italic max-w-xs"><span className="truncate block">{d.mensaje || '—'}</span></td>
                          <td className="px-6 py-4 text-gray-400 whitespace-nowrap">
                            {formatDate(d.fecha)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ═══ SECCIÓN: EVIDENCIAS ═══ */}
        {seccion === 'evidencias' && (
          <div>
            <p className="text-gray-500 mb-6">Registro verificable de campañas completadas, con métricas e información detallada de cada operación.</p>
            <div className="relative">
              {/* Línea vertical del timeline */}
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-orange-200" />
              <div className="space-y-8">
                {mockEvidencias.map(ev => (
                  <div key={ev.id} className="relative flex gap-6">
                    {/* Punto del timeline */}
                    <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center text-white text-xl flex-shrink-0 z-10 shadow-md">
                      {TIPO_ICONO[ev.tipo]}
                    </div>
                    {/* Card */}
                    <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div>
                          <h3 className="font-bold text-gray-900 text-lg">{ev.titulo}</h3>
                          <p className="text-sm text-gray-400 mt-0.5">{new Date(ev.fecha).toLocaleDateString('es-CL', { dateStyle: 'long' })}</p>
                        </div>
                        <button
                          onClick={() => setEvidenciaDetalle(ev)}
                          className="flex-shrink-0 px-4 py-2 bg-orange-50 hover:bg-orange-100 text-orange-600 font-semibold text-sm rounded-xl transition-colors"
                        >
                          Ver evidencia
                        </button>
                      </div>
                      <p className="text-gray-600 text-sm mb-4">{ev.descripcion}</p>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-gray-50 rounded-xl p-3 text-center">
                          <p className="text-lg font-extrabold text-gray-900">{ev.beneficiarios.toLocaleString('es-CL')}</p>
                          <p className="text-xs text-gray-400 mt-0.5">Beneficiarios</p>
                        </div>
                        <div className="bg-orange-50 rounded-xl p-3 text-center">
                          <p className="text-lg font-extrabold text-orange-600">${ev.monto.toLocaleString('es-CL')}</p>
                          <p className="text-xs text-gray-400 mt-0.5">Invertidos</p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-3 text-center">
                          <p className="text-lg font-extrabold text-gray-900">{ev.centrosBeneficiados?.length ?? 0}</p>
                          <p className="text-xs text-gray-400 mt-0.5">Centros</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══ SECCIÓN: FISCAL ═══ */}
        {seccion === 'fiscal' && (
          <div>
            <p className="text-gray-500 mb-6">Documentos oficiales de Donaton para la transparencia fiscal y rendición de cuentas.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
              {[
                {
                  titulo: 'Declaración de Impuestos 2024',
                  descripcion: 'Formulario 22 presentado al Servicio de Impuestos Internos correspondiente al año tributario 2024.',
                  icono: '📋',
                  color: 'bg-blue-50 border-blue-100',
                  iconBg: 'bg-blue-100',
                  label: 'Descargar PDF',
                  nombre: 'Declaracion-Impuestos-2024',
                },
                {
                  titulo: 'Memoria Anual 2024',
                  descripcion: 'Informe completo de actividades, impacto social y gestión financiera de Donaton durante el año 2024.',
                  icono: '📊',
                  color: 'bg-orange-50 border-orange-100',
                  iconBg: 'bg-orange-100',
                  label: 'Descargar PDF',
                  nombre: 'Memoria-Anual-2024',
                },
                {
                  titulo: 'Auditoría Externa 2024',
                  descripcion: 'Informe de auditoría independiente realizado por Ernst & Young Chile sobre las cuentas de Donaton 2024.',
                  icono: '🔍',
                  color: 'bg-green-50 border-green-100',
                  iconBg: 'bg-green-100',
                  label: 'Ver informe',
                  nombre: 'Auditoria-Externa-2024',
                },
              ].map(doc => (
                <div key={doc.titulo} className={`rounded-2xl border p-6 ${doc.color}`}>
                  <div className={`w-12 h-12 ${doc.iconBg} rounded-xl flex items-center justify-center text-2xl mb-4`}>
                    {doc.icono}
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">{doc.titulo}</h3>
                  <p className="text-sm text-gray-500 mb-4 leading-relaxed">{doc.descripcion}</p>
                  <button
                    onClick={() => downloadPlaceholderPDF(doc.nombre)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 font-semibold text-sm rounded-xl transition-colors shadow-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    {doc.label}
                  </button>
                </div>
              ))}
            </div>

            {/* Info adicional */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-bold text-gray-900 mb-4">Compromiso de transparencia</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { titulo: 'Registro SII', desc: 'Donaton está registrada como organización sin fines de lucro bajo RUT 76.123.456-7, con exención de IVA.' },
                  { titulo: 'Donación deducible', desc: 'Las donaciones realizadas a través de nuestra plataforma son deducibles de impuestos según la Ley 19.885.' },
                  { titulo: 'Auditoría anual', desc: 'Cada año realizamos una auditoría externa independiente para garantizar el correcto uso de los fondos.' },
                  { titulo: 'Contacto', desc: 'Para consultas sobre transparencia: transparencia@donaton.cl o llama al +56 2 2345 6789.' },
                ].map(item => (
                  <div key={item.titulo} className="flex gap-3">
                    <div className="w-2 h-2 rounded-full bg-orange-500 mt-2 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{item.titulo}</p>
                      <p className="text-sm text-gray-500 mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Promedio por donación visible */}
            <div className="mt-6 bg-gray-50 border border-gray-100 rounded-2xl p-4 flex items-center gap-4">
              <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
              </div>
              <div>
                <p className="text-sm text-gray-500">Promedio por donación</p>
                <p className="font-bold text-gray-900">${promedio.toLocaleString('es-CL')}</p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-sm text-gray-500">Donadores únicos</p>
                <p className="font-bold text-gray-900">{totalDonadores}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ═══ MODAL: Evidencia detalle ═══ */}
      {evidenciaDetalle && (
        <Modal title={evidenciaDetalle.titulo} onClose={() => setEvidenciaDetalle(null)}>
          <div className="space-y-4">
            <p className="text-sm text-gray-500">{evidenciaDetalle.descripcion}</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-xl font-extrabold text-gray-900">{evidenciaDetalle.beneficiarios.toLocaleString('es-CL')}</p>
                <p className="text-xs text-gray-400">Beneficiarios</p>
              </div>
              <div className="bg-orange-50 rounded-xl p-3 text-center">
                <p className="text-xl font-extrabold text-orange-600">${evidenciaDetalle.monto.toLocaleString('es-CL')}</p>
                <p className="text-xs text-gray-400">Invertidos</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-xl font-extrabold text-gray-900">{new Date(evidenciaDetalle.fecha).getFullYear()}</p>
                <p className="text-xs text-gray-400">Año</p>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Detalle de la campaña</p>
              <ul className="space-y-2">
                {evidenciaDetalle.detalle.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <svg className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            {evidenciaDetalle.centrosBeneficiados && evidenciaDetalle.centrosBeneficiados.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Centros beneficiados</p>
                <div className="flex flex-wrap gap-2">
                  {evidenciaDetalle.centrosBeneficiados.map(c => (
                    <span key={c} className="text-xs bg-orange-50 text-orange-700 px-2.5 py-1 rounded-full">{c}</span>
                  ))}
                </div>
              </div>
            )}
            <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-sm text-green-700">
              <strong>Verificado</strong> · Esta campaña fue auditada y verificada por el equipo de transparencia de Donaton.
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
