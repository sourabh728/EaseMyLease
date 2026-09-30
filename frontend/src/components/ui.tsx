interface PageStateProps {
  title?: string
  message: string
}

export function LoadingState({ message = 'Loading…' }: { message?: string }) {
  return <p className="text-sm text-slate-500">{message}</p>
}

export function EmptyState({ title = 'Nothing here yet', message }: PageStateProps) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white/70 px-6 py-10 text-center">
      <h2 className="font-medium text-slate-900">{title}</h2>
      <p className="mt-2 text-sm text-slate-600">{message}</p>
    </div>
  )
}

export function ErrorState({ title = 'Something went wrong', message }: PageStateProps) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      <p className="font-medium">{title}</p>
      <p className="mt-1">{message}</p>
    </div>
  )
}

export function fieldClassName() {
  return 'w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-teal-600'
}

export function labelClassName() {
  return 'mb-1 block text-sm text-slate-700'
}

export function primaryButtonClassName() {
  return 'rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-60'
}

export function secondaryButtonClassName() {
  return 'rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50'
}
