import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useDonacion } from '../contexts/DonacionContext'
import CausaCard from '../components/ui/CausaCard'
import MapaCentros from '../components/ui/MapaCentros'
import { useCountUp } from '../lib/useCountUp'
import { mockCentrosAcopio, mockImpactoRegion, mockPartners } from '../lib/mockData'
import api from '../lib/axios'
import type { CentroAcopio, Necesidad } from '../types'

/* ─── Animated stat ─── */
function AnimatedStat({ target, prefix = '', suffix = '', label, icon }: {
  target: number; prefix?: string; suffix?: string; label: string; icon: React.ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [fired, setFired] = useState(false)
  const { value, start } = useCountUp(target, 1600, false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !fired) { setFired(true); start() }
    }, { threshold: 0.6 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [fired])
  return (
    <div ref={ref} className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
      <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">{icon}</div>
      <div className="text-center sm:text-left">
        <p className="text-3xl font-extrabold text-gray-900 leading-none">{prefix}{value.toLocaleString('es-CL')}{suffix}</p>
        <p className="text-sm text-gray-500 mt-1">{label}</p>
      </div>
    </div>
  )
}

/* ─── Floating hero image ─── */
function HeroImg({ src, size, className }: { src: string; size: 'sm' | 'md' | 'lg'; className?: string }) {
  const dim = 'w-52 h-52'
  return (
    <div className={`absolute ${dim} rounded-full overflow-hidden ring-4 ring-white shadow-xl ${className ?? ''}`}>
      <img src={src} alt="" className="w-full h-full object-cover" />
    </div>
  )
}

const MEDALS = [
  { label: '🥇', ring: 'ring-yellow-400', bg: 'bg-yellow-50' },
  { label: '🥈', ring: 'ring-gray-400', bg: 'bg-gray-50' },
  { label: '🥉', ring: 'ring-orange-400', bg: 'bg-orange-50' },
  { label: '4', ring: 'ring-gray-300', bg: 'bg-gray-50' },
  { label: '5', ring: 'ring-gray-300', bg: 'bg-gray-50' },
]

const HERO_IMGS = {
  a: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=200&h=200&q=80&fit=crop',
  b: 'https://images.unsplash.com/photo-1509099836639-18ba1795216d?w=200&h=200&q=80&fit=crop',
  c: 'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=200&h=200&q=80&fit=crop',
  d: 'https://images.unsplash.com/photo-1593113616828-6f22bca04804?w=200&h=200&q=80&fit=crop',
  e: 'https://images.unsplash.com/photo-1531206715517-5c0ba140b2b8?w=200&h=200&q=80&fit=crop',
  f: 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=200&h=200&q=80&fit=crop',
}

const NIVEL_COLOR = ['fill-orange-100', 'fill-orange-200', 'fill-orange-300', 'fill-orange-400', 'fill-orange-500']

/* Fotos de perfil para top donadores (por posición 0-4) */
const DONADOR_FOTOS = [
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100',
]

const ORG_KEYWORDS = ['empresa', 'club', 'farmacia', 'fundacion', 'fundación', 'corp', 'ltda', 'spa', 'srl', 'asociacion', 'asociación', 'colegio', 'instituto', 'laboratorio']
const ANON_KEYWORDS = ['anonimo', 'anónimo', 'anonymous']

function getAvatarType(nombre: string): 'org' | 'anon' | 'person' {
  const lower = (nombre ?? '').toLowerCase()
  if (ANON_KEYWORDS.some(k => lower.includes(k))) return 'anon'
  if (ORG_KEYWORDS.some(k => lower.includes(k))) return 'org'
  return 'person'
}

/* Logos de partners por ID (null = sin logo, usar badge) */
const PARTNER_LOGOS: Record<number, string | null> = {
  1: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Falabella_logo.svg/200px-Falabella_logo.svg.png',
  2: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Sodimac_logo.svg/200px-Sodimac_logo.svg.png',
  3: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Flag_of_the_Red_Cross.svg/100px-Flag_of_the_Red_Cross.svg.png',
  4: null,
  5: null,
  6: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/BancoEstado_logo.svg/200px-BancoEstado_logo.svg.png',
}

export default function Home() {
  const { causasActivas, topDonadores, totalDonaciones, totalRecaudado } = useDonacion()
  const causasHome = causasActivas.slice(0, 3)

  let _personPhotoIdx = 0
  const donadorAvatarData = topDonadores.map(d => {
    const type = getAvatarType(d.nombre ?? '')
    return { type, photoIdx: type === 'person' ? _personPhotoIdx++ : -1 }
  })

  // Donación especial — form
  const [formEspecial, setFormEspecial] = useState({ nombre: '', tipoBien: '', descripcion: '', region: '', telefono: '' })
  const [enviandoEspecial, setEnviandoEspecial] = useState(false)
  const [exitoEspecial, setExitoEspecial] = useState(false)

  // Voluntariado — form
  const [formVoluntario, setFormVoluntario] = useState({ nombre: '', email: '', telefono: '', region: '', disponibilidad: 'ambos', areaInteres: 'logistica' })
  const [enviandoVol, setEnviandoVol] = useState(false)
  const [exitoVol, setExitoVol] = useState(false)

  // Centros — carga desde API con fallback a mock
  const [centros, setCentros] = useState<CentroAcopio[]>(mockCentrosAcopio)
  const [necesidades, setNecesidades] = useState<Necesidad[]>([])
  useEffect(() => {
    api.get<CentroAcopio[]>('/api/centros')
      .then(({ data }) => { if (data.length > 0) setCentros(data) })
      .catch(() => { /* usa mock como fallback */ })
    api.get<Necesidad[]>('/api/necesidades')
      .then(({ data }) => { if (data.length > 0) setNecesidades(data) })
      .catch(() => { /* sin necesidades del backend, no mostramos badges */ })
  }, [])

  const [regionFiltro, setRegionFiltro] = useState('Todas')
  const regiones = ['Todas', ...Array.from(new Set(centros.map(c => c.region)))]
  const centrosFiltrados = regionFiltro === 'Todas' ? centros : centros.filter(c => c.region === regionFiltro)

  // Campaña invierno — progreso simulado
  const campanaMeta = 5000
  const campanaActual = 2847
  const campanaPct = Math.round((campanaActual / campanaMeta) * 100)

  function handleEspecial(e: React.FormEvent) {
    e.preventDefault()
    setEnviandoEspecial(true)
    setTimeout(() => {
      setEnviandoEspecial(false)
      setExitoEspecial(true)
      setFormEspecial({ nombre: '', tipoBien: '', descripcion: '', region: '', telefono: '' })
      setTimeout(() => setExitoEspecial(false), 5000)
    }, 1200)
  }

  function handleVoluntario(e: React.FormEvent) {
    e.preventDefault()
    setEnviandoVol(true)
    setTimeout(() => {
      setEnviandoVol(false)
      setExitoVol(true)
      setFormVoluntario({ nombre: '', email: '', telefono: '', region: '', disponibilidad: 'ambos', areaInteres: 'logistica' })
      setTimeout(() => setExitoVol(false), 5000)
    }, 1200)
  }

  const inputCls = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
  const selectCls = `${inputCls} bg-white`

  return (
    <main className="flex-1">

      {/* ══════ HERO ══════ */}
      <section className="relative bg-white min-h-[600px] flex items-center py-20 overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[700px] h-[500px] rounded-full bg-orange-50 blur-3xl opacity-70" />
        </div>
        <HeroImg src={HERO_IMGS.a} size="lg" className="hidden xl:block top-16 left-[4%]" />
        <HeroImg src={HERO_IMGS.b} size="md" className="hidden xl:block top-52 left-[11%]" />
        <HeroImg src={HERO_IMGS.c} size="sm" className="hidden xl:block top-[68%] left-[6%]" />
        <HeroImg src={HERO_IMGS.d} size="lg" className="hidden xl:block top-14 right-[6%]" />
        <HeroImg src={HERO_IMGS.e} size="md" className="hidden xl:block top-44 right-[3%]" />
        <HeroImg src={HERO_IMGS.f} size="sm" className="hidden xl:block top-[65%] right-[10%]" />
        <div className="relative max-w-6xl mx-auto px-6 w-full text-center z-10">
          <span className="inline-flex items-center gap-2 bg-orange-50 border border-orange-100 text-orange-600 text-xs font-semibold px-4 py-1.5 rounded-full mb-8 tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
            Plataforma solidaria · Chile
          </span>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-gray-900 leading-[1.05] mb-6 mx-auto max-w-3xl" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
            Juntos podemos <span className="text-orange-500">cambiar vidas</span> en Chile
          </h1>
          <p className="text-lg sm:text-xl text-gray-500 max-w-xl mx-auto mb-10 leading-relaxed">
            Conecta tu generosidad con causas reales. Sin intermediarios — el <strong className="text-gray-800 font-semibold">100% de tu donación llega a quien lo necesita.</strong>
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="#causas" className="bg-orange-500 hover:bg-orange-600 text-white font-bold text-base px-9 py-4 rounded-full transition-colors duration-150 shadow-lg shadow-orange-200 hover:shadow-orange-300">Ver causas activas</a>
            <Link to="/transparencia" className="flex items-center gap-2 text-gray-600 hover:text-orange-500 font-semibold text-base transition-colors duration-150">
              Cómo funciona
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </Link>
          </div>
          <div className="flex items-center justify-center gap-3 mt-10">
            <div className="flex -space-x-2.5">
              {[
                { inicial: 'V', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60' },
                { inicial: 'C', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60' },
                { inicial: 'M', url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60' },
                { inicial: 'A', url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=60' },
                { inicial: 'R', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=60' },
              ].map(({ inicial, url }) => (
                <div key={inicial} className="w-9 h-9 rounded-full bg-orange-400 ring-2 ring-white overflow-hidden relative flex items-center justify-center text-white text-xs font-bold">
                  <span className="absolute inset-0 flex items-center justify-center">{inicial}</span>
                  <img src={url} alt={inicial} className="absolute inset-0 w-full h-full object-cover" onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
                </div>
              ))}
            </div>
            <p className="text-sm text-gray-500"><strong className="text-gray-900">+{topDonadores.length} donadores</strong> ya están ayudando</p>
          </div>
        </div>
      </section>

      {/* ══════ STATS BAR ══════ */}
      <section className="bg-amber-50 border-y border-amber-100 py-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-4 divide-y sm:divide-y-0 sm:divide-x divide-amber-200">
            <AnimatedStat target={totalRecaudado} prefix="$" label="Pesos recaudados para causas"
              icon={<svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            />
            <div className="sm:pl-8 pt-8 sm:pt-0">
              <AnimatedStat target={totalDonaciones} label="Donaciones realizadas en total"
                icon={<svg className="w-5 h-5 text-orange-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.593c-.525-.445-6.703-5.728-8.079-7.183C1.722 12.109 1.5 10.5 1.5 9.25 1.5 6.527 3.675 4.5 6.25 4.5c1.52 0 2.98.716 3.75 1.903C10.77 5.216 12.23 4.5 13.75 4.5c2.575 0 4.75 2.027 4.75 4.75 0 1.25-.222 2.859-2.421 5.16C14.702 15.866 12.524 21.148 12 21.593z" /></svg>}
              />
            </div>
            <div className="sm:pl-8 pt-8 sm:pt-0">
              <AnimatedStat target={847} label="Voluntarios activos en Chile"
                icon={<svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ══════ CAUSA URGENTE ══════ */}
      {(() => {
        const urgente = causasActivas.find(c => c.destacada)
        if (!urgente) return null
        return (
          <section className="bg-red-50 border-y border-red-100 py-5">
            <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
              <span className="flex-shrink-0 inline-flex items-center gap-2 bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wide">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                🚨 Urgente
              </span>
              <div className="flex-1 min-w-0 text-center sm:text-left">
                <p className="font-black text-gray-900 text-base sm:text-lg truncate">{urgente.titulo}</p>
                <p className="text-gray-600 text-sm line-clamp-1">{urgente.descripcion}</p>
              </div>
              <Link to="/donaciones" className="flex-shrink-0 bg-red-500 hover:bg-red-600 text-white font-bold text-sm px-6 py-3 rounded-full transition-colors shadow-md">
                Colaborar ahora
              </Link>
            </div>
          </section>
        )
      })()}

      {/* ══════ CAUSAS ACTIVAS ══════ */}
      <section id="causas" className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8 mb-14">
            <div className="text-center lg:text-left lg:flex-1">
              <p className="text-orange-500 font-semibold text-base mb-2 italic" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>Our Causes</p>
              <h2 className="text-4xl sm:text-5xl font-black text-gray-900 mb-4 leading-tight" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                Ayuda a quienes más <span className="text-orange-500">lo necesitan</span>
              </h2>
              <p className="text-gray-500 text-lg max-w-lg">Cada peso que donas tiene un impacto real y verificable.</p>
            </div>
            <div className="hidden lg:block flex-shrink-0">
              <div className="w-72 h-48 rounded-2xl overflow-hidden shadow-xl ring-4 ring-orange-100">
                <img
                  src="https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=800"
                  alt="Personas recibiendo ayuda"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">
            {causasHome.map(causa => <CausaCard key={causa.id} causa={causa} />)}
          </div>
          <div className="text-center mt-10">
            <Link to="/transparencia" className="inline-flex items-center gap-2 text-orange-500 hover:text-orange-600 font-semibold text-sm transition-colors">
              Ver todas las causas
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          CAMPAÑA DE INVIERNO - ABRIGO SOLIDARIO
      ══════════════════════════════════════ */}
      <section id="campana-invierno" className="relative py-24 overflow-hidden">
        {/* Fondo oscuro con overlay */}
        <div className="absolute inset-0 bg-gray-900" />
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=1400')", backgroundSize: 'cover', backgroundPosition: 'center' }} />
        <div className="relative max-w-6xl mx-auto px-6 z-10">
          {/* Badge */}
          <span className="inline-flex items-center gap-2 bg-orange-500/20 border border-orange-400/30 text-orange-300 text-xs font-semibold px-4 py-1.5 rounded-full mb-6 tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
            Campaña activa · Junio – Agosto 2026
          </span>
          <h2 className="text-4xl sm:text-5xl font-black text-white mb-4 leading-tight max-w-2xl" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
            Abrigo Solidario: <span className="text-orange-400">Calor para quienes más lo necesitan</span>
          </h2>
          <p className="text-gray-300 text-lg max-w-2xl mb-10">
            Esta temporada invernal buscamos reunir <strong className="text-white">5.000 prendas de abrigo</strong> para familias vulnerables en todo Chile. ¿Tienes ropa que ya no usas? ¡Dónala!
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
            {/* Info campaña */}
            <div>
              <div className="grid grid-cols-2 gap-4 mb-8">
                {[
                  { icono: '🧥', titulo: 'Ropa de abrigo', desc: 'Poleras térmicas, chaquetas, abrigos, poleras de polar' },
                  { icono: '🛏️', titulo: 'Frazadas', desc: 'De lana, polar o microfibra, cualquier talla' },
                  { icono: '👟', titulo: 'Calzado', desc: 'Botines, zapatillas, botas en buen estado' },
                  { icono: '🧤', titulo: 'Accesorios', desc: 'Gorros, guantes, bufandas' },
                ].map(item => (
                  <div key={item.titulo} className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-4">
                    <p className="text-2xl mb-2">{item.icono}</p>
                    <p className="font-bold text-white text-sm">{item.titulo}</p>
                    <p className="text-gray-400 text-xs mt-1">{item.desc}</p>
                  </div>
                ))}
              </div>
              <div className="bg-white/10 border border-white/10 rounded-xl p-4">
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Especificaciones requeridas</p>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>✓ Estado: bueno o muy bueno (sin roturas ni manchas)</li>
                  <li>✓ Limpia y lista para entregar</li>
                  <li>✓ Tallas adulto y niño aceptadas</li>
                </ul>
              </div>
            </div>

            {/* Progreso + Mapa */}
            <div className="space-y-6">
              {/* Progreso */}
              <div className="bg-white/10 border border-white/10 rounded-2xl p-6">
                <div className="flex items-end justify-between mb-3">
                  <div>
                    <p className="text-white font-black text-4xl">{campanaActual.toLocaleString('es-CL')}</p>
                    <p className="text-gray-400 text-sm">prendas recolectadas</p>
                  </div>
                  <p className="text-orange-400 font-bold text-lg">{campanaPct}%</p>
                </div>
                <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-orange-500 rounded-full transition-all" style={{ width: `${campanaPct}%` }} />
                </div>
                <p className="text-gray-400 text-xs mt-2">Meta: {campanaMeta.toLocaleString('es-CL')} prendas</p>
              </div>

              {/* Mapa por regiones (SVG simple) */}
              <div className="bg-white/10 border border-white/10 rounded-2xl p-4">
                <p className="text-white font-semibold text-sm mb-3">Actividad por región</p>
                <div className="flex gap-4 flex-wrap">
                  {mockImpactoRegion.slice(0, 5).map(r => (
                    <div key={r.id} className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        r.nivel >= 5 ? 'bg-orange-500' : r.nivel >= 3 ? 'bg-orange-400' : 'bg-orange-300'
                      }`} />
                      <div>
                        <p className="text-white text-xs font-bold">{r.nombre}</p>
                        <p className="text-gray-400 text-xs">{r.kilosRopa.toLocaleString('es-CL')} kg</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-4">
            <a href="#donde-donar" className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold px-8 py-4 rounded-full transition-colors shadow-lg">
              Ver centros de acopio
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
            </a>
            <Link to="/campanas" className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold px-8 py-4 rounded-full transition-colors">
              Ver todas las campañas
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          DÓNDE DONAR — Centros de acopio
      ══════════════════════════════════════ */}
      <section id="donde-donar" className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-orange-500 font-semibold text-base mb-2 italic" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>Puntos de recepción</p>
            <h2 className="text-4xl sm:text-5xl font-black text-gray-900 mb-4" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
              ¿Dónde <span className="text-orange-500">donar?</span>
            </h2>
            <p className="text-gray-500 text-lg max-w-lg mx-auto">Encuentra el centro de acopio más cercano a ti.</p>
          </div>

          {/* Filtro región */}
          <div className="flex flex-wrap gap-2 justify-center mb-8">
            {regiones.map(r => (
              <button key={r} onClick={() => setRegionFiltro(r)} className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${regionFiltro === r ? 'bg-orange-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-orange-300'}`}>
                {r}
              </button>
            ))}
          </div>

          {/* Mapa interactivo */}
          <div className="mb-10">
            <MapaCentros centros={centrosFiltrados} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {centrosFiltrados.filter(c => c.activo).map(centro => {
              const pct = Math.round((centro.capacidadActual / centro.capacidadMax) * 100)
              const urgentes = necesidades.filter(n => n.centro?.id === centro.id && n.urgente && n.activa)
              return (
                <div key={centro.id} className={`bg-white rounded-2xl border shadow-sm p-5 hover:border-orange-200 transition-colors ${urgentes.length > 0 ? 'border-red-200' : 'border-gray-100'}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 text-sm">{centro.nombre}</h3>
                      <span className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full mt-1 inline-block">{centro.region} · {centro.ciudad}</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
                      {urgentes.length > 0 && (
                        <span className="text-[10px] bg-red-100 text-red-700 font-bold px-1.5 py-0.5 rounded-full">{urgentes.length} URGENTE{urgentes.length > 1 ? 'S' : ''}</span>
                      )}
                      <div className={`w-2.5 h-2.5 rounded-full ${centro.activo ? 'bg-green-400' : 'bg-gray-300'}`} />
                    </div>
                  </div>
                  <div className="space-y-2 text-xs text-gray-500 mb-4">
                    <p className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      {centro.direccion}
                    </p>
                    <p className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      {centro.horario}
                    </p>
                    <p className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.948V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                      {centro.telefono}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {centro.queRecibe.slice(0, 3).map(item => (
                      <span key={item} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{item}</span>
                    ))}
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                      <span>Capacidad</span>
                      <span>{centro.capacidadActual}/{centro.capacidadMax}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${pct > 80 ? 'bg-red-400' : pct > 60 ? 'bg-yellow-400' : 'bg-emerald-400'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* CTA Mapa de Necesidades */}
          <div className="mt-8 text-center">
            <Link
              to="/mapa-necesidades"
              className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-3 rounded-full transition-colors shadow-sm"
            >
              🗺️ Ver mapa de necesidades urgentes
            </Link>
            <p className="text-xs text-gray-400 mt-2">Descubre qué necesita cada centro y dona exactamente lo que hace falta.</p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          DONACIÓN ESPECIAL
      ══════════════════════════════════════ */}
      <section id="donacion-especial" className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Info */}
            <div>
              <p className="text-orange-500 font-semibold text-base mb-2 italic" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>Donación especial</p>
              <h2 className="text-4xl sm:text-5xl font-black text-gray-900 mb-5 leading-tight" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                ¿Tienes algo <span className="text-orange-500">especial</span> para donar?
              </h2>
              <p className="text-gray-500 text-lg mb-6">
                Aceptamos donaciones no convencionales que también transforman vidas: vehículos, muebles, equipos, maquinaria, materiales de construcción y más.
              </p>
              <div className="grid grid-cols-2 gap-4 mb-6">
                {[
                  { icono: '🚗', titulo: 'Vehículos', desc: 'Autos, camionetas, bicicletas' },
                  { icono: '🪑', titulo: 'Muebles', desc: 'Sofás, camas, mesas, sillas' },
                  { icono: '💻', titulo: 'Equipos', desc: 'Computadores, electrodomésticos' },
                  { icono: '🏗️', titulo: 'Materiales', desc: 'Construcción, ferretería, madera' },
                ].map(item => (
                  <div key={item.titulo} className="flex items-start gap-3 p-3 bg-orange-50 rounded-xl">
                    <span className="text-2xl">{item.icono}</span>
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{item.titulo}</p>
                      <p className="text-gray-500 text-xs">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              {/* Card teléfono */}
              <div className="flex items-center gap-4 bg-gray-900 rounded-2xl p-5">
                <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.948V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                </div>
                <div>
                  <p className="text-gray-400 text-xs font-medium">Llámanos directamente</p>
                  <p className="text-white font-black text-xl">+56 2 2345 6789</p>
                  <p className="text-gray-400 text-xs mt-0.5">Lun-Vie 9:00 - 18:00</p>
                </div>
              </div>
            </div>

            {/* Formulario */}
            <div className="bg-gray-50 rounded-2xl border border-gray-100 p-6 shadow-sm">
              <h3 className="font-bold text-gray-900 text-lg mb-5">Cuéntanos sobre tu donación</h3>
              {exitoEspecial ? (
                <div className="py-10 text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <p className="font-bold text-gray-900 mb-1">¡Solicitud enviada!</p>
                  <p className="text-gray-500 text-sm">Nos pondremos en contacto contigo en 24 horas.</p>
                </div>
              ) : (
                <form onSubmit={handleEspecial} className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Nombre completo</label>
                    <input value={formEspecial.nombre} onChange={e => setFormEspecial(f => ({ ...f, nombre: e.target.value }))} required placeholder="Tu nombre..." className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de bien</label>
                    <input value={formEspecial.tipoBien} onChange={e => setFormEspecial(f => ({ ...f, tipoBien: e.target.value }))} required placeholder="Ej: Refrigerador, sofá, bicicleta..." className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Descripción del bien</label>
                    <textarea value={formEspecial.descripcion} onChange={e => setFormEspecial(f => ({ ...f, descripcion: e.target.value }))} rows={3} placeholder="Describe el estado, tamaño, modelo..." className={`${inputCls} resize-none`} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Región</label>
                      <select value={formEspecial.region} onChange={e => setFormEspecial(f => ({ ...f, region: e.target.value }))} required className={selectCls}>
                        <option value="">Selecciona...</option>
                        <option>Metropolitana</option>
                        <option>Valparaíso</option>
                        <option>Biobío</option>
                        <option>Araucanía</option>
                        <option>Maule</option>
                        <option>Coquimbo</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Teléfono</label>
                      <input type="tel" value={formEspecial.telefono} onChange={e => setFormEspecial(f => ({ ...f, telefono: e.target.value }))} required placeholder="+56 9 1234 5678" className={inputCls} />
                    </div>
                  </div>
                  <button type="submit" disabled={enviandoEspecial} className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 mt-2">
                    {enviandoEspecial && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                    Enviar solicitud
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          VOLUNTARIADO
      ══════════════════════════════════════ */}
      <section id="voluntariado" className="relative overflow-hidden py-20">
        {/* Imagen de fondo */}
        <img
          src="https://images.unsplash.com/photo-1509099836639-18ba1795216d?w=1400"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Overlay naranja semitransparente */}
        <div className="absolute inset-0 bg-orange-600/30" />
        <div className="relative z-10 max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-orange-200 font-semibold text-base mb-2 italic" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>Únete a nosotros</p>
            <h2 className="text-4xl sm:text-5xl font-black text-white mb-4 leading-tight" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
              Sé <span className="text-orange-100">voluntario</span>
            </h2>
            <p className="text-orange-100 text-lg max-w-lg mx-auto">847 personas ya están cambiando Chile con su tiempo. ¿Y tú?</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            {/* Beneficios */}
            <div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                {[
                  { icono: '🤝', titulo: 'Impacto real', desc: 'Ves los resultados directos de tu trabajo en la comunidad.' },
                  { icono: '📜', titulo: 'Certificado', desc: 'Obtén un certificado oficial de voluntariado para tu CV.' },
                  { icono: '👥', titulo: 'Red de contactos', desc: 'Conoce personas apasionadas por el cambio social.' },
                  { icono: '🎓', titulo: 'Capacitación', desc: 'Acceso a talleres y formación en gestión social.' },
                ].map(b => (
                  <div key={b.titulo} className="bg-white/20 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                    <p className="text-2xl mb-2">{b.icono}</p>
                    <p className="font-bold text-white text-sm">{b.titulo}</p>
                    <p className="text-orange-100 text-xs mt-1">{b.desc}</p>
                  </div>
                ))}
              </div>
              {/* Contador */}
              <div className="bg-white/20 border border-white/20 rounded-2xl p-5">
                <p className="text-orange-100 text-sm mb-1">Voluntarios activos hoy</p>
                <p className="text-white font-black text-5xl">847</p>
                <p className="text-orange-200 text-sm mt-1">en 7 regiones de Chile</p>
              </div>
            </div>

            {/* Formulario */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h3 className="font-bold text-gray-900 text-lg mb-5">Inscríbete como voluntario</h3>
              {exitoVol ? (
                <div className="py-10 text-center">
                  <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <p className="font-bold text-gray-900 mb-1">¡Inscripción exitosa!</p>
                  <p className="text-gray-500 text-sm">Te contactaremos para coordinar el inicio de actividades.</p>
                </div>
              ) : (
                <form onSubmit={handleVoluntario} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Nombre completo</label>
                      <input value={formVoluntario.nombre} onChange={e => setFormVoluntario(f => ({ ...f, nombre: e.target.value }))} required placeholder="Tu nombre..." className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                      <input type="email" value={formVoluntario.email} onChange={e => setFormVoluntario(f => ({ ...f, email: e.target.value }))} required placeholder="tu@email.com" className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Teléfono</label>
                      <input type="tel" value={formVoluntario.telefono} onChange={e => setFormVoluntario(f => ({ ...f, telefono: e.target.value }))} placeholder="+56 9..." className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Región</label>
                      <select value={formVoluntario.region} onChange={e => setFormVoluntario(f => ({ ...f, region: e.target.value }))} required className={selectCls}>
                        <option value="">Selecciona...</option>
                        <option>Metropolitana</option>
                        <option>Valparaíso</option>
                        <option>Biobío</option>
                        <option>Araucanía</option>
                        <option>Maule</option>
                        <option>Coquimbo</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Disponibilidad</label>
                      <select value={formVoluntario.disponibilidad} onChange={e => setFormVoluntario(f => ({ ...f, disponibilidad: e.target.value }))} className={selectCls}>
                        <option value="fin_de_semana">Fin de semana</option>
                        <option value="semana">Días de semana</option>
                        <option value="ambos">Ambos</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Área de interés</label>
                      <select value={formVoluntario.areaInteres} onChange={e => setFormVoluntario(f => ({ ...f, areaInteres: e.target.value }))} className={selectCls}>
                        <option value="logistica">Logística y distribución</option>
                        <option value="comunicaciones">Comunicaciones y marketing</option>
                        <option value="salud">Salud y bienestar</option>
                        <option value="educacion">Educación y capacitación</option>
                      </select>
                    </div>
                  </div>
                  <button type="submit" disabled={enviandoVol} className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 mt-2">
                    {enviandoVol && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                    Quiero ser voluntario
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          IMPACTO POR REGIÓN
      ══════════════════════════════════════ */}
      <section className="relative py-20 bg-white overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=1400"
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-10"
        />
        <div className="relative z-10 max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-orange-500 font-semibold text-base mb-2 italic" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>Impacto nacional</p>
            <h2 className="text-4xl sm:text-5xl font-black text-gray-900 mb-4" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
              Nuestro impacto <span className="text-orange-500">por región</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            {/* Mapa de Chile con fotos por región */}
            <div className="flex justify-center">
              <div className="flex flex-col gap-1 w-48 sm:w-56">
                {[
                  { label: 'IV',   h: 'h-10', foto: 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=400&q=80' },
                  { label: 'V',    h: 'h-9',  foto: 'https://images.unsplash.com/photo-1565008447742-97f6f38c985c?w=400&q=80' },
                  { label: 'RM',   h: 'h-8',  foto: 'https://images.unsplash.com/photo-1588392382834-a891154bca4d?w=400&q=80' },
                  { label: 'VI',   h: 'h-9',  foto: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=400&q=80' },
                  { label: 'VII',  h: 'h-10', foto: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=400&q=80' },
                  { label: 'VIII', h: 'h-11', foto: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=400&q=80' },
                  { label: 'IX',   h: 'h-10', foto: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80' },
                  { label: 'XIV',  h: 'h-10', foto: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=400&q=80' },
                  { label: 'X',    h: 'h-11', foto: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=400&q=80' },
                  { label: 'XI',   h: 'h-20', foto: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=400&q=80' },
                  { label: 'XII',  h: 'h-16', foto: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80' },
                ].map(r => (
                  <div key={r.label} className={`relative overflow-hidden rounded-lg ${r.h}`}>
                    {r.foto && <img src={r.foto} alt={r.label} className="absolute inset-0 w-full h-full object-cover" onError={e => { e.currentTarget.style.display = 'none' }} />}
                    <div className={`absolute inset-0 ${r.foto ? 'bg-orange-500/60' : 'bg-orange-300'}`} />
                    <div className="relative z-10 flex items-center justify-center h-full">
                      <span className="text-white font-bold text-xl">{r.label}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Rankings */}
            <div>
              <h3 className="font-bold text-gray-900 mb-4">Top 5 regiones más activas</h3>
              <div className="space-y-4">
                {mockImpactoRegion.slice(0, 5).map((r, i) => (
                  <div key={r.id}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-yellow-400 text-yellow-900' : 'bg-gray-100 text-gray-500'}`}>{i + 1}</span>
                        <span className="font-semibold text-gray-900 text-sm">{r.nombre}</span>
                      </div>
                      <span className="text-xs text-gray-400">{r.familiasAyudadas.toLocaleString('es-CL')} familias</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-orange-500 rounded-full" style={{ width: `${(r.familiasAyudadas / 1420) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-4 mt-8">
                {[
                  { label: 'Familias ayudadas', value: mockImpactoRegion.reduce((a, r) => a + r.familiasAyudadas, 0).toLocaleString('es-CL') },
                  { label: 'Kilos de ropa', value: mockImpactoRegion.reduce((a, r) => a + r.kilosRopa, 0).toLocaleString('es-CL') },
                  { label: 'Centros activos', value: mockImpactoRegion.reduce((a, r) => a + r.centrosActivos, 0).toString() },
                ].map(s => (
                  <div key={s.label} className="bg-orange-50 rounded-xl p-3 text-center">
                    <p className="font-extrabold text-orange-600 text-xl">{s.value}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════ TOP DONADORES ══════ */}
      <section className="bg-gray-900 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-orange-400 font-semibold text-base mb-2 italic" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>Our Community</p>
            <h2 className="text-4xl sm:text-5xl font-black text-white mb-4 leading-tight" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
              Nuestros <span className="text-orange-400">héroes</span>
            </h2>
            <p className="text-gray-400 text-lg max-w-lg mx-auto">Personas que lideran el cambio con su generosidad.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
            {topDonadores.map((d, i) => {
              const medal = MEDALS[i] ?? MEDALS[4]
              const isTop3 = i < 3
              const { type: avatarType, photoIdx } = donadorAvatarData[i] ?? { type: 'person', photoIdx: -1 }
              return (
                <div key={d.id ?? i} className={`flex flex-col items-center text-center gap-3 p-5 rounded-2xl transition-colors duration-150 ${isTop3 ? 'bg-gray-800 border border-gray-700 hover:border-orange-500/40' : 'bg-gray-800/50 border border-gray-800 hover:border-gray-700'}`}>
                  <span className="text-xl leading-none">{isTop3 ? medal.label : ''}</span>
                  <div className={`w-16 h-16 rounded-full ring-4 ${medal.ring} ring-offset-2 ring-offset-gray-800 overflow-hidden flex-shrink-0 relative`}>
                    {avatarType === 'anon' && (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-700">
                        <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                        </svg>
                      </div>
                    )}
                    {avatarType === 'org' && (
                      <div className="absolute inset-0 flex items-center justify-center bg-indigo-100">
                        <span className="text-indigo-600 font-black text-2xl leading-none">{(d.nombre ?? '?')[0].toUpperCase()}</span>
                      </div>
                    )}
                    {avatarType === 'person' && (
                      <>
                        <div className="absolute inset-0 flex items-center justify-center bg-orange-100">
                          <span className="text-orange-600 font-black text-2xl leading-none">{(d.nombre ?? '?')[0].toUpperCase()}</span>
                        </div>
                        {DONADOR_FOTOS[photoIdx] && (
                          <img
                            src={DONADOR_FOTOS[photoIdx]}
                            alt={d.nombre ?? ''}
                            className="absolute inset-0 w-full h-full object-cover"
                            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                          />
                        )}
                      </>
                    )}
                  </div>
                  {!isTop3 && <span className="text-gray-500 text-xs font-bold">#{i + 1}</span>}
                  <p className="text-white font-bold text-sm leading-tight">
                    {(d.nombre ?? '').split(' ')[0]}<br />
                    <span className="font-normal text-gray-400">{(d.nombre ?? '').split(' ').slice(1).join(' ')}</span>
                  </p>
                  <p className="text-orange-400 font-extrabold text-base">${(d.totalDonado ?? 0).toLocaleString('es-CL')}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          PARTNERS Y ALIADOS
      ══════════════════════════════════════ */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-orange-500 font-semibold text-base mb-2 italic" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>Trabajamos juntos</p>
            <h2 className="text-4xl sm:text-5xl font-black text-gray-900 mb-4" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
              Partners y <span className="text-orange-500">aliados</span>
            </h2>
            <p className="text-gray-500 text-lg max-w-lg mx-auto">Organizaciones que creen en nuestra misión y nos apoyan.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {mockPartners.map(p => (
              <div key={p.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col items-center text-center gap-3 hover:border-orange-200 transition-colors">
                {/* Logo o badge con fallback */}
                <div className="w-16 h-12 relative flex items-center justify-center">
                  {/* Badge siempre visible detrás como fallback */}
                  <div className={`absolute inset-0 ${p.color} rounded-xl flex items-center justify-center text-white font-black text-base`}>{p.iniciales}</div>
                  {PARTNER_LOGOS[p.id] && (
                    <img
                      src={PARTNER_LOGOS[p.id]!}
                      alt={p.nombre}
                      className="relative z-10 max-h-10 max-w-full object-contain"
                      onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                    />
                  )}
                </div>
                <p className="font-bold text-gray-900 text-sm">{p.nombre}</p>
                <p className="text-gray-400 text-xs leading-relaxed">{p.descripcion}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${p.tipo === 'empresa' ? 'bg-blue-50 text-blue-600' : p.tipo === 'ong' ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-600'}`}>
                  {p.tipo === 'empresa' ? 'Empresa' : p.tipo === 'ong' ? 'ONG' : 'Gobierno'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ CTA FINAL ══════ */}
      <section className="bg-orange-500 py-20">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h2 className="text-4xl sm:text-5xl font-black text-white mb-5 leading-tight" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>¿Listo para marcar la diferencia?</h2>
          <p className="text-orange-100 text-lg mb-10 max-w-xl mx-auto">Únete a miles de chilenos que ya están transformando vidas. Gratis, rápido y seguro.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/login?modo=registro" className="bg-white hover:bg-orange-50 text-orange-600 font-bold text-base px-9 py-4 rounded-full transition-colors duration-150 shadow-lg">Crear cuenta gratis</Link>
            <Link to="/transparencia" className="border-2 border-white/50 hover:border-white text-white font-semibold text-base px-9 py-4 rounded-full transition-colors duration-150">Ver transparencia</Link>
          </div>
          <p className="text-orange-200 text-sm mt-6">Sin tarjeta de crédito · 0% comisión</p>
        </div>
      </section>

    </main>
  )
}
