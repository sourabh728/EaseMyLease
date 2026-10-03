import { api } from '@/api/client'
import type {
  InventoryItem,
  InventoryStatus,
  PaginatedResponse,
} from '@/types/domain'

export type InventoryListParams = {
  page?: number
  pageSize?: number
  search?: string
  shopId?: string
  categoryId?: string
  parentCategoryId?: string
  size?: string
  color?: string
  status?: InventoryStatus
  availableOnly?: boolean
  occasion?: string
  minPrice?: number
  maxPrice?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export type InventoryImageInput = { url: string; sortOrder?: number }

export type InventoryPayload = {
  categoryId: string
  shopId?: string
  itemCode: string
  name: string
  description?: string
  size?: string
  color?: string
  brand?: string
  purchasePrice?: number
  rentalPrice: number
  securityDeposit?: number
  condition?: string
  status?: InventoryStatus
  location?: string
  occasion?: string
  images?: InventoryImageInput[]
}

export type ResolveItemResult = {
  item: InventoryItem
  suggestedAction: 'RENT' | 'RETURN' | 'VIEW'
  activeRental: {
    id: string
    rentalNumber: string
    status: string
    expectedReturnDate: string
    customer?: { id: string; name: string; phone: string }
  } | null
}

export const inventoryService = {
  list(params?: InventoryListParams) {
    return api.get<PaginatedResponse<InventoryItem>>('/inventory', { params })
  },
  get(id: string) {
    return api.get<InventoryItem>(`/inventory/${id}`)
  },
  getByCode(itemCode: string) {
    return api.get<InventoryItem>(`/inventory/by-code/${encodeURIComponent(itemCode)}`)
  },
  resolve(itemCode: string) {
    return api.get<ResolveItemResult>(
      `/inventory/resolve/${encodeURIComponent(itemCode)}`,
    )
  },
  create(payload: InventoryPayload) {
    return api.post<InventoryItem & { softLimitWarning?: string }>('/inventory', payload)
  },
  update(id: string, payload: Partial<InventoryPayload>) {
    return api.patch<InventoryItem>(`/inventory/${id}`, payload)
  },
  remove(id: string) {
    return api.delete<InventoryItem>(`/inventory/${id}`)
  },
}
