import { api } from '@/api/client'
import type {
  AuthResponse,
  LoginPayload,
  RegisterPayload,
  ResetPasswordPayload,
  SendOtpPayload,
  User,
  VerifyLoginOtpPayload,
} from '@/types/auth'

export const authService = {
  sendOtp(payload: SendOtpPayload) {
    return api.post<{ message: string }>('/auth/otp/send', payload)
  },
  register(payload: RegisterPayload) {
    return api.post<AuthResponse>('/auth/register', payload)
  },
  login(payload: LoginPayload) {
    return api.post<AuthResponse>('/auth/login', payload)
  },
  loginWithOtp(payload: VerifyLoginOtpPayload) {
    return api.post<AuthResponse>('/auth/otp/login', payload)
  },
  resetPassword(payload: ResetPasswordPayload) {
    return api.post<{ message: string }>('/auth/password/reset', payload)
  },
  me() {
    return api.get<User>('/auth/me')
  },
}
