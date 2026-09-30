import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { returnsService } from '@/services/returns.service'
import { getErrorMessage } from '@/utils/error'
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

export function ReturnsListPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')

  const filters = useMemo(
    () => ({
      page,
      pageSize: 20,
      search: search.trim() || undefined,
    }),
    [page, search],
  )

  const returnsQuery = useQuery({
    queryKey: ['returns', filters],
    queryFn: async () => (await returnsService.list(filters)).data,
  })

  const rows = returnsQuery.data?.data ?? []
  const meta = returnsQuery.data?.meta

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Returns</h1>
          <p className="mt-1 text-sm text-slate-600">
            Inspect returned items, record damage, and settle deposits.
          </p>
        </div>
        <Link to="/returns/new" className={primaryButtonClassName() + ' inline-flex no-underline'}>
          Process return
        </Link>
      </div>

      <input
        className={fieldClassName() + ' max-w-md'}
        placeholder="Search by rental # or customer"
        value={search}
        onChange={(e) => {
          setPage(1)
          setSearch(e.target.value)
        }}
      />

      {returnsQuery.isLoading ? <LoadingState message="Loading returns…" /> : null}
      {returnsQuery.isError ? (
        <ErrorState message={getErrorMessage(returnsQuery.error, 'Failed to load returns')} />
      ) : null}

      {!returnsQuery.isLoading && !returnsQuery.isError && rows.length === 0 ? (
        <EmptyState title="No returns yet" message="Process a return from an active rental." />
      ) : null}

      {rows.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Return date</th>
                <th className="px-4 py-3 font-medium">Rental</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Late fee</th>
                <th className="px-4 py-3 font-medium">Items</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3">{row.returnDate.slice(0, 10)}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {row.rental?.rentalNumber ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{row.rental?.customer?.name ?? '—'}</td>
                  <td className="px-4 py-3">₹{money(row.lateFee)}</td>
                  <td className="px-4 py-3">{row.items?.length ?? 0}</td>
                  <td className="px-4 py-3 text-right">
                    {row.rentalId ? (
                      <Link to={`/rentals/${row.rentalId}`} className="text-teal-700 hover:underline">
                        Rental
                      </Link>
                    ) : null}
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
