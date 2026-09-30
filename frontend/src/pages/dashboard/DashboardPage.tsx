import type { User } from '@/types/auth'

interface DashboardPageProps {
  user: User | null
}

export function DashboardPage({ user }: DashboardPageProps) {
  return (
    <section>
      <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
      <p className="mt-2 text-slate-600">
        Welcome{user ? `, ${user.name}` : ''}. Phase 1 foundation is ready —
        inventory and rentals come next.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-medium text-slate-900">Account</h2>
          <dl className="mt-3 space-y-2 text-sm text-slate-600">
            <div>
              <dt className="inline text-slate-500">Email: </dt>
              <dd className="inline">{user?.email ?? '—'}</dd>
            </div>
            <div>
              <dt className="inline text-slate-500">Role: </dt>
              <dd className="inline">{user?.role ?? '—'}</dd>
            </div>
            <div>
              <dt className="inline text-slate-500">Tenant: </dt>
              <dd className="inline">{user?.tenantId ?? '—'}</dd>
            </div>
          </dl>
        </div>
        <div className="rounded-xl border border-dashed border-slate-300 bg-white/60 p-5">
          <h2 className="font-medium text-slate-900">Coming in Phase 2</h2>
          <p className="mt-2 text-sm text-slate-600">
            Inventory, categories, and item management for your rental catalog.
          </p>
        </div>
      </div>
    </section>
  )
}
