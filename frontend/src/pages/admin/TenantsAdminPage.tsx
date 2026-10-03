import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  tenantsService,
  type SubscriptionPlan,
  type SubscriptionStatus,
} from '@/services/tenants.service'
import { getErrorMessage } from '@/utils/error'
import {
  ErrorState,
  LoadingState,
  fieldClassName,
  primaryButtonClassName,
} from '@/components/ui'

const PLANS: SubscriptionPlan[] = ['FREE', 'BASIC', 'PRO']
const STATUSES: SubscriptionStatus[] = ['TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELLED']

export function TenantsAdminPage() {
  const queryClient = useQueryClient()
  const [message, setMessage] = useState<string | null>(null)

  const tenantsQuery = useQuery({
    queryKey: ['tenants', 'admin'],
    queryFn: async () => (await tenantsService.list()).data,
  })

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      plan,
      subscriptionStatus,
    }: {
      id: string
      plan: SubscriptionPlan
      subscriptionStatus: SubscriptionStatus
    }) =>
      (
        await tenantsService.updateSubscription(id, {
          plan,
          subscriptionStatus,
        })
      ).data,
    onSuccess: async () => {
      setMessage('Subscription updated.')
      await queryClient.invalidateQueries({ queryKey: ['tenants'] })
    },
  })

  if (tenantsQuery.isLoading) return <LoadingState message="Loading tenants…" />
  if (tenantsQuery.isError) {
    return (
      <ErrorState
        message={getErrorMessage(
          tenantsQuery.error,
          'Failed to load tenants (SUPER_ADMIN only)',
        )}
      />
    )
  }

  const tenants = tenantsQuery.data ?? []

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Tenants</h1>
        <p className="mt-1 text-sm text-slate-600">
          Manual plan assignment (no payment gateway yet).
        </p>
      </div>

      {message ? <p className="text-sm text-teal-700">{message}</p> : null}
      {updateMutation.isError ? (
        <p className="text-sm text-red-600">
          {getErrorMessage(updateMutation.error, 'Update failed')}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 font-medium">Business</th>
              <th className="px-4 py-3 font-medium">Plan</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Usage</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {tenants.map((tenant) => (
              <TenantRow
                key={tenant.id}
                tenant={tenant}
                busy={updateMutation.isPending}
                onSave={(plan, subscriptionStatus) =>
                  updateMutation.mutate({
                    id: tenant.id,
                    plan,
                    subscriptionStatus,
                  })
                }
              />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function TenantRow({
  tenant,
  busy,
  onSave,
}: {
  tenant: {
    id: string
    name: string
    slug: string
    plan: SubscriptionPlan
    subscriptionStatus: SubscriptionStatus
    _count: {
      users: number
      shops: number
      inventoryItems: number
      rentals: number
    }
  }
  busy: boolean
  onSave: (plan: SubscriptionPlan, status: SubscriptionStatus) => void
}) {
  const [plan, setPlan] = useState(tenant.plan)
  const [status, setStatus] = useState(tenant.subscriptionStatus)

  return (
    <tr className="border-b border-slate-100 last:border-0">
      <td className="px-4 py-3">
        <div className="font-medium text-slate-900">{tenant.name}</div>
        <div className="text-xs text-slate-500">{tenant.slug}</div>
      </td>
      <td className="px-4 py-3">
        <select
          className={fieldClassName()}
          value={plan}
          onChange={(e) => setPlan(e.target.value as SubscriptionPlan)}
        >
          {PLANS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </td>
      <td className="px-4 py-3">
        <select
          className={fieldClassName()}
          value={status}
          onChange={(e) => setStatus(e.target.value as SubscriptionStatus)}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </td>
      <td className="px-4 py-3 text-slate-600">
        {tenant._count.shops} shops · {tenant._count.inventoryItems} items ·{' '}
        {tenant._count.rentals} rentals
      </td>
      <td className="px-4 py-3 text-right">
        <button
          type="button"
          className={primaryButtonClassName()}
          disabled={busy}
          onClick={() => onSave(plan, status)}
        >
          Save
        </button>
      </td>
    </tr>
  )
}
