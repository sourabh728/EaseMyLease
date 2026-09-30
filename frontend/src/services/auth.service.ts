import { api } from '@/api/client'
import type {
  AuthResponse,
  LoginPayload,
  RegisterPayload,
  User,
} from '@/types/auth'

export const authService = {
  register(payload: RegisterPayload) {
    return api.post<AuthResponse>('/auth/register', payload)
  },
  login(payload: LoginPayload) {
    return api.post<AuthResponse>('/auth/login', payload)
  },
  me() {
    return api.get<User>('/auth/me')
  },
}
