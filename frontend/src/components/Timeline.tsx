import { useQuery } from '@tanstack/react-query'
import { ticketsApi } from '../api/endpoints'
import { errorMessage } from '../api/client'
import { ErrorNotice, Skeleton } from './ui'
import { formatDateTime } from '../utils/format'
import { PRIORITY_LABEL, STATUS_LABEL, type Priority, type TicketHistoryEntry, type TicketStatus } from '../types'

function describe(h: TicketHistoryEntry): string {
  const who = h.changedBy.fullName
  const status = (v: string | null) => (v ? STATUS_LABEL[v as TicketStatus] ?? v : '')
  const priority = (v: string | null) => (v ? PRIORITY_LABEL[v as Priority] ?? v : '')
  switch (h.field) {
    case 'created':
      return `${who} created the ticket`
    case 'status':
      return `${who} changed the status from ${status(h.oldValue)} to ${status(h.newValue)}`
    case 'priority':
      return `${who} changed the priority from ${priority(h.oldValue)} to ${priority(h.newValue)}`
    case 'assignee':
      if (!h.newValue) return `${who} unassigned the ticket (was ${h.oldValue})`
      if (!h.oldValue) return `${who} assigned the ticket to ${h.newValue}`
      return `${who} reassigned the ticket from ${h.oldValue} to ${h.newValue}`
    case 'category':
      return `${who} changed the category from ${h.oldValue ?? 'none'} to ${h.newValue ?? 'none'}`
    case 'title':
      return `${who} changed the title`
    case 'description':
      return `${who} edited the description`
    case 'resolutionNotes':
      return `${who} recorded the resolution notes`
    default:
      return `${who} updated ${h.field}`
  }
}

export default function Timeline({ ticketId }: { ticketId: number }) {
  const history = useQuery({
    queryKey: ['history', ticketId],
    queryFn: () => ticketsApi.history(ticketId),
    refetchInterval: 20_000,
  })

  if (history.isLoading) return <Skeleton className="h-24 w-full" />
  if (history.isError) return <ErrorNotice message={errorMessage(history.error)} onRetry={() => history.refetch()} />
  if (!history.data?.length) return <p className="text-sm text-subtle">No activity recorded.</p>

  return (
    <ol className="relative ml-1.5 border-l border-rule">
      {history.data.map((h) => (
        <li key={h.id} className="relative pb-4 pl-5 last:pb-0">
          <span aria-hidden className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-subtle ring-1 ring-rule" />
          <p className="text-sm">{describe(h)}</p>
          <time className="text-xs text-subtle" dateTime={h.changedAt}>
            {formatDateTime(h.changedAt)}
          </time>
        </li>
      ))}
    </ol>
  )
}
