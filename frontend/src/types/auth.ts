export type Role = 'SUPER_ADMIN' | 'SHOP_OWNER' | 'STAFF'

export interface User {
  id: string
  tenantId: string | null
  name: string
  email: string
  phone?: string | null
  role: Role
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

export interface Tenant {
  id: string
  name: string
  slug: string
  createdAt: string
  updatedAt: string
}

export interface Shop {
  id: string
  tenantId: string
  name: string
  ownerName?: string | null
  email?: string | null
  phone?: string | null
}

export interface AuthResponse {
  accessToken: string
  user: User
  tenant?: Tenant
  shop?: Shop
}

export interface RegisterPayload {
  businessName: string
  ownerName: string
  email: string
  password: string
  phone?: string
  shopName?: string
  slug?: string
}

export interface LoginPayload {
  email: string
  password: string
}
