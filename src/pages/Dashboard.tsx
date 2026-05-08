import { useDonacion } from '../contexts/DonacionContext'
import { useAuth } from '../contexts/AuthContext'
import ProgressBar from '../components/ui/ProgressBar'

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className={`rounded-2xl p-6 ${color}`}>
      <p className="text-sm font-medium opacity-80 mb-1">{label}</p>
      <p className="text-3xl font-extrabold">{value}</p>
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const { causas, donaciones, totalRecaudado, topDonadores } = useDonacion()

  const causasActivas = causas.filter((c) => c.activa)
  const totalMetas = causas.reduce((a, c) => a + c.meta, 0)
  const pctGlobal = Math.round((totalRecaudado / totalMetas) * 100)

  const donacionesPorCausa = causas.map((c) => ({
    ...c,
    totalCausa: donaciones.filter((d) => d.causaId === c.id).reduce((a, d) => a + d.monto, 0),
    count: donaciones.filter((d) => d.causaId === c.id).length,
  }))

  return (
    <div className="flex-1 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900">Dashboard Admin</h1>
          <p className="text-gray-500 mt-1">
            Bienvenido, <strong>{user?.nombre}</strong> · Última actualización: hoy
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <StatCard
            label="Total recaudado"
            value={`$${totalRecaudado.toLocaleString('es-CL')}`}
            color="bg-orange-500 text-white"
          />
          <StatCard
            label="Donaciones"
            value={String(donaciones.length)}
            color="bg-white border border-gray-100 text-gray-900"
          />
          <StatCard
            label="Causas activas"
            value={String(causasActivas.length)}
            color="bg-white border border-gray-100 text-gray-900"
          />
          <StatCard
            label="% Meta global"
            value={`${pctGlobal}%`}
            color="bg-emerald-500 text-white"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Causas */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900">Estado de causas</h2>
              <span className="text-xs text-gray-400">{causas.length} en total</span>
            </div>
            <div className="divide-y divide-gray-50">
              {donacionesPorCausa.map((c) => (
                <div key={c.id} className="px-6 py-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0 pr-4">
                      <p className="font-semibold text-gray-900 text-sm truncate">{c.titulo}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {c.count} donaciones · {c.categoria}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-orange-500 text-sm">
                        ${c.totalCausa.toLocaleString('es-CL')}
                      </p>
                      <span
                        className={`inline-block mt-0.5 text-xs px-2 py-0.5 rounded-full font-medium ${
                          c.activa
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {c.activa ? 'Activa' : 'Cerrada'}
                      </span>
                    </div>
                  </div>
                  <ProgressBar value={c.recaudado} max={c.meta} showLabel={false} />
                  <p className="text-xs text-gray-400 mt-1">
                    ${c.recaudado.toLocaleString('es-CL')} de ${c.meta.toLocaleString('es-CL')}
                  </p>
                </div>
              ))}
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
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      i === 0 ? 'bg-yellow-400 text-yellow-900' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {i + 1}
                  </span>
                  <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-sm flex-shrink-0">
                    {d.nombre[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{d.nombre}</p>
                  </div>
                  <p className="text-sm font-bold text-orange-500 flex-shrink-0">
                    ${d.totalDonado.toLocaleString('es-CL')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Últimas donaciones */}
        <div className="mt-6 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-bold text-gray-900">Últimas donaciones</h2>
            <span className="text-xs text-gray-400">{donaciones.length} registros</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Donador</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Causa</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Monto</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {donaciones.slice(0, 10).map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-3 font-medium text-gray-900">
                      {d.anonima ? 'Anónimo' : d.donadorNombre}
                    </td>
                    <td className="px-6 py-3 text-gray-600 max-w-xs truncate">{d.causaTitulo}</td>
                    <td className="px-6 py-3 font-bold text-orange-500">
                      ${d.monto.toLocaleString('es-CL')}
                    </td>
                    <td className="px-6 py-3 text-gray-400">
                      {new Date(d.fecha).toLocaleDateString('es-CL')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
