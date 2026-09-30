import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { rentalsService } from '@/services/rentals.service'
import { returnsService } from '@/services/returns.service'
import { getErrorMessage } from '@/utils/error'
import { RETURN_CONDITIONS, type ReturnCondition } from '@/types/domain'
import {
  ErrorState,
  LoadingState,
  fieldClassName,
  labelClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
} from '@/components/ui'

const schema = z.object({
  rentalId: z.string().min(1, 'Select a rental'),
  returnDate: z.string().min(1, 'Return date required'),
  lateFee: z.coerce.number().min(0).optional(),
  notes: z.string().max(2000).optional(),
  completeSettlement: z.boolean().optional(),
})

type FormValues = z.infer<typeof schema>

type ItemState = {
  rentalItemId: string
  condition: ReturnCondition
  damageNotes: string
  missingAccessories: string
  stains: boolean
  isLost: boolean
  additionalCharge: number
  damageCharge: number
  damageDescription: string
  notes: string
}

export function ReturnProcessPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const presetRentalId = searchParams.get('rentalId') ?? ''
  const [itemStates, setItemStates] = useState<ItemState[]>([])

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      rentalId: presetRentalId,
      returnDate: new Date().toISOString().slice(0, 10),
      lateFee: 0,
      notes: '',
      completeSettlement: true,
    },
  })

  const rentalId = watch('rentalId')

  const activeRentalsQuery = useQuery({
    queryKey: ['rentals', 'returnable'],
    queryFn: async () => {
      const [active, overdue, pending] = await Promise.all([
        rentalsService.list({ status: 'ACTIVE', pageSize: 50 }),
        rentalsService.list({ status: 'OVERDUE', pageSize: 50 }),
        rentalsService.list({ status: 'RETURN_PENDING', pageSize: 50 }),
      ])
      const map = new Map<string, (typeof active.data.data)[0]>()
      for (const list of [active.data.data, overdue.data.data, pending.data.data]) {
        for (const r of list) map.set(r.id, r)
      }
      return [...map.values()]
    },
  })

  const rentalQuery = useQuery({
    queryKey: ['rentals', rentalId],
    enabled: Boolean(rentalId),
    queryFn: async () => (await rentalsService.get(rentalId)).data,
  })

  useEffect(() => {
    if (presetRentalId) setValue('rentalId', presetRentalId)
  }, [presetRentalId, setValue])

  useEffect(() => {
    const items = rentalQuery.data?.items ?? []
    setItemStates(
      items.map((item) => ({
        rentalItemId: item.id,
        condition: 'GOOD' as ReturnCondition,
        damageNotes: '',
        missingAccessories: '',
        stains: false,
        isLost: false,
        additionalCharge: 0,
        damageCharge: 0,
        damageDescription: '',
        notes: '',
      })),
    )
  }, [rentalQuery.data])

  const rentalOptions = useMemo(() => {
    const list = activeRentalsQuery.data ?? []
    if (rentalQuery.data && !list.find((r) => r.id === rentalQuery.data.id)) {
      return [rentalQuery.data, ...list]
    }
    return list
  }, [activeRentalsQuery.data, rentalQuery.data])

  const createMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (itemStates.length === 0) throw new Error('No rental items to return')
      return (
        await returnsService.create({
          rentalId: values.rentalId,
          returnDate: values.returnDate,
          lateFee: values.lateFee || 0,
          notes: values.notes || undefined,
          completeSettlement: values.completeSettlement !== false,
          items: itemStates.map((item) => ({
            rentalItemId: item.rentalItemId,
            condition: item.condition,
            damageNotes: item.damageNotes || undefined,
            missingAccessories: item.missingAccessories || undefined,
            stains: item.stains,
            isLost: item.isLost || item.condition === 'LOST',
            additionalCharge: item.additionalCharge || 0,
            damageCharge: item.damageCharge || undefined,
            damageDescription: item.damageDescription || undefined,
            notes: item.notes || undefined,
          })),
        })
      ).data
    },
    onSuccess: async (ret) => {
      await queryClient.invalidateQueries({ queryKey: ['returns'] })
      await queryClient.invalidateQueries({ queryKey: ['rentals'] })
      await queryClient.invalidateQueries({ queryKey: ['inventory'] })
      navigate(ret.rentalId ? `/rentals/${ret.rentalId}` : '/returns')
    },
  })

  function updateItem(rentalItemId: string, patch: Partial<ItemState>) {
    setItemStates((prev) =>
      prev.map((item) =>
        item.rentalItemId === rentalItemId ? { ...item, ...patch } : item,
      ),
    )
  }

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Process return</h1>
          <p className="mt-1 text-sm text-slate-600">
            Inspect each item, note damage, and settle the rental.
          </p>
        </div>
        <Link to="/returns" className={secondaryButtonClassName() + ' no-underline'}>
          Back
        </Link>
      </div>

      <form
        className="space-y-5 rounded-xl border border-slate-200 bg-white p-5"
        onSubmit={handleSubmit((values) => createMutation.mutateAsync(values))}
      >
        <div>
          <label className={labelClassName()}>Rental</label>
          <select className={fieldClassName()} {...register('rentalId')}>
            <option value="">Select rental…</option>
            {rentalOptions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.rentalNumber} · {r.customer?.name ?? 'Customer'} · {r.status}
              </option>
            ))}
          </select>
          {errors.rentalId ? (
            <p className="mt-1 text-sm text-red-600">{errors.rentalId.message}</p>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClassName()}>Return date</label>
            <input type="date" className={fieldClassName()} {...register('returnDate')} />
          </div>
          <div>
            <label className={labelClassName()}>Late fee (₹)</label>
            <input type="number" step="0.01" min="0" className={fieldClassName()} {...register('lateFee')} />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" {...register('completeSettlement')} />
          Complete settlement (mark rental COMPLETED)
        </label>

        <div>
          <label className={labelClassName()}>Notes</label>
          <textarea className={fieldClassName()} rows={2} {...register('notes')} />
        </div>

        {rentalQuery.isLoading && rentalId ? <LoadingState message="Loading rental items…" /> : null}

        {itemStates.map((state) => {
          const line = rentalQuery.data?.items?.find((i) => i.id === state.rentalItemId)
          return (
            <div key={state.rentalItemId} className="space-y-3 rounded-lg border border-slate-200 p-4">
              <h3 className="font-medium text-slate-900">
                {line?.inventoryItem?.itemCode} · {line?.inventoryItem?.name}
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelClassName()}>Condition</label>
                  <select
                    className={fieldClassName()}
                    value={state.condition}
                    onChange={(e) =>
                      updateItem(state.rentalItemId, {
                        condition: e.target.value as ReturnCondition,
                        isLost: e.target.value === 'LOST',
                      })
                    }
                  >
                    {RETURN_CONDITIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClassName()}>Additional charge (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className={fieldClassName()}
                    value={state.additionalCharge}
                    onChange={(e) =>
                      updateItem(state.rentalItemId, {
                        additionalCharge: Number(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div>
                  <label className={labelClassName()}>Damage charge (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className={fieldClassName()}
                    value={state.damageCharge}
                    onChange={(e) =>
                      updateItem(state.rentalItemId, {
                        damageCharge: Number(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div>
                  <label className={labelClassName()}>Missing accessories</label>
                  <input
                    className={fieldClassName()}
                    value={state.missingAccessories}
                    onChange={(e) =>
                      updateItem(state.rentalItemId, {
                        missingAccessories: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div>
                <label className={labelClassName()}>Damage notes</label>
                <textarea
                  className={fieldClassName()}
                  rows={2}
                  value={state.damageNotes}
                  onChange={(e) =>
                    updateItem(state.rentalItemId, { damageNotes: e.target.value })
                  }
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={state.stains}
                  onChange={(e) =>
                    updateItem(state.rentalItemId, { stains: e.target.checked })
                  }
                />
                Stains present
              </label>
            </div>
          )
        })}

        {createMutation.isError ? (
          <ErrorState message={getErrorMessage(createMutation.error, 'Return failed')} />
        ) : null}

        <button
          type="submit"
          className={primaryButtonClassName()}
          disabled={isSubmitting || createMutation.isPending || !rentalId}
        >
          {createMutation.isPending ? 'Saving…' : 'Submit return'}
        </button>
      </form>
    </section>
  )
}
