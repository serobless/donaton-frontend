import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

interface Props {
  requiredRole?: 'admin' | 'donador'
}

export default function ProtectedRoute({ requiredRole }: Props) {
  const { isAuthenticated, user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (requiredRole && user?.rol !== requiredRole) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
