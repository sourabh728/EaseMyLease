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
  email: string
  password: string
  otp: string
  /** Optional; backend derives User.name from the email local-part. */
  ownerName?: string
  phone?: string
  shopName?: string
  slug?: string
}

/** Pending registration fields stored until OTP verification completes. */
export interface PendingRegisterPayload {
  businessName: string
  email: string
  password: string
  phone?: string
}

export interface LoginPayload {
  email: string
  password: string
}

export type OtpPurpose = 'REGISTER' | 'LOGIN' | 'RESET_PASSWORD'

export interface SendOtpPayload {
  email: string
  purpose: OtpPurpose
}

export interface VerifyLoginOtpPayload {
  email: string
  code: string
}

export interface ResetPasswordPayload {
  email: string
  otp: string
  newPassword: string
}
