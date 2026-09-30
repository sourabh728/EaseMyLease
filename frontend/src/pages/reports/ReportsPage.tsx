import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { reportsService } from '@/services/reports.service'
import { getErrorMessage } from '@/utils/error'
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

function defaultRange() {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - 29)
  return {
    fromDate: from.toISOString().slice(0, 10),
    toDate: to.toISOString().slice(0, 10),
  }
}

export function ReportsPage() {
  const defaults = useMemo(() => defaultRange(), [])
  const [fromDate, setFromDate] = useState(defaults.fromDate)
  const [toDate, setToDate] = useState(defaults.toDate)
  const [applied, setApplied] = useState(defaults)

  const params = useMemo(
    () => ({ fromDate: applied.fromDate, toDate: applied.toDate }),
    [applied],
  )

  const revenueQuery = useQuery({
    queryKey: ['reports', 'revenue', params],
    queryFn: async () => (await reportsService.revenue(params)).data,
  })
  const rentalsQuery = useQuery({
    queryKey: ['reports', 'rentals', params],
    queryFn: async () => (await reportsService.rentals(params)).data,
  })
  const inventoryQuery = useQuery({
    queryKey: ['reports', 'inventory'],
    queryFn: async () => (await reportsService.inventory()).data,
  })
  const outstandingQuery = useQuery({
    queryKey: ['reports', 'outstanding'],
    queryFn: async () => (await reportsService.outstanding()).data,
  })

  const loading =
    revenueQuery.isLoading ||
    rentalsQuery.isLoading ||
    inventoryQuery.isLoading ||
    outstandingQuery.isLoading

  const error =
    revenueQuery.error ||
    rentalsQuery.error ||
    inventoryQuery.error ||
    outstandingQuery.error

  return (
    <section className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Reports</h1>
        <p className="mt-2 text-slate-600">
          Revenue, rentals, inventory utilization, and outstanding balances.
        </p>
      </div>

      <form
        className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4"
        onSubmit={(e) => {
          e.preventDefault()
          setApplied({ fromDate, toDate })
        }}
      >
        <div>
          <label className={labelClassName()}>From</label>
          <input
            type="date"
            className={fieldClassName()}
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </div>
        <div>
          <label className={labelClassName()}>To</label>
          <input
            type="date"
            className={fieldClassName()}
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>
        <button type="submit" className={secondaryButtonClassName()}>
          Apply range
        </button>
        <Link to="/damage" className="text-sm text-teal-700 hover:underline">
          Damage records →
        </Link>
      </form>

      {loading ? <LoadingState message="Loading reports…" /> : null}
      {error ? (
        <ErrorState message={getErrorMessage(error, 'Failed to load reports')} />
      ) : null}

      {revenueQuery.data ? (
        <div className="space-y-3">
          <h2 className="font-medium text-slate-900">Revenue</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <SummaryCard label="Inflow" value={`₹${money(revenueQuery.data.totalInflow)}`} />
            <SummaryCard label="Refunds" value={`₹${money(revenueQuery.data.totalRefunds)}`} />
            <SummaryCard label="Net" value={`₹${money(revenueQuery.data.netRevenue)}`} />
          </div>
          <SimpleTable
            headers={['Date', 'Inflow', 'Refunds', 'Net']}
            rows={revenueQuery.data.byDate.map((r) => [
              r.date,
              `₹${money(r.inflow)}`,
              `₹${money(r.refunds)}`,
              `₹${money(r.net)}`,
            ])}
            empty="No payments in this range."
          />
          {revenueQuery.data.byType.length > 0 ? (
            <SimpleTable
              headers={['Payment type', 'Amount']}
              rows={revenueQuery.data.byType.map((r) => [
                r.paymentType,
                `₹${money(r.amount)}`,
              ])}
            />
          ) : null}
        </div>
      ) : null}

      {rentalsQuery.data ? (
        <div className="space-y-3">
          <h2 className="font-medium text-slate-900">Rentals summary</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <SummaryCard
              label="Created in period"
              value={String(rentalsQuery.data.createdInPeriod)}
            />
            <SummaryCard
              label="Completed in period"
              value={String(rentalsQuery.data.completedInPeriod)}
            />
          </div>
          <SimpleTable
            headers={['Status', 'Count']}
            rows={rentalsQuery.data.byStatus.map((r) => [r.status, String(r.count)])}
            empty="No rentals."
          />
        </div>
      ) : null}

      {inventoryQuery.data ? (
        <div className="space-y-3">
          <h2 className="font-medium text-slate-900">Inventory utilization</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <SummaryCard label="Total items" value={String(inventoryQuery.data.total)} />
            <SummaryCard label="On rent" value={String(inventoryQuery.data.onRent)} />
            <SummaryCard
              label="Utilization"
              value={`${inventoryQuery.data.utilizationRate}%`}
            />
          </div>
          <SimpleTable
            headers={['Status', 'Count']}
            rows={inventoryQuery.data.byStatus.map((r) => [r.status, String(r.count)])}
            empty="No inventory."
          />
        </div>
      ) : null}

      {outstandingQuery.data ? (
        <div className="space-y-3">
          <h2 className="font-medium text-slate-900">Outstanding</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <SummaryCard
              label="Balances due"
              value={`₹${money(outstandingQuery.data.totalOutstanding)}`}
            />
            <SummaryCard
              label="Deposit exposure"
              value={`₹${money(outstandingQuery.data.pendingDepositExposure)}`}
            />
            <SummaryCard
              label="Open damage charges"
              value={`₹${money(outstandingQuery.data.openDamageCharges)}`}
            />
          </div>
          <SimpleTable
            headers={['Rental', 'Customer', 'Status', 'Balance']}
            rows={outstandingQuery.data.pendingBalances.map((r) => [
              <Link key={r.id} to={`/rentals/${r.id}`} className="text-teal-700 hover:underline">
                {r.rentalNumber}
              </Link>,
              r.customer?.name ?? '—',
              r.status,
              `₹${money(r.balanceAmount)}`,
            ])}
            empty="No outstanding balances."
          />
        </div>
      ) : null}
    </section>
  )
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-slate-900">{value}</p>
    </div>
  )
}

function SimpleTable({
  headers,
  rows,
  empty,
}: {
  headers: string[]
  rows: Array<Array<ReactNode>>
  empty?: string
}) {
  if (rows.length === 0) {
    return <EmptyState message={empty ?? 'No data.'} />
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
          <tr>
            {headers.map((h) => (
              <th key={h} className="px-4 py-3 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-slate-100 last:border-0">
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-3 text-slate-800">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
