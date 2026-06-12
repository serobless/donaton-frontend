import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthProvider, useAuth } from './AuthContext'

beforeEach(() => {
  localStorage.clear()
})

function TestComponent() {
  const { isAuthenticated, user, logout } = useAuth()
  return (
    <div>
      <span data-testid="auth">{isAuthenticated ? 'autenticado' : 'no-autenticado'}</span>
      <span data-testid="nombre">{user?.nombre ?? 'sin-nombre'}</span>
      <button onClick={logout}>Logout</button>
    </div>
  )
}

function renderAuth() {
  return render(<AuthProvider><TestComponent /></AuthProvider>)
}

describe('AuthContext', () => {
  it('estado inicial: no autenticado si localStorage está vacío', () => {
    renderAuth()
    expect(screen.getByTestId('auth').textContent).toBe('no-autenticado')
  })

  it('recupera sesión desde localStorage al montar', () => {
    localStorage.setItem('donaton_token', 'token-guardado')
    localStorage.setItem('donaton_user', JSON.stringify({ id: 7, nombre: 'Sebastián', email: 'seba@test.cl', rol: 'donador' }))
    renderAuth()
    expect(screen.getByTestId('auth').textContent).toBe('autenticado')
    expect(screen.getByTestId('nombre').textContent).toBe('Sebastián')
  })

  it('logout limpia estado y localStorage', async () => {
    localStorage.setItem('donaton_token', 'tok')
    localStorage.setItem('donaton_user', JSON.stringify({ id: 1, nombre: 'X', email: 'x@x.cl', rol: 'donador' }))
    renderAuth()
    await userEvent.click(screen.getByRole('button', { name: 'Logout' }))
    expect(screen.getByTestId('auth').textContent).toBe('no-autenticado')
    expect(localStorage.getItem('donaton_token')).toBeNull()
  })
})
