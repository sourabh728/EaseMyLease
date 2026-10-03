import { NavLink, Outlet } from 'react-router-dom'
import { APP_NAME } from '@/constants'
import { useActiveShop } from '@/hooks/useActiveShop'
import { fieldClassName } from '@/components/ui'
import type { Role } from '@/types/auth'

interface AppLayoutProps {
  userName?: string
  userRole?: Role
  onLogout?: () => void
}

const navItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/inventory', label: 'Inventory' },
  { to: '/customers', label: 'Customers' },
  { to: '/rentals', label: 'Rentals' },
  { to: '/returns', label: 'Returns' },
  { to: '/payments', label: 'Payments' },
  { to: '/damage', label: 'Damage' },
  { to: '/reports', label: 'Reports' },
  { to: '/settings', label: 'Settings' },
] as const

export function AppLayout({ userName, userRole, onLogout }: AppLayoutProps) {
  const isSuperAdmin = userRole === 'SUPER_ADMIN'
  const { shops, activeShopId, setActiveShopId } = useActiveShop({
    enabled: !isSuperAdmin,
  })

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center justify-between gap-4">
            <NavLink to="/dashboard" className="text-xl font-semibold text-teal-800 no-underline">
              {APP_NAME}
            </NavLink>
            <div className="flex items-center gap-3 text-sm text-slate-600 sm:hidden">
              {userName ? <span className="truncate max-w-28">{userName}</span> : null}
              {onLogout ? (
                <button
                  type="button"
                  onClick={onLogout}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50"
                >
                  Log out
                </button>
              ) : null}
            </div>
          </div>

          <nav className="-mx-1 flex gap-1 overflow-x-auto pb-1 text-sm">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  [
                    'whitespace-nowrap rounded-lg px-3 py-1.5 no-underline transition-colors',
                    isActive
                      ? 'bg-teal-700 text-white'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                  ].join(' ')
                }
              >
                {item.label}
              </NavLink>
            ))}
            {isSuperAdmin ? (
              <NavLink
                to="/admin/tenants"
                className={({ isActive }) =>
                  [
                    'whitespace-nowrap rounded-lg px-3 py-1.5 no-underline transition-colors',
                    isActive
                      ? 'bg-teal-700 text-white'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                  ].join(' ')
                }
              >
                Tenants
              </NavLink>
            ) : null}
          </nav>

          <div className="hidden items-center gap-3 text-sm text-slate-600 sm:flex">
            {shops.length > 1 ? (
              <select
                className={fieldClassName() + ' w-auto py-1.5'}
                value={activeShopId ?? ''}
                onChange={(e) => setActiveShopId(e.target.value)}
                aria-label="Active branch"
              >
                {shops.map((shop) => (
                  <option key={shop.id} value={shop.id}>
                    {shop.name}
                  </option>
                ))}
              </select>
            ) : null}
            {userName ? <span>{userName}</span> : null}
            {onLogout ? (
              <button
                type="button"
                onClick={onLogout}
                className="rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50"
              >
                Log out
              </button>
            ) : null}
          </div>
        </div>
        {shops.length > 1 ? (
          <div className="mx-auto max-w-6xl px-4 pb-3 sm:hidden">
            <select
              className={fieldClassName()}
              value={activeShopId ?? ''}
              onChange={(e) => setActiveShopId(e.target.value)}
              aria-label="Active branch"
            >
              {shops.map((shop) => (
                <option key={shop.id} value={shop.id}>
                  {shop.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
