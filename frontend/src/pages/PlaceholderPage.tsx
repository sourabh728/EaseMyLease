import { Link } from 'react-router-dom'

interface PlaceholderPageProps {
  title: string
  description: string
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <section>
      <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
      <p className="mt-2 max-w-2xl text-slate-600">{description}</p>
      <p className="mt-6 text-sm text-slate-500">
        Coming in a later phase.{' '}
        <Link to="/dashboard" className="text-teal-700 hover:underline">
          Back to dashboard
        </Link>
      </p>
    </section>
  )
}
