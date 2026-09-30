import { Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthLayout } from '@/layouts/AuthLayout'
import { AppLayout } from '@/layouts/AppLayout'
import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { InventoryListPage } from '@/pages/inventory/InventoryListPage'
import { InventoryFormPage } from '@/pages/inventory/InventoryFormPage'
import { CustomersListPage } from '@/pages/customers/CustomersListPage'
import { CustomerFormPage } from '@/pages/customers/CustomerFormPage'
import { SettingsPage } from '@/pages/settings/SettingsPage'
import { PlaceholderPage } from '@/pages/PlaceholderPage'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { useAuthSession } from '@/hooks/useAuthSession'
import { APP_NAME } from '@/constants'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

function AppRoutes() {
  const { user, loading, logout } = useAuthSession()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-600">
        Loading {APP_NAME}…
      </div>
    )
  }

  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route
          element={<AppLayout userName={user?.name} onLogout={logout} />}
        >
          <Route path="/dashboard" element={<DashboardPage user={user} />} />
          <Route path="/inventory" element={<InventoryListPage />} />
          <Route path="/inventory/new" element={<InventoryFormPage />} />
          <Route path="/inventory/:id" element={<InventoryFormPage />} />
          <Route path="/customers" element={<CustomersListPage />} />
          <Route path="/customers/new" element={<CustomerFormPage />} />
          <Route path="/customers/:id" element={<CustomerFormPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route
            path="/rentals"
            element={
              <PlaceholderPage
                title="Rentals"
                description="Create and manage rental bookings. This module arrives in Phase 3."
              />
            }
          />
          <Route
            path="/returns"
            element={
              <PlaceholderPage
                title="Returns"
                description="Process returns, inspections, and late fees in Phase 3."
              />
            }
          />
          <Route
            path="/payments"
            element={
              <PlaceholderPage
                title="Payments"
                description="Track deposits, balances, and payment history in Phase 3."
              />
            }
          />
          <Route
            path="/reports"
            element={
              <PlaceholderPage
                title="Reports"
                description="Revenue, utilization, and inventory reports come later."
              />
            }
          />
        </Route>
      </Route>

      <Route path="/" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppRoutes />
    </QueryClientProvider>
  )
}
