import type { ReactNode } from 'react'

/** Shared frame for sign-in and registration: a dark statement panel beside the form. */
export default function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <div className="hidden flex-col justify-between bg-ink p-12 text-white lg:flex">
        <div className="flex items-center gap-2.5">
          <span aria-hidden className="grid h-8 w-8 place-items-center rounded bg-white/10">
            <span className="block h-3.5 w-3.5 rounded-sm bg-[#E5604D]" />
          </span>
          <span className="text-base font-semibold tracking-tight">IT Help Desk</span>
        </div>
        <div>
          <p className="max-w-md text-3xl font-semibold leading-snug tracking-tight">
            Tell us what broke. We will keep you posted until it is fixed.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-ink-muted">
            <li>Every ticket has one owner and a clear status.</li>
            <li>Replies, changes and fixes are recorded on the ticket itself.</li>
            <li>Urgent problems are flagged when they pass their response target.</li>
          </ul>
        </div>
        <p className="text-xs text-ink-muted">Incident management for your organisation.</p>
      </div>
      <div className="flex min-h-screen items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mb-6 mt-1 text-sm text-subtle">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  )
}
