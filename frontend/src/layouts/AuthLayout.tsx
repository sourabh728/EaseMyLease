import { Link, Outlet } from 'react-router-dom'
import { APP_NAME } from '@/constants'

export function AuthLayout() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10">
      <div className="mb-8 text-center">
        <Link to="/" className="text-3xl font-semibold tracking-tight text-teal-800 no-underline">
          {APP_NAME}
        </Link>
        <p className="mt-2 text-slate-600">Rental business management, simplified</p>
      </div>
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur">
        <Outlet />
      </div>
    </div>
  )
}
