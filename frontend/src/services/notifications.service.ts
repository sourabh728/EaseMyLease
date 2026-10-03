import { api } from '@/api/client'

export type SendReminderResult = {
  emailSent: boolean
  whatsappShareUrl: string | null
  type: 'RENTAL_DUE_TODAY' | 'RENTAL_OVERDUE'
}

export const notificationsService = {
  sendReminder(rentalId: string) {
    return api.post<SendReminderResult>(`/rentals/${rentalId}/send-reminder`)
  },
  runReminders() {
    return api.post<{ skipped: boolean; sent: number }>('/notifications/run-reminders')
  },
}
