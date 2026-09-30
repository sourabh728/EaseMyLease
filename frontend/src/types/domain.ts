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

export type RentalStatus =
  | 'DRAFT'
  | 'CONFIRMED'
  | 'ACTIVE'
  | 'RETURN_PENDING'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'OVERDUE'

export const RENTAL_STATUSES: RentalStatus[] = [
  'DRAFT',
  'CONFIRMED',
  'ACTIVE',
  'RETURN_PENDING',
  'COMPLETED',
  'CANCELLED',
  'OVERDUE',
]

export type ReturnCondition =
  | 'GOOD'
  | 'MINOR_DAMAGE'
  | 'MAJOR_DAMAGE'
  | 'MISSING_ACCESSORY'
  | 'LOST'

export const RETURN_CONDITIONS: ReturnCondition[] = [
  'GOOD',
  'MINOR_DAMAGE',
  'MAJOR_DAMAGE',
  'MISSING_ACCESSORY',
  'LOST',
]

export type PaymentType = 'RENT' | 'DEPOSIT' | 'LATE_FEE' | 'DAMAGE_CHARGE' | 'REFUND'
export type PaymentMethod = 'CASH' | 'UPI' | 'CARD' | 'BANK_TRANSFER'

export const PAYMENT_TYPES: PaymentType[] = [
  'RENT',
  'DEPOSIT',
  'LATE_FEE',
  'DAMAGE_CHARGE',
  'REFUND',
]

export const PAYMENT_METHODS: PaymentMethod[] = [
  'CASH',
  'UPI',
  'CARD',
  'BANK_TRANSFER',
]

export interface RentalItem {
  id: string
  tenantId: string
  rentalId: string
  inventoryItemId: string
  rentalPrice: string
  deposit: string
  conditionAtRelease: string | null
  conditionAtReturn: string | null
  notes: string | null
  inventoryItem?: {
    id: string
    itemCode: string
    name: string
    size: string | null
    color: string | null
    status: InventoryStatus
    rentalPrice: string
    securityDeposit: string | null
  }
}

export interface Payment {
  id: string
  tenantId: string
  rentalId: string
  amount: string
  paymentType: PaymentType
  method: PaymentMethod
  transactionRef: string | null
  paymentDate: string
  notes: string | null
  createdBy: string
  createdAt: string
  updatedAt: string
  rental?: {
    id: string
    rentalNumber: string
    status: RentalStatus
    customer?: { id: string; name: string; phone: string }
    totalRent: string
    totalDeposit: string
    amountPaid: string
    balanceAmount: string
  }
}

export interface DamageRecord {
  id: string
  tenantId: string
  rentalId: string
  returnId: string | null
  rentalItemId: string | null
  inventoryItemId: string
  description: string
  chargeAmount: string
  photoUrls: string[] | null
  createdBy: string
  createdAt: string
  updatedAt: string
  inventoryItem?: { id: string; itemCode: string; name: string }
}

export interface RentalReturnItem {
  id: string
  tenantId: string
  returnId: string
  rentalItemId: string
  inventoryItemId: string
  condition: ReturnCondition
  damageNotes: string | null
  missingAccessories: string | null
  stains: boolean
  isLost: boolean
  additionalCharge: string
  notes: string | null
  photoUrls: string[] | null
}

export interface RentalReturn {
  id: string
  tenantId: string
  rentalId: string
  returnDate: string
  lateFee: string
  notes: string | null
  createdBy: string
  createdAt: string
  updatedAt: string
  items?: RentalReturnItem[]
  damageRecords?: DamageRecord[]
  rental?: {
    id: string
    rentalNumber: string
    status: RentalStatus
    customerId: string
    customer?: { id: string; name: string; phone: string }
    totalRent: string
    totalDeposit: string
    amountPaid: string
    balanceAmount: string
  }
}

export interface Rental {
  id: string
  tenantId: string
  customerId: string
  rentalNumber: string
  rentalStartDate: string
  expectedReturnDate: string
  actualReturnDate: string | null
  subtotal: string
  discount: string
  totalRent: string
  totalDeposit: string
  amountPaid: string
  balanceAmount: string
  status: RentalStatus
  notes: string | null
  createdBy: string
  createdAt: string
  updatedAt: string
  customer?: {
    id: string
    name: string
    phone: string
    email: string | null
    city: string | null
  }
  items?: RentalItem[]
  payments?: Payment[]
  returns?: RentalReturn[]
  damageRecords?: DamageRecord[]
}

export interface AvailabilityResult {
  inventoryItemId: string
  itemCode: string
  name: string
  status: InventoryStatus
  rentalPrice: string
  securityDeposit: string | null
  available: boolean
  reason: string | null
}

export interface AvailabilityResponse {
  rentalStartDate: string
  expectedReturnDate: string
  results: AvailabilityResult[]
}
