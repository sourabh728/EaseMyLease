import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { returnsService } from '@/services/returns.service'
import { getErrorMessage } from '@/utils/error'
import {
  DAMAGE_SETTLEMENT_STATUSES,
  type DamageSettlementStatus,
} from '@/types/domain'
import {
  EmptyState,
  ErrorState,
  LoadingState,
  fieldClassName,
  labelClassName,
  secondaryButtonClassName,
} from '@/components/ui'

function money(value: string | number) {
  const n = typeof value === 'string' ? Number(value) : value
  return Number.isFinite(n) ? n.toFixed(2) : '0.00'
}

export function DamageListPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [settlementStatus, setSettlementStatus] = useState<
    DamageSettlementStatus | ''
  >('')
  const queryClient = useQueryClient()

  const filters = useMemo(
    () => ({
      page,
      pageSize: 20,
      search: search.trim() || undefined,
      settlementStatus: settlementStatus || undefined,
    }),
    [page, search, settlementStatus],
  )

  const listQuery = useQuery({
    queryKey: ['damage-records', filters],
    queryFn: async () => (await returnsService.listDamage(filters)).data,
  })

  const updateMutation = useMutation({
    mutationFn: async (payload: {
      id: string
      settlementStatus: DamageSettlementStatus
    }) =>
      (
        await returnsService.updateDamage(payload.id, {
          settlementStatus: payload.settlementStatus,
        })
      ).data,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['damage-records'] })
      await queryClient.invalidateQueries({ queryKey: ['reports'] })
    },
  })

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Damage records</h1>
        <p className="mt-2 text-slate-600">
          Review charges and update settlement status. Linked to rentals and items.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="min-w-48 flex-1">
          <label className={labelClassName()}>Search</label>
          <input
            className={fieldClassName()}
            placeholder="Rental, item, customer…"
            value={search}
            onChange={(e) => {
              setPage(1)
              setSearch(e.target.value)
            }}
          />
        </div>
        <div>
          <label className={labelClassName()}>Settlement</label>
          <select
            className={fieldClassName()}
            value={settlementStatus}
            onChange={(e) => {
              setPage(1)
              setSettlementStatus(e.target.value as DamageSettlementStatus | '')
            }}
          >
            <option value="">All</option>
            {DAMAGE_SETTLEMENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {listQuery.isLoading ? <LoadingState message="Loading damage records…" /> : null}
      {listQuery.isError ? (
        <ErrorState
          message={getErrorMessage(listQuery.error, 'Failed to load damage records')}
        />
      ) : null}

      {listQuery.data && listQuery.data.data.length === 0 ? (
        <EmptyState message="No damage records match these filters." />
      ) : null}

      {listQuery.data && listQuery.data.data.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Rental</th>
                <th className="px-4 py-3 font-medium">Item</th>
                <th className="px-4 py-3 font-medium">Charge</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {listQuery.data.data.map((row) => (
                <tr key={row.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 text-slate-600">
                    {row.createdAt.slice(0, 10)}
                  </td>
                  <td className="px-4 py-3">
                    {row.rental ? (
                      <Link
                        to={`/rentals/${row.rental.id}`}
                        className="text-teal-700 hover:underline"
                      >
                        {row.rental.rentalNumber}
                      </Link>
                    ) : (
                      '—'
                    )}
                    <div className="text-xs text-slate-500">
                      {row.rental?.customer?.name ?? ''}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">
                      {row.inventoryItem?.itemCode} · {row.inventoryItem?.name}
                    </div>
                    <div className="line-clamp-2 text-xs text-slate-500">
                      {row.description}
                    </div>
                  </td>
                  <td className="px-4 py-3">₹{money(row.chargeAmount)}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium">
                      {row.settlementStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {row.settlementStatus !== 'SETTLED' ? (
                        <button
                          type="button"
                          className={secondaryButtonClassName()}
                          disabled={updateMutation.isPending}
                          onClick={() =>
                            updateMutation.mutate({
                              id: row.id,
                              settlementStatus: 'SETTLED',
                            })
                          }
                        >
                          Settle
                        </button>
                      ) : null}
                      {row.settlementStatus !== 'WAIVED' ? (
                        <button
                          type="button"
                          className={secondaryButtonClassName()}
                          disabled={updateMutation.isPending}
                          onClick={() =>
                            updateMutation.mutate({
                              id: row.id,
                              settlementStatus: 'WAIVED',
                            })
                          }
                        >
                          Waive
                        </button>
                      ) : null}
                      {row.settlementStatus !== 'OPEN' ? (
                        <button
                          type="button"
                          className={secondaryButtonClassName()}
                          disabled={updateMutation.isPending}
                          onClick={() =>
                            updateMutation.mutate({
                              id: row.id,
                              settlementStatus: 'OPEN',
                            })
                          }
                        >
                          Reopen
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {updateMutation.isError ? (
        <ErrorState
          message={getErrorMessage(updateMutation.error, 'Update failed')}
        />
      ) : null}

      {listQuery.data && listQuery.data.meta.totalPages > 1 ? (
        <div className="flex items-center gap-3">
          <button
            type="button"
            className={secondaryButtonClassName()}
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </button>
          <span className="text-sm text-slate-600">
            Page {listQuery.data.meta.page} of {listQuery.data.meta.totalPages}
          </span>
          <button
            type="button"
            className={secondaryButtonClassName()}
            disabled={page >= listQuery.data.meta.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      ) : null}
    </section>
  )
}
