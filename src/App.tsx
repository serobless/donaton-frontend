import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './contexts/AuthContext'
import { DonacionProvider } from './contexts/DonacionContext'
import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'
import ProtectedRoute from './components/layout/ProtectedRoute'
import Home from './pages/Home'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Transparencia from './pages/Transparencia'
import Donaciones from './pages/Donaciones'
import Testimonios from './pages/Testimonios'
import Campanas from './pages/Campanas'
import MapaNecesidades from './pages/MapaNecesidades'

const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <DonacionProvider>
          <BrowserRouter>
            <div className="flex flex-col min-h-screen">
              <Navbar />
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/transparencia" element={<Transparencia />} />
                <Route path="/testimonios" element={<Testimonios />} />
                <Route path="/campanas" element={<Campanas />} />
                <Route path="/mapa-necesidades" element={<MapaNecesidades />} />

                {/* Rutas protegidas para cualquier usuario autenticado */}
                <Route element={<ProtectedRoute />}>
                  <Route path="/donaciones" element={<Donaciones />} />
                </Route>

                {/* Rutas protegidas solo para admin */}
                <Route element={<ProtectedRoute requiredRole="admin" />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                </Route>
              </Routes>
              <Footer />
            </div>
          </BrowserRouter>
        </DonacionProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}
