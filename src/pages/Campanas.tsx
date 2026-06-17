import { useState } from 'react'
import { Link } from 'react-router-dom'
import { mockCampanas } from '../lib/mockData'
import type { Campana } from '../types'

type FiltroEstado = 'todas' | 'activa' | 'proxima' | 'finalizada'

const estadoConfig = {
  activa:    { label: 'Activa',      bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  proxima:   { label: 'Próximamente', bg: 'bg-blue-100',   text: 'text-blue-700',    dot: 'bg-blue-500'    },
  finalizada:{ label: 'Finalizada',  bg: 'bg-gray-100',   text: 'text-gray-500',    dot: 'bg-gray-400'    },
}

function CampanaCard({ campana }: { campana: Campana }) {
  const cfg = estadoConfig[campana.estado]
  const pct = campana.metaUnidades > 0
    ? Math.min(Math.round((campana.unidadesActuales / campana.metaUnidades) * 100), 100)
    : 0

  const fechaFin = new Date(campana.fechaFin).toLocaleDateString('es-CL', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <article className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col">
      <div className="relative h-48 overflow-hidden bg-gray-100">
        <img
          src={campana.imagen}
          alt={campana.titulo}
          className="w-full h-full object-cover"
          onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
        />
        <span className={`absolute top-3 left-3 inline-flex items-center gap-1.5 ${cfg.bg} ${cfg.text} text-xs font-bold px-3 py-1 rounded-full`}>
          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${campana.estado === 'activa' ? 'animate-pulse' : ''}`} />
          {cfg.label}
        </span>
      </div>

      <div className="p-6 flex flex-col flex-1">
        <h3 className="font-bold text-gray-900 text-lg leading-snug mb-2 line-clamp-2">{campana.titulo}</h3>
        <p className="text-gray-500 text-sm leading-relaxed mb-4 line-clamp-2 flex-1">{campana.descripcion}</p>

        {/* Progreso */}
        <div className="mb-4">
          <div className="flex justify-between items-end mb-1.5">
            <span className="text-orange-500 font-extrabold text-xl">
              {campana.unidadesActuales.toLocaleString('es-CL')}
            </span>
            <span className="text-gray-400 text-xs font-medium">{pct}%</span>
          </div>
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${campana.estado === 'finalizada' ? 'bg-gray-400' : 'bg-orange-500'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-gray-400 text-xs mt-1">
            Meta: {campana.metaUnidades.toLocaleString('es-CL')} {campana.unidadNombre}
          </p>
        </div>

        {/* Fecha */}
        <p className="text-gray-400 text-xs mb-3">Cierre: {fechaFin}</p>

        {/* Regiones */}
        <div className="flex flex-wrap gap-1.5 mb-5">
          {campana.regiones.map(r => (
            <span key={r} className="bg-orange-50 text-orange-600 text-xs font-medium px-2.5 py-0.5 rounded-full">
              {r}
            </span>
          ))}
        </div>

        {campana.estado === 'activa' ? (
          <Link
            to="/donaciones"
            className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm py-3 rounded-xl transition-colors mt-auto"
          >
            Participar en esta campaña
          </Link>
        ) : campana.estado === 'proxima' ? (
          <button
            disabled
            className="w-full flex items-center justify-center bg-blue-50 text-blue-400 font-bold text-sm py-3 rounded-xl cursor-not-allowed mt-auto"
          >
            Próximamente disponible
          </button>
        ) : (
          <div className="w-full flex items-center justify-center gap-2 bg-gray-50 text-gray-400 font-bold text-sm py-3 rounded-xl mt-auto">
            ✓ Meta alcanzada
          </div>
        )}
      </div>
    </article>
  )
}

export default function Campanas() {
  const [filtro, setFiltro] = useState<FiltroEstado>('todas')

  const campanasFiltradas = mockCampanas
    .filter(c => filtro === 'todas' || c.estado === filtro)
    .sort((a, b) => {
      const orden = { activa: 0, proxima: 1, finalizada: 2 }
      return orden[a.estado] - orden[b.estado]
    })

  const filtros: { value: FiltroEstado; label: string; count: number }[] = [
    { value: 'todas',     label: 'Todas',       count: mockCampanas.length },
    { value: 'activa',    label: 'Activas',      count: mockCampanas.filter(c => c.estado === 'activa').length },
    { value: 'proxima',   label: 'Próximas',     count: mockCampanas.filter(c => c.estado === 'proxima').length },
    { value: 'finalizada',label: 'Finalizadas',  count: mockCampanas.filter(c => c.estado === 'finalizada').length },
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
            Colectas temáticas con metas concretas. Elige una campaña y haz que tu donación tenga el mayor impacto posible.
          </p>
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
        {campanasFiltradas.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg font-semibold">No hay campañas en esta categoría</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">
            {campanasFiltradas.map(c => <CampanaCard key={c.id} campana={c} />)}
          </div>
        )}

        {/* CTA */}
        <div className="text-center mt-16 bg-white rounded-2xl border border-gray-100 shadow-sm p-10">
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
