import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { shopsService } from '@/services/shops.service'
import { categoriesService } from '@/services/categories.service'
import { tenantsService } from '@/services/tenants.service'
import { notificationsService } from '@/services/notifications.service'
import { useActiveShop } from '@/hooks/useActiveShop'
import { getErrorMessage } from '@/utils/error'
import {
  EmptyState,
  ErrorState,
  LoadingState,
  fieldClassName,
  labelClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
} from '@/components/ui'

const shopSchema = z.object({
  name: z.string().min(1, 'Shop name is required').max(120),
  logo: z.string().max(500).optional(),
  ownerName: z.string().max(120).optional(),
  phone: z.string().max(20).optional(),
  whatsapp: z.string().max(20).optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  address: z.string().max(500).optional(),
  city: z.string().max(80).optional(),
  state: z.string().max(80).optional(),
  pincode: z.string().max(20).optional(),
  gstNumber: z.string().max(30).optional(),
  businessHoursText: z.string().max(2000).optional(),
  rentalTerms: z.string().max(5000).optional(),
  defaultDeposit: z.string().optional(),
  defaultLateCharge: z.string().optional(),
})

type ShopFormValues = z.infer<typeof shopSchema>

const categorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(120),
  description: z.string().max(500).optional(),
  parentId: z.string().optional(),
  sortOrder: z.string().optional(),
})

type CategoryFormValues = z.infer<typeof categorySchema>

function parseHours(text?: string): Record<string, unknown> | undefined {
  if (!text?.trim()) return undefined
  try {
    const parsed = JSON.parse(text) as unknown
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>
    }
  } catch {
    return { note: text.trim() }
  }
  return { note: text.trim() }
}

export function SettingsPage() {
  const queryClient = useQueryClient()
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [shopMessage, setShopMessage] = useState<string | null>(null)
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null)
  const [newBranchName, setNewBranchName] = useState('')
  const { setActiveShopId } = useActiveShop()

  const shopsQuery = useQuery({
    queryKey: ['shops'],
    queryFn: async () => (await shopsService.list()).data,
  })

  const tenantQuery = useQuery({
    queryKey: ['tenants', 'me'],
    queryFn: async () => (await tenantsService.me()).data,
  })

  const shops = shopsQuery.data ?? []
  const shop =
    shops.find((s) => s.id === selectedShopId) ?? shops[0] ?? undefined

  const categoriesQuery = useQuery({
    queryKey: ['categories', 'all'],
    queryFn: async () => (await categoriesService.list({ includeInactive: true })).data,
  })

  const shopForm = useForm<ShopFormValues>({
    resolver: zodResolver(shopSchema),
    defaultValues: {
      name: '',
      logo: '',
      ownerName: '',
      phone: '',
      whatsapp: '',
      email: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      gstNumber: '',
      businessHoursText: '',
      rentalTerms: '',
      defaultDeposit: '',
      defaultLateCharge: '',
    },
  })

  const categoryForm = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
      description: '',
      parentId: '',
      sortOrder: '0',
    },
  })

  useEffect(() => {
    if (shops.length && !selectedShopId) {
      setSelectedShopId(shops[0].id)
    }
  }, [shops, selectedShopId])

  useEffect(() => {
    if (!shop) return
    shopForm.reset({
      name: shop.name,
      logo: shop.logo ?? '',
      ownerName: shop.ownerName ?? '',
      phone: shop.phone ?? '',
      whatsapp: shop.whatsapp ?? '',
      email: shop.email ?? '',
      address: shop.address ?? '',
      city: shop.city ?? '',
      state: shop.state ?? '',
      pincode: shop.pincode ?? '',
      gstNumber: shop.gstNumber ?? '',
      businessHoursText: shop.businessHours
        ? JSON.stringify(shop.businessHours, null, 2)
        : '',
      rentalTerms: shop.rentalTerms ?? '',
      defaultDeposit: shop.defaultDeposit ?? '',
      defaultLateCharge: shop.defaultLateCharge ?? '',
    })
  }, [shop, shopForm])

  const createBranchMutation = useMutation({
    mutationFn: async (name: string) =>
      (await shopsService.create({ name })).data,
    onSuccess: async (created) => {
      setNewBranchName('')
      setSelectedShopId(created.id)
      setActiveShopId(created.id)
      setShopMessage('Branch created.')
      await queryClient.invalidateQueries({ queryKey: ['shops'] })
    },
  })

  const runRemindersMutation = useMutation({
    mutationFn: async () => (await notificationsService.runReminders()).data,
  })

  const saveShopMutation = useMutation({
    mutationFn: async (values: ShopFormValues) => {
      if (!shop) throw new Error('No shop found')
      return (
        await shopsService.update(shop.id, {
          name: values.name,
          logo: values.logo || undefined,
          ownerName: values.ownerName || undefined,
          phone: values.phone || undefined,
          whatsapp: values.whatsapp || undefined,
          email: values.email || undefined,
          address: values.address || undefined,
          city: values.city || undefined,
          state: values.state || undefined,
          pincode: values.pincode || undefined,
          gstNumber: values.gstNumber || undefined,
          businessHours: parseHours(values.businessHoursText),
          rentalTerms: values.rentalTerms || undefined,
          defaultDeposit: values.defaultDeposit
            ? Number(values.defaultDeposit)
            : undefined,
          defaultLateCharge: values.defaultLateCharge
            ? Number(values.defaultLateCharge)
            : undefined,
        })
      ).data
    },
    onSuccess: async () => {
      setShopMessage('Shop settings saved.')
      await queryClient.invalidateQueries({ queryKey: ['shops'] })
    },
  })

  const saveCategoryMutation = useMutation({
    mutationFn: async (values: CategoryFormValues) => {
      const payload = {
        name: values.name,
        description: values.description || undefined,
        parentId: values.parentId || undefined,
        sortOrder: values.sortOrder ? Number(values.sortOrder) : 0,
      }
      if (editingCategoryId) {
        return (await categoriesService.update(editingCategoryId, payload)).data
      }
      return (await categoriesService.create(payload)).data
    },
    onSuccess: async () => {
      setEditingCategoryId(null)
      categoryForm.reset({ name: '', description: '', parentId: '', sortOrder: '0' })
      await queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
  })

  const toggleCategoryMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      if (isActive) {
        return (await categoriesService.update(id, { isActive: true })).data
      }
      return (await categoriesService.remove(id, false)).data
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
  })

  const categories = categoriesQuery.data ?? []
  const rootCategories = categories.filter((c) => !c.parentId)
  const tenant = tenantQuery.data

  return (
    <section className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-600">
          Plan, branches, shop profile, rental defaults, and categories.
        </p>
      </div>

      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-medium text-slate-900">Subscription</h2>
        {tenantQuery.isLoading ? <LoadingState message="Loading plan…" /> : null}
        {tenant ? (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <p className="text-xs uppercase text-slate-500">Plan</p>
                <p className="mt-1 font-semibold text-slate-900">{tenant.plan}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-500">Status</p>
                <p className="mt-1 font-semibold text-slate-900">{tenant.subscriptionStatus}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-500">Trial ends</p>
                <p className="mt-1 text-slate-800">
                  {tenant.trialEndsAt ? tenant.trialEndsAt.slice(0, 10) : '—'}
                </p>
              </div>
            </div>
            <p className="text-sm text-slate-600">
              Inventory: {tenant.usage.inventoryCount} / soft limit{' '}
              {tenant.usage.freeInventorySoftLimit} (FREE) · Branches:{' '}
              {tenant.usage.shopCount}
            </p>
            {tenant.freeLimitWarning ? (
              <p className="text-sm text-amber-700">{tenant.freeLimitWarning}</p>
            ) : null}
            <p className="text-xs text-slate-500">
              Payment gateway not connected yet — plan changes are assigned by SUPER_ADMIN.
            </p>
          </>
        ) : null}
      </div>

      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-medium text-slate-900">Branches</h2>
        <p className="text-sm text-slate-600">
          Add a second shop/branch. Use the header switcher to set the active branch.
        </p>
        {shops.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {shops.map((s) => (
              <button
                key={s.id}
                type="button"
                className={
                  shop?.id === s.id
                    ? 'rounded-lg bg-teal-700 px-3 py-1.5 text-sm text-white'
                    : 'rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700'
                }
                onClick={() => {
                  setSelectedShopId(s.id)
                  setActiveShopId(s.id)
                }}
              >
                {s.name}
              </button>
            ))}
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <input
            className={fieldClassName() + ' max-w-xs'}
            placeholder="New branch name"
            value={newBranchName}
            onChange={(e) => setNewBranchName(e.target.value)}
          />
          <button
            type="button"
            className={primaryButtonClassName()}
            disabled={!newBranchName.trim() || createBranchMutation.isPending}
            onClick={() => createBranchMutation.mutate(newBranchName.trim())}
          >
            Add branch
          </button>
        </div>
        {createBranchMutation.isError ? (
          <p className="text-sm text-red-600">
            {getErrorMessage(createBranchMutation.error, 'Failed to create branch')}
          </p>
        ) : null}
      </div>

      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-medium text-slate-900">Notifications</h2>
        <p className="text-sm text-slate-600">
          Email reminders run daily at 08:00 when ENABLE_RENTAL_REMINDERS=true. WhatsApp uses
          wa.me share links only (Cloud API is future work).
        </p>
        <button
          type="button"
          className={secondaryButtonClassName()}
          disabled={runRemindersMutation.isPending}
          onClick={() => runRemindersMutation.mutate()}
        >
          {runRemindersMutation.isPending ? 'Sending…' : 'Run reminders now'}
        </button>
        {runRemindersMutation.isSuccess ? (
          <p className="text-sm text-teal-700">
            Sent {runRemindersMutation.data.sent} reminder(s)
            {runRemindersMutation.data.skipped ? ' (reminders disabled)' : ''}.
          </p>
        ) : null}
        {runRemindersMutation.isError ? (
          <p className="text-sm text-red-600">
            {getErrorMessage(runRemindersMutation.error, 'Failed to run reminders')}
          </p>
        ) : null}
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-medium text-slate-900">Shop profile</h2>
        {shopsQuery.isLoading ? <LoadingState message="Loading shop…" /> : null}
        {shopsQuery.isError ? (
          <ErrorState message={getErrorMessage(shopsQuery.error, 'Failed to load shop')} />
        ) : null}
        {!shopsQuery.isLoading && !shop ? (
          <EmptyState title="No shop found" message="Register again or contact support." />
        ) : null}

        {shop ? (
          <form
            className="space-y-4 rounded-xl border border-slate-200 bg-white p-5"
            onSubmit={shopForm.handleSubmit((values) => saveShopMutation.mutateAsync(values))}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className={labelClassName()}>Shop name</span>
                <input className={fieldClassName()} {...shopForm.register('name')} />
              </label>
              <label className="block sm:col-span-2">
                <span className={labelClassName()}>Logo URL</span>
                <input
                  className={fieldClassName()}
                  placeholder="https://…"
                  {...shopForm.register('logo')}
                />
              </label>
              <label className="block">
                <span className={labelClassName()}>Owner name</span>
                <input className={fieldClassName()} {...shopForm.register('ownerName')} />
              </label>
              <label className="block">
                <span className={labelClassName()}>GST number</span>
                <input className={fieldClassName()} {...shopForm.register('gstNumber')} />
              </label>
              <label className="block">
                <span className={labelClassName()}>Phone</span>
                <input className={fieldClassName()} {...shopForm.register('phone')} />
              </label>
              <label className="block">
                <span className={labelClassName()}>WhatsApp</span>
                <input className={fieldClassName()} {...shopForm.register('whatsapp')} />
              </label>
              <label className="block sm:col-span-2">
                <span className={labelClassName()}>Email</span>
                <input type="email" className={fieldClassName()} {...shopForm.register('email')} />
              </label>
              <label className="block sm:col-span-2">
                <span className={labelClassName()}>Address</span>
                <textarea className={fieldClassName()} rows={2} {...shopForm.register('address')} />
              </label>
              <label className="block">
                <span className={labelClassName()}>City</span>
                <input className={fieldClassName()} {...shopForm.register('city')} />
              </label>
              <label className="block">
                <span className={labelClassName()}>State</span>
                <input className={fieldClassName()} {...shopForm.register('state')} />
              </label>
              <label className="block">
                <span className={labelClassName()}>Pincode</span>
                <input className={fieldClassName()} {...shopForm.register('pincode')} />
              </label>
              <label className="block">
                <span className={labelClassName()}>Default deposit</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className={fieldClassName()}
                  {...shopForm.register('defaultDeposit')}
                />
              </label>
              <label className="block">
                <span className={labelClassName()}>Default late charge</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className={fieldClassName()}
                  {...shopForm.register('defaultLateCharge')}
                />
              </label>
              <label className="block sm:col-span-2">
                <span className={labelClassName()}>Business hours (JSON or free text)</span>
                <textarea
                  className={fieldClassName()}
                  rows={3}
                  placeholder='{"mon":"10:00-20:00"}'
                  {...shopForm.register('businessHoursText')}
                />
              </label>
              <label className="block sm:col-span-2">
                <span className={labelClassName()}>Rental terms</span>
                <textarea
                  className={fieldClassName()}
                  rows={4}
                  {...shopForm.register('rentalTerms')}
                />
              </label>
            </div>

            {saveShopMutation.isError ? (
              <p className="text-sm text-red-600">
                {getErrorMessage(saveShopMutation.error, 'Failed to save shop')}
              </p>
            ) : null}
            {shopMessage ? <p className="text-sm text-teal-700">{shopMessage}</p> : null}

            <button
              type="submit"
              className={primaryButtonClassName()}
              disabled={saveShopMutation.isPending}
            >
              {saveShopMutation.isPending ? 'Saving…' : 'Save shop settings'}
            </button>
          </form>
        ) : null}
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-medium text-slate-900">Categories</h2>

        <form
          className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-5"
          onSubmit={categoryForm.handleSubmit((values) =>
            saveCategoryMutation.mutateAsync(values),
          )}
        >
          <input
            className={fieldClassName()}
            placeholder="Category name"
            {...categoryForm.register('name')}
          />
          <input
            className={fieldClassName()}
            placeholder="Description"
            {...categoryForm.register('description')}
          />
          <select className={fieldClassName()} {...categoryForm.register('parentId')}>
            <option value="">No parent (root)</option>
            {rootCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            className={fieldClassName()}
            type="number"
            min={0}
            placeholder="Sort order"
            {...categoryForm.register('sortOrder')}
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className={primaryButtonClassName()}
              disabled={saveCategoryMutation.isPending}
            >
              {editingCategoryId ? 'Update' : 'Add'}
            </button>
            {editingCategoryId ? (
              <button
                type="button"
                className={secondaryButtonClassName()}
                onClick={() => {
                  setEditingCategoryId(null)
                  categoryForm.reset({
                    name: '',
                    description: '',
                    parentId: '',
                    sortOrder: '0',
                  })
                }}
              >
                Cancel
              </button>
            ) : null}
          </div>
          {saveCategoryMutation.isError ? (
            <p className="text-sm text-red-600 sm:col-span-2 lg:col-span-5">
              {getErrorMessage(saveCategoryMutation.error, 'Failed to save category')}
            </p>
          ) : null}
        </form>

        {categoriesQuery.isLoading ? <LoadingState message="Loading categories…" /> : null}
        {categoriesQuery.isError ? (
          <ErrorState
            message={getErrorMessage(categoriesQuery.error, 'Failed to load categories')}
          />
        ) : null}
        {!categoriesQuery.isLoading && categories.length === 0 ? (
          <EmptyState
            title="No categories"
            message="Create categories like Saree, Sherwani, or Lehenga to organize inventory."
          />
        ) : null}

        {categories.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Parent</th>
                  <th className="px-4 py-3 font-medium">Items</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
                  <tr key={category.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 text-slate-900">{category.name}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {category.parent?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {category._count?.items ?? 0}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          category.isActive
                            ? 'rounded-md bg-teal-50 px-2 py-1 text-xs text-teal-800'
                            : 'rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600'
                        }
                      >
                        {category.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-3">
                      <button
                        type="button"
                        className="text-teal-700 hover:underline"
                        onClick={() => {
                          setEditingCategoryId(category.id)
                          categoryForm.reset({
                            name: category.name,
                            description: category.description ?? '',
                            parentId: category.parentId ?? '',
                            sortOrder: String(category.sortOrder ?? 0),
                          })
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="text-slate-600 hover:underline"
                        onClick={() =>
                          toggleCategoryMutation.mutate({
                            id: category.id,
                            isActive: !category.isActive,
                          })
                        }
                      >
                        {category.isActive ? 'Disable' : 'Enable'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </section>
  )
}
