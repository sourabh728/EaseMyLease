import { Link } from 'react-router-dom'
import type { User } from '@/types/auth'

interface DashboardPageProps {
  user: User | null
}

const shortcuts = [
  { to: '/inventory', title: 'Inventory', body: 'Manage rental items, status, and pricing.' },
  { to: '/customers', title: 'Customers', body: 'Keep customer contact and ID details.' },
  { to: '/settings', title: 'Settings', body: 'Shop profile, terms, and categories.' },
]

export function DashboardPage({ user }: DashboardPageProps) {
  return (
    <section>
      <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
      <p className="mt-2 text-slate-600">
        Welcome{user ? `, ${user.name}` : ''}. Manage inventory, customers, and shop settings.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
          </dl>
        </div>

        {shortcuts.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="rounded-xl border border-slate-200 bg-white p-5 no-underline transition hover:border-teal-300"
          >
            <h2 className="font-medium text-slate-900">{item.title}</h2>
            <p className="mt-2 text-sm text-slate-600">{item.body}</p>
          </Link>
        ))}
      </div>
    </section>
  )
}
