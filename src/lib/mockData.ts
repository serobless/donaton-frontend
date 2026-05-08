import type { Causa, Donacion, TopDonador, User } from '../types'

export const mockCausas: Causa[] = [
  {
    id: 1,
    titulo: 'Reconstrucción Escuela Rural Putaendo',
    descripcion:
      'Ayuda a reconstruir la escuela primaria de Putaendo afectada por las lluvias de invierno. Más de 200 niños esperan volver a clases.',
    imagen: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=600&auto=format',
    meta: 15000000,
    recaudado: 9750000,
    categoria: 'Educación',
    activa: true,
    fechaFin: '2026-07-31',
  },
  {
    id: 2,
    titulo: 'Alimentación para Adultos Mayores Valparaíso',
    descripcion:
      'Programa de cajas de alimentos mensuales para 150 adultos mayores en situación de vulnerabilidad en el Gran Valparaíso.',
    imagen: 'https://images.unsplash.com/photo-1593113616828-6f22bca04804?w=600&auto=format',
    meta: 8000000,
    recaudado: 6200000,
    categoria: 'Alimentación',
    activa: true,
    fechaFin: '2026-08-15',
  },
  {
    id: 3,
    titulo: 'Medicamentos Oncológicos Niños La Serena',
    descripcion:
      'Financiamiento de tratamientos oncológicos para 12 niños del Hospital de La Serena que no cuentan con cobertura FONASA completa.',
    imagen: 'https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=600&auto=format',
    meta: 25000000,
    recaudado: 7500000,
    categoria: 'Salud',
    activa: true,
    fechaFin: '2026-09-30',
  },
  {
    id: 4,
    titulo: 'Refugio Animales Santiago Sur',
    descripcion:
      'Ampliación del refugio municipal de animales en Santiago Sur para albergar a 80 perros y gatos rescatados de la calle.',
    imagen: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=600&auto=format',
    meta: 6000000,
    recaudado: 5800000,
    categoria: 'Animales',
    activa: false,
    fechaFin: '2026-04-30',
  },
]

export const mockDonaciones: Donacion[] = [
  {
    id: 1,
    donadorNombre: 'María González',
    donadorEmail: 'maria@email.com',
    monto: 50000,
    causaId: 1,
    causaTitulo: 'Reconstrucción Escuela Rural Putaendo',
    fecha: '2026-05-01T10:30:00Z',
    mensaje: '¡Adelante! Los niños merecen una buena educación.',
    anonima: false,
  },
  {
    id: 2,
    donadorNombre: 'Carlos Rodríguez',
    donadorEmail: 'carlos@email.com',
    monto: 100000,
    causaId: 2,
    causaTitulo: 'Alimentación para Adultos Mayores Valparaíso',
    fecha: '2026-05-02T14:15:00Z',
    mensaje: '',
    anonima: false,
  },
  {
    id: 3,
    donadorNombre: 'Anónimo',
    monto: 200000,
    causaId: 3,
    causaTitulo: 'Medicamentos Oncológicos Niños La Serena',
    fecha: '2026-05-03T09:00:00Z',
    mensaje: 'Con todo el corazón.',
    anonima: true,
  },
  {
    id: 4,
    donadorNombre: 'Ana Martínez',
    donadorEmail: 'ana@email.com',
    monto: 75000,
    causaId: 1,
    causaTitulo: 'Reconstrucción Escuela Rural Putaendo',
    fecha: '2026-05-04T16:45:00Z',
    mensaje: '',
    anonima: false,
  },
  {
    id: 5,
    donadorNombre: 'Roberto Silva',
    donadorEmail: 'roberto@email.com',
    monto: 30000,
    causaId: 2,
    causaTitulo: 'Alimentación para Adultos Mayores Valparaíso',
    fecha: '2026-05-05T11:20:00Z',
    mensaje: 'Un pequeño aporte para una gran causa.',
    anonima: false,
  },
  {
    id: 6,
    donadorNombre: 'Valentina Torres',
    donadorEmail: 'vale@email.com',
    monto: 150000,
    causaId: 3,
    causaTitulo: 'Medicamentos Oncológicos Niños La Serena',
    fecha: '2026-05-06T08:00:00Z',
    mensaje: '',
    anonima: false,
  },
  {
    id: 7,
    donadorNombre: 'Felipe Muñoz',
    donadorEmail: 'felipe@email.com',
    monto: 45000,
    causaId: 1,
    causaTitulo: 'Reconstrucción Escuela Rural Putaendo',
    fecha: '2026-05-07T13:10:00Z',
    mensaje: 'Fuerza Putaendo!',
    anonima: false,
  },
]

export const mockTopDonadores: TopDonador[] = [
  { id: 1, nombre: 'Valentina Torres', totalDonado: 450000, cantidadDonaciones: 8 },
  { id: 2, nombre: 'Carlos Rodríguez', totalDonado: 380000, cantidadDonaciones: 5 },
  { id: 3, nombre: 'María González', totalDonado: 275000, cantidadDonaciones: 7 },
  { id: 4, nombre: 'Ana Martínez', totalDonado: 210000, cantidadDonaciones: 4 },
  { id: 5, nombre: 'Roberto Silva', totalDonado: 185000, cantidadDonaciones: 6 },
]

export const mockUsers: User[] = [
  {
    id: 1,
    nombre: 'Admin Donaton',
    email: 'admin@donaton.cl',
    rol: 'admin',
  },
  {
    id: 2,
    nombre: 'María González',
    email: 'maria@email.com',
    rol: 'donador',
  },
]
