export interface User {
  id: number
  nombre: string
  email: string
  rol: 'admin' | 'donador'
  avatar?: string
  fechaRegistro?: string
  totalDonaciones?: number
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
  diasRestantes?: number
}

export type EstadoDonacion = 'pendiente' | 'en_proceso' | 'completada' | 'cancelada'
export type TipoDonacion = 'monetaria' | 'ropa' | 'alimento' | 'medica'

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

export interface DonacionExtendida extends Donacion {
  estado: EstadoDonacion
  tipo: TipoDonacion
  destino?: string
  descripcion?: string
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
  rut: string
  telefono?: string
  region?: string
}

export interface AuthResponse {
  token: string
  user: User
}

export interface Voluntario {
  id: number
  nombre: string
  email: string
  telefono: string
  region: string
  disponibilidad: 'fin_de_semana' | 'semana' | 'ambos'
  areaInteres: 'logistica' | 'comunicaciones' | 'salud' | 'educacion'
  fechaInscripcion: string
  activo: boolean
}

export interface HorarioCentro {
  dia: string
  hora: string
}

export interface CentroAcopio {
  id: number
  nombre: string
  direccion: string
  region: string
  ciudad: string
  horario: string
  telefono: string
  queRecibe: string[]
  capacidadActual: number
  capacidadMax: number
  activo: boolean
  coordenadas?: { lat: number; lng: number }
}

export interface EvidenciaCampana {
  id: number
  titulo: string
  fecha: string
  monto: number
  beneficiarios: number
  descripcion: string
  detalle: string[]
  centrosBeneficiados?: string[]
  tipo: 'ropa' | 'alimento' | 'monetario' | 'medicamento'
}

export interface ImpactoRegion {
  id: number
  nombre: string
  codigo: string
  familiasAyudadas: number
  kilosRopa: number
  centrosActivos: number
  nivel: 1 | 2 | 3 | 4 | 5
}

export interface Partner {
  id: number
  nombre: string
  tipo: 'empresa' | 'ong' | 'gobierno'
  descripcion: string
  iniciales: string
  color: string
}

export interface ChartDataMonth {
  mes: string
  total: number
  monetario: number
  especie: number
}
