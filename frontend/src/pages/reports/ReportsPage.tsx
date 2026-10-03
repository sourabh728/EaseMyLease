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

type Tab =
  | 'overview'
  | 'trends'
  | 'top'
  | 'customers'
  | 'aging'

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'trends', label: 'Revenue trend' },
  { id: 'top', label: 'Top items' },
  { id: 'customers', label: 'Customers' },
  { id: 'aging', label: 'Overdue aging' },
]

export function ReportsPage() {
  const defaults = useMemo(() => defaultRange(), [])
  const [fromDate, setFromDate] = useState(defaults.fromDate)
  const [toDate, setToDate] = useState(defaults.toDate)
  const [applied, setApplied] = useState(defaults)
  const [tab, setTab] = useState<Tab>('overview')
  const [granularity, setGranularity] = useState<'day' | 'week'>('day')

  const params = useMemo(
    () => ({ fromDate: applied.fromDate, toDate: applied.toDate }),
    [applied],
  )

  const revenueQuery = useQuery({
    queryKey: ['reports', 'revenue', params],
    queryFn: async () => (await reportsService.revenue(params)).data,
    enabled: tab === 'overview',
  })
  const rentalsQuery = useQuery({
    queryKey: ['reports', 'rentals', params],
    queryFn: async () => (await reportsService.rentals(params)).data,
    enabled: tab === 'overview',
  })
  const inventoryQuery = useQuery({
    queryKey: ['reports', 'inventory'],
    queryFn: async () => (await reportsService.inventory()).data,
    enabled: tab === 'overview',
  })
  const outstandingQuery = useQuery({
    queryKey: ['reports', 'outstanding'],
    queryFn: async () => (await reportsService.outstanding()).data,
    enabled: tab === 'overview',
  })
  const trendQuery = useQuery({
    queryKey: ['reports', 'revenue-trend', params, granularity],
    queryFn: async () =>
      (await reportsService.revenueTrend({ ...params, granularity })).data,
    enabled: tab === 'trends',
  })
  const topItemsQuery = useQuery({
    queryKey: ['reports', 'top-items', params],
    queryFn: async () => (await reportsService.topItems(params)).data,
    enabled: tab === 'top',
  })
  const topCategoriesQuery = useQuery({
    queryKey: ['reports', 'top-categories', params],
    queryFn: async () => (await reportsService.topCategories(params)).data,
    enabled: tab === 'top',
  })
  const customersQuery = useQuery({
    queryKey: ['reports', 'customers', params],
    queryFn: async () => (await reportsService.customers(params)).data,
    enabled: tab === 'customers',
  })
  const agingQuery = useQuery({
    queryKey: ['reports', 'overdue-aging'],
    queryFn: async () => (await reportsService.overdueAging()).data,
    enabled: tab === 'aging',
  })

  const loading =
    (tab === 'overview' &&
      (revenueQuery.isLoading ||
        rentalsQuery.isLoading ||
        inventoryQuery.isLoading ||
        outstandingQuery.isLoading)) ||
    (tab === 'trends' && trendQuery.isLoading) ||
    (tab === 'top' && (topItemsQuery.isLoading || topCategoriesQuery.isLoading)) ||
    (tab === 'customers' && customersQuery.isLoading) ||
    (tab === 'aging' && agingQuery.isLoading)

  const error =
    revenueQuery.error ||
    rentalsQuery.error ||
    inventoryQuery.error ||
    outstandingQuery.error ||
    trendQuery.error ||
    topItemsQuery.error ||
    topCategoriesQuery.error ||
    customersQuery.error ||
    agingQuery.error

  const maxTrend = Math.max(
    1,
    ...(trendQuery.data?.series.map((s) => Math.abs(s.net)) ?? [1]),
  )

  return (
    <section className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Reports</h1>
        <p className="mt-2 text-slate-600">
          Revenue, utilization, top items, repeat customers, and overdue aging.
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

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={
              tab === t.id
                ? 'rounded-lg bg-teal-700 px-3 py-1.5 text-sm text-white'
                : 'rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50'
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? <LoadingState message="Loading reports…" /> : null}
      {error ? (
        <ErrorState message={getErrorMessage(error, 'Failed to load reports')} />
      ) : null}

      {tab === 'overview' && revenueQuery.data ? (
        <div className="space-y-6">
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
          </div>

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
            </div>
          ) : null}
        </div>
      ) : null}

      {tab === 'trends' && trendQuery.data ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-medium text-slate-900">Revenue trend</h2>
            <select
              className={fieldClassName() + ' w-auto'}
              value={granularity}
              onChange={(e) => setGranularity(e.target.value as 'day' | 'week')}
            >
              <option value="day">By day</option>
              <option value="week">By week</option>
            </select>
            <SummaryCard label="Net" value={`₹${money(trendQuery.data.netRevenue)}`} />
          </div>
          <div className="flex h-40 items-end gap-1 rounded-xl border border-slate-200 bg-white p-4">
            {trendQuery.data.series.map((s, i) => {
              const label = s.date ?? s.period ?? String(i)
              const height = Math.max(4, Math.round((Math.abs(s.net) / maxTrend) * 100))
              return (
                <div key={label} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className="w-full max-w-6 rounded-t bg-teal-600"
                    style={{ height: `${height}%` }}
                    title={`${label}: ₹${money(s.net)}`}
                  />
                </div>
              )
            })}
          </div>
          <SimpleTable
            headers={[granularity === 'week' ? 'Week starting' : 'Date', 'Inflow', 'Refunds', 'Net']}
            rows={trendQuery.data.series.map((r) => [
              r.date ?? r.period ?? '—',
              `₹${money(r.inflow)}`,
              `₹${money(r.refunds)}`,
              `₹${money(r.net)}`,
            ])}
            empty="No trend data."
          />
        </div>
      ) : null}

      {tab === 'top' ? (
        <div className="space-y-6">
          {topItemsQuery.data ? (
            <div className="space-y-3">
              <h2 className="font-medium text-slate-900">Top rented items</h2>
              <SimpleTable
                headers={['Code', 'Name', 'Category', 'Rentals', 'Revenue']}
                rows={topItemsQuery.data.items.map((i) => [
                  i.itemCode,
                  i.name,
                  i.categoryName ?? '—',
                  String(i.rentalCount),
                  `₹${money(i.revenue)}`,
                ])}
                empty="No rentals in this range."
              />
            </div>
          ) : null}
          {topCategoriesQuery.data ? (
            <div className="space-y-3">
              <h2 className="font-medium text-slate-900">Top categories</h2>
              <SimpleTable
                headers={['Category', 'Rentals', 'Revenue']}
                rows={topCategoriesQuery.data.categories.map((c) => [
                  c.categoryName,
                  String(c.rentalCount),
                  `₹${money(c.revenue)}`,
                ])}
                empty="No category data."
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {tab === 'customers' && customersQuery.data ? (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <SummaryCard
              label="Unique customers"
              value={String(customersQuery.data.uniqueCustomers)}
            />
            <SummaryCard
              label="Repeat customers"
              value={String(customersQuery.data.repeatCustomers)}
            />
            <SummaryCard
              label="Repeat rate"
              value={`${customersQuery.data.repeatRate}%`}
            />
          </div>
          <SimpleTable
            headers={['Customer', 'Phone', 'Rentals', 'Spend']}
            rows={customersQuery.data.topCustomers.map((c) => [
              c.name,
              c.phone,
              String(c.rentalCount),
              `₹${money(c.totalSpend)}`,
            ])}
            empty="No customer activity."
          />
        </div>
      ) : null}

      {tab === 'aging' && agingQuery.data ? (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-5">
            <SummaryCard label="Total overdue" value={String(agingQuery.data.totalOverdue)} />
            <SummaryCard label="0–3 days" value={String(agingQuery.data.buckets['0-3'])} />
            <SummaryCard label="4–7 days" value={String(agingQuery.data.buckets['4-7'])} />
            <SummaryCard label="8–14 days" value={String(agingQuery.data.buckets['8-14'])} />
            <SummaryCard label="15+ days" value={String(agingQuery.data.buckets['15+'])} />
          </div>
          <SimpleTable
            headers={['Rental', 'Customer', 'Days', 'Bucket', 'Balance']}
            rows={agingQuery.data.rentals.map((r) => [
              <Link key={r.id} to={`/rentals/${r.id}`} className="text-teal-700 hover:underline">
                {r.rentalNumber}
              </Link>,
              r.customer?.name ?? '—',
              String(r.daysOverdue),
              r.bucket,
              `₹${money(r.balanceAmount)}`,
            ])}
            empty="No overdue rentals."
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
