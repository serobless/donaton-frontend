import { Link } from 'react-router-dom'
import type { Causa } from '../../types'
import ProgressBar from './ProgressBar'

interface Props {
  causa: Causa
}

const categoryConfig: Record<string, { bg: string; text: string }> = {
  Educación:    { bg: 'bg-blue-100',    text: 'text-blue-700'    },
  Alimentación: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  Salud:        { bg: 'bg-rose-100',    text: 'text-rose-700'    },
  Animales:     { bg: 'bg-amber-100',   text: 'text-amber-700'   },
}

export default function CausaCard({ causa }: Props) {
  const diasRestantes =
    causa.diasRestantes ??
    Math.max(0, Math.ceil((new Date(causa.fechaFin).getTime() - Date.now()) / 86400000))
  const pct = Math.min(Math.round((causa.recaudado / causa.meta) * 100), 100)
  const cat = categoryConfig[causa.categoria] ?? { bg: 'bg-gray-100', text: 'text-gray-700' }

  return (
    <article className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 hover:-translate-y-1 flex flex-col">

      {/* ── Image ── */}
      <div className="relative h-52 overflow-hidden flex-shrink-0">
        <img
          src={causa.imagen}
          alt={causa.titulo}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
        />

        {/* Category badge — solid on image */}
        <span className={`absolute top-3 left-3 ${cat.bg} ${cat.text} text-xs font-bold px-2.5 py-1 rounded-full`}>
          {causa.categoria}
        </span>

        {/* Days left — only when active */}
        {causa.activa && diasRestantes > 0 && (
          <span className="absolute top-3 right-3 bg-white/90 text-gray-700 text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm">
            {diasRestantes} días
          </span>
        )}
      </div>

      {/* ── Content ── */}
      <div className="p-5 flex flex-col flex-1">
        <h3 className="font-bold text-gray-900 text-[1rem] leading-snug mb-2 line-clamp-2">
          {causa.titulo}
        </h3>
        <p className="text-gray-500 text-sm leading-relaxed mb-5 line-clamp-2 flex-1">
          {causa.descripcion}
        </p>

        {/* Amounts */}
        <div className="flex items-end justify-between mb-2">
          <div>
            <span className="text-orange-500 font-extrabold text-xl">
              ${causa.recaudado.toLocaleString('es-CL')}
            </span>
            <span className="text-gray-400 text-xs ml-1">recaudados</span>
          </div>
          <span className="text-gray-400 text-xs font-medium">{pct}%</span>
        </div>

        {/* Progress */}
        <ProgressBar value={causa.recaudado} max={causa.meta} showLabel={false} />

        <div className="flex items-center justify-between mt-2 mb-5">
          <span className="text-xs text-gray-400">
            Meta: ${causa.meta.toLocaleString('es-CL')}
          </span>
          {!causa.activa && (
            <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">
              ¡Meta alcanzada!
            </span>
          )}
        </div>

        <Link
          to={`/causas/${causa.id}`}
          className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-bold text-sm py-3 rounded-xl transition-colors duration-150 mt-auto"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 21.593c-.525-.445-6.703-5.728-8.079-7.183C1.722 12.109 1.5 10.5 1.5 9.25 1.5 6.527 3.675 4.5 6.25 4.5c1.52 0 2.98.716 3.75 1.903C10.77 5.216 12.23 4.5 13.75 4.5c2.575 0 4.75 2.027 4.75 4.75 0 1.25-.222 2.859-2.421 5.16C14.702 15.866 12.524 21.148 12 21.593z" />
          </svg>
          Donar ahora
        </Link>
      </div>
    </article>
  )
}
