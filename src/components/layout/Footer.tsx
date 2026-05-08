import { Link } from 'react-router-dom'

function FooterHeading({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-white font-bold text-sm uppercase tracking-widest mb-5">
      {children}
    </h4>
  )
}

function FooterLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <li>
      <Link
        to={to}
        className="text-gray-400 hover:text-orange-400 text-sm transition-colors duration-150 flex items-center gap-1.5 group"
      >
        <span className="w-1 h-1 rounded-full bg-gray-700 group-hover:bg-orange-400 transition-colors" />
        {children}
      </Link>
    </li>
  )
}

export default function Footer() {
  return (
    <footer className="bg-gray-950 text-gray-400">
      <div className="max-w-6xl mx-auto px-6 pt-16 pb-8">

        {/* ── 4-column grid ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">

          {/* Col 1 — Brand */}
          <div className="lg:col-span-1">
            <Link to="/" className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 21.593c-.525-.445-6.703-5.728-8.079-7.183C1.722 12.109 1.5 10.5 1.5 9.25 1.5 6.527 3.675 4.5 6.25 4.5c1.52 0 2.98.716 3.75 1.903C10.77 5.216 12.23 4.5 13.75 4.5c2.575 0 4.75 2.027 4.75 4.75 0 1.25-.222 2.859-2.421 5.16C14.702 15.866 12.524 21.148 12 21.593z" />
                </svg>
              </div>
              <span
                className="text-xl font-bold text-white"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                Dona<span className="text-orange-400">ton</span>
              </span>
            </Link>
            <p className="text-sm text-gray-500 leading-relaxed mb-5">
              Plataforma chilena de donaciones solidarias. Conectamos corazones con causas que
              transforman vidas reales.
            </p>
            <p className="text-xs text-gray-600 bg-gray-900 rounded-lg px-3 py-2 inline-block">
              🇨🇱 Hecho con ♥ para Chile
            </p>
          </div>

          {/* Col 2 — Links rápidos */}
          <div>
            <FooterHeading>Links rápidos</FooterHeading>
            <ul className="space-y-3">
              <FooterLink to="/">Inicio</FooterLink>
              <FooterLink to="/transparencia">Transparencia</FooterLink>
              <FooterLink to="/login">Iniciar sesión</FooterLink>
              <FooterLink to="/login?modo=registro">Registrarse</FooterLink>
              <FooterLink to="/donaciones">Mis donaciones</FooterLink>
            </ul>
          </div>

          {/* Col 3 — Explorar */}
          <div>
            <FooterHeading>Explorar causas</FooterHeading>
            <ul className="space-y-3">
              <FooterLink to="/#causas">Educación</FooterLink>
              <FooterLink to="/#causas">Alimentación</FooterLink>
              <FooterLink to="/#causas">Salud</FooterLink>
              <FooterLink to="/#causas">Animales</FooterLink>
              <FooterLink to="/transparencia">Ver todas</FooterLink>
            </ul>
          </div>

          {/* Col 4 — Contacto y redes */}
          <div>
            <FooterHeading>Comunidad</FooterHeading>
            <ul className="space-y-3 mb-6">
              <li className="text-sm text-gray-500">contacto@donaton.cl</li>
              <li className="text-sm text-gray-500">Santiago, Chile</li>
            </ul>

            {/* Social icons */}
            <div className="flex items-center gap-3">
              {[
                {
                  label: 'Instagram',
                  path: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z',
                },
                {
                  label: 'Facebook',
                  path: 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z',
                },
                {
                  label: 'Twitter/X',
                  path: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z',
                },
              ].map((s) => (
                <a
                  key={s.label}
                  href="#"
                  aria-label={s.label}
                  className="w-9 h-9 rounded-lg bg-gray-800 hover:bg-orange-500 flex items-center justify-center transition-colors duration-150 group"
                >
                  <svg className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" fill="currentColor" viewBox="0 0 24 24">
                    <path d={s.path} />
                  </svg>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* ── Divider ── */}
        <div className="border-t border-gray-800/60" />

        {/* ── Bottom bar ── */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6">
          <p className="text-xs text-gray-600">
            © {new Date().getFullYear()} Donaton SpA. Todos los derechos reservados.
          </p>
          <div className="flex items-center gap-4 text-xs text-gray-700">
            <a href="#" className="hover:text-gray-500 transition-colors">Términos de uso</a>
            <a href="#" className="hover:text-gray-500 transition-colors">Privacidad</a>
            <a href="#" className="hover:text-gray-500 transition-colors">Cookies</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
