import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { customersService } from '@/services/customers.service'
import { inventoryService } from '@/services/inventory.service'
import { rentalsService } from '@/services/rentals.service'
import { getErrorMessage } from '@/utils/error'
import {
  ErrorState,
  LoadingState,
  fieldClassName,
  labelClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
} from '@/components/ui'

const schema = z
  .object({
    customerId: z.string().min(1, 'Select a customer'),
    rentalStartDate: z.string().min(1, 'Start date required'),
    expectedReturnDate: z.string().min(1, 'Return date required'),
    discount: z.coerce.number().min(0).optional(),
    notes: z.string().max(2000).optional(),
  })
  .refine((v) => v.expectedReturnDate > v.rentalStartDate, {
    message: 'Return date must be after start date',
    path: ['expectedReturnDate'],
  })

type FormValues = z.infer<typeof schema>

export function RentalCreatePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [itemSearch, setItemSearch] = useState('')
  const [availabilityMsg, setAvailabilityMsg] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      customerId: '',
      rentalStartDate: '',
      expectedReturnDate: '',
      discount: 0,
      notes: '',
    },
  })

  const start = watch('rentalStartDate')
  const end = watch('expectedReturnDate')

  const customersQuery = useQuery({
    queryKey: ['customers', 'rental-picker'],
    queryFn: async () => (await customersService.list({ page: 1, pageSize: 100 })).data,
  })

  const inventoryQuery = useQuery({
    queryKey: ['inventory', 'rental-picker', itemSearch],
    queryFn: async () =>
      (
        await inventoryService.list({
          page: 1,
          pageSize: 50,
          search: itemSearch.trim() || undefined,
          availableOnly: true,
        })
      ).data,
  })

  const items = inventoryQuery.data?.data ?? []
  const selectedItems = useMemo(
    () => items.filter((i) => selectedIds.includes(i.id)),
    [items, selectedIds],
  )

  const createMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (selectedIds.length === 0) {
        throw new Error('Select at least one inventory item')
      }

      const availability = (
        await rentalsService.checkAvailability({
          rentalStartDate: values.rentalStartDate,
          expectedReturnDate: values.expectedReturnDate,
          inventoryItemIds: selectedIds,
        })
      ).data

      const blocked = availability.results.filter((r) => !r.available)
      if (blocked.length > 0) {
        throw new Error(
          blocked.map((b) => `${b.itemCode}: ${b.reason}`).join('; '),
        )
      }

      return (
        await rentalsService.create({
          customerId: values.customerId,
          rentalStartDate: values.rentalStartDate,
          expectedReturnDate: values.expectedReturnDate,
          discount: values.discount || 0,
          notes: values.notes || undefined,
          items: selectedIds.map((id) => ({ inventoryItemId: id })),
        })
      ).data
    },
    onSuccess: async (rental) => {
      await queryClient.invalidateQueries({ queryKey: ['rentals'] })
      navigate(`/rentals/${rental.id}`)
    },
  })

  async function runAvailabilityCheck() {
    setAvailabilityMsg(null)
    if (!start || !end || selectedIds.length === 0) {
      setAvailabilityMsg('Pick dates and at least one item first.')
      return
    }
    try {
      const res = (
        await rentalsService.checkAvailability({
          rentalStartDate: start,
          expectedReturnDate: end,
          inventoryItemIds: selectedIds,
        })
      ).data
      const blocked = res.results.filter((r) => !r.available)
      setAvailabilityMsg(
        blocked.length === 0
          ? 'All selected items are available for these dates.'
          : blocked.map((b) => `${b.itemCode}: ${b.reason}`).join('; '),
      )
    } catch (err) {
      setAvailabilityMsg(getErrorMessage(err, 'Availability check failed'))
    }
  }

  function toggleItem(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">New rental</h1>
          <p className="mt-1 text-sm text-slate-600">
            Pick a customer, dates, and available items. Prices come from inventory.
          </p>
        </div>
        <Link to="/rentals" className={secondaryButtonClassName() + ' no-underline'}>
          Back
        </Link>
      </div>

      <form
        className="space-y-5 rounded-xl border border-slate-200 bg-white p-5"
        onSubmit={handleSubmit((values) => createMutation.mutateAsync(values))}
      >
        <div>
          <label className={labelClassName()}>Customer</label>
          <select className={fieldClassName()} {...register('customerId')}>
            <option value="">Select customer…</option>
            {(customersQuery.data?.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} · {c.phone}
              </option>
            ))}
          </select>
          {errors.customerId ? (
            <p className="mt-1 text-sm text-red-600">{errors.customerId.message}</p>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClassName()}>Start date</label>
            <input type="date" className={fieldClassName()} {...register('rentalStartDate')} />
            {errors.rentalStartDate ? (
              <p className="mt-1 text-sm text-red-600">{errors.rentalStartDate.message}</p>
            ) : null}
          </div>
          <div>
            <label className={labelClassName()}>Expected return</label>
            <input type="date" className={fieldClassName()} {...register('expectedReturnDate')} />
            {errors.expectedReturnDate ? (
              <p className="mt-1 text-sm text-red-600">{errors.expectedReturnDate.message}</p>
            ) : null}
          </div>
        </div>

        <div>
          <label className={labelClassName()}>Discount (₹)</label>
          <input type="number" step="0.01" min="0" className={fieldClassName()} {...register('discount')} />
        </div>

        <div>
          <label className={labelClassName()}>Notes</label>
          <textarea className={fieldClassName()} rows={2} {...register('notes')} />
        </div>

        <div className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex-1">
              <label className={labelClassName()}>Inventory items</label>
              <input
                className={fieldClassName()}
                placeholder="Search available items"
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
              />
            </div>
            <button type="button" className={secondaryButtonClassName()} onClick={runAvailabilityCheck}>
              Check availability
            </button>
          </div>

          {inventoryQuery.isLoading ? <LoadingState message="Loading items…" /> : null}
          {inventoryQuery.isError ? (
            <ErrorState message={getErrorMessage(inventoryQuery.error, 'Failed to load inventory')} />
          ) : null}

          <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-200">
            {items.map((item) => {
              const checked = selectedIds.includes(item.id)
              return (
                <label
                  key={item.id}
                  className="flex cursor-pointer items-start gap-3 border-b border-slate-100 px-3 py-2 last:border-0 hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={checked}
                    onChange={() => toggleItem(item.id)}
                  />
                  <span className="flex-1 text-sm">
                    <span className="font-medium text-slate-900">
                      {item.itemCode} · {item.name}
                    </span>
                    <span className="mt-0.5 block text-slate-600">
                      ₹{Number(item.rentalPrice).toFixed(2)} rent
                      {item.securityDeposit
                        ? ` · ₹${Number(item.securityDeposit).toFixed(2)} deposit`
                        : ''}
                      {item.size ? ` · ${item.size}` : ''}
                      {item.color ? ` · ${item.color}` : ''}
                    </span>
                  </span>
                </label>
              )
            })}
            {!inventoryQuery.isLoading && items.length === 0 ? (
              <p className="px-3 py-4 text-sm text-slate-500">No available items found.</p>
            ) : null}
          </div>

          {selectedItems.length > 0 ? (
            <p className="text-sm text-slate-600">{selectedIds.length} item(s) selected</p>
          ) : (
            <p className="text-sm text-amber-700">Select at least one item.</p>
          )}

          {availabilityMsg ? (
            <p className="text-sm text-slate-700">{availabilityMsg}</p>
          ) : null}
        </div>

        {createMutation.isError ? (
          <ErrorState message={getErrorMessage(createMutation.error, 'Could not create rental')} />
        ) : null}

        <div className="flex gap-3">
          <button
            type="submit"
            className={primaryButtonClassName()}
            disabled={isSubmitting || createMutation.isPending || selectedIds.length === 0}
          >
            {createMutation.isPending ? 'Creating…' : 'Create draft rental'}
          </button>
        </div>
      </form>
    </section>
  )
}
