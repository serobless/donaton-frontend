import type { Testimonio } from '../../types'

interface Props {
  testimonio: Testimonio
}

export default function TestimonioCard({ testimonio }: Props) {
  const fecha = new Date(testimonio.fechaCreacion).toLocaleDateString('es-CL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <article className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      {testimonio.imagenUrl && (
        <img
          src={testimonio.imagenUrl}
          alt={testimonio.titulo}
          className="w-full h-44 object-cover"
          onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
        />
      )}
      <div className="p-6">
        <h3 className="font-bold text-gray-900 text-lg mb-3 line-clamp-2">{testimonio.titulo}</h3>
        <div
          className="text-gray-600 text-sm leading-relaxed mb-4 line-clamp-4 prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: testimonio.contenido }}
        />
        <div className="flex items-center gap-2 pt-3 border-t border-gray-50">
          <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
            <span className="text-orange-600 font-bold text-xs leading-none">
              {testimonio.autorNombre[0]?.toUpperCase()}
            </span>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">{testimonio.autorNombre}</p>
            <p className="text-xs text-gray-400">{fecha}</p>
          </div>
        </div>
      </div>
    </article>
  )
}
