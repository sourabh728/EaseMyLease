import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { reportsService } from '@/services/reports.service'
import { getErrorMessage } from '@/utils/error'
import type { User } from '@/types/auth'
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '@/components/ui'

interface DashboardPageProps {
  user: User | null
}

function money(value: string | number) {
  const n = typeof value === 'string' ? Number(value) : value
  return Number.isFinite(n) ? n.toFixed(2) : '0.00'
}

export function DashboardPage({ user }: DashboardPageProps) {
  const dashQuery = useQuery({
    queryKey: ['reports', 'dashboard'],
    queryFn: async () => (await reportsService.dashboard()).data,
  })

  if (dashQuery.isLoading) return <LoadingState message="Loading dashboard…" />
  if (dashQuery.isError || !dashQuery.data) {
    return (
      <ErrorState
        message={getErrorMessage(dashQuery.error, 'Could not load dashboard')}
      />
    )
  }

  const d = dashQuery.data

  const kpis = [
    { label: "Today's rentals", value: String(d.todayRentals), to: '/rentals' },
    { label: "Today's returns", value: String(d.todayReturns), to: '/returns' },
    { label: 'Currently rented', value: String(d.currentlyRented), to: '/rentals?status=ACTIVE' },
    { label: 'Overdue', value: String(d.overdueRentals), to: '/rentals?status=OVERDUE', warn: d.overdueRentals > 0 },
    { label: "Today's revenue", value: `₹${money(d.todayRevenue)}`, to: '/payments' },
    { label: 'Pending payments', value: String(d.pendingPayments), to: '/reports' },
    { label: 'Available inventory', value: String(d.availableInventory), to: '/inventory' },
  ]

  return (
    <section className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
        <p className="mt-2 text-slate-600">
          Welcome{user ? `, ${user.name}` : ''}. Shop overview for today.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Link
            key={k.label}
            to={k.to}
            className={[
              'rounded-xl border bg-white p-4 no-underline transition hover:border-teal-300',
              k.warn ? 'border-amber-300' : 'border-slate-200',
            ].join(' ')}
          >
            <p className="text-xs uppercase tracking-wide text-slate-500">{k.label}</p>
            <p
              className={[
                'mt-2 text-2xl font-semibold',
                k.warn ? 'text-amber-700' : 'text-slate-900',
              ].join(' ')}
            >
              {k.value}
            </p>
          </Link>
        ))}
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-medium text-slate-900">Recent activity</h2>
          <Link to="/reports" className="text-sm text-teal-700 hover:underline">
            View reports
          </Link>
        </div>
        {d.recentActivities.length === 0 ? (
          <EmptyState message="No rentals, payments, or returns yet." />
        ) : (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
            {d.recentActivities.map((a) => (
              <li key={`${a.type}-${a.id}`}>
                <Link
                  to={`/rentals/${a.hrefId}`}
                  className="flex flex-col gap-1 px-4 py-3 no-underline hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">{a.label}</p>
                    <p className="text-xs text-slate-500">{a.detail}</p>
                  </div>
                  <div className="text-right text-xs text-slate-500">
                    <p>{a.at.slice(0, 16).replace('T', ' ')}</p>
                    <p className="text-slate-700">₹{money(a.amount)}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
