import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useDonacion } from '../contexts/DonacionContext'
import type { Donacion } from '../types'
import { mockDonaciones } from '../lib/mockData'
import api from '../lib/axios'

export default function Donaciones() {
  const { user } = useAuth()
  const { causasActivas } = useDonacion()
  const [donaciones, setDonaciones] = useState<Donacion[]>([])
  const [historialLoading, setHistorialLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    causaId: '',
    monto: '',
    mensaje: '',
    anonima: false,
  })
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function fetchDonaciones() {
      try {
        const { data } = await api.get<Donacion[]>('/api/donaciones')
        setDonaciones(data)
      } catch (err: unknown) {
        const hasResponse = err && typeof err === 'object' && 'response' in err
        if (!hasResponse) {
          const fallback = user
            ? mockDonaciones.filter(
                (d) => !d.anonima && (d.donadorEmail === user.email || d.donadorNombre === user.nombre)
              )
            : []
          setDonaciones(fallback)
        }
      } finally {
        setHistorialLoading(false)
      }
    }
    fetchDonaciones()
  }, [user])

  const misDonaciones = donaciones.filter(
    (d) => !d.anonima && (d.donadorEmail === user?.email || d.donadorNombre === user?.nombre)
  )

  const miTotal = misDonaciones.reduce((a, d) => a + d.monto, 0)

  async function handleDonar(e: React.FormEvent) {
    e.preventDefault()
    if (!form.causaId || !form.monto || !user) return
    setLoading(true)

    const causa = causasActivas.find((c) => c.id === Number(form.causaId))
    if (!causa) { setLoading(false); return }

    const payload = {
      causaId: causa.id,
      monto: Number(form.monto),
      mensaje: form.mensaje,
      anonima: form.anonima,
    }

    try {
      const { data: nueva } = await api.post<Donacion>('/api/donaciones', payload)
      setDonaciones((prev) => [nueva, ...prev])
    } catch (err: unknown) {
      const hasResponse = err && typeof err === 'object' && 'response' in err
      if (!hasResponse) {
        const nueva: Donacion = {
          id: Date.now(),
          donadorNombre: form.anonima ? 'Anónimo' : user.nombre,
          donadorEmail: form.anonima ? undefined : user.email,
          monto: Number(form.monto),
          causaId: causa.id,
          causaTitulo: causa.titulo,
          fecha: new Date().toISOString(),
          mensaje: form.mensaje,
          anonima: form.anonima,
        }
        setDonaciones((prev) => [nueva, ...prev])
      } else {
        setLoading(false)
        return
      }
    }

    setLoading(false)
    setSuccess(true)
    setShowForm(false)
    setForm({ causaId: '', monto: '', mensaje: '', anonima: false })
    setTimeout(() => setSuccess(false), 4000)
  }

  const montosSugeridos = [5000, 10000, 25000, 50000, 100000]

  return (
    <div className="flex-1 bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900">Mis donaciones</h1>
            <p className="text-gray-500 mt-1">
              Hola <strong>{user?.nombre}</strong> · Has aportado{' '}
              <strong className="text-orange-500">${miTotal.toLocaleString('es-CL')}</strong> en
              total
            </p>
          </div>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nueva donación
          </button>
        </div>

        {/* Toast */}
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-800 px-5 py-4 rounded-xl flex items-center gap-3">
            <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <p className="font-medium">¡Donación registrada con éxito! Gracias por tu generosidad.</p>
          </div>
        )}

        {/* Formulario */}
        {showForm && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-5">Nueva donación</h2>
            <form onSubmit={handleDonar} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Causa</label>
                <select
                  value={form.causaId}
                  onChange={(e) => setForm((f) => ({ ...f, causaId: e.target.value }))}
                  required
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
                >
                  <option value="">Selecciona una causa...</option>
                  {causasActivas.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.titulo}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Monto (CLP)
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {montosSugeridos.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, monto: String(m) }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                        form.monto === String(m)
                          ? 'bg-orange-500 text-white border-orange-500'
                          : 'border-gray-200 text-gray-600 hover:border-orange-300'
                      }`}
                    >
                      ${m.toLocaleString('es-CL')}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min="1000"
                  value={form.monto}
                  onChange={(e) => setForm((f) => ({ ...f, monto: e.target.value }))}
                  placeholder="Otro monto..."
                  required
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Mensaje (opcional)
                </label>
                <textarea
                  value={form.mensaje}
                  onChange={(e) => setForm((f) => ({ ...f, mensaje: e.target.value }))}
                  placeholder="Un mensaje de aliento..."
                  rows={2}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.anonima}
                  onChange={(e) => setForm((f) => ({ ...f, anonima: e.target.checked }))}
                  className="w-4 h-4 accent-orange-500"
                />
                <span className="text-sm text-gray-700">Donar de forma anónima</span>
              </label>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {loading && (
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  )}
                  Confirmar donación
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-5 py-3 border border-gray-200 rounded-xl text-gray-600 text-sm hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Historial */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-bold text-gray-900">Historial</h2>
            <span className="text-xs text-gray-400">{misDonaciones.length} donaciones</span>
          </div>

          {historialLoading ? (
            <div className="py-16 text-center text-gray-400 text-sm">Cargando historial...</div>
          ) : misDonaciones.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <p className="text-gray-500 text-sm">Aún no has realizado donaciones.</p>
              <button
                onClick={() => setShowForm(true)}
                className="mt-4 text-orange-500 hover:text-orange-600 font-semibold text-sm"
              >
                Hacer mi primera donación →
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {misDonaciones.map((d) => (
                <div key={d.id} className="px-6 py-4 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{d.causaTitulo}</p>
                    {d.mensaje && (
                      <p className="text-xs text-gray-500 mt-0.5 italic">"{d.mensaje}"</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(d.fecha).toLocaleDateString('es-CL', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-orange-500">${d.monto.toLocaleString('es-CL')}</p>
                    {d.anonima && (
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                        Anónima
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
