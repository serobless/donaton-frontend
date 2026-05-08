import { useState } from 'react'
import { useDonacion } from '../contexts/DonacionContext'

export default function Transparencia() {
  const { donaciones, totalRecaudado, causas } = useDonacion()
  const [filtroNombre, setFiltroNombre] = useState('')
  const [filtroCausa, setFiltroCausa] = useState('todas')

  const donacionesFiltradas = donaciones.filter((d) => {
    const matchNombre =
      filtroNombre === '' ||
      d.donadorNombre.toLowerCase().includes(filtroNombre.toLowerCase())
    const matchCausa = filtroCausa === 'todas' || String(d.causaId) === filtroCausa
    return matchNombre && matchCausa
  })

  const totalDonadores = new Set(donaciones.map((d) => d.donadorEmail ?? d.donadorNombre)).size
  const promedio = donaciones.length > 0 ? Math.round(totalRecaudado / donaciones.length) : 0

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
            Registro público de todas las donaciones. En Donaton no hay secretos: cada peso es
            trazable y verificable.
          </p>

          {/* Métricas */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total recaudado', value: `$${totalRecaudado.toLocaleString('es-CL')}`, accent: true },
              { label: 'Donaciones', value: donaciones.length, accent: false },
              { label: 'Donadores únicos', value: totalDonadores, accent: false },
              { label: 'Promedio por donación', value: `$${promedio.toLocaleString('es-CL')}`, accent: false },
            ].map((m) => (
              <div
                key={m.label}
                className={`rounded-xl p-4 ${m.accent ? 'bg-orange-500 text-white' : 'bg-gray-50 border border-gray-100'}`}
              >
                <p className={`text-xs font-medium mb-1 ${m.accent ? 'text-orange-100' : 'text-gray-500'}`}>
                  {m.label}
                </p>
                <p className={`text-2xl font-extrabold ${m.accent ? 'text-white' : 'text-gray-900'}`}>
                  {m.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <input
            type="text"
            placeholder="Buscar por nombre..."
            value={filtroNombre}
            onChange={(e) => setFiltroNombre(e.target.value)}
            className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
          />
          <select
            value={filtroCausa}
            onChange={(e) => setFiltroCausa(e.target.value)}
            className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
          >
            <option value="todas">Todas las causas</option>
            {causas.map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.titulo}
              </option>
            ))}
          </select>
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
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Mensaje</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {donacionesFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                      No se encontraron donaciones con ese filtro.
                    </td>
                  </tr>
                ) : (
                  donacionesFiltradas.map((d) => (
                    <tr key={d.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-xs flex-shrink-0">
                            {d.anonima ? '?' : d.donadorNombre[0]}
                          </div>
                          <span className="font-medium text-gray-900">
                            {d.anonima ? 'Anónimo' : d.donadorNombre}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600 max-w-xs">
                        <span className="truncate block">{d.causaTitulo}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-orange-500">
                          ${d.monto.toLocaleString('es-CL')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-500 italic max-w-xs">
                        <span className="truncate block">{d.mensaje || '—'}</span>
                      </td>
                      <td className="px-6 py-4 text-gray-400 whitespace-nowrap">
                        {new Date(d.fecha).toLocaleDateString('es-CL', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
