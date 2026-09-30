import { useEffect, useState } from 'react'
import { STORAGE_KEYS } from '@/constants'
import { authService } from '@/services/auth.service'
import type { User } from '@/types/auth'

export function useAuthSession() {
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
  }

  return { user, setUser, loading, logout, isAuthenticated: Boolean(user) }
}
