import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { customersService } from '@/services/customers.service'
import { getErrorMessage } from '@/utils/error'
import {
  EmptyState,
  ErrorState,
  LoadingState,
  fieldClassName,
  primaryButtonClassName,
} from '@/components/ui'

export function CustomersListPage() {
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

  const customersQuery = useQuery({
    queryKey: ['customers', filters],
    queryFn: async () => (await customersService.list(filters)).data,
  })

  const customers = customersQuery.data?.data ?? []
  const meta = customersQuery.data?.meta

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Customers</h1>
          <p className="mt-1 text-sm text-slate-600">Store contact details for rentals and follow-ups.</p>
        </div>
        <Link to="/customers/new" className={primaryButtonClassName() + ' inline-flex no-underline'}>
          Add customer
        </Link>
      </div>

      <input
        className={fieldClassName() + ' max-w-md'}
        placeholder="Search by name or phone"
        value={search}
        onChange={(e) => {
          setPage(1)
          setSearch(e.target.value)
        }}
      />

      {customersQuery.isLoading ? <LoadingState message="Loading customers…" /> : null}
      {customersQuery.isError ? (
        <ErrorState message={getErrorMessage(customersQuery.error, 'Failed to load customers')} />
      ) : null}

      {!customersQuery.isLoading && !customersQuery.isError && customers.length === 0 ? (
        <EmptyState
          title="No customers yet"
          message="Add a customer to start recording rental contacts."
        />
      ) : null}

      {customers.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">City</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 text-slate-900">{customer.name}</td>
                  <td className="px-4 py-3 text-slate-700">{customer.phone}</td>
                  <td className="px-4 py-3 text-slate-600">{customer.city ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{customer.email ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <Link to={`/customers/${customer.id}`} className="text-teal-700 hover:underline">
                      Edit
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
            Page {meta.page} of {meta.totalPages} · {meta.total} customers
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
