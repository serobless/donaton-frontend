import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useDonacion } from '../contexts/DonacionContext'
import CausaCard from '../components/ui/CausaCard'
import { useCountUp } from '../lib/useCountUp'

/* ─── Animated stat (starts on viewport enter) ─── */
function AnimatedStat({
  target,
  prefix = '',
  suffix = '',
  label,
  icon,
}: {
  target: number
  prefix?: string
  suffix?: string
  label: string
  icon: React.ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [fired, setFired] = useState(false)
  const { value, start } = useCountUp(target, 1600, false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !fired) {
          setFired(true)
          start()
        }
      },
      { threshold: 0.6 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [fired])

  return (
    <div ref={ref} className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
      <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div className="text-center sm:text-left">
        <p className="text-3xl font-extrabold text-gray-900 leading-none">
          {prefix}{value.toLocaleString('es-CL')}{suffix}
        </p>
        <p className="text-sm text-gray-500 mt-1">{label}</p>
      </div>
    </div>
  )
}

/* ─── Floating hero image ─── */
function HeroImg({
  src,
  size,
  className,
}: {
  src: string
  size: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const dim = size === 'lg' ? 'w-28 h-28' : size === 'md' ? 'w-20 h-20' : 'w-14 h-14'
  return (
    <div
      className={`absolute ${dim} rounded-full overflow-hidden ring-4 ring-white shadow-xl ${className ?? ''}`}
    >
      <img src={src} alt="" className="w-full h-full object-cover" />
    </div>
  )
}

/* ─── Medal colors ─── */
const MEDALS = [
  { label: '🥇', ring: 'ring-yellow-400',  bg: 'bg-yellow-50'  },
  { label: '🥈', ring: 'ring-gray-400',    bg: 'bg-gray-50'    },
  { label: '🥉', ring: 'ring-orange-400',  bg: 'bg-orange-50'  },
  { label: '4',  ring: 'ring-gray-300',    bg: 'bg-gray-50'    },
  { label: '5',  ring: 'ring-gray-300',    bg: 'bg-gray-50'    },
]

/* ─── Hero Unsplash images ─── */
const HERO_IMGS = {
  a: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=200&h=200&q=80&fit=crop',
  b: 'https://images.unsplash.com/photo-1509099836639-18ba1795216d?w=200&h=200&q=80&fit=crop',
  c: 'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=200&h=200&q=80&fit=crop',
  d: 'https://images.unsplash.com/photo-1593113616828-6f22bca04804?w=200&h=200&q=80&fit=crop',
  e: 'https://images.unsplash.com/photo-1531206715517-5c0ba140b2b8?w=200&h=200&q=80&fit=crop',
  f: 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=200&h=200&q=80&fit=crop',
}

export default function Home() {
  const { causasActivas, topDonadores, totalDonaciones, totalRecaudado } = useDonacion()
  const causasHome = causasActivas.slice(0, 3)

  console.log('[Home] causasActivas:', causasActivas)
  console.log('[Home] causasHome (primeras 3):', causasHome)

  return (
    <main className="flex-1">

      {/* ══════════════════════════════════════════════
          HERO — white bg, centered, floating circles
      ══════════════════════════════════════════════ */}
      <section className="relative bg-white min-h-[600px] flex items-center py-20 overflow-hidden">
        {/* Subtle radial glow — decorative, not interactive */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[700px] h-[500px] rounded-full bg-orange-50 blur-3xl opacity-70" />
        </div>

        {/* ── Floating images — absolute on section (xl+ only) ── */}
        <HeroImg src={HERO_IMGS.a} size="lg" className="hidden xl:block top-16  left-[4%]" />
        <HeroImg src={HERO_IMGS.b} size="md" className="hidden xl:block top-52  left-[11%]" />
        <HeroImg src={HERO_IMGS.c} size="sm" className="hidden xl:block top-[68%] left-[6%]" />
        <HeroImg src={HERO_IMGS.d} size="md" className="hidden xl:block top-14  right-[6%]" />
        <HeroImg src={HERO_IMGS.e} size="lg" className="hidden xl:block top-44  right-[3%]" />
        <HeroImg src={HERO_IMGS.f} size="sm" className="hidden xl:block top-[65%] right-[10%]" />

        {/* ── Center content — constrained & centered ── */}
        <div className="relative max-w-6xl mx-auto px-6 w-full text-center z-10">
          {/* Pill badge */}
          <span className="inline-flex items-center gap-2 bg-orange-50 border border-orange-100 text-orange-600 text-xs font-semibold px-4 py-1.5 rounded-full mb-8 tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
            Plataforma solidaria · Chile
          </span>

          {/* Headline */}
          <h1
            className="text-5xl sm:text-6xl lg:text-7xl font-black text-gray-900 leading-[1.05] mb-6 mx-auto max-w-3xl"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Juntos podemos{' '}
            <span className="text-orange-500">cambiar vidas</span>{' '}
            en Chile
          </h1>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl text-gray-500 max-w-xl mx-auto mb-10 leading-relaxed">
            Conecta tu generosidad con causas reales. Sin intermediarios — el{' '}
            <strong className="text-gray-800 font-semibold">100% de tu donación llega a quien lo necesita.</strong>
          </p>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="#causas"
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold text-base px-9 py-4 rounded-full transition-colors duration-150 shadow-lg shadow-orange-200 hover:shadow-orange-300"
            >
              Ver causas activas
            </a>
            <Link
              to="/transparencia"
              className="flex items-center gap-2 text-gray-600 hover:text-orange-500 font-semibold text-base transition-colors duration-150"
            >
              Cómo funciona
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          {/* Social proof avatars */}
          <div className="flex items-center justify-center gap-3 mt-10">
            <div className="flex -space-x-2.5">
              {['V', 'C', 'M', 'A', 'R'].map((l) => (
                <div
                  key={l}
                  className="w-9 h-9 rounded-full bg-orange-400 ring-2 ring-white flex items-center justify-center text-white text-xs font-bold"
                >
                  {l}
                </div>
              ))}
            </div>
            <p className="text-sm text-gray-500">
              <strong className="text-gray-900">+{topDonadores.length} donadores</strong> ya están ayudando
            </p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          STATS BAR — amber-50 background
      ══════════════════════════════════════════════ */}
      <section className="bg-amber-50 border-y border-amber-100 py-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-4 divide-y sm:divide-y-0 sm:divide-x divide-amber-200">
            <AnimatedStat
              target={totalRecaudado}
              prefix="$"
              label="Pesos recaudados para causas"
              icon={
                <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <div className="sm:pl-8 pt-8 sm:pt-0">
              <AnimatedStat
                target={totalDonaciones}
                label="Donaciones realizadas en total"
                icon={
                  <svg className="w-5 h-5 text-orange-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 21.593c-.525-.445-6.703-5.728-8.079-7.183C1.722 12.109 1.5 10.5 1.5 9.25 1.5 6.527 3.675 4.5 6.25 4.5c1.52 0 2.98.716 3.75 1.903C10.77 5.216 12.23 4.5 13.75 4.5c2.575 0 4.75 2.027 4.75 4.75 0 1.25-.222 2.859-2.421 5.16C14.702 15.866 12.524 21.148 12 21.593z" />
                  </svg>
                }
              />
            </div>
            <div className="sm:pl-8 pt-8 sm:pt-0">
              <AnimatedStat
                target={causasActivas.length}
                suffix=" causas"
                label="Activas esperando tu apoyo"
                icon={
                  <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                }
              />
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          CAUSAS ACTIVAS — Charite style
      ══════════════════════════════════════════════ */}
      <section id="causas" className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">

          {/* Section header */}
          <div className="text-center mb-14">
            <p
              className="text-orange-500 font-semibold text-base mb-2 italic"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Our Causes
            </p>
            <h2
              className="text-4xl sm:text-5xl font-black text-gray-900 mb-4 leading-tight"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Ayuda a quienes más{' '}
              <span className="text-orange-500">lo necesitan</span>
            </h2>
            <p className="text-gray-500 text-lg max-w-lg mx-auto">
              Cada peso que donas tiene un impacto real y verificable.
            </p>
          </div>

          {/* Cards grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">
            {causasHome.map((causa) => (
              <CausaCard key={causa.id} causa={causa} />
            ))}
          </div>

          {/* See all link */}
          <div className="text-center mt-10">
            <Link
              to="/transparencia"
              className="inline-flex items-center gap-2 text-orange-500 hover:text-orange-600 font-semibold text-sm transition-colors"
            >
              Ver todas las causas
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          TOP DONADORES — dark bg-gray-900 (Charite)
      ══════════════════════════════════════════════ */}
      <section className="bg-gray-900 py-20">
        <div className="max-w-6xl mx-auto px-6">

          {/* Header */}
          <div className="text-center mb-14">
            <p
              className="text-orange-400 font-semibold text-base mb-2 italic"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Our Community
            </p>
            <h2
              className="text-4xl sm:text-5xl font-black text-white mb-4 leading-tight"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Nuestros{' '}
              <span className="text-orange-400">héroes</span>
            </h2>
            <p className="text-gray-400 text-lg max-w-lg mx-auto">
              Personas que lideran el cambio con su generosidad.
            </p>
          </div>

          {/* Donadores grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
            {topDonadores.map((d, i) => {
              const medal = MEDALS[i] ?? MEDALS[4]
              const isTop3 = i < 3
              return (
                <div
                  key={d.id}
                  className={`flex flex-col items-center text-center gap-3 p-5 rounded-2xl transition-colors duration-150 ${
                    isTop3
                      ? 'bg-gray-800 border border-gray-700 hover:border-orange-500/40'
                      : 'bg-gray-800/50 border border-gray-800 hover:border-gray-700'
                  }`}
                >
                  {/* Medal / rank */}
                  <span className="text-xl leading-none">{isTop3 ? medal.label : ''}</span>

                  {/* Avatar circle */}
                  <div
                    className={`w-16 h-16 rounded-full bg-orange-100 ring-4 ${medal.ring} ring-offset-2 ring-offset-gray-800 flex items-center justify-center flex-shrink-0`}
                  >
                    <span className="text-orange-600 font-black text-2xl leading-none">
                      {d.nombre[0]}
                    </span>
                  </div>

                  {/* Rank number for 4-5 */}
                  {!isTop3 && (
                    <span className="text-gray-500 text-xs font-bold">#{i + 1}</span>
                  )}

                  {/* Name */}
                  <p className="text-white font-bold text-sm leading-tight">
                    {d.nombre.split(' ')[0]}
                    <br />
                    <span className="font-normal text-gray-400">{d.nombre.split(' ').slice(1).join(' ')}</span>
                  </p>

                  {/* Amount */}
                  <p className="text-orange-400 font-extrabold text-base">
                    ${d.totalDonado.toLocaleString('es-CL')}
                  </p>

                  {/* Donations count */}
                  <span className="text-gray-600 text-xs">
                    {d.cantidadDonaciones} donaciones
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          CTA FINAL — dark with orange accent
      ══════════════════════════════════════════════ */}
      <section className="bg-orange-500 py-20">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h2
            className="text-4xl sm:text-5xl font-black text-white mb-5 leading-tight"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            ¿Listo para marcar la diferencia?
          </h2>
          <p className="text-orange-100 text-lg mb-10 max-w-xl mx-auto">
            Únete a miles de chilenos que ya están transformando vidas. Gratis, rápido y seguro.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/login?modo=registro"
              className="bg-white hover:bg-orange-50 text-orange-600 font-bold text-base px-9 py-4 rounded-full transition-colors duration-150 shadow-lg"
            >
              Crear cuenta gratis
            </Link>
            <Link
              to="/transparencia"
              className="border-2 border-white/50 hover:border-white text-white font-semibold text-base px-9 py-4 rounded-full transition-colors duration-150"
            >
              Ver transparencia
            </Link>
          </div>
          <p className="text-orange-200 text-sm mt-6">Sin tarjeta de crédito · 0% comisión</p>
        </div>
      </section>

    </main>
  )
}
