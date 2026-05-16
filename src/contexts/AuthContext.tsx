import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { LoginCredentials, RegisterData, User } from '../types'
import { mockUsers } from '../lib/mockData'
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
  rol: 'admin' | 'donador'
}

function isNetworkError(err: unknown): boolean {
  return !!(err && typeof err === 'object' && !('response' in err) && 'request' in err)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem(USER_KEY)
    try {
      return stored ? JSON.parse(stored) : null
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
    const { data } = await api.get<User>('/auth/me', {
      headers: { Authorization: `Bearer ${tok}` },
    })
    return data
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
        loggedUser = { id: 0, nombre: data.nombre, email: data.email, rol: data.rol }
      }
      localStorage.setItem(USER_KEY, JSON.stringify(loggedUser))
      setToken(data.token)
      setUser(loggedUser)
    } catch (err: unknown) {
      if (isNetworkError(err)) {
        const found = mockUsers.find((u) => u.email === email)
        if (!found || password !== '123456') throw new Error('Credenciales incorrectas')
        const fakeToken = btoa(`${found.id}:${found.email}:${Date.now()}`)
        localStorage.setItem(TOKEN_KEY, fakeToken)
        localStorage.setItem(USER_KEY, JSON.stringify(found))
        setToken(fakeToken)
        setUser(found)
        return
      }
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? ((err as { response?: { data?: { message?: string } } }).response?.data?.message)
          : undefined
      throw new Error(msg ?? 'Credenciales incorrectas')
    } finally {
      setIsLoading(false)
    }
  }

  async function register({ nombre, email, password, rut, telefono, region }: RegisterData) {
    setIsLoading(true)
    try {
      const { data } = await api.post<BackendAuthResponse>('/auth/register', { nombre, email, password, rut, telefono, region })
      localStorage.setItem(TOKEN_KEY, data.token)
      let loggedUser: User
      try {
        loggedUser = await fetchMe(data.token)
      } catch {
        loggedUser = { id: 0, nombre: data.nombre, email: data.email, rol: data.rol }
      }
      localStorage.setItem(USER_KEY, JSON.stringify(loggedUser))
      setToken(data.token)
      setUser(loggedUser)
    } catch (err: unknown) {
      if (isNetworkError(err)) {
        const newUser: User = { id: Date.now(), nombre, email, rol: 'donador' }
        const fakeToken = btoa(`${newUser.id}:${newUser.email}:${Date.now()}`)
        localStorage.setItem(TOKEN_KEY, fakeToken)
        localStorage.setItem(USER_KEY, JSON.stringify(newUser))
        setToken(fakeToken)
        setUser(newUser)
        return
      }
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? ((err as { response?: { data?: { message?: string } } }).response?.data?.message)
          : undefined
      throw new Error(msg ?? 'Error al registrar usuario')
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
