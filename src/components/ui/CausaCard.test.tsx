import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import CausaCard from './CausaCard'
import type { Causa } from '../../types'

const causaBase: Causa = {
  id: 1,
  titulo: 'Escuela Rural Putaendo',
  descripcion: 'Ayuda a reconstruir la escuela.',
  imagen: '',
  meta: 10000000,
  recaudado: 6500000,
  categoria: 'Educación',
  activa: true,
  fechaFin: '2099-12-31',
}

function renderCard(causa: Causa = causaBase) {
  return render(<MemoryRouter><CausaCard causa={causa} /></MemoryRouter>)
}

describe('CausaCard', () => {
  it('muestra el título de la causa', () => {
    renderCard()
    expect(screen.getByText('Escuela Rural Putaendo')).toBeInTheDocument()
  })

  it('muestra el porcentaje correcto', () => {
    renderCard()
    expect(screen.getByText('65%')).toBeInTheDocument()
  })

  it('muestra el badge de categoría', () => {
    renderCard()
    expect(screen.getAllByText('Educación').length).toBeGreaterThan(0)
  })

  it('muestra el botón de donar', () => {
    renderCard()
    expect(screen.getByRole('link', { name: /donar ahora/i })).toBeInTheDocument()
  })
})
