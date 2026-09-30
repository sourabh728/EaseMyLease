import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { inventoryService } from '@/services/inventory.service'
import { categoriesService } from '@/services/categories.service'
import { INVENTORY_STATUSES, type InventoryStatus } from '@/types/domain'
import { getErrorMessage } from '@/utils/error'
import {
  EmptyState,
  ErrorState,
  LoadingState,
  primaryButtonClassName,
  fieldClassName,
} from '@/components/ui'

export function InventoryListPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<InventoryStatus | ''>('')
  const [categoryId, setCategoryId] = useState('')
  const [size, setSize] = useState('')
  const [color, setColor] = useState('')
  const [occasion, setOccasion] = useState('')
  const [availableOnly, setAvailableOnly] = useState(false)
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: async () => (await categoriesService.list({ includeInactive: false })).data,
  })

  const filters = useMemo(
    () => ({
      page,
      pageSize: 20,
      search: search.trim() || undefined,
      status: status || undefined,
      categoryId: categoryId || undefined,
      size: size.trim() || undefined,
      color: color.trim() || undefined,
      occasion: occasion.trim() || undefined,
      availableOnly: availableOnly || undefined,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
    }),
    [page, search, status, categoryId, size, color, occasion, availableOnly, minPrice, maxPrice],
  )

  const inventoryQuery = useQuery({
    queryKey: ['inventory', filters],
    queryFn: async () => (await inventoryService.list(filters)).data,
  })

  const items = inventoryQuery.data?.data ?? []
  const meta = inventoryQuery.data?.meta

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Inventory</h1>
          <p className="mt-1 text-sm text-slate-600">Track rental items, pricing, and availability.</p>
        </div>
        <Link to="/inventory/new" className={primaryButtonClassName() + ' inline-flex no-underline'}>
          Add item
        </Link>
      </div>

      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-3 lg:grid-cols-4">
        <input
          className={fieldClassName()}
          placeholder="Search name or code"
          value={search}
          onChange={(e) => {
            setPage(1)
            setSearch(e.target.value)
          }}
        />
        <select
          className={fieldClassName()}
          value={categoryId}
          onChange={(e) => {
            setPage(1)
            setCategoryId(e.target.value)
          }}
        >
          <option value="">All categories</option>
          {(categoriesQuery.data ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.parent ? `${c.parent.name} / ${c.name}` : c.name}
            </option>
          ))}
        </select>
        <select
          className={fieldClassName()}
          value={status}
          onChange={(e) => {
            setPage(1)
            setStatus(e.target.value as InventoryStatus | '')
          }}
        >
          <option value="">All statuses</option>
          {INVENTORY_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replaceAll('_', ' ')}
            </option>
          ))}
        </select>
        <input
          className={fieldClassName()}
          placeholder="Size"
          value={size}
          onChange={(e) => {
            setPage(1)
            setSize(e.target.value)
          }}
        />
        <input
          className={fieldClassName()}
          placeholder="Color"
          value={color}
          onChange={(e) => {
            setPage(1)
            setColor(e.target.value)
          }}
        />
        <input
          className={fieldClassName()}
          placeholder="Occasion"
          value={occasion}
          onChange={(e) => {
            setPage(1)
            setOccasion(e.target.value)
          }}
        />
        <input
          className={fieldClassName()}
          type="number"
          min={0}
          placeholder="Min price"
          value={minPrice}
          onChange={(e) => {
            setPage(1)
            setMinPrice(e.target.value)
          }}
        />
        <input
          className={fieldClassName()}
          type="number"
          min={0}
          placeholder="Max price"
          value={maxPrice}
          onChange={(e) => {
            setPage(1)
            setMaxPrice(e.target.value)
          }}
        />
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={availableOnly}
            onChange={(e) => {
              setPage(1)
              setAvailableOnly(e.target.checked)
            }}
          />
          Available only
        </label>
      </div>

      {inventoryQuery.isLoading ? <LoadingState message="Loading inventory…" /> : null}
      {inventoryQuery.isError ? (
        <ErrorState message={getErrorMessage(inventoryQuery.error, 'Failed to load inventory')} />
      ) : null}

      {!inventoryQuery.isLoading && !inventoryQuery.isError && items.length === 0 ? (
        <EmptyState
          title="No inventory items"
          message="Add your first rental item to start building your catalog."
        />
      ) : null}

      {items.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Size</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Rent</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-mono text-xs text-slate-700">{item.itemCode}</td>
                  <td className="px-4 py-3 text-slate-900">{item.name}</td>
                  <td className="px-4 py-3 text-slate-600">{item.category?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{item.size ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700">
                      {item.status.replaceAll('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">₹{item.rentalPrice}</td>
                  <td className="px-4 py-3 text-right">
                    <Link to={`/inventory/${item.id}`} className="text-teal-700 hover:underline">
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
            Page {meta.page} of {meta.totalPages} · {meta.total} items
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
