import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { AuthState, LoginCredentials, RegisterData, User } from '../types'
import { mockUsers } from '../lib/mockData'

interface AuthContextValue extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

const TOKEN_KEY = 'donaton_token'
const USER_KEY = 'donaton_user'

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

  async function login({ email, password }: LoginCredentials) {
    // Simulación — reemplazar con api.post('/auth/login', ...)
    await new Promise((r) => setTimeout(r, 600))
    const user = mockUsers.find((u) => u.email === email)
    if (!user || password !== '123456') {
      throw new Error('Credenciales incorrectas')
    }
    const fakeToken = btoa(`${user.id}:${user.email}:${Date.now()}`)
    localStorage.setItem(TOKEN_KEY, fakeToken)
    localStorage.setItem(USER_KEY, JSON.stringify(user))
    setState({ user, token: fakeToken, isAuthenticated: true, isLoading: false })
  }

  async function register({ nombre, email }: RegisterData) {
    // Simulación — reemplazar con api.post('/auth/register', ...)
    await new Promise((r) => setTimeout(r, 800))
    const newUser: User = { id: Date.now(), nombre, email, rol: 'donador' }
    const fakeToken = btoa(`${newUser.id}:${newUser.email}:${Date.now()}`)
    localStorage.setItem(TOKEN_KEY, fakeToken)
    localStorage.setItem(USER_KEY, JSON.stringify(newUser))
    setState({ user: newUser, token: fakeToken, isAuthenticated: true, isLoading: false })
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
