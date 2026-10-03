import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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
} from '@/components/ui'

const registerSchema = z.object({
  businessName: z.string().min(1, 'Business name is required').max(120),
  email: z.string().email('Enter a valid email'),
  phone: z.string().max(20).optional().or(z.literal('')),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
})

type RegisterForm = z.infer<typeof registerSchema>

export function RegisterPage() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      businessName: '',
      email: '',
      phone: '',
      password: '',
    },
  })

  async function onSubmit(values: RegisterForm) {
    setError(null)
    const email = values.email.trim()
    try {
      await authService.sendOtp({ email, purpose: 'REGISTER' })

      const pending: PendingRegisterPayload = {
        businessName: values.businessName.trim(),
        email,
        password: values.password,
        phone: values.phone?.trim() || undefined,
      }
      sessionStorage.setItem(STORAGE_KEYS.pendingRegister, JSON.stringify(pending))
      navigate('/register/verify-email')
    } catch (err) {
      setError(getErrorMessage(err, 'Could not send verification code.'))
    }
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900">Create your shop</h1>
      <p className="mt-1 text-sm text-slate-500">
        Enter your shop details. We&apos;ll email a code to verify your address before creating the
        account.
      </p>

      <form className="mt-6 space-y-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <label className="block text-sm">
          <span className={labelClassName()}>Business name</span>
          <input
            {...form.register('businessName')}
            className={fieldClassName()}
            autoComplete="organization"
          />
          {form.formState.errors.businessName ? (
            <p className="mt-1 text-sm text-red-600">
              {form.formState.errors.businessName.message}
            </p>
          ) : null}
        </label>

        <label className="block text-sm">
          <span className={labelClassName()}>Email</span>
          <input
            type="email"
            {...form.register('email')}
            className={fieldClassName()}
            autoComplete="email"
          />
          {form.formState.errors.email ? (
            <p className="mt-1 text-sm text-red-600">{form.formState.errors.email.message}</p>
          ) : null}
        </label>

        <label className="block text-sm">
          <span className={labelClassName()}>Phone (optional)</span>
          <input {...form.register('phone')} className={fieldClassName()} autoComplete="tel" />
        </label>

        <label className="block text-sm">
          <span className={labelClassName()}>Password</span>
          <input
            type="password"
            {...form.register('password')}
            className={fieldClassName()}
            autoComplete="new-password"
          />
          {form.formState.errors.password ? (
            <p className="mt-1 text-sm text-red-600">{form.formState.errors.password.message}</p>
          ) : null}
        </label>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <button
          type="submit"
          disabled={form.formState.isSubmitting}
          className={`w-full ${primaryButtonClassName()}`}
        >
          {form.formState.isSubmitting
            ? 'Sending verification…'
            : 'Verify email & create account'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-slate-600">
        Already registered?{' '}
        <Link to="/login" className="text-teal-700 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  )
}
