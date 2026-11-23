import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { AlertTriangle, ArrowLeft } from 'lucide-react'
import axios from 'axios'
import { ticketsApi } from '../api/endpoints'
import { errorMessage } from '../api/client'
import { useAuth } from '../contexts/AuthContext'
import { EmptyState, ErrorNotice, Panel, Select, Skeleton } from '../components/ui'
import { PriorityBadge, StatusBadge } from '../components/badges'
import CommentThread from '../components/CommentThread'
import AttachmentList from '../components/AttachmentList'
import Timeline from '../components/Timeline'
import TicketActions from '../components/TicketActions'
import { formatDateTime, formatDuration } from '../utils/format'
import { PRIORITIES, PRIORITY_LABEL, type Priority } from '../types'

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 text-sm">
      <dt className="shrink-0 text-subtle">{label}</dt>
      <dd className="min-w-0 text-right">{children}</dd>
    </div>
  )
}

export default function TicketDetailPage() {
  const { id } = useParams()
  const ticketId = Number(id)
  const { isStaff, isAdmin, user } = useAuth()
  const queryClient = useQueryClient()

  const ticket = useQuery({
    queryKey: ['ticket', ticketId],
    queryFn: () => ticketsApi.get(ticketId),
    enabled: Number.isFinite(ticketId),
    refetchInterval: 15_000,
    retry: (count, err) => !(axios.isAxiosError(err) && err.response?.status === 404) && count < 2,
  })

  const priority = useMutation({
    mutationFn: (p: Priority) => ticketsApi.setPriority(ticketId, p),
    onSuccess: () => {
      toast.success('Priority updated')
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] })
      queryClient.invalidateQueries({ queryKey: ['history', ticketId] })
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  if (ticket.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }
  if (ticket.isError) {
    const notFound = axios.isAxiosError(ticket.error) && ticket.error.response?.status === 404
    return notFound ? (
      <EmptyState
        title="Ticket not found"
        body="It may have been removed, or you may not have access to it."
        action={<Link to="/my-tickets" className="text-sm font-medium text-accent hover:underline">Back to my tickets</Link>}
      />
    ) : (
      <ErrorNotice message={errorMessage(ticket.error)} onRetry={() => ticket.refetch()} />
    )
  }

  const t = ticket.data!
  const locked = t.status === 'CLOSED' || t.status === 'CANCELLED'
  const canChangePriority = isStaff && !locked && (isAdmin || !t.assignee || t.assignee.id === user?.id)
  const backTo = isStaff ? '/tickets' : '/my-tickets'

  return (
    <>
      <Link to={backTo} className="mb-4 inline-flex items-center gap-1.5 text-sm text-subtle hover:text-ink">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back to tickets
      </Link>

      <header className="mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-mono text-sm text-subtle">#{t.id}</span>
          <StatusBadge status={t.status} />
          <PriorityBadge priority={t.priority} />
          {t.slaBreached && (
            <span className="inline-flex items-center gap-1 rounded bg-red-50 px-1.5 py-0.5 text-xs font-medium text-crit">
              <AlertTriangle className="h-3 w-3" aria-hidden />
              Past response target
            </span>
          )}
        </div>
        <h1 className="mt-2 break-words text-2xl font-semibold tracking-tight">{t.title}</h1>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="space-y-6">
          <Panel title="Description">
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{t.description}</p>
          </Panel>

          {t.resolutionNotes && (t.status === 'RESOLVED' || t.status === 'CLOSED') && (
            <section className="rounded-lg border border-l-4 border-rule border-l-good bg-white p-4">
              <h2 className="text-sm font-semibold text-good">Resolution</h2>
              <p className="mt-1.5 whitespace-pre-wrap break-words text-sm">{t.resolutionNotes}</p>
              {t.resolvedAt && <p className="mt-2 text-xs text-subtle">Resolved on {formatDateTime(t.resolvedAt)}</p>}
            </section>
          )}

          <Panel title="Conversation">
            <CommentThread ticketId={t.id} locked={locked} />
          </Panel>

          <Panel title="Attachments">
            <AttachmentList ticketId={t.id} locked={locked} />
          </Panel>

          <Panel title="Activity">
            <Timeline ticketId={t.id} />
          </Panel>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          <Panel title="Actions">
            <TicketActions ticket={t} />
          </Panel>

          <Panel title="Details" bodyClassName="py-2">
            <dl className="divide-y divide-rule">
              <Row label="Priority">
                {canChangePriority ? (
                  <Select
                    aria-label="Change priority"
                    value={t.priority}
                    disabled={priority.isPending}
                    onChange={(e) => priority.mutate(e.target.value as Priority)}
                    className="py-1 text-xs"
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {PRIORITY_LABEL[p]}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <PriorityBadge priority={t.priority} />
                )}
              </Row>
              <Row label="Category">{t.category?.name ?? <span className="text-subtle">None</span>}</Row>
              <Row label="Requester">{t.requester.fullName}</Row>
              <Row label="Assigned to">{t.assignee?.fullName ?? <span className="italic text-subtle">Unassigned</span>}</Row>
              <Row label="Created">{formatDateTime(t.createdAt)}</Row>
              <Row label="Last update">{formatDateTime(t.updatedAt)}</Row>
              <Row label="Target">
                <span className={t.slaBreached ? 'font-medium text-crit' : undefined}>{formatDateTime(t.slaDueAt)}</span>
              </Row>
              {t.resolvedAt && <Row label="Resolved">{formatDateTime(t.resolvedAt)}</Row>}
              {t.resolutionMinutes != null && <Row label="Time to resolve">{formatDuration(t.resolutionMinutes)}</Row>}
            </dl>
          </Panel>
        </aside>
      </div>
    </>
  )
}
