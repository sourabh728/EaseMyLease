import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { STORAGE_KEYS } from '@/constants'
import { authService } from '@/services/auth.service'
import type { User } from '@/types/auth'

export function useAuthSession() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem(STORAGE_KEYS.accessToken)
    if (!token) {
      setLoading(false)
      return
    }

    authService
      .me()
      .then((res) => setUser(res.data))
      .catch(() => {
        localStorage.removeItem(STORAGE_KEYS.accessToken)
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [])

  const logout = () => {
    localStorage.removeItem(STORAGE_KEYS.accessToken)
    setUser(null)
    queryClient.clear()
    navigate('/login', { replace: true })
  }

  return { user, setUser, loading, logout, isAuthenticated: Boolean(user) }
}
