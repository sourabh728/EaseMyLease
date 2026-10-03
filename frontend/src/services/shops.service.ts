import { api } from '@/api/client'
import type { Shop } from '@/types/domain'

export type UpdateShopPayload = Partial<{
  name: string
  logo: string
  ownerName: string
  phone: string
  whatsapp: string
  email: string
  address: string
  city: string
  state: string
  pincode: string
  gstNumber: string
  businessHours: Record<string, unknown>
  rentalTerms: string
  defaultDeposit: number
  defaultLateCharge: number
}>

export type CreateShopPayload = {
  name: string
} & UpdateShopPayload

export const shopsService = {
  list() {
    return api.get<Shop[]>('/shops')
  },
  get(id: string) {
    return api.get<Shop>(`/shops/${id}`)
  },
  create(payload: CreateShopPayload) {
    return api.post<Shop>('/shops', payload)
  },
  update(id: string, payload: UpdateShopPayload) {
    return api.patch<Shop>(`/shops/${id}`, payload)
  },
}
