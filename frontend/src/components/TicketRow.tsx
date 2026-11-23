import { Link } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import type { Ticket } from '../types'
import { PriorityBadge, StatusBadge, priorityEdge } from './badges'
import { cn, timeAgo } from '../utils/format'

export const TICKET_GRID = 'md:grid md:grid-cols-[4.25rem_minmax(0,1fr)_9.5rem_8.5rem_6.5rem] md:items-center md:gap-4'

export function TicketRowHeader({ showRequester }: { showRequester: boolean }) {
  return (
    <div className={cn('hidden border-b border-rule bg-paper/60 px-4 py-2 text-xs font-medium text-subtle', TICKET_GRID)}>
      <span>Ticket</span>
      <span>{showRequester ? 'Subject and requester' : 'Subject'}</span>
      <span>Status</span>
      <span>Assigned to</span>
      <span className="text-right">Updated</span>
    </div>
  )
}

export function TicketRow({ ticket, showRequester }: { ticket: Ticket; showRequester: boolean }) {
  return (
    <Link
      to={`/tickets/${ticket.id}`}
      className={cn(
        'block border-b border-l-4 border-b-rule px-4 py-3 transition-colors last:border-b-0 hover:bg-paper/70',
        priorityEdge[ticket.priority],
        TICKET_GRID,
      )}
    >
      <span className="flex items-center justify-between font-mono text-xs text-subtle md:block">
        <span>#{ticket.id}</span>
        <span className="md:hidden">
          <StatusBadge status={ticket.status} />
        </span>
      </span>

      <span className="mt-1 block min-w-0 md:mt-0">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-ink">{ticket.title}</span>
          {ticket.slaBreached && (
            <span title="Past its response target" className="inline-flex shrink-0 items-center gap-1 rounded bg-red-50 px-1.5 py-0.5 text-[11px] font-medium text-crit">
              <AlertTriangle className="h-3 w-3" aria-hidden />
              Overdue
            </span>
          )}
        </span>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-subtle">
          <PriorityBadge priority={ticket.priority} />
          {ticket.category && <span>{ticket.category.name}</span>}
          {showRequester && <span>From {ticket.requester.fullName}</span>}
        </span>
      </span>

      <span className="hidden md:block">
        <StatusBadge status={ticket.status} />
      </span>

      <span className="mt-1 block truncate text-xs text-subtle md:mt-0 md:text-sm">
        {ticket.assignee ? ticket.assignee.fullName : <span className="italic">Unassigned</span>}
      </span>

      <span className="mt-0.5 block text-xs text-subtle md:mt-0 md:text-right" title={new Date(ticket.updatedAt).toLocaleString()}>
        {timeAgo(ticket.updatedAt)}
      </span>
    </Link>
  )
}

export function TicketRowsSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 border-b border-l-4 border-b-rule border-l-rule px-4 py-4 last:border-b-0">
          <div className="h-3 w-10 animate-pulse rounded bg-rule/70" />
          <div className="h-3 flex-1 animate-pulse rounded bg-rule/70" />
          <div className="hidden h-5 w-24 animate-pulse rounded bg-rule/70 md:block" />
        </div>
      ))}
    </div>
  )
}
