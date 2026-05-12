import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { AuthState, LoginCredentials, RegisterData, User } from '../types'
import { mockUsers } from '../lib/mockData'
import api from '../lib/axios'

interface AuthContextValue extends AuthState {
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
  return !!(err && typeof err === 'object' && 'response' in err === false && 'request' in err)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
  })

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    const userRaw = localStorage.getItem(USER_KEY)
    if (token && userRaw) {
      try {
        const user: User = JSON.parse(userRaw)
        setState({ user, token, isAuthenticated: true, isLoading: false })
      } catch {
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(USER_KEY)
        setState((s) => ({ ...s, isLoading: false }))
      }
    } else {
      setState((s) => ({ ...s, isLoading: false }))
    }
  }, [])

  async function fetchMe(token: string): Promise<User> {
    const { data } = await api.get<User>('/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
    return data
  }

  async function login({ email, password }: LoginCredentials) {
    try {
      const { data } = await api.post<BackendAuthResponse>('/auth/login', { email, password })
      localStorage.setItem(TOKEN_KEY, data.token)
      let user: User
      try {
        user = await fetchMe(data.token)
      } catch {
        user = { id: 0, nombre: data.nombre, email: data.email, rol: data.rol }
      }
      localStorage.setItem(USER_KEY, JSON.stringify(user))
      setState({ user, token: data.token, isAuthenticated: true, isLoading: false })
    } catch (err: unknown) {
      if (isNetworkError(err)) {
        const user = mockUsers.find((u) => u.email === email)
        if (!user || password !== '123456') throw new Error('Credenciales incorrectas')
        const fakeToken = btoa(`${user.id}:${user.email}:${Date.now()}`)
        localStorage.setItem(TOKEN_KEY, fakeToken)
        localStorage.setItem(USER_KEY, JSON.stringify(user))
        setState({ user, token: fakeToken, isAuthenticated: true, isLoading: false })
        return
      }
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? ((err as { response?: { data?: { message?: string } } }).response?.data?.message)
          : undefined
      throw new Error(msg ?? 'Credenciales incorrectas')
    }
  }

  async function register({ nombre, email, password }: RegisterData) {
    try {
      const { data } = await api.post<BackendAuthResponse>('/auth/register', { nombre, email, password })
      localStorage.setItem(TOKEN_KEY, data.token)
      let user: User
      try {
        user = await fetchMe(data.token)
      } catch {
        user = { id: 0, nombre: data.nombre, email: data.email, rol: data.rol }
      }
      localStorage.setItem(USER_KEY, JSON.stringify(user))
      setState({ user, token: data.token, isAuthenticated: true, isLoading: false })
    } catch (err: unknown) {
      if (isNetworkError(err)) {
        const newUser: User = { id: Date.now(), nombre, email, rol: 'donador' }
        const fakeToken = btoa(`${newUser.id}:${newUser.email}:${Date.now()}`)
        localStorage.setItem(TOKEN_KEY, fakeToken)
        localStorage.setItem(USER_KEY, JSON.stringify(newUser))
        setState({ user: newUser, token: fakeToken, isAuthenticated: true, isLoading: false })
        return
      }
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? ((err as { response?: { data?: { message?: string } } }).response?.data?.message)
          : undefined
      throw new Error(msg ?? 'Error al registrar usuario')
    }
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setState({ user: null, token: null, isAuthenticated: false, isLoading: false })
  }

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
