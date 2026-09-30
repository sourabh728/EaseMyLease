import { Navigate, Outlet } from 'react-router-dom'
import { STORAGE_KEYS } from '@/constants'

export function ProtectedRoute() {
  const token = localStorage.getItem(STORAGE_KEYS.accessToken)
  if (!token) {
    return <Navigate to="/login" replace />
  }
  return <Outlet />
}
