import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="grid min-h-screen place-items-center px-6 text-center">
      <div>
        <p className="font-mono text-sm text-subtle">404</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">That page does not exist</h1>
        <p className="mt-2 text-sm text-subtle">The link may be out of date, or the page may have moved.</p>
        <Link to="/dashboard" className="mt-5 inline-block rounded bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-dark">
          Go to the dashboard
        </Link>
      </div>
    </div>
  )
}
