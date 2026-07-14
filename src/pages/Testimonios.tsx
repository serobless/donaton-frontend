import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { CKEditor } from '@ckeditor/ckeditor5-react'
import {
  ClassicEditor,
  Bold, Italic, Underline, Strikethrough,
  Link, AutoLink,
  MediaEmbed,
  Essentials,
  Paragraph,
  Heading,
  BlockQuote,
  List, ListProperties,
  Alignment,
  FontSize, FontColor, FontBackgroundColor,
  Table, TableToolbar, TableCellProperties, TableProperties,
  HorizontalLine,
  Indent, IndentBlock,
  FindAndReplace,
  RemoveFormat,
  Code, CodeBlock,
  SpecialCharacters, SpecialCharactersEssentials,
  Base64UploadAdapter,
  ImageBlock, ImageInline,
  ImageCaption, ImageStyle, ImageToolbar,
  ImageUpload, ImageInsert,
  ImageResize,
  AutoImage,
} from 'ckeditor5'
import {
  SlashCommand,
  CaseChange,
  FormatPainter,
} from 'ckeditor5-premium-features'
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

  const [titulo, setTitulo] = useState('')
  const [contenido, setContenido] = useState('')
  const [charCount, setCharCount] = useState(0)
  const [imagenUrl, setImagenUrl] = useState('')
  const [formularioAbierto, setFormularioAbierto] = useState(false)
  const [guiaAbierta, setGuiaAbierta] = useState(true)
  const [error, setError] = useState('')
  const [pendienteAprobacion, setPendienteAprobacion] = useState(false)

  const { data: testimonios = [], isLoading } = useQuery({
    queryKey: ['testimonios'],
    queryFn: fetchTestimonios,
  })

  const mutation = useMutation({
    mutationFn: crearTestimonio,
    onSuccess: () => {
      setTitulo('')
      setContenido('')
      setImagenUrl('')
      setFormularioAbierto(false)
      setError('')
      setPendienteAprobacion(true)
    },
    onError: () => {
      setError('No se pudo publicar el testimonio. Intenta nuevamente.')
    },
  })

  function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    const textoPlano = contenido.replace(/<[^>]*>/g, '').trim()
    if (titulo.trim().length < 10) {
      setError('El título debe tener al menos 10 caracteres.')
      return
    }
    if (titulo.trim().length > 100) {
      setError('El título no puede superar 100 caracteres.')
      return
    }
    if (textoPlano.length < 50) {
      setError('El contenido debe tener al menos 50 caracteres.')
      return
    }
    if (textoPlano.length > 5000) {
      setError('El contenido no puede superar 5.000 caracteres.')
      return
    }
    if (imagenUrl.trim() && !/^https:\/\/.+/.test(imagenUrl.trim())) {
      setError('La URL de imagen debe comenzar con https://')
      return
    }
    const contenidoBytes = new Blob([contenido]).size
    if (contenidoBytes > 10 * 1024 * 1024) {
      setError('El contenido es demasiado grande (máx. 10MB). Usa imágenes más pequeñas o en menor cantidad.')
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
            <h2 className="text-xl font-bold text-gray-900 mb-5">Nuevo testimonio</h2>

            {/* Guía colapsable */}
            <div className="mb-6">
              <button
                type="button"
                onClick={() => setGuiaAbierta(!guiaAbierta)}
                className="w-full flex items-center justify-between bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm font-semibold text-blue-800 hover:bg-blue-100 transition-colors"
              >
                <span>📋 Antes de publicar, revisa estas indicaciones</span>
                <svg className={`w-4 h-4 transition-transform ${guiaAbierta ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {guiaAbierta && (
                <ul className="mt-2 bg-blue-50 border border-blue-100 rounded-xl px-5 py-4 space-y-1.5 text-sm text-blue-700 list-disc list-inside">
                  <li>Tu testimonio debe describir una experiencia real de donación o voluntariado en Donaton</li>
                  <li>El contenido debe ser apropiado y respetuoso con la comunidad</li>
                  <li>Puedes subir imágenes desde tu PC arrastrándolas al editor, pegándolas con <strong>Ctrl+V</strong>, o usando el botón de imagen</li>
                  <li>No incluyas información personal sensible (RUT, dirección exacta, etc.)</li>
                  <li>Para insertar videos de YouTube o Vimeo, pega la URL directamente en el editor</li>
                  <li>Mínimo 50 caracteres en el contenido · Máximo 5.000 caracteres</li>
                </ul>
              )}
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl mb-4 flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
                {error}
              </div>
            )}

            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-gray-700">Título</label>
                <span className={`text-xs ${titulo.length > 100 ? 'text-red-500 font-semibold' : titulo.length > 80 ? 'text-amber-500' : 'text-gray-400'}`}>
                  {titulo.length}/100
                </span>
              </div>
              <input
                type="text"
                value={titulo}
                onChange={e => setTitulo(e.target.value)}
                maxLength={110}
                placeholder="Ej: Mi experiencia donando ropa este invierno"
                className={`w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-orange-100 outline-none text-sm transition-colors ${
                  titulo.length > 100 ? 'border-red-300 focus:border-red-400' : 'border-gray-200 focus:border-orange-400'
                }`}
              />
              {titulo.trim().length > 0 && titulo.trim().length < 10 && (
                <p className="text-xs text-amber-600 mt-1">Mínimo 10 caracteres</p>
              )}
            </div>

            <div className="mb-5">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Contenido</label>
              <div className={`rounded-xl border overflow-hidden ${charCount > 5000 ? 'border-red-300' : 'border-gray-200'}`}>
                <CKEditor
                  editor={ClassicEditor}
                  config={{
                    licenseKey: 'eyJhbGciOiJFUzI1NiJ9.eyJleHAiOjE3ODUxOTY3OTksImp0aSI6IjA4Y2IyNWY5LTFmOTQtNDlhNi04ODkyLWQwNTI2MGMzYjJkYyIsInVzYWdlRW5kcG9pbnQiOiJodHRwczovL3Byb3h5LWV2ZW50LmNrZWRpdG9yLmNvbSIsImRpc3RyaWJ1dGlvbkNoYW5uZWwiOlsiY2xvdWQiLCJkcnVwYWwiLCJzaCJdLCJ3aGl0ZUxhYmVsIjp0cnVlLCJsaWNlbnNlVHlwZSI6InRyaWFsIiwiZmVhdHVyZXMiOlsiKiJdLCJ2YyI6ImJkNGMyNjUwIn0.u2SqPEXgN0wqTks6e-xe4U2AizDqvo6-uUtzc8G8-8nSv9kMHPxMEaLMMKTIpw84c_3WXQqKFAxwKERVKVYnjQ',
                    plugins: [
                      Essentials, Paragraph, Heading,
                      Bold, Italic, Underline, Strikethrough, Code, RemoveFormat,
                      Link, AutoLink,
                      List, ListProperties,
                      Alignment,
                      FontSize, FontColor, FontBackgroundColor,
                      BlockQuote, CodeBlock,
                      Table, TableToolbar, TableCellProperties, TableProperties,
                      HorizontalLine,
                      Indent, IndentBlock,
                      FindAndReplace,
                      MediaEmbed,
                      SpecialCharacters, SpecialCharactersEssentials,
                      Base64UploadAdapter,
                      ImageBlock, ImageInline,
                      ImageCaption, ImageStyle, ImageToolbar,
                      ImageUpload, ImageInsert,
                      ImageResize,
                      AutoImage,
                      SlashCommand, CaseChange, FormatPainter,
                    ],
                    toolbar: {
                      items: [
                        'heading', '|',
                        'bold', 'italic', 'underline', 'strikethrough', 'code', 'removeFormat', '|',
                        'fontSize', 'fontColor', 'fontBackgroundColor', '|',
                        'alignment', '|',
                        'bulletedList', 'numberedList', 'outdent', 'indent', '|',
                        'insertImage', 'link', 'blockQuote', 'insertTable', 'mediaEmbed', 'horizontalLine', 'specialCharacters', '|',
                        'codeBlock', '|',
                        'findAndReplace', 'caseChange', 'formatPainter',
                      ],
                      shouldNotGroupWhenFull: true,
                    },
                    list: {
                      properties: { styles: true, startIndex: true, reversed: true },
                    },
                    table: {
                      contentToolbar: ['tableColumn', 'tableRow', 'mergeTableCells', 'tableCellProperties', 'tableProperties'],
                    },
                    image: {
                      toolbar: [
                        'imageStyle:inline', 'imageStyle:block', 'imageStyle:side', '|',
                        'toggleImageCaption', 'imageTextAlternative', '|',
                        'resizeImage',
                      ],
                      insert: {
                        integrations: ['upload', 'url'],
                      },
                      resizeUnit: '%',
                      resizeOptions: [
                        { name: 'resizeImage:original', value: null, label: 'Original' },
                        { name: 'resizeImage:25', value: '25', label: '25%' },
                        { name: 'resizeImage:50', value: '50', label: '50%' },
                        { name: 'resizeImage:75', value: '75', label: '75%' },
                      ],
                    },
                    fontSize: {
                      options: [10, 12, 'default', 16, 18, 20, 24],
                    },
                    mediaEmbed: {
                      previewsInData: true,
                    },
                    placeholder: 'Cuenta tu historia aquí. Escribe "/" para ver comandos o arrastra una imagen.',
                  }}
                  data={contenido}
                  onChange={(_, editor) => {
                    const html = editor.getData()
                    const texto = html.replace(/<[^>]*>/g, '').trim()
                    setContenido(html)
                    setCharCount(texto.length)
                  }}
                />
              </div>
              <div className="flex items-center justify-between mt-1">
                {charCount > 0 && charCount < 50 ? (
                  <p className="text-xs text-amber-600">Mínimo 50 caracteres</p>
                ) : <span />}
                <p className={`text-xs ml-auto ${charCount > 5000 ? 'text-red-500 font-semibold' : charCount > 4000 ? 'text-amber-500' : 'text-gray-400'}`}>
                  {charCount.toLocaleString('es-CL')} / 5.000
                </p>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                URL de imagen de portada <span className="font-normal text-gray-400">(opcional)</span>
              </label>
              <input
                type="text"
                value={imagenUrl}
                onChange={e => setImagenUrl(e.target.value)}
                placeholder="https://i.imgur.com/ejemplo.jpg"
                className={`w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-orange-100 outline-none text-sm transition-colors ${
                  imagenUrl && !/^https:\/\/.+/.test(imagenUrl) ? 'border-red-300 focus:border-red-400' : 'border-gray-200 focus:border-orange-400'
                }`}
              />
              {imagenUrl && !/^https:\/\/.+/.test(imagenUrl) && (
                <p className="text-xs text-red-500 mt-1">La URL debe comenzar con https://</p>
              )}
              <p className="text-xs text-gray-400 mt-1">Usa una URL de imagen pública (Imgur, Google Photos, etc.)</p>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Publicando como <span className="font-semibold text-gray-700">{user?.nombre}</span>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setFormularioAbierto(false); setError(''); setGuiaAbierta(true) }}
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

        {/* Banner: testimonio pendiente de aprobación */}
        {pendienteAprobacion && (
          <div className="mb-8 bg-blue-50 border border-blue-200 text-blue-800 px-5 py-4 rounded-xl flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-semibold">Testimonio enviado</p>
              <p className="text-sm mt-0.5">Tu testimonio está pendiente de aprobación por un administrador. Aparecerá en esta página una vez que sea revisado.</p>
            </div>
            <button onClick={() => setPendienteAprobacion(false)} className="ml-auto text-blue-400 hover:text-blue-600 text-lg leading-none flex-shrink-0">✕</button>
          </div>
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
