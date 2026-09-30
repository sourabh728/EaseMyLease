import { api } from '@/api/client'
import type {
  DamageRecord,
  PaginatedResponse,
  RentalReturn,
  ReturnCondition,
} from '@/types/domain'

export type ReturnListParams = {
  page?: number
  pageSize?: number
  search?: string
  rentalId?: string
  fromDate?: string
  toDate?: string
}

export type ReturnItemPayload = {
  rentalItemId: string
  condition: ReturnCondition
  damageNotes?: string
  missingAccessories?: string
  stains?: boolean
  isLost?: boolean
  additionalCharge?: number
  notes?: string
  photoUrls?: string[]
  damageCharge?: number
  damageDescription?: string
}

export type ReturnPayload = {
  rentalId: string
  returnDate?: string
  lateFee?: number
  notes?: string
  completeSettlement?: boolean
  items: ReturnItemPayload[]
}

export const returnsService = {
  list(params?: ReturnListParams) {
    return api.get<PaginatedResponse<RentalReturn>>('/returns', { params })
  },
  get(id: string) {
    return api.get<RentalReturn>(`/returns/${id}`)
  },
  create(payload: ReturnPayload) {
    return api.post<RentalReturn>('/returns', payload)
  },
  listDamage(rentalId?: string) {
    return api.get<DamageRecord[]>('/damage-records', {
      params: rentalId ? { rentalId } : undefined,
    })
  },
}
