import { Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthLayout } from '@/layouts/AuthLayout'
import { AppLayout } from '@/layouts/AppLayout'
import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { RegisterVerifyEmailPage } from '@/pages/auth/RegisterVerifyEmailPage'
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { InventoryListPage } from '@/pages/inventory/InventoryListPage'
import { InventoryFormPage } from '@/pages/inventory/InventoryFormPage'
import { CustomersListPage } from '@/pages/customers/CustomersListPage'
import { CustomerFormPage } from '@/pages/customers/CustomerFormPage'
import { SettingsPage } from '@/pages/settings/SettingsPage'
import { RentalsListPage } from '@/pages/rentals/RentalsListPage'
import { RentalCreatePage } from '@/pages/rentals/RentalCreatePage'
import { RentalDetailPage } from '@/pages/rentals/RentalDetailPage'
import { ReturnsListPage } from '@/pages/returns/ReturnsListPage'
import { ReturnProcessPage } from '@/pages/returns/ReturnProcessPage'
import { PaymentsListPage } from '@/pages/payments/PaymentsListPage'
import { ReportsPage } from '@/pages/reports/ReportsPage'
import { DamageListPage } from '@/pages/damage/DamageListPage'
import { InventoryScanPage } from '@/pages/inventory/InventoryScanPage'
import { TenantsAdminPage } from '@/pages/admin/TenantsAdminPage'
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
        <Route path="/register/verify-email" element={<RegisterVerifyEmailPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route
          element={
            <AppLayout
              userName={user?.name}
              userRole={user?.role}
              onLogout={logout}
            />
          }
        >
          <Route path="/dashboard" element={<DashboardPage user={user} />} />
          <Route path="/inventory" element={<InventoryListPage />} />
          <Route path="/inventory/scan" element={<InventoryScanPage />} />
          <Route path="/inventory/new" element={<InventoryFormPage />} />
          <Route path="/inventory/:id" element={<InventoryFormPage />} />
          <Route path="/customers" element={<CustomersListPage />} />
          <Route path="/customers/new" element={<CustomerFormPage />} />
          <Route path="/customers/:id" element={<CustomerFormPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/admin/tenants" element={<TenantsAdminPage />} />
          <Route path="/rentals" element={<RentalsListPage />} />
          <Route path="/rentals/new" element={<RentalCreatePage />} />
          <Route path="/rentals/:id" element={<RentalDetailPage />} />
          <Route path="/returns" element={<ReturnsListPage />} />
          <Route path="/returns/new" element={<ReturnProcessPage />} />
          <Route path="/payments" element={<PaymentsListPage />} />
          <Route path="/damage" element={<DamageListPage />} />
          <Route path="/reports" element={<ReportsPage />} />
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
