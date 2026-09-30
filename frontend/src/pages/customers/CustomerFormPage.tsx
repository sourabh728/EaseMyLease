import { useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { customersService } from '@/services/customers.service'
import { getErrorMessage } from '@/utils/error'
import {
  ErrorState,
  LoadingState,
  fieldClassName,
  labelClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
} from '@/components/ui'

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(120),
  phone: z.string().min(5, 'Phone is required').max(20),
  whatsapp: z.string().max(20).optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  address: z.string().max(500).optional(),
  city: z.string().max(80).optional(),
  idProofType: z.string().max(40).optional(),
  idProofNumber: z.string().max(80).optional(),
  notes: z.string().max(2000).optional(),
})

type FormValues = z.infer<typeof schema>

export function CustomerFormPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const customerQuery = useQuery({
    queryKey: ['customers', id],
    enabled: isEdit,
    queryFn: async () => (await customersService.get(id!)).data,
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      phone: '',
      whatsapp: '',
      email: '',
      address: '',
      city: '',
      idProofType: '',
      idProofNumber: '',
      notes: '',
    },
  })

  useEffect(() => {
    if (!customerQuery.data) return
    const c = customerQuery.data
    reset({
      name: c.name,
      phone: c.phone,
      whatsapp: c.whatsapp ?? '',
      email: c.email ?? '',
      address: c.address ?? '',
      city: c.city ?? '',
      idProofType: c.idProofType ?? '',
      idProofNumber: c.idProofNumber ?? '',
      notes: c.notes ?? '',
    })
  }, [customerQuery.data, reset])

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = {
        name: values.name,
        phone: values.phone,
        whatsapp: values.whatsapp || undefined,
        email: values.email || undefined,
        address: values.address || undefined,
        city: values.city || undefined,
        idProofType: values.idProofType || undefined,
        idProofNumber: values.idProofNumber || undefined,
        notes: values.notes || undefined,
      }
      if (isEdit && id) {
        return (await customersService.update(id, payload)).data
      }
      return (await customersService.create(payload)).data
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['customers'] })
      navigate('/customers')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!id) return
      await customersService.remove(id)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['customers'] })
      navigate('/customers')
    },
  })

  if (isEdit && customerQuery.isLoading) {
    return <LoadingState message="Loading customer…" />
  }

  if (isEdit && customerQuery.isError) {
    return (
      <ErrorState message={getErrorMessage(customerQuery.error, 'Failed to load customer')} />
    )
  }

  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link to="/customers" className="text-sm text-teal-700 hover:underline">
          ← Back to customers
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">
          {isEdit ? 'Edit customer' : 'Add customer'}
        </h1>
      </div>

      <form
        className="space-y-4 rounded-xl border border-slate-200 bg-white p-5"
        onSubmit={handleSubmit((values) => saveMutation.mutateAsync(values))}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className={labelClassName()}>Name</span>
            <input className={fieldClassName()} {...register('name')} />
            {errors.name ? <p className="mt-1 text-xs text-red-600">{errors.name.message}</p> : null}
          </label>
          <label className="block">
            <span className={labelClassName()}>Phone</span>
            <input className={fieldClassName()} {...register('phone')} />
            {errors.phone ? (
              <p className="mt-1 text-xs text-red-600">{errors.phone.message}</p>
            ) : null}
          </label>
          <label className="block">
            <span className={labelClassName()}>WhatsApp</span>
            <input className={fieldClassName()} {...register('whatsapp')} />
          </label>
          <label className="block sm:col-span-2">
            <span className={labelClassName()}>Email</span>
            <input type="email" className={fieldClassName()} {...register('email')} />
            {errors.email ? (
              <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
            ) : null}
          </label>
          <label className="block sm:col-span-2">
            <span className={labelClassName()}>Address</span>
            <textarea className={fieldClassName()} rows={2} {...register('address')} />
          </label>
          <label className="block">
            <span className={labelClassName()}>City</span>
            <input className={fieldClassName()} {...register('city')} />
          </label>
          <label className="block">
            <span className={labelClassName()}>ID proof type</span>
            <input
              className={fieldClassName()}
              placeholder="Aadhaar, Passport…"
              {...register('idProofType')}
            />
          </label>
          <label className="block sm:col-span-2">
            <span className={labelClassName()}>ID proof number</span>
            <input className={fieldClassName()} {...register('idProofNumber')} />
          </label>
          <label className="block sm:col-span-2">
            <span className={labelClassName()}>Notes</span>
            <textarea className={fieldClassName()} rows={3} {...register('notes')} />
          </label>
        </div>

        {saveMutation.isError ? (
          <p className="text-sm text-red-600">
            {getErrorMessage(saveMutation.error, 'Failed to save customer')}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={isSubmitting || saveMutation.isPending}
            className={primaryButtonClassName()}
          >
            {saveMutation.isPending ? 'Saving…' : 'Save customer'}
          </button>
          <Link to="/customers" className={secondaryButtonClassName() + ' inline-flex no-underline'}>
            Cancel
          </Link>
          {isEdit ? (
            <button
              type="button"
              className="rounded-lg border border-red-300 px-4 py-2 text-sm text-red-700 hover:bg-red-50"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (confirm('Delete this customer?')) deleteMutation.mutate()
              }}
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
            </button>
          ) : null}
        </div>
      </form>
    </section>
  )
}
