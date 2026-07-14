import { useState } from 'react'
import type { Testimonio } from '../../types'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../lib/axios'
import { useQueryClient } from '@tanstack/react-query'

interface Props {
  testimonio: Testimonio
}

export default function TestimonioCard({ testimonio }: Props) {
  const [modalAbierto, setModalAbierto] = useState(false)
  const [eliminando, setEliminando] = useState(false)
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const esAdmin = user?.rol?.toLowerCase() === 'admin'

  async function handleEliminar(e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm('¿Eliminar este testimonio?')) return
    setEliminando(true)
    try {
      await api.delete(`/api/testimonios/${testimonio.id}`)
      queryClient.invalidateQueries({ queryKey: ['testimonios'] })
    } catch {
      alert('No se pudo eliminar el testimonio.')
      setEliminando(false)
    }
  }

  const fecha = new Date(testimonio.fechaCreacion).toLocaleDateString('es-CL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <>
      <article
        className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer flex flex-col"
        onClick={() => setModalAbierto(true)}
      >
        {testimonio.imagenUrl && (
          <img
            src={testimonio.imagenUrl}
            alt={testimonio.titulo}
            className="w-full h-48 object-cover"
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
          />
        )}
        <div className="p-6 flex flex-col flex-1">
          {/* Comilla decorativa */}
          <svg className="w-7 h-7 text-orange-200 mb-2 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
          </svg>

          <h3 className="font-bold text-gray-900 text-base mb-2 line-clamp-2 leading-snug">
            {testimonio.titulo}
          </h3>
          <div
            className="text-gray-500 text-sm leading-relaxed line-clamp-3 prose prose-sm max-w-none flex-1"
            dangerouslySetInnerHTML={{ __html: testimonio.contenido }}
          />

          <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-50">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                <span className="text-orange-600 font-bold text-xs leading-none">
                  {testimonio.autorNombre[0]?.toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800 leading-tight">{testimonio.autorNombre}</p>
                <p className="text-xs text-gray-400">{fecha}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {esAdmin && (
                <button
                  onClick={handleEliminar}
                  disabled={eliminando}
                  className="text-xs text-red-400 hover:text-red-600 disabled:opacity-50 transition-colors p-1"
                  title="Eliminar testimonio"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
              <span className="text-xs font-semibold text-orange-500 flex items-center gap-1">
                Leer más
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </span>
            </div>
          </div>
        </div>
      </article>

      {/* Modal detalle */}
      {modalAbierto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setModalAbierto(false)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Imagen de cabecera */}
            {testimonio.imagenUrl && (
              <div className="relative h-56 overflow-hidden rounded-t-3xl">
                <img
                  src={testimonio.imagenUrl}
                  alt={testimonio.titulo}
                  className="w-full h-full object-cover"
                  onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                <button
                  onClick={() => setModalAbierto(false)}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            <div className="p-8">
              {/* Botón cerrar si no hay imagen */}
              {!testimonio.imagenUrl && (
                <div className="flex justify-end mb-2">
                  <button
                    onClick={() => setModalAbierto(false)}
                    className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}

              {/* Comilla decorativa */}
              <svg className="w-10 h-10 text-orange-100 mb-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
              </svg>

              <h2 className="text-2xl font-black text-gray-900 mb-6 leading-snug" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                {testimonio.titulo}
              </h2>

              <div
                className="prose prose-gray max-w-none text-gray-700 leading-relaxed mb-8"
                dangerouslySetInnerHTML={{ __html: testimonio.contenido }}
              />

              {/* Autor */}
              <div className="flex items-center gap-3 pt-6 border-t border-gray-100">
                <div className="w-11 h-11 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-orange-600 font-black text-base">
                    {testimonio.autorNombre[0]?.toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-bold text-gray-900">{testimonio.autorNombre}</p>
                  <p className="text-sm text-gray-400">{fecha}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
