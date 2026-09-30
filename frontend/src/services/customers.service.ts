import { api } from '@/api/client'
import type { Customer, PaginatedResponse } from '@/types/domain'

export type CustomerListParams = {
  page?: number
  pageSize?: number
  search?: string
}

export type CustomerPayload = {
  name: string
  phone: string
  whatsapp?: string
  email?: string
  address?: string
  city?: string
  idProofType?: string
  idProofNumber?: string
  notes?: string
}

export const customersService = {
  list(params?: CustomerListParams) {
    return api.get<PaginatedResponse<Customer>>('/customers', { params })
  },
  get(id: string) {
    return api.get<Customer>(`/customers/${id}`)
  },
  create(payload: CustomerPayload) {
    return api.post<Customer>('/customers', payload)
  },
  update(id: string, payload: Partial<CustomerPayload>) {
    return api.patch<Customer>(`/customers/${id}`, payload)
  },
  remove(id: string) {
    return api.delete(`/customers/${id}`)
  },
}
