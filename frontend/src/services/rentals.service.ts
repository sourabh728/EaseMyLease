import { api } from '@/api/client'
import type {
  AvailabilityResponse,
  PaginatedResponse,
  Rental,
  RentalStatus,
} from '@/types/domain'

export type RentalListParams = {
  page?: number
  pageSize?: number
  search?: string
  status?: RentalStatus
  customerId?: string
  fromDate?: string
  toDate?: string
}

export type RentalItemPayload = {
  inventoryItemId: string
  rentalPrice?: number
  deposit?: number
  notes?: string
}

export type RentalPayload = {
  customerId: string
  rentalStartDate: string
  expectedReturnDate: string
  discount?: number
  notes?: string
  items: RentalItemPayload[]
}

export const rentalsService = {
  list(params?: RentalListParams) {
    return api.get<PaginatedResponse<Rental>>('/rentals', { params })
  },
  get(id: string) {
    return api.get<Rental>(`/rentals/${id}`)
  },
  create(payload: RentalPayload) {
    return api.post<Rental>('/rentals', payload)
  },
  update(id: string, payload: Partial<RentalPayload>) {
    return api.patch<Rental>(`/rentals/${id}`, payload)
  },
  confirm(id: string) {
    return api.post<Rental>(`/rentals/${id}/confirm`)
  },
  release(id: string, payload?: { conditionAtRelease?: string }) {
    return api.post<Rental>(`/rentals/${id}/release`, payload ?? {})
  },
  cancel(id: string) {
    return api.post<Rental>(`/rentals/${id}/cancel`)
  },
  checkAvailability(payload: {
    rentalStartDate: string
    expectedReturnDate: string
    inventoryItemIds: string[]
    excludeRentalId?: string
  }) {
    return api.post<AvailabilityResponse>('/rentals/availability', payload)
  },
}
