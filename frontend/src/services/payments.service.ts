import { api } from '@/api/client'
import type {
  PaginatedResponse,
  Payment,
  PaymentMethod,
  PaymentType,
} from '@/types/domain'

export type PaymentListParams = {
  page?: number
  pageSize?: number
  search?: string
  rentalId?: string
  paymentType?: PaymentType
  fromDate?: string
  toDate?: string
}

export type PaymentPayload = {
  rentalId: string
  amount: number
  paymentType: PaymentType
  method: PaymentMethod
  transactionRef?: string
  paymentDate?: string
  notes?: string
}

export const paymentsService = {
  list(params?: PaymentListParams) {
    return api.get<PaginatedResponse<Payment>>('/payments', { params })
  },
  get(id: string) {
    return api.get<Payment>(`/payments/${id}`)
  },
  create(payload: PaymentPayload) {
    return api.post<Payment>('/payments', payload)
  },
}
