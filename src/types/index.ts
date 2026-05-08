export interface User {
  id: number
  nombre: string
  email: string
  rol: 'admin' | 'donador'
  avatar?: string
}

export interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
}

export interface Causa {
  id: number
  titulo: string
  descripcion: string
  imagen: string
  meta: number
  recaudado: number
  categoria: string
  activa: boolean
  fechaFin: string
}

export interface Donacion {
  id: number
  donadorNombre: string
  donadorEmail?: string
  monto: number
  causaId: number
  causaTitulo: string
  fecha: string
  mensaje?: string
  anonima: boolean
}

export interface TopDonador {
  id: number
  nombre: string
  avatar?: string
  totalDonado: number
  cantidadDonaciones: number
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  nombre: string
  email: string
  password: string
}

export interface AuthResponse {
  token: string
  user: User
}
