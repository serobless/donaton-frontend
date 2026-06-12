import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CKEditor } from '@ckeditor/ckeditor5-react'
import {
  ClassicEditor,
  Bold,
  Italic,
  Link,
  MediaEmbed,
  Essentials,
  Paragraph,
  Heading,
  BlockQuote,
  List,
} from 'ckeditor5'
import { useAuth } from '../contexts/AuthContext'
import TestimonioCard from '../components/ui/TestimonioCard'
import api from '../lib/axios'
import type { Testimonio, TestimonioRequest } from '../types'

async function fetchTestimonios(): Promise<Testimonio[]> {
  const { data } = await api.get<Testimonio[]>('/api/testimonios')
  return data
}

async function crearTestimonio(req: TestimonioRequest): Promise<Testimonio> {
  const { data } = await api.post<Testimonio>('/api/testimonios', req)
  return data
}

export default function Testimonios() {
  const { isAuthenticated, user } = useAuth()
  const queryClient = useQueryClient()

  const [titulo, setTitulo] = useState('')
  const [contenido, setContenido] = useState('')
  const [imagenUrl, setImagenUrl] = useState('')
  const [formularioAbierto, setFormularioAbierto] = useState(false)
  const [error, setError] = useState('')

  const { data: testimonios = [], isLoading } = useQuery({
    queryKey: ['testimonios'],
    queryFn: fetchTestimonios,
  })

  const mutation = useMutation({
    mutationFn: crearTestimonio,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['testimonios'] })
      setTitulo('')
      setContenido('')
      setImagenUrl('')
      setFormularioAbierto(false)
      setError('')
    },
    onError: () => {
      setError('No se pudo publicar el testimonio. Intenta nuevamente.')
    },
  })

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!titulo.trim() || !contenido.trim()) {
      setError('El título y el contenido son obligatorios.')
      return
    }
    mutation.mutate({
      titulo: titulo.trim(),
      contenido,
      imagenUrl: imagenUrl.trim() || undefined,
    })
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Hero */}
      <section className="bg-white border-b border-gray-100 py-16">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-orange-500 font-semibold text-base mb-2 italic" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
            Historias reales
          </p>
          <h1 className="text-4xl sm:text-5xl font-black text-gray-900 mb-4" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
            Testi<span className="text-orange-500">monios</span>
          </h1>
          <p className="text-gray-500 text-lg max-w-lg mx-auto">
            Conoce las historias de quienes han donado y recibido ayuda a través de Donaton.
          </p>

          {isAuthenticated && (
            <button
              onClick={() => setFormularioAbierto(!formularioAbierto)}
              className="mt-6 inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-3 rounded-full transition-colors shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Compartir mi testimonio
            </button>
          )}
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Formulario de nuevo testimonio */}
        {isAuthenticated && formularioAbierto && (
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 mb-10"
          >
            <h2 className="text-xl font-bold text-gray-900 mb-6">Nuevo testimonio</h2>

            {error && (
              <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl mb-4">
                {error}
              </div>
            )}

            <div className="mb-5">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Título</label>
              <input
                type="text"
                value={titulo}
                onChange={e => setTitulo(e.target.value)}
                placeholder="Ej: Mi experiencia donando ropa este invierno"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none text-sm transition-colors"
                required
              />
            </div>

            <div className="mb-5">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Contenido</label>
              <div className="rounded-xl border border-gray-200 overflow-hidden">
                <CKEditor
                  editor={ClassicEditor}
                  config={{
                    licenseKey: 'GPL',
                    plugins: [Essentials, Bold, Italic, Link, MediaEmbed, Paragraph, Heading, BlockQuote, List],
                    toolbar: {
                      items: ['heading', '|', 'bold', 'italic', 'link', '|', 'bulletedList', 'numberedList', '|', 'blockQuote', 'mediaEmbed'],
                    },
                    placeholder: 'Cuenta tu historia aquí. Puedes pegar enlaces de YouTube o Vimeo para insertar videos.',
                  }}
                  data={contenido}
                  onChange={(_, editor) => setContenido(editor.getData())}
                />
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                URL de imagen de portada <span className="font-normal text-gray-400">(opcional)</span>
              </label>
              <input
                type="url"
                value={imagenUrl}
                onChange={e => setImagenUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none text-sm transition-colors"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Publicando como <span className="font-semibold text-gray-700">{user?.nombre}</span>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setFormularioAbierto(false); setError('') }}
                  className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={mutation.isPending}
                  className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-colors"
                >
                  {mutation.isPending ? 'Publicando…' : 'Publicar'}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Lista de testimonios */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map(n => (
              <div key={n} className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse">
                <div className="h-4 bg-gray-100 rounded mb-3 w-3/4" />
                <div className="h-3 bg-gray-100 rounded mb-2" />
                <div className="h-3 bg-gray-100 rounded w-5/6" />
              </div>
            ))}
          </div>
        ) : testimonios.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-orange-300" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 21.593c-.525-.445-6.703-5.728-8.079-7.183C1.722 12.109 1.5 10.5 1.5 9.25 1.5 6.527 3.675 4.5 6.25 4.5c1.52 0 2.98.716 3.75 1.903C10.77 5.216 12.23 4.5 13.75 4.5c2.575 0 4.75 2.027 4.75 4.75 0 1.25-.222 2.859-2.421 5.16C14.702 15.866 12.524 21.148 12 21.593z" />
              </svg>
            </div>
            <h3 className="text-gray-900 font-bold text-lg mb-2">Aún no hay testimonios</h3>
            <p className="text-gray-500 text-sm">
              {isAuthenticated ? '¡Sé el primero en compartir tu historia!' : 'Inicia sesión para compartir tu experiencia.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {testimonios.map(t => (
              <TestimonioCard key={t.id} testimonio={t} />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
