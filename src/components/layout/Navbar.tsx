import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  function handleLogout() {
    logout()
    navigate('/')
    setMenuOpen(false)
  }

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `text-[0.9rem] font-medium transition-colors duration-150 ${
      isActive ? 'text-orange-500' : 'text-gray-600 hover:text-orange-500'
    }`

  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-6 relative flex items-center justify-between h-16">

          {/* ── Logo — left ── */}
          <Link to="/" onClick={() => window.scrollTo(0, 0)} className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center shadow-sm">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 21.593c-.525-.445-6.703-5.728-8.079-7.183C1.722 12.109 1.5 10.5 1.5 9.25 1.5 6.527 3.675 4.5 6.25 4.5c1.52 0 2.98.716 3.75 1.903C10.77 5.216 12.23 4.5 13.75 4.5c2.575 0 4.75 2.027 4.75 4.75 0 1.25-.222 2.859-2.421 5.16C14.702 15.866 12.524 21.148 12 21.593z" />
              </svg>
            </div>
            <span className="font-bold text-lg text-gray-900 tracking-tight">
              Dona<span className="text-orange-500">ton</span>
            </span>
          </Link>

          {/* ── Nav links — absolutely centered ── */}
          <nav className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center gap-8">
            <NavLink to="/" end onClick={() => window.scrollTo(0, 0)} className={linkClass}>Inicio</NavLink>
            <NavLink to="/transparencia" className={linkClass}>Transparencia</NavLink>
            <NavLink to="/campanas" className={linkClass}>Campañas</NavLink>
            <NavLink to="/mapa-necesidades" className={linkClass}>Mapa</NavLink>
            <NavLink to="/testimonios" className={linkClass}>Testimonios</NavLink>
            {isAuthenticated && (
              <NavLink to="/donaciones" className={linkClass}>Mis donaciones</NavLink>
            )}
            {user?.rol?.toLowerCase() === 'admin' && (
              <NavLink to="/dashboard" className={linkClass}>Dashboard</NavLink>
            )}
          </nav>

          {/* ── Actions — right ── */}
          <div className="hidden md:flex items-center gap-3 flex-shrink-0">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                    <span className="text-orange-600 font-bold text-sm leading-none">
                      {user?.nombre[0]}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-gray-700">
                    {user?.nombre.split(' ')[0]}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Salir
                </button>
              </div>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Iniciar sesión
                </Link>
                <Link
                  to="#causas"
                  className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold px-5 py-2.5 rounded-full transition-colors shadow-sm"
                >
                  Donar ahora
                </Link>
              </>
            )}
          </div>

          {/* ── Mobile burger ── */}
          <button
            className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menú"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              }
            </svg>
          </button>
      </div>

      {/* ── Mobile drawer ── */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-6 py-4 flex flex-col gap-1">
          {[
            { to: '/', label: 'Inicio', end: true },
            { to: '/transparencia', label: 'Transparencia' },
            { to: '/campanas', label: 'Campañas' },
            { to: '/mapa-necesidades', label: 'Mapa de Necesidades' },
            { to: '/testimonios', label: 'Testimonios' },
            ...(isAuthenticated ? [{ to: '/donaciones', label: 'Mis donaciones' }] : []),
            ...(user?.rol?.toLowerCase() === 'admin' ? [{ to: '/dashboard', label: 'Dashboard' }] : []),
          ].map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={'end' in item ? item.end : false}
              className={({ isActive }) =>
                `px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-orange-50 text-orange-600' : 'text-gray-600 hover:bg-gray-50'
                }`
              }
              onClick={() => { setMenuOpen(false); window.scrollTo(0, 0) }}
            >
              {item.label}
            </NavLink>
          ))}
          <div className="pt-3 mt-1 border-t border-gray-100">
            {isAuthenticated ? (
              <button
                onClick={handleLogout}
                className="w-full text-left px-3 py-2 text-sm text-red-500 font-medium"
              >
                Cerrar sesión
              </button>
            ) : (
              <Link
                to="/login"
                className="block text-center bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm py-3 rounded-full transition-colors"
                onClick={() => { setMenuOpen(false); window.scrollTo(0, 0) }}
              >
                Donar ahora
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
