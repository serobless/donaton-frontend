import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import ProtectedRoute from './ProtectedRoute'

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}))

import { useAuth } from '../../contexts/AuthContext'

const mockUseAuth = useAuth as ReturnType<typeof vi.fn>

function renderProtected(requiredRole?: 'admin' | 'donador') {
  return render(
    <MemoryRouter initialEntries={['/secreto']}>
      <Routes>
        <Route path="/login" element={<div>Login</div>} />
        <Route path="/" element={<div>Inicio</div>} />
        <Route element={<ProtectedRoute allowedRoles={requiredRole ? [requiredRole] : undefined} />}>
          <Route path="/secreto" element={<div>Contenido protegido</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  )
}

describe('ProtectedRoute', () => {
  it('redirige a /login si no está autenticado', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, user: null, isLoading: false })
    renderProtected()
    expect(screen.getByText('Login')).toBeInTheDocument()
    expect(screen.queryByText('Contenido protegido')).not.toBeInTheDocument()
  })

  it('renderiza el outlet si está autenticado', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, user: { rol: 'donador' }, isLoading: false })
    renderProtected()
    expect(screen.getByText('Contenido protegido')).toBeInTheDocument()
  })

  it('redirige a / si no tiene el rol requerido', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, user: { rol: 'donador' }, isLoading: false })
    renderProtected('admin')
    expect(screen.getByText('Inicio')).toBeInTheDocument()
    expect(screen.queryByText('Contenido protegido')).not.toBeInTheDocument()
  })

  it('renderiza el outlet si tiene el rol correcto', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, user: { rol: 'admin' }, isLoading: false })
    renderProtected('admin')
    expect(screen.getByText('Contenido protegido')).toBeInTheDocument()
  })

  it('no renderiza nada mientras carga (isLoading)', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, user: null, isLoading: true })
    const { container } = renderProtected()
    expect(container.firstChild).toBeNull()
  })
})
