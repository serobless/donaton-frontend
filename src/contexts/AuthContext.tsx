import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { LoginCredentials, RegisterData, User } from '../types'
import api from '../lib/axios'

interface AuthContextValue {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (credentials: LoginCredentials) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

const TOKEN_KEY = 'donaton_token'
const USER_KEY = 'donaton_user'

interface BackendAuthResponse {
  token: string
  email: string
  nombre: string
  rol: string  // backend envía "ADMIN" o "DONANTE" (enum Java)
}

function normalizeRol(rol: string): 'admin' | 'donador' | 'empresa' | 'centro_admin' {
  const r = rol.toUpperCase()
  if (r === 'ADMIN') return 'admin'
  if (r === 'EMPRESA') return 'empresa'
  if (r === 'CENTRO_ADMIN') return 'centro_admin'
  return 'donador'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem(USER_KEY)
    try {
      if (!stored) return null
      const parsed = JSON.parse(stored) as User
      return { ...parsed, rol: normalizeRol(parsed.rol as string) }
    } catch {
      localStorage.removeItem(USER_KEY)
      return null
    }
  })

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem(TOKEN_KEY)
  })

  const [isLoading, setIsLoading] = useState(false)

  const isAuthenticated = !!token && !!user

  useEffect(() => {
    function handleUnauthorized() {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
      setToken(null)
      setUser(null)
    }
    window.addEventListener('auth:unauthorized', handleUnauthorized)
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized)
  }, [])

  async function fetchMe(tok: string): Promise<User> {
    const { data } = await api.get<User & { rol: string }>('/auth/me', {
      headers: { Authorization: `Bearer ${tok}` },
    })
    return { ...data, rol: normalizeRol(data.rol) }
  }

  async function login({ email, password }: LoginCredentials) {
    setIsLoading(true)
    try {
      const { data } = await api.post<BackendAuthResponse>('/auth/login', { email, password })
      localStorage.setItem(TOKEN_KEY, data.token)
      let loggedUser: User
      try {
        loggedUser = await fetchMe(data.token)
      } catch {
        loggedUser = { id: 0, nombre: data.nombre, email: data.email, rol: normalizeRol(data.rol) }
      }
      localStorage.setItem(USER_KEY, JSON.stringify(loggedUser))
      setToken(data.token)
      setUser(loggedUser)
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { message?: string } } }
      let msg: string
      if (!axiosErr.response) {
        msg = 'No se pudo conectar con el servidor. Verifica que ms-auth esté corriendo en el puerto 8083.'
      } else if (axiosErr.response.status === 401 || axiosErr.response.status === 403) {
        msg = axiosErr.response.data?.message ?? 'Correo o contraseña incorrectos.'
      } else {
        msg = axiosErr.response.data?.message ?? `Error ${axiosErr.response.status} al iniciar sesión.`
      }
      throw new Error(msg)
    } finally {
      setIsLoading(false)
    }
  }

  async function register({ nombre, email, password, rut, telefono, region, esEmpresa, nombreEmpresa, rutEmpresa }: RegisterData) {
    setIsLoading(true)
    try {
      const { data } = await api.post<BackendAuthResponse>('/auth/register', {
        nombre, email, password, rut, telefono, region,
        esEmpresa: esEmpresa ?? false,
        nombreEmpresa: esEmpresa ? nombreEmpresa : undefined,
        rutEmpresa: esEmpresa ? rutEmpresa : undefined,
      })
      localStorage.setItem(TOKEN_KEY, data.token)
      let loggedUser: User
      try {
        loggedUser = await fetchMe(data.token)
      } catch {
        loggedUser = { id: 0, nombre: data.nombre, email: data.email, rol: normalizeRol(data.rol) }
      }
      localStorage.setItem(USER_KEY, JSON.stringify(loggedUser))
      setToken(data.token)
      setUser(loggedUser)
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { message?: string } }; code?: string }
      let msg: string
      if (!axiosErr.response) {
        // Sin respuesta: servidor caído o red
        msg = 'No se pudo conectar con el servidor. Verifica que ms-auth esté corriendo en el puerto 8083.'
      } else if (axiosErr.response.status === 400) {
        msg = axiosErr.response.data?.message ?? 'Datos inválidos. Revisa los campos e intenta nuevamente.'
      } else if (axiosErr.response.status === 409) {
        msg = axiosErr.response.data?.message ?? 'Ya existe una cuenta con este correo o RUT.'
      } else {
        msg = axiosErr.response.data?.message ?? `Error ${axiosErr.response.status} al registrar usuario.`
      }
      throw new Error(msg)
    } finally {
      setIsLoading(false)
    }
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
