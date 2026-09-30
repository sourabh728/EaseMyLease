export interface PaginatedMeta {
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: PaginatedMeta
}

export interface Shop {
  id: string
  tenantId: string
  name: string
  logo: string | null
  ownerName: string | null
  phone: string | null
  whatsapp: string | null
  email: string | null
  address: string | null
  city: string | null
  state: string | null
  pincode: string | null
  gstNumber: string | null
  businessHours: Record<string, unknown> | null
  rentalTerms: string | null
  defaultDeposit: string | null
  defaultLateCharge: string | null
  createdAt: string
  updatedAt: string
}

export interface Category {
  id: string
  tenantId: string
  name: string
  description: string | null
  parentId: string | null
  sortOrder: number
  isActive: boolean
  createdAt: string
  updatedAt: string
  parent?: { id: string; name: string } | null
  _count?: { children: number; items: number }
}

export type InventoryStatus =
  | 'AVAILABLE'
  | 'RESERVED'
  | 'ON_RENT'
  | 'RETURNED'
  | 'UNDER_INSPECTION'
  | 'DAMAGED'
  | 'LOST'
  | 'UNDER_REPAIR'
  | 'RETIRED'

export const INVENTORY_STATUSES: InventoryStatus[] = [
  'AVAILABLE',
  'RESERVED',
  'ON_RENT',
  'RETURNED',
  'UNDER_INSPECTION',
  'DAMAGED',
  'LOST',
  'UNDER_REPAIR',
  'RETIRED',
]

export interface InventoryImage {
  id: string
  url: string
  sortOrder: number
}

export interface InventoryItem {
  id: string
  tenantId: string
  categoryId: string
  itemCode: string
  name: string
  description: string | null
  size: string | null
  color: string | null
  brand: string | null
  purchasePrice: string | null
  rentalPrice: string
  securityDeposit: string | null
  condition: string | null
  status: InventoryStatus
  location: string | null
  occasion: string | null
  createdAt: string
  updatedAt: string
  category?: {
    id: string
    name: string
    parentId: string | null
    parent?: { id: string; name: string } | null
  }
  images?: InventoryImage[]
}

export interface Customer {
  id: string
  tenantId: string
  name: string
  phone: string
  whatsapp: string | null
  email: string | null
  address: string | null
  city: string | null
  idProofType: string | null
  idProofNumber: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}
