import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../lib/axios'

type EstadoCampana = 'activa' | 'finalizada'

interface CausaApi {
  id: number
  titulo: string
  descripcion?: string
  imagenUrl?: string
  meta: number
  recaudado: number
  activa: boolean
  categoria: string
  diasRestantes?: number
  fechaInicio?: string
  fechaFin?: string
}

interface CausaDisplay {
  id: number
  titulo: string
  descripcion: string
  imagen: string
  categoria: string
  estado: EstadoCampana
  meta: number
  recaudado: number
  diasRestantes?: number
  fechaInicio?: string
  fechaFin?: string
}

const estadoConfig = {
  activa:     { label: 'Activa',     bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  finalizada: { label: 'Finalizada', bg: 'bg-gray-100',    text: 'text-gray-500',    dot: 'bg-gray-400'    },
}

function CausaCard({ causa }: { causa: CausaDisplay }) {
  const cfg = estadoConfig[causa.estado]
  const pct = causa.meta > 0
    ? Math.min(Math.round((causa.recaudado / causa.meta) * 100), 100)
    : 0

  return (
    <article className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col">
      <div className="relative h-48 overflow-hidden bg-gray-100">
        {causa.imagen ? (
          <img
            src={causa.imagen}
            alt={causa.titulo}
            className="w-full h-full object-cover"
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-orange-50">
            <svg className="w-12 h-12 text-orange-200" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 21.593c-.525-.445-6.703-5.728-8.079-7.183C1.722 12.109 1.5 10.5 1.5 9.25 1.5 6.527 3.675 4.5 6.25 4.5c1.52 0 2.98.716 3.75 1.903C10.77 5.216 12.23 4.5 13.75 4.5c2.575 0 4.75 2.027 4.75 4.75 0 1.25-.222 2.859-2.421 5.16C14.702 15.866 12.524 21.148 12 21.593z" />
            </svg>
          </div>
        )}
        <span className={`absolute top-3 left-3 inline-flex items-center gap-1.5 ${cfg.bg} ${cfg.text} text-xs font-bold px-3 py-1 rounded-full`}>
          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${causa.estado === 'activa' ? 'animate-pulse' : ''}`} />
          {cfg.label}
        </span>
        <span className="absolute top-3 right-3 bg-white/90 text-gray-600 text-xs font-medium px-2 py-1 rounded-full">
          {causa.categoria}
        </span>
      </div>

      <div className="p-6 flex flex-col flex-1">
        <h3 className="font-bold text-gray-900 text-lg leading-snug mb-1 line-clamp-2">{causa.titulo}</h3>
        {causa.estado === 'activa' && (
          <span className="inline-flex items-center gap-1 text-xs text-green-600 font-semibold mb-2">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Causa verificada
          </span>
        )}
        <p className="text-gray-500 text-sm leading-relaxed mb-4 line-clamp-2 flex-1">{causa.descripcion}</p>

        {/* Progreso */}
        <div className="mb-4">
          <div className="flex justify-between items-end mb-1.5">
            <span className="text-orange-500 font-extrabold text-xl">
              ${causa.recaudado.toLocaleString('es-CL')}
            </span>
            <span className="text-gray-400 text-xs font-medium">{pct}%</span>
          </div>
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${causa.estado === 'finalizada' ? 'bg-gray-400' : 'bg-orange-500'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-gray-400 text-xs mt-1">Meta: ${causa.meta.toLocaleString('es-CL')}</p>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-0.5 mb-3">
          {causa.fechaInicio && (
            <p className="text-gray-400 text-xs">
              Inicio: {new Date(causa.fechaInicio + 'T12:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
          )}
          {causa.fechaFin && (
            <p className="text-gray-400 text-xs">
              Fin: {new Date(causa.fechaFin + 'T12:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
          )}
          {causa.diasRestantes != null && causa.estado === 'activa' && (
            <p className="text-gray-400 text-xs">{causa.diasRestantes} días restantes</p>
          )}
        </div>

        {causa.estado === 'activa' ? (
          <Link
            to={`/donaciones?causaId=${causa.id}`}
            className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm py-3 rounded-xl transition-colors mt-auto"
          >
            Participar en esta causa
          </Link>
        ) : (
          <div className="w-full flex items-center justify-center gap-2 bg-gray-50 text-gray-400 font-bold text-sm py-3 rounded-xl mt-auto">
            ✓ Causa finalizada
          </div>
        )}
      </div>
    </article>
  )
}

export default function Campanas() {
  const [causas, setCausas] = useState<CausaDisplay[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState<EstadoCampana | 'todas'>('todas')

  useEffect(() => {
    api.get<CausaApi[]>('/api/causas')
      .then(({ data }) => {
        setCausas(data.map(c => ({
          id: c.id,
          titulo: c.titulo,
          descripcion: c.descripcion ?? '',
          imagen: c.imagenUrl ?? '',
          categoria: c.categoria,
          estado: c.activa ? 'activa' : 'finalizada',
          meta: c.meta,
          recaudado: c.recaudado,
          diasRestantes: c.diasRestantes,
          fechaInicio: c.fechaInicio,
          fechaFin: c.fechaFin,
        })))
      })
      .catch(() => setCausas([]))
      .finally(() => setLoading(false))
  }, [])

  const causasFiltradas = causas
    .filter(c => filtro === 'todas' || c.estado === filtro)
    .sort((a, b) => (a.estado === 'activa' ? -1 : 1) - (b.estado === 'activa' ? -1 : 1))

  const filtros = [
    { value: 'todas' as const,     label: 'Todas',       count: causas.length },
    { value: 'activa' as const,    label: 'Activas',     count: causas.filter(c => c.estado === 'activa').length },
    { value: 'finalizada' as const,label: 'Finalizadas', count: causas.filter(c => c.estado === 'finalizada').length },
  ]

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Hero */}
      <section className="bg-white border-b border-gray-100 py-16">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-orange-500 font-semibold text-base mb-2 italic" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
            Iniciativas solidarias
          </p>
          <h1 className="text-4xl sm:text-5xl font-black text-gray-900 mb-4" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
            Cam<span className="text-orange-500">pañas</span>
          </h1>
          <p className="text-gray-500 text-lg max-w-lg mx-auto">
            Causas activas con metas concretas. Elige una y haz que tu donación tenga el mayor impacto posible.
          </p>
          {!loading && causas.length > 0 && (
            <div className="flex flex-wrap justify-center gap-10 mt-10 pt-8 border-t border-gray-100">
              {[
                { value: causas.filter(c => c.estado === 'activa').length, label: 'causas activas' },
                { value: `$${causas.reduce((a, c) => a + c.recaudado, 0).toLocaleString('es-CL')}`, label: 'recaudados en total' },
                { value: causas.length, label: 'campañas históricas' },
              ].map(({ value, label }) => (
                <div key={label} className="text-center">
                  <p className="text-3xl font-black text-orange-500">{value}</p>
                  <p className="text-xs text-gray-400 mt-1 uppercase tracking-wide">{label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Filtros */}
        <div className="flex flex-wrap gap-2 mb-10 justify-center">
          {filtros.map(f => (
            <button
              key={f.value}
              onClick={() => setFiltro(f.value)}
              className={`inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold transition-colors ${
                filtro === f.value
                  ? 'bg-orange-500 text-white shadow-md'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-orange-300 hover:text-orange-500'
              }`}
            >
              {f.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${filtro === f.value ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
                {f.count}
              </span>
            </button>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">
            {[1, 2, 3].map(n => (
              <div key={n} className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse h-80">
                <div className="h-48 bg-gray-100 rounded-xl mb-4" />
                <div className="h-4 bg-gray-100 rounded mb-2 w-3/4" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : causasFiltradas.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg font-semibold">No hay causas en esta categoría</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">
            {causasFiltradas.map(c => <CausaCard key={c.id} causa={c} />)}
          </div>
        )}

        {/* Cómo funciona — GoFundMe style */}
        <div className="mt-16 bg-white rounded-2xl border border-gray-100 shadow-sm p-10">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-black text-gray-900" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
              ¿Cómo funciona <span className="text-orange-500">Donaton</span>?
            </h2>
            <p className="text-gray-400 text-sm mt-2">Tu donación llega directo a quienes más lo necesitan</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
              {
                step: '1', title: 'Elige una causa',
                desc: 'Navega las campañas activas y elige la que más te mueva. Filtra por categoría y ve el progreso en tiempo real.',
                icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
              },
              {
                step: '2', title: 'Haz tu donación',
                desc: 'Dona dinero, ropa, alimentos o insumos médicos. Combina varios tipos en una sola entrega y elige si deseas ser anónimo.',
                icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z',
              },
              {
                step: '3', title: 'Sigue tu impacto',
                desc: 'Revisa el estado de tu donación en todo momento desde tu perfil. Al completarse la causa recibirás la confirmación.',
                icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
              },
            ].map(({ step, title, desc, icon }) => (
              <div key={step} className="text-center">
                <div className="relative w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={icon} />
                  </svg>
                  <span className="absolute -top-2 -right-2 w-6 h-6 bg-orange-500 text-white text-xs font-black rounded-full flex items-center justify-center">{step}</span>
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-8 bg-white rounded-2xl border border-gray-100 shadow-sm p-10">
          <h2 className="text-2xl font-black text-gray-900 mb-3" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
            ¿Quieres proponer una campaña?
          </h2>
          <p className="text-gray-500 text-sm mb-6 max-w-md mx-auto">
            Si representas a una organización o tienes una iniciativa solidaria, contáctanos para evaluar una nueva campaña en Donaton.
          </p>
          <a
            href="mailto:contacto@donaton.cl"
            className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold px-8 py-3 rounded-full transition-colors shadow-sm"
          >
            Contactar al equipo
          </a>
        </div>
      </div>
    </main>
  )
}
