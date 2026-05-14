import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

interface Props {
  requiredRole?: 'admin' | 'donador'
}

export default function ProtectedRoute({ requiredRole }: Props) {
  const { isAuthenticated, user, isLoading } = useAuth()

  if (isLoading) return null

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (requiredRole && user?.rol?.toLowerCase() !== requiredRole) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
