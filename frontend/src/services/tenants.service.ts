import { api } from '@/api/client'

export type SubscriptionPlan = 'FREE' | 'BASIC' | 'PRO'
export type SubscriptionStatus = 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED'

export type TenantMe = {
  id: string
  name: string
  slug: string
  plan: SubscriptionPlan
  subscriptionStatus: SubscriptionStatus
  trialEndsAt: string | null
  currentPeriodEnd: string | null
  createdAt: string
  updatedAt: string
  usage: {
    inventoryCount: number
    shopCount: number
    freeInventorySoftLimit: number
  }
  freeLimitWarning: string | null
}

export type TenantAdmin = {
  id: string
  name: string
  slug: string
  plan: SubscriptionPlan
  subscriptionStatus: SubscriptionStatus
  trialEndsAt: string | null
  currentPeriodEnd: string | null
  createdAt: string
  _count: {
    users: number
    shops: number
    inventoryItems: number
    rentals: number
  }
}

export type UpdateSubscriptionPayload = Partial<{
  plan: SubscriptionPlan
  subscriptionStatus: SubscriptionStatus
  trialEndsAt: string | null
  currentPeriodEnd: string | null
}>

export const tenantsService = {
  me() {
    return api.get<TenantMe>('/tenants/me')
  },
  list() {
    return api.get<TenantAdmin[]>('/tenants')
  },
  updateSubscription(id: string, payload: UpdateSubscriptionPayload) {
    return api.patch<TenantAdmin>(`/tenants/${id}/subscription`, payload)
  },
}
