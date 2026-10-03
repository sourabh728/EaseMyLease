import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { authService } from '@/services/auth.service'
import { getErrorMessage } from '@/utils/error'
import {
  fieldClassName,
  labelClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
} from '@/components/ui'

const emailSchema = z.object({
  email: z.string().email('Enter a valid email'),
})

type EmailForm = z.infer<typeof emailSchema>

const resetSchema = z
  .object({
    otp: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code'),
    newPassword: z.string().min(8, 'Password must be at least 8 characters').max(128),
    confirmPassword: z.string().min(8, 'Confirm your password'),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type ResetForm = z.infer<typeof resetSchema>

export function ForgotPasswordPage() {
  const [step, setStep] = useState<'email' | 'reset' | 'done'>('email')
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [resending, setResending] = useState(false)

  const emailForm = useForm<EmailForm>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: '' },
  })

  const resetForm = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
    defaultValues: { otp: '', newPassword: '', confirmPassword: '' },
  })

  async function onEmailSubmit(values: EmailForm) {
    setError(null)
    setInfo(null)
    try {
      const { data } = await authService.sendOtp({
        email: values.email,
        purpose: 'RESET_PASSWORD',
      })
      setEmail(values.email)
      setStep('reset')
      setInfo(data.message)
      resetForm.reset({ otp: '', newPassword: '', confirmPassword: '' })
    } catch (err) {
      setError(getErrorMessage(err, 'Could not send reset code.'))
    }
  }

  async function onResetSubmit(values: ResetForm) {
    setError(null)
    try {
      await authService.resetPassword({
        email,
        otp: values.otp,
        newPassword: values.newPassword,
      })
      setStep('done')
    } catch (err) {
      setError(getErrorMessage(err, 'Could not reset password.'))
    }
  }

  async function onResend() {
    setError(null)
    setInfo(null)
    setResending(true)
    try {
      const { data } = await authService.sendOtp({
        email,
        purpose: 'RESET_PASSWORD',
      })
      setInfo(data.message || 'A new code was sent.')
    } catch (err) {
      setError(getErrorMessage(err, 'Could not resend code.'))
    } finally {
      setResending(false)
    }
  }

  if (step === 'done') {
    return (
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Password updated</h1>
        <p className="mt-1 text-sm text-slate-500">
          You can sign in with your new password.
        </p>
        <Link
          to="/login"
          className={`mt-6 inline-flex w-full justify-center ${primaryButtonClassName()}`}
        >
          Back to sign in
        </Link>
      </div>
    )
  }

  if (step === 'reset') {
    return (
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Reset your password</h1>
        <p className="mt-1 text-sm text-slate-500">
          Enter the code sent to {email}, then choose a new password.
        </p>

        <form className="mt-6 space-y-4" onSubmit={resetForm.handleSubmit(onResetSubmit)}>
          <label className="block text-sm">
            <span className={labelClassName()}>Verification code</span>
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              {...resetForm.register('otp')}
              className={fieldClassName()}
              placeholder="6-digit code"
            />
            {resetForm.formState.errors.otp ? (
              <p className="mt-1 text-sm text-red-600">{resetForm.formState.errors.otp.message}</p>
            ) : null}
          </label>
          <label className="block text-sm">
            <span className={labelClassName()}>New password</span>
            <input
              type="password"
              autoComplete="new-password"
              {...resetForm.register('newPassword')}
              className={fieldClassName()}
            />
            {resetForm.formState.errors.newPassword ? (
              <p className="mt-1 text-sm text-red-600">
                {resetForm.formState.errors.newPassword.message}
              </p>
            ) : null}
          </label>
          <label className="block text-sm">
            <span className={labelClassName()}>Confirm password</span>
            <input
              type="password"
              autoComplete="new-password"
              {...resetForm.register('confirmPassword')}
              className={fieldClassName()}
            />
            {resetForm.formState.errors.confirmPassword ? (
              <p className="mt-1 text-sm text-red-600">
                {resetForm.formState.errors.confirmPassword.message}
              </p>
            ) : null}
          </label>

          {info ? <p className="text-sm text-slate-600">{info}</p> : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <button
            type="submit"
            disabled={resetForm.formState.isSubmitting}
            className={`w-full ${primaryButtonClassName()}`}
          >
            {resetForm.formState.isSubmitting ? 'Updating…' : 'Update password'}
          </button>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setStep('email')
                setError(null)
                setInfo(null)
              }}
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

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900">Forgot password</h1>
      <p className="mt-1 text-sm text-slate-500">
        We&apos;ll email a verification code so you can set a new password.
      </p>

      <form className="mt-6 space-y-4" onSubmit={emailForm.handleSubmit(onEmailSubmit)}>
        <label className="block text-sm">
          <span className={labelClassName()}>Email</span>
          <input
            type="email"
            autoComplete="email"
            {...emailForm.register('email')}
            className={fieldClassName()}
          />
          {emailForm.formState.errors.email ? (
            <p className="mt-1 text-sm text-red-600">{emailForm.formState.errors.email.message}</p>
          ) : null}
        </label>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <button
          type="submit"
          disabled={emailForm.formState.isSubmitting}
          className={`w-full ${primaryButtonClassName()}`}
        >
          {emailForm.formState.isSubmitting ? 'Sending code…' : 'Send reset code'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-slate-600">
        <Link to="/login" className="text-teal-700 hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  )
}
