import { useCallback, useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { shopsService } from '@/services/shops.service'
import { STORAGE_KEYS } from '@/constants'
import type { Shop } from '@/types/domain'

/**
 * Active branch selection (localStorage). Loads shops when authenticated
 * tenant users call list; SUPER_ADMIN pages simply see an empty shops list.
 */
export function useActiveShop(options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true

  const shopsQuery = useQuery({
    queryKey: ['shops'],
    enabled,
    queryFn: async () => (await shopsService.list()).data,
    retry: false,
  })

  const shops = shopsQuery.data ?? []
  const [activeShopId, setActiveShopIdState] = useState<string | null>(() =>
    localStorage.getItem(STORAGE_KEYS.activeShopId),
  )

  useEffect(() => {
    if (shops.length === 0) return
    const stored = localStorage.getItem(STORAGE_KEYS.activeShopId)
    const valid = stored && shops.some((s) => s.id === stored)
    if (!valid) {
      const first = shops[0].id
      localStorage.setItem(STORAGE_KEYS.activeShopId, first)
      setActiveShopIdState(first)
    } else if (stored !== activeShopId) {
      setActiveShopIdState(stored)
    }
  }, [shops, activeShopId])

  const setActiveShopId = useCallback((shopId: string) => {
    localStorage.setItem(STORAGE_KEYS.activeShopId, shopId)
    setActiveShopIdState(shopId)
  }, [])

  const activeShop: Shop | undefined = shops.find((s) => s.id === activeShopId)

  return {
    shops,
    activeShopId,
    activeShop,
    setActiveShopId,
    isLoading: shopsQuery.isLoading,
    isError: shopsQuery.isError,
    error: shopsQuery.error,
  }
}
