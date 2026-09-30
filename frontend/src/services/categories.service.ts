import { api } from '@/api/client'
import type { Category } from '@/types/domain'

export type CategoryPayload = {
  name: string
  description?: string
  parentId?: string | null
  sortOrder?: number
  isActive?: boolean
}

export const categoriesService = {
  list(params?: { includeInactive?: boolean; parentId?: string; rootsOnly?: boolean }) {
    return api.get<Category[]>('/categories', { params })
  },
  get(id: string) {
    return api.get<Category>(`/categories/${id}`)
  },
  create(payload: CategoryPayload) {
    return api.post<Category>('/categories', payload)
  },
  update(id: string, payload: Partial<CategoryPayload>) {
    return api.patch<Category>(`/categories/${id}`, payload)
  },
  remove(id: string, hard = false) {
    return api.delete(`/categories/${id}`, { params: { hard } })
  },
}
