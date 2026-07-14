import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:8082',
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
})

api.interceptors.request.use((config) => {
  const url = config.url ?? ''
  const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/register')
  if (!isAuthEndpoint) {
    const token = localStorage.getItem('donaton_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.dispatchEvent(new Event('auth:unauthorized'))
    }
    return Promise.reject(error)
  }
)

export default api
