import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { authService } from '@/services/auth.service'
import { STORAGE_KEYS } from '@/constants'
import { getErrorMessage } from '@/utils/error'
import type { PendingRegisterPayload } from '@/types/auth'
import {
  fieldClassName,
  labelClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
} from '@/components/ui'

const otpSchema = z.object({
  otp: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code'),
})

type OtpForm = z.infer<typeof otpSchema>

function readPending(): PendingRegisterPayload | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEYS.pendingRegister)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PendingRegisterPayload
    if (!parsed?.email || !parsed?.businessName || !parsed?.password) return null
    return parsed
  } catch {
    return null
  }
}

function nameFromEmail(email: string): string {
  const local = email.split('@')[0]?.trim() ?? ''
  return local.slice(0, 120) || 'User'
}

export function RegisterVerifyEmailPage() {
  const navigate = useNavigate()
  const [pending, setPending] = useState<PendingRegisterPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [resending, setResending] = useState(false)

  const form = useForm<OtpForm>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: '' },
  })

  useEffect(() => {
    const data = readPending()
    if (!data) {
      navigate('/register', { replace: true })
      return
    }
    setPending(data)
    setInfo('We sent a 6-digit code to your email. Check your inbox (or server console in dev).')
  }, [navigate])

  async function onResend() {
    if (!pending) return
    setError(null)
    setInfo(null)
    setResending(true)
    try {
      await authService.sendOtp({ email: pending.email, purpose: 'REGISTER' })
      setInfo('A new code was sent.')
      form.setValue('otp', '')
    } catch (err) {
      setError(getErrorMessage(err, 'Could not resend code.'))
    } finally {
      setResending(false)
    }
  }

  async function onSubmit(values: OtpForm) {
    if (!pending) return
    setError(null)
    try {
      const { data } = await authService.register({
        businessName: pending.businessName,
        email: pending.email,
        phone: pending.phone,
        password: pending.password,
        otp: values.otp,
        ownerName: nameFromEmail(pending.email),
      })
      sessionStorage.removeItem(STORAGE_KEYS.pendingRegister)
      localStorage.setItem(STORAGE_KEYS.accessToken, data.accessToken)
      navigate('/dashboard')
    } catch (err) {
      setError(getErrorMessage(err, 'Registration failed. Please try again.'))
    }
  }

  if (!pending) {
    return (
      <div className="text-sm text-slate-600">Loading verification…</div>
    )
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900">Verify your email</h1>
      <p className="mt-1 text-sm text-slate-500">
        Enter the code sent to {pending.email} to finish creating your account.
      </p>

      <form className="mt-6 space-y-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <label className="block text-sm">
          <span className={labelClassName()}>Verification code</span>
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            {...form.register('otp')}
            className={fieldClassName()}
            placeholder="6-digit code"
          />
          {form.formState.errors.otp ? (
            <p className="mt-1 text-sm text-red-600">{form.formState.errors.otp.message}</p>
          ) : null}
        </label>

        {info ? <p className="text-sm text-slate-600">{info}</p> : null}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <button
          type="submit"
          disabled={form.formState.isSubmitting}
          className={`w-full ${primaryButtonClassName()}`}
        >
          {form.formState.isSubmitting ? 'Creating account…' : 'Verify & create account'}
        </button>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => navigate('/register')}
            className={secondaryButtonClassName()}
          >
            Back
          </button>
          <button
            type="button"
            disabled={resending}
            onClick={onResend}
            className={secondaryButtonClassName()}
          >
            {resending ? 'Resending…' : 'Resend code'}
          </button>
        </div>
      </form>
    </div>
  )
}
