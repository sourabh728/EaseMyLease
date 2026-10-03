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

export type RevenueTrendReport = {
  fromDate: string
  toDate: string
  totalInflow: number
  totalRefunds: number
  netRevenue: number
  granularity: 'day' | 'week'
  series: Array<{
    date?: string
    period?: string
    inflow: number
    refunds: number
    net: number
  }>
}

export type TopItemsReport = {
  fromDate: string
  toDate: string
  items: Array<{
    inventoryItemId: string
    itemCode: string
    name: string
    categoryName: string | null
    rentalCount: number
    revenue: number
  }>
}

export type TopCategoriesReport = {
  fromDate: string
  toDate: string
  categories: Array<{
    categoryName: string
    rentalCount: number
    revenue: number
  }>
}

export type CustomersAnalyticsReport = {
  fromDate: string
  toDate: string
  uniqueCustomers: number
  repeatCustomers: number
  repeatRate: number
  topCustomers: Array<{
    customerId: string
    name: string
    phone: string
    email: string | null
    rentalCount: number
    totalSpend: number
  }>
}

export type OverdueAgingReport = {
  totalOverdue: number
  buckets: Record<'0-3' | '4-7' | '8-14' | '15+', number>
  rentals: Array<{
    id: string
    rentalNumber: string
    expectedReturnDate: string
    balanceAmount: string
    totalRent: string
    daysOverdue: number
    bucket: string
    customer?: { id: string; name: string; phone: string }
  }>
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
  revenueTrend(params?: ReportDateParams & { granularity?: 'day' | 'week' }) {
    return api.get<RevenueTrendReport>('/reports/revenue-trend', { params })
  },
  topItems(params?: ReportDateParams) {
    return api.get<TopItemsReport>('/reports/top-items', { params })
  },
  topCategories(params?: ReportDateParams) {
    return api.get<TopCategoriesReport>('/reports/top-categories', { params })
  },
  customers(params?: ReportDateParams) {
    return api.get<CustomersAnalyticsReport>('/reports/customers', { params })
  },
  overdueAging() {
    return api.get<OverdueAgingReport>('/reports/overdue-aging')
  },
}
