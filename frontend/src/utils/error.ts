import axios from 'axios'

export function getErrorMessage(error: unknown, fallback = 'Something went wrong') {
  if (typeof error === 'string') return error

  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | { message?: string | string[]; error?: string }
      | undefined

    if (data?.message) {
      if (Array.isArray(data.message)) return data.message.join(', ')
      if (typeof data.message === 'string') return data.message
    }

    if (typeof data?.error === 'string') return data.error
    if (error.message) return error.message
  }

  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string') return message
  }

  return fallback
}
