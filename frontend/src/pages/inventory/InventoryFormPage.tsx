import { useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { inventoryService } from '@/services/inventory.service'
import { categoriesService } from '@/services/categories.service'
import { INVENTORY_STATUSES } from '@/types/domain'
import { getErrorMessage } from '@/utils/error'
import {
  ErrorState,
  LoadingState,
  fieldClassName,
  labelClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
} from '@/components/ui'

const schema = z.object({
  categoryId: z.string().min(1, 'Category is required'),
  itemCode: z.string().min(1, 'Item code is required').max(60),
  name: z.string().min(1, 'Name is required').max(160),
  description: z.string().max(2000).optional(),
  size: z.string().max(40).optional(),
  color: z.string().max(40).optional(),
  brand: z.string().max(80).optional(),
  purchasePrice: z.string().optional(),
  rentalPrice: z.string().min(1, 'Rental price is required'),
  securityDeposit: z.string().optional(),
  condition: z.string().max(80).optional(),
  status: z.enum([
    'AVAILABLE',
    'RESERVED',
    'ON_RENT',
    'RETURNED',
    'UNDER_INSPECTION',
    'DAMAGED',
    'LOST',
    'UNDER_REPAIR',
    'RETIRED',
  ]),
  location: z.string().max(120).optional(),
  occasion: z.string().max(80).optional(),
  imageUrl: z.string().max(1000).optional(),
})

type FormValues = z.infer<typeof schema>

function toNumberOrUndefined(value?: string) {
  if (!value?.trim()) return undefined
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

export function InventoryFormPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: async () => (await categoriesService.list({ includeInactive: false })).data,
  })

  const itemQuery = useQuery({
    queryKey: ['inventory', id],
    enabled: isEdit,
    queryFn: async () => (await inventoryService.get(id!)).data,
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      status: 'AVAILABLE',
      categoryId: '',
      itemCode: '',
      name: '',
      description: '',
      size: '',
      color: '',
      brand: '',
      purchasePrice: '',
      rentalPrice: '',
      securityDeposit: '',
      condition: '',
      location: '',
      occasion: '',
      imageUrl: '',
    },
  })

  useEffect(() => {
    if (!itemQuery.data) return
    const item = itemQuery.data
    reset({
      categoryId: item.categoryId,
      itemCode: item.itemCode,
      name: item.name,
      description: item.description ?? '',
      size: item.size ?? '',
      color: item.color ?? '',
      brand: item.brand ?? '',
      purchasePrice: item.purchasePrice ?? '',
      rentalPrice: item.rentalPrice,
      securityDeposit: item.securityDeposit ?? '',
      condition: item.condition ?? '',
      status: item.status,
      location: item.location ?? '',
      occasion: item.occasion ?? '',
      imageUrl: item.images?.[0]?.url ?? '',
    })
  }, [itemQuery.data, reset])

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = {
        categoryId: values.categoryId,
        itemCode: values.itemCode,
        name: values.name,
        description: values.description || undefined,
        size: values.size || undefined,
        color: values.color || undefined,
        brand: values.brand || undefined,
        purchasePrice: toNumberOrUndefined(values.purchasePrice),
        rentalPrice: Number(values.rentalPrice),
        securityDeposit: toNumberOrUndefined(values.securityDeposit),
        condition: values.condition || undefined,
        status: values.status,
        location: values.location || undefined,
        occasion: values.occasion || undefined,
        images: values.imageUrl?.trim()
          ? [{ url: values.imageUrl.trim(), sortOrder: 0 }]
          : [],
      }

      if (isEdit && id) {
        return (await inventoryService.update(id, payload)).data
      }
      return (await inventoryService.create(payload)).data
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['inventory'] })
      navigate('/inventory')
    },
  })

  const retireMutation = useMutation({
    mutationFn: async () => {
      if (!id) return
      return (await inventoryService.remove(id)).data
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['inventory'] })
      navigate('/inventory')
    },
  })

  if (isEdit && itemQuery.isLoading) {
    return <LoadingState message="Loading item…" />
  }

  if (isEdit && itemQuery.isError) {
    return <ErrorState message={getErrorMessage(itemQuery.error, 'Failed to load item')} />
  }

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link to="/inventory" className="text-sm text-teal-700 hover:underline">
          ← Back to inventory
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">
          {isEdit ? 'Edit inventory item' : 'Add inventory item'}
        </h1>
      </div>

      <form
        className="space-y-4 rounded-xl border border-slate-200 bg-white p-5"
        onSubmit={handleSubmit((values) => saveMutation.mutateAsync(values))}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={labelClassName()}>Item code</span>
            <input className={fieldClassName()} {...register('itemCode')} />
            {errors.itemCode ? (
              <p className="mt-1 text-xs text-red-600">{errors.itemCode.message}</p>
            ) : null}
          </label>
          <label className="block">
            <span className={labelClassName()}>Category</span>
            <select className={fieldClassName()} {...register('categoryId')}>
              <option value="">Select category</option>
              {(categoriesQuery.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.parent ? `${c.parent.name} / ${c.name}` : c.name}
                </option>
              ))}
            </select>
            {errors.categoryId ? (
              <p className="mt-1 text-xs text-red-600">{errors.categoryId.message}</p>
            ) : null}
          </label>
          <label className="block sm:col-span-2">
            <span className={labelClassName()}>Name</span>
            <input className={fieldClassName()} {...register('name')} />
            {errors.name ? (
              <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>
            ) : null}
          </label>
          <label className="block sm:col-span-2">
            <span className={labelClassName()}>Description</span>
            <textarea className={fieldClassName()} rows={3} {...register('description')} />
          </label>
          <label className="block">
            <span className={labelClassName()}>Size</span>
            <input className={fieldClassName()} {...register('size')} />
          </label>
          <label className="block">
            <span className={labelClassName()}>Color</span>
            <input className={fieldClassName()} {...register('color')} />
          </label>
          <label className="block">
            <span className={labelClassName()}>Brand</span>
            <input className={fieldClassName()} {...register('brand')} />
          </label>
          <label className="block">
            <span className={labelClassName()}>Occasion</span>
            <input className={fieldClassName()} {...register('occasion')} />
          </label>
          <label className="block">
            <span className={labelClassName()}>Rental price</span>
            <input
              type="number"
              min={0}
              step="0.01"
              className={fieldClassName()}
              {...register('rentalPrice')}
            />
            {errors.rentalPrice ? (
              <p className="mt-1 text-xs text-red-600">{errors.rentalPrice.message}</p>
            ) : null}
          </label>
          <label className="block">
            <span className={labelClassName()}>Security deposit</span>
            <input
              type="number"
              min={0}
              step="0.01"
              className={fieldClassName()}
              {...register('securityDeposit')}
            />
          </label>
          <label className="block">
            <span className={labelClassName()}>Purchase price</span>
            <input
              type="number"
              min={0}
              step="0.01"
              className={fieldClassName()}
              {...register('purchasePrice')}
            />
          </label>
          <label className="block">
            <span className={labelClassName()}>Status</span>
            <select className={fieldClassName()} {...register('status')}>
              {INVENTORY_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replaceAll('_', ' ')}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={labelClassName()}>Condition</span>
            <input className={fieldClassName()} {...register('condition')} />
          </label>
          <label className="block">
            <span className={labelClassName()}>Location</span>
            <input className={fieldClassName()} {...register('location')} />
          </label>
          <label className="block sm:col-span-2">
            <span className={labelClassName()}>Image URL</span>
            <input
              className={fieldClassName()}
              placeholder="https://…"
              {...register('imageUrl')}
            />
          </label>
        </div>

        {saveMutation.isError ? (
          <p className="text-sm text-red-600">
            {getErrorMessage(saveMutation.error, 'Failed to save item')}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={isSubmitting || saveMutation.isPending}
            className={primaryButtonClassName()}
          >
            {saveMutation.isPending ? 'Saving…' : 'Save item'}
          </button>
          <Link to="/inventory" className={secondaryButtonClassName() + ' inline-flex no-underline'}>
            Cancel
          </Link>
          {isEdit ? (
            <button
              type="button"
              className="rounded-lg border border-red-300 px-4 py-2 text-sm text-red-700 hover:bg-red-50"
              disabled={retireMutation.isPending}
              onClick={() => {
                if (confirm('Retire this item? It will be marked as RETIRED.')) {
                  retireMutation.mutate()
                }
              }}
            >
              {retireMutation.isPending ? 'Retiring…' : 'Retire item'}
            </button>
          ) : null}
        </div>
      </form>
    </section>
  )
}
