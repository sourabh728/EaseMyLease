import { api } from '@/api/client'
import { STORAGE_KEYS } from '@/constants'
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

const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

export async function downloadRentalReceipt(rentalId: string, rentalNumber: string) {
  const token = localStorage.getItem(STORAGE_KEYS.accessToken)
  const res = await fetch(`${apiBase}/rentals/${rentalId}/receipt`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) {
    throw new Error('Failed to download receipt')
  }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `receipt-${rentalNumber}.pdf`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function buildWhatsAppShareUrl(rental: Rental) {
  const phoneRaw = (rental.customer?.whatsapp || rental.customer?.phone || '').replace(
    /\D/g,
    '',
  )
  const items = (rental.items ?? [])
    .map((i) => i.inventoryItem?.name ?? i.inventoryItem?.itemCode)
    .filter(Boolean)
    .join(', ')
  const lines = [
    `Rental ${rental.rentalNumber}`,
    `Customer: ${rental.customer?.name ?? ''}`,
    `Dates: ${rental.rentalStartDate.slice(0, 10)} to ${rental.expectedReturnDate.slice(0, 10)}`,
    `Items: ${items || '—'}`,
    `Total rent: ₹${Number(rental.totalRent).toFixed(2)}`,
    `Deposit: ₹${Number(rental.totalDeposit).toFixed(2)}`,
    `Paid: ₹${Number(rental.amountPaid).toFixed(2)}`,
    `Balance: ₹${Number(rental.balanceAmount).toFixed(2)}`,
    `Status: ${rental.status}`,
  ]
  const text = encodeURIComponent(lines.join('\n'))
  if (phoneRaw) {
    return `https://wa.me/${phoneRaw}?text=${text}`
  }
  return `https://wa.me/?text=${text}`
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
  downloadReceipt(id: string, rentalNumber: string) {
    return downloadRentalReceipt(id, rentalNumber)
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
