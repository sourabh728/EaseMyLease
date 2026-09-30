import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { paymentsService } from '@/services/payments.service'
import { rentalsService } from '@/services/rentals.service'
import { getErrorMessage } from '@/utils/error'
import {
  PAYMENT_METHODS,
  PAYMENT_TYPES,
  type PaymentMethod,
  type PaymentType,
} from '@/types/domain'
import {
  EmptyState,
  ErrorState,
  LoadingState,
  fieldClassName,
  labelClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
} from '@/components/ui'

function money(value: string | number) {
  const n = typeof value === 'string' ? Number(value) : value
  return Number.isFinite(n) ? n.toFixed(2) : '0.00'
}

const schema = z.object({
  rentalId: z.string().min(1, 'Select a rental'),
  amount: z.coerce.number().min(0.01, 'Amount required'),
  paymentType: z.enum(['RENT', 'DEPOSIT', 'LATE_FEE', 'DAMAGE_CHARGE', 'REFUND']),
  method: z.enum(['CASH', 'UPI', 'CARD', 'BANK_TRANSFER']),
  transactionRef: z.string().max(120).optional(),
  paymentDate: z.string().optional(),
  notes: z.string().max(2000).optional(),
})

type FormValues = z.infer<typeof schema>

export function PaymentsListPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const queryClient = useQueryClient()

  const filters = useMemo(
    () => ({
      page,
      pageSize: 20,
      search: search.trim() || undefined,
    }),
    [page, search],
  )

  const paymentsQuery = useQuery({
    queryKey: ['payments', filters],
    queryFn: async () => (await paymentsService.list(filters)).data,
  })

  const rentalsQuery = useQuery({
    queryKey: ['rentals', 'payment-picker'],
    queryFn: async () => (await rentalsService.list({ page: 1, pageSize: 50 })).data,
    enabled: showForm,
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      rentalId: '',
      amount: 0,
      paymentType: 'RENT' as PaymentType,
      method: 'CASH' as PaymentMethod,
      transactionRef: '',
      paymentDate: new Date().toISOString().slice(0, 10),
      notes: '',
    },
  })

  const createMutation = useMutation({
    mutationFn: async (values: FormValues) =>
      (
        await paymentsService.create({
          rentalId: values.rentalId,
          amount: values.amount,
          paymentType: values.paymentType,
          method: values.method,
          transactionRef: values.transactionRef || undefined,
          paymentDate: values.paymentDate || undefined,
          notes: values.notes || undefined,
        })
      ).data,
    onSuccess: async () => {
      reset()
      setShowForm(false)
      await queryClient.invalidateQueries({ queryKey: ['payments'] })
      await queryClient.invalidateQueries({ queryKey: ['rentals'] })
    },
  })

  const rows = paymentsQuery.data?.data ?? []
  const meta = paymentsQuery.data?.meta

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Payments</h1>
          <p className="mt-1 text-sm text-slate-600">
            Record rent, deposits, late fees, damage charges, and refunds.
          </p>
        </div>
        <button
          type="button"
          className={primaryButtonClassName()}
          onClick={() => setShowForm((v) => !v)}
        >
          {showForm ? 'Close form' : 'Record payment'}
        </button>
      </div>

      {showForm ? (
        <form
          className="space-y-3 rounded-xl border border-slate-200 bg-white p-4"
          onSubmit={handleSubmit((values) => createMutation.mutateAsync(values))}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelClassName()}>Rental</label>
              <select className={fieldClassName()} {...register('rentalId')}>
                <option value="">Select rental…</option>
                {(rentalsQuery.data?.data ?? []).map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.rentalNumber} · {r.customer?.name ?? 'Customer'} · bal ₹
                    {money(r.balanceAmount)}
                  </option>
                ))}
              </select>
              {errors.rentalId ? (
                <p className="mt-1 text-sm text-red-600">{errors.rentalId.message}</p>
              ) : null}
            </div>
            <div>
              <label className={labelClassName()}>Amount</label>
              <input type="number" step="0.01" className={fieldClassName()} {...register('amount')} />
              {errors.amount ? (
                <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>
              ) : null}
            </div>
            <div>
              <label className={labelClassName()}>Date</label>
              <input type="date" className={fieldClassName()} {...register('paymentDate')} />
            </div>
            <div>
              <label className={labelClassName()}>Type</label>
              <select className={fieldClassName()} {...register('paymentType')}>
                {PAYMENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClassName()}>Method</label>
              <select className={fieldClassName()} {...register('method')}>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClassName()}>Reference</label>
              <input className={fieldClassName()} {...register('transactionRef')} />
            </div>
            <div>
              <label className={labelClassName()}>Notes</label>
              <input className={fieldClassName()} {...register('notes')} />
            </div>
          </div>
          {createMutation.isError ? (
            <ErrorState message={getErrorMessage(createMutation.error, 'Payment failed')} />
          ) : null}
          <div className="flex gap-2">
            <button
              type="submit"
              className={primaryButtonClassName()}
              disabled={isSubmitting || createMutation.isPending}
            >
              {createMutation.isPending ? 'Saving…' : 'Save payment'}
            </button>
            <button
              type="button"
              className={secondaryButtonClassName()}
              onClick={() => setShowForm(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      <input
        className={fieldClassName() + ' max-w-md'}
        placeholder="Search by rental #, customer, reference"
        value={search}
        onChange={(e) => {
          setPage(1)
          setSearch(e.target.value)
        }}
      />

      {paymentsQuery.isLoading ? <LoadingState message="Loading payments…" /> : null}
      {paymentsQuery.isError ? (
        <ErrorState message={getErrorMessage(paymentsQuery.error, 'Failed to load payments')} />
      ) : null}

      {!paymentsQuery.isLoading && !paymentsQuery.isError && rows.length === 0 ? (
        <EmptyState title="No payments yet" message="Record a payment against a rental." />
      ) : null}

      {rows.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Rental</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Method</th>
                <th className="px-4 py-3 font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3">{p.paymentDate.slice(0, 10)}</td>
                  <td className="px-4 py-3">
                    <Link
                      to={`/rentals/${p.rentalId}`}
                      className="font-medium text-teal-700 hover:underline"
                    >
                      {p.rental?.rentalNumber ?? p.rentalId.slice(0, 8)}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {p.rental?.customer?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3">{p.paymentType}</td>
                  <td className="px-4 py-3">{p.method}</td>
                  <td className="px-4 py-3">₹{money(p.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {meta && meta.totalPages > 1 ? (
        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>
            Page {meta.page} of {meta.totalPages}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-lg border border-slate-300 px-3 py-1.5 disabled:opacity-50"
              disabled={meta.page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <button
              type="button"
              className="rounded-lg border border-slate-300 px-3 py-1.5 disabled:opacity-50"
              disabled={meta.page >= meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </section>
  )
}
