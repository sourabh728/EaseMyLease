import { api } from '@/api/client'
import type {
  DashboardSummary,
  InventoryUtilizationReport,
  OutstandingReport,
  RentalsSummaryReport,
  RevenueReport,
} from '@/types/domain'

export type ReportDateParams = {
  fromDate?: string
  toDate?: string
}

export const reportsService = {
  dashboard() {
    return api.get<DashboardSummary>('/reports/dashboard')
  },
  revenue(params?: ReportDateParams) {
    return api.get<RevenueReport>('/reports/revenue', { params })
  },
  rentals(params?: ReportDateParams) {
    return api.get<RentalsSummaryReport>('/reports/rentals', { params })
  },
  inventory() {
    return api.get<InventoryUtilizationReport>('/reports/inventory')
  },
  outstanding() {
    return api.get<OutstandingReport>('/reports/outstanding')
  },
}
