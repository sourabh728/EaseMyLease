import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { rentalsService } from '@/services/rentals.service'
import { getErrorMessage } from '@/utils/error'
import { RENTAL_STATUSES, type RentalStatus } from '@/types/domain'
import {
  EmptyState,
  ErrorState,
  LoadingState,
  fieldClassName,
  primaryButtonClassName,
} from '@/components/ui'

function money(value: string | number) {
  const n = typeof value === 'string' ? Number(value) : value
  return Number.isFinite(n) ? n.toFixed(2) : '0.00'
}

function parseStatusParam(value: string | null): RentalStatus | '' {
  if (!value) return ''
  return (RENTAL_STATUSES as string[]).includes(value)
    ? (value as RentalStatus)
    : ''
}

export function RentalsListPage() {
  const [searchParams] = useSearchParams()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<RentalStatus | ''>(() =>
    parseStatusParam(searchParams.get('status')),
  )

  const filters = useMemo(
    () => ({
      page,
      pageSize: 20,
      search: search.trim() || undefined,
      status: status || undefined,
    }),
    [page, search, status],
  )

  const rentalsQuery = useQuery({
    queryKey: ['rentals', filters],
    queryFn: async () => (await rentalsService.list(filters)).data,
  })

  const rentals = rentalsQuery.data?.data ?? []
  const meta = rentalsQuery.data?.meta

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Rentals</h1>
          <p className="mt-1 text-sm text-slate-600">
            Create bookings, release items, and track rental status.
          </p>
        </div>
        <Link to="/rentals/new" className={primaryButtonClassName() + ' inline-flex no-underline'}>
          New rental
        </Link>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          className={fieldClassName() + ' max-w-md'}
          placeholder="Search by rental #, customer, phone"
          value={search}
          onChange={(e) => {
            setPage(1)
            setSearch(e.target.value)
          }}
        />
        <select
          className={fieldClassName() + ' max-w-xs'}
          value={status}
          onChange={(e) => {
            setPage(1)
            setStatus(e.target.value as RentalStatus | '')
          }}
        >
          <option value="">All statuses</option>
          {RENTAL_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {rentalsQuery.isLoading ? <LoadingState message="Loading rentals…" /> : null}
      {rentalsQuery.isError ? (
        <ErrorState message={getErrorMessage(rentalsQuery.error, 'Failed to load rentals')} />
      ) : null}

      {!rentalsQuery.isLoading && !rentalsQuery.isError && rentals.length === 0 ? (
        <EmptyState title="No rentals yet" message="Create a rental to book inventory for a customer." />
      ) : null}

      {rentals.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Rental #</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Dates</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Balance</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {rentals.map((rental) => (
                <tr key={rental.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-slate-900">{rental.rentalNumber}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {rental.customer?.name ?? '—'}
                    <div className="text-xs text-slate-500">{rental.customer?.phone}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {rental.rentalStartDate.slice(0, 10)} → {rental.expectedReturnDate.slice(0, 10)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                      {rental.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">₹{money(rental.totalRent)}</td>
                  <td className="px-4 py-3 text-slate-700">₹{money(rental.balanceAmount)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link to={`/rentals/${rental.id}`} className="text-teal-700 hover:underline">
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {meta && meta.totalPages > 1 ? (
        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>
            Page {meta.page} of {meta.totalPages} · {meta.total} rentals
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
