import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { rentalsService } from '@/services/rentals.service'
import { paymentsService } from '@/services/payments.service'
import { getErrorMessage } from '@/utils/error'
import {
  PAYMENT_METHODS,
  PAYMENT_TYPES,
  type PaymentMethod,
  type PaymentType,
} from '@/types/domain'
import {
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

const paymentSchema = z.object({
  amount: z.coerce.number().min(0.01, 'Amount required'),
  paymentType: z.enum(['RENT', 'DEPOSIT', 'LATE_FEE', 'DAMAGE_CHARGE', 'REFUND']),
  method: z.enum(['CASH', 'UPI', 'CARD', 'BANK_TRANSFER']),
  transactionRef: z.string().max(120).optional(),
  notes: z.string().max(2000).optional(),
})

type PaymentForm = z.infer<typeof paymentSchema>

export function RentalDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [actionError, setActionError] = useState<string | null>(null)
  const [showPayment, setShowPayment] = useState(false)

  const rentalQuery = useQuery({
    queryKey: ['rentals', id],
    enabled: Boolean(id),
    queryFn: async () => (await rentalsService.get(id!)).data,
  })

  const rental = rentalQuery.data

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['rentals'] })
    await queryClient.invalidateQueries({ queryKey: ['payments'] })
  }

  const actionMutation = useMutation({
    mutationFn: async (action: 'confirm' | 'release' | 'cancel') => {
      if (!id) throw new Error('Missing rental id')
      if (action === 'confirm') return (await rentalsService.confirm(id)).data
      if (action === 'release') return (await rentalsService.release(id)).data
      return (await rentalsService.cancel(id)).data
    },
    onSuccess: async () => {
      setActionError(null)
      await invalidate()
    },
    onError: (err) => setActionError(getErrorMessage(err, 'Action failed')),
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PaymentForm>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: 0,
      paymentType: 'RENT' as PaymentType,
      method: 'CASH' as PaymentMethod,
      transactionRef: '',
      notes: '',
    },
  })

  const paymentMutation = useMutation({
    mutationFn: async (values: PaymentForm) => {
      if (!id) throw new Error('Missing rental')
      return (
        await paymentsService.create({
          rentalId: id,
          amount: values.amount,
          paymentType: values.paymentType,
          method: values.method,
          transactionRef: values.transactionRef || undefined,
          notes: values.notes || undefined,
        })
      ).data
    },
    onSuccess: async () => {
      reset()
      setShowPayment(false)
      await invalidate()
    },
  })

  if (rentalQuery.isLoading) return <LoadingState message="Loading rental…" />
  if (rentalQuery.isError || !rental) {
    return (
      <ErrorState message={getErrorMessage(rentalQuery.error, 'Rental not found')} />
    )
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm text-slate-500">
            <Link to="/rentals" className="text-teal-700 hover:underline">
              Rentals
            </Link>{' '}
            / {rental.rentalNumber}
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">{rental.rentalNumber}</h1>
          <p className="mt-1 text-sm text-slate-600">
            {rental.customer?.name} · {rental.customer?.phone}
          </p>
        </div>
        <span className="rounded-md bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700">
          {rental.status}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase text-slate-500">Period</p>
          <p className="mt-1 text-sm text-slate-800">
            {rental.rentalStartDate.slice(0, 10)} → {rental.expectedReturnDate.slice(0, 10)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase text-slate-500">Total rent</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">₹{money(rental.totalRent)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase text-slate-500">Deposit</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">₹{money(rental.totalDeposit)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase text-slate-500">Balance</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">₹{money(rental.balanceAmount)}</p>
          <p className="text-xs text-slate-500">Paid ₹{money(rental.amountPaid)}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {rental.status === 'DRAFT' ? (
          <>
            <button
              type="button"
              className={primaryButtonClassName()}
              disabled={actionMutation.isPending}
              onClick={() => actionMutation.mutate('confirm')}
            >
              Confirm booking
            </button>
            <button
              type="button"
              className={secondaryButtonClassName()}
              disabled={actionMutation.isPending}
              onClick={() => actionMutation.mutate('cancel')}
            >
              Cancel
            </button>
          </>
        ) : null}
        {rental.status === 'CONFIRMED' ? (
          <>
            <button
              type="button"
              className={primaryButtonClassName()}
              disabled={actionMutation.isPending}
              onClick={() => actionMutation.mutate('release')}
            >
              Release items
            </button>
            <button
              type="button"
              className={secondaryButtonClassName()}
              disabled={actionMutation.isPending}
              onClick={() => actionMutation.mutate('cancel')}
            >
              Cancel
            </button>
          </>
        ) : null}
        {rental.status === 'ACTIVE' || rental.status === 'OVERDUE' || rental.status === 'RETURN_PENDING' ? (
          <Link
            to={`/returns/new?rentalId=${rental.id}`}
            className={primaryButtonClassName() + ' inline-flex no-underline'}
          >
            Process return
          </Link>
        ) : null}
        {rental.status !== 'CANCELLED' ? (
          <button
            type="button"
            className={secondaryButtonClassName()}
            onClick={() => setShowPayment((v) => !v)}
          >
            Record payment
          </button>
        ) : null}
      </div>

      {actionError ? <ErrorState message={actionError} /> : null}

      {showPayment ? (
        <form
          className="space-y-3 rounded-xl border border-slate-200 bg-white p-4"
          onSubmit={handleSubmit((values) => paymentMutation.mutateAsync(values))}
        >
          <h2 className="font-medium text-slate-900">Record payment</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClassName()}>Amount</label>
              <input type="number" step="0.01" className={fieldClassName()} {...register('amount')} />
              {errors.amount ? (
                <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>
              ) : null}
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
          </div>
          <div>
            <label className={labelClassName()}>Notes</label>
            <input className={fieldClassName()} {...register('notes')} />
          </div>
          {paymentMutation.isError ? (
            <ErrorState message={getErrorMessage(paymentMutation.error, 'Payment failed')} />
          ) : null}
          <button
            type="submit"
            className={primaryButtonClassName()}
            disabled={isSubmitting || paymentMutation.isPending}
          >
            {paymentMutation.isPending ? 'Saving…' : 'Save payment'}
          </button>
        </form>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 font-medium">Item</th>
              <th className="px-4 py-3 font-medium">Rent</th>
              <th className="px-4 py-3 font-medium">Deposit</th>
              <th className="px-4 py-3 font-medium">Condition</th>
            </tr>
          </thead>
          <tbody>
            {(rental.items ?? []).map((item) => (
              <tr key={item.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-900">
                    {item.inventoryItem?.itemCode} · {item.inventoryItem?.name}
                  </div>
                  <div className="text-xs text-slate-500">{item.inventoryItem?.status}</div>
                </td>
                <td className="px-4 py-3">₹{money(item.rentalPrice)}</td>
                <td className="px-4 py-3">₹{money(item.deposit)}</td>
                <td className="px-4 py-3 text-slate-600">
                  {item.conditionAtReturn ?? item.conditionAtRelease ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(rental.payments ?? []).length > 0 ? (
        <div>
          <h2 className="mb-2 font-medium text-slate-900">Payments</h2>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Method</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {rental.payments!.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3">{p.paymentDate.slice(0, 10)}</td>
                    <td className="px-4 py-3">{p.paymentType}</td>
                    <td className="px-4 py-3">{p.method}</td>
                    <td className="px-4 py-3">₹{money(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {rental.notes ? (
        <p className="text-sm text-slate-600">
          <span className="font-medium text-slate-800">Notes:</span> {rental.notes}
        </p>
      ) : null}

      <button type="button" className={secondaryButtonClassName()} onClick={() => navigate('/rentals')}>
        Back to list
      </button>
    </section>
  )
}
