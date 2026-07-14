import { useState, useEffect, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const REGIONES = [
  'Región de Arica y Parinacota',
  'Región de Tarapacá',
  'Región de Antofagasta',
  'Región de Atacama',
  'Región de Coquimbo',
  'Región de Valparaíso',
  'Región Metropolitana de Santiago',
  "Región del Libertador General Bernardo O'Higgins",
  'Región del Maule',
  'Región del Ñuble',
  'Región del Biobío',
  'Región de La Araucanía',
  'Región de Los Ríos',
  'Región de Los Lagos',
  'Región de Aysén del General Carlos Ibáñez del Campo',
  'Región de Magallanes y de la Antártica Chilena',
]

function formatRut(raw: string): string {
  const clean = raw.replace(/[^0-9kK]/g, '').toUpperCase()
  if (clean.length < 2) return clean
  const dv = clean.slice(-1)
  const body = clean.slice(0, -1)
  const formatted = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${formatted}-${dv}`
}

function validateRutDv(rut: string): boolean {
  const clean = rut.replace(/[^0-9kK]/g, '').toUpperCase()
  if (clean.length < 2) return false
  const dv = clean.slice(-1)
  const body = clean.slice(0, -1)
  if (!/^\d+$/.test(body)) return false
  let sum = 0
  let mul = 2
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i]) * mul
    mul = mul === 7 ? 2 : mul + 1
  }
  const rem = 11 - (sum % 11)
  const expected = rem === 11 ? '0' : rem === 10 ? 'K' : String(rem)
  return dv === expected
}

export default function Login() {
  const [params] = useSearchParams()
  const [modo, setModo] = useState<'login' | 'registro'>(
    params.get('modo') === 'registro' ? 'registro' : 'login'
  )
  const [form, setForm] = useState({ nombre: '', email: '', password: '', confirmar: '', rut: '', telefono: '', region: '', esEmpresa: false, nombreEmpresa: '', rutEmpresa: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, register, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (isAuthenticated) navigate('/')
  }, [isAuthenticated, navigate])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
    setError('')
  }

  function handleRutChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/[^0-9kK]/g, '')
    setForm((f) => ({ ...f, rut: formatRut(raw) }))
    setError('')
  }

  function handleRutEmpresaChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/[^0-9kK]/g, '')
    setForm((f) => ({ ...f, rutEmpresa: formatRut(raw) }))
    setError('')
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (modo === 'login') {
        await login({ email: form.email, password: form.password })
      } else {
        if (form.password !== form.confirmar) {
          setError('Las contraseñas no coinciden')
          setLoading(false)
          return
        }
        if (form.password.length < 6) {
          setError('La contraseña debe tener al menos 6 caracteres')
          setLoading(false)
          return
        }
        if (!validateRutDv(form.rut)) {
          setError('El RUT ingresado no es válido')
          setLoading(false)
          return
        }
        if (form.esEmpresa) {
          if (!form.nombreEmpresa.trim()) {
            setError('El nombre de la empresa es requerido')
            setLoading(false)
            return
          }
          if (!validateRutDv(form.rutEmpresa)) {
            setError('El RUT de la empresa no es válido')
            setLoading(false)
            return
          }
        }
        await register({
          nombre: form.nombre,
          email: form.email,
          password: form.password,
          rut: form.rut,
          telefono: form.telefono || undefined,
          region: form.region || undefined,
          esEmpresa: form.esEmpresa,
          nombreEmpresa: form.esEmpresa ? form.nombreEmpresa : undefined,
          rutEmpresa: form.esEmpresa ? form.rutEmpresa : undefined,
        })
      }
      navigate('/')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ocurrió un error. Intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center py-16 px-4 bg-gray-50">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2">
            <span className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold text-lg">
              D
            </span>
            <span className="text-2xl font-bold text-gray-900">
              Dona<span className="text-orange-500">ton</span>
            </span>
          </Link>
          <p className="text-gray-500 mt-2 text-sm">Plataforma solidaria chilena</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          {/* Tabs */}
          <div className="flex rounded-xl bg-gray-100 p-1 mb-8">
            <button
              onClick={() => { setModo('login'); setError('') }}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                modo === 'login' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Iniciar sesión
            </button>
            <button
              onClick={() => { setModo('registro'); setError('') }}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                modo === 'registro' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Registrarse
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {modo === 'registro' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Nombre completo
                </label>
                <input
                  type="text"
                  name="nombre"
                  value={form.nombre}
                  onChange={handleChange}
                  required
                  placeholder="María González"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition"
                />
              </div>
            )}

            {modo === 'registro' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  RUT
                </label>
                <input
                  type="text"
                  name="rut"
                  value={form.rut}
                  onChange={handleRutChange}
                  required
                  placeholder="12.345.678-9"
                  maxLength={12}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Correo electrónico
              </label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
                placeholder="correo@ejemplo.cl"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Contraseña
              </label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                required
                placeholder="••••••••"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition"
              />
            </div>

            {modo === 'registro' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Confirmar contraseña
                </label>
                <input
                  type="password"
                  name="confirmar"
                  value={form.confirmar}
                  onChange={handleChange}
                  required
                  placeholder="••••••••"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition"
                />
              </div>
            )}

            {modo === 'registro' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Teléfono <span className="text-gray-400 font-normal">(opcional)</span>
                </label>
                <input
                  type="tel"
                  name="telefono"
                  value={form.telefono}
                  onChange={handleChange}
                  placeholder="+56 9 1234 5678"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition"
                />
              </div>
            )}

            {modo === 'registro' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Región <span className="text-gray-400 font-normal">(opcional)</span>
                </label>
                <select
                  name="region"
                  value={form.region}
                  onChange={handleChange}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition bg-white"
                >
                  <option value="">Selecciona tu región</option>
                  {REGIONES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            )}

            {modo === 'registro' && (
              <div className="pt-1">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, esEmpresa: !f.esEmpresa, nombreEmpresa: '', rutEmpresa: '' }))}
                    className={`relative w-10 h-6 rounded-full transition-colors flex-shrink-0 ${form.esEmpresa ? 'bg-orange-500' : 'bg-gray-200'}`}
                  >
                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${form.esEmpresa ? 'left-5' : 'left-1'}`} />
                  </button>
                  <span className="text-sm text-gray-700">Registrarme como empresa</span>
                </label>
              </div>
            )}

            {modo === 'registro' && form.esEmpresa && (
              <>
                <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-700">
                  Las donaciones que realices quedarán registradas como donación empresarial y aparecerán con el nombre de tu empresa.
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Nombre de la empresa <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="nombreEmpresa"
                    value={form.nombreEmpresa}
                    onChange={handleChange}
                    required
                    placeholder="Mi Empresa S.A."
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    RUT empresa <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="rutEmpresa"
                    value={form.rutEmpresa}
                    onChange={handleRutEmpresaChange}
                    required
                    placeholder="76.123.456-7"
                    maxLength={12}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition"
                  />
                </div>
              </>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {loading && (
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              )}
              {modo === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
            </button>
          </form>

          {modo === 'login' && (
            <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100 text-xs text-blue-700">
              <p className="font-semibold mb-1">Cuentas de demo:</p>
              <p>Admin: <strong>admin@donaton.cl</strong> / 123456</p>
              <p>Donador: <strong>juan@donaton.cl</strong> / 123456</p>
            </div>
          )}
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          <Link to="/" className="text-orange-500 hover:text-orange-600 font-medium">
            ← Volver al inicio
          </Link>
        </p>
      </div>
    </div>
  )
}
