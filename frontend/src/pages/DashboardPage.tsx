import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Plus } from 'lucide-react'
import { reportsApi, ticketsApi } from '../api/endpoints'
import { errorMessage } from '../api/client'
import { useAuth } from '../contexts/AuthContext'
import { Button, EmptyState, ErrorNotice, PageHeader, Panel, Skeleton } from '../components/ui'
import { TicketRow, TicketRowsSkeleton } from '../components/TicketRow'
import { formatHours, cn } from '../utils/format'

interface Stat {
  label: string
  value: string | number
  to?: string
  tone?: 'normal' | 'alert'
}

function StatStrip({ stats, loading }: { stats: Stat[]; loading: boolean }) {
  return (
    <dl className="mb-6 grid grid-cols-2 divide-rule overflow-hidden rounded-lg border border-rule bg-white sm:grid-cols-4 sm:divide-x lg:grid-cols-8 [&>*]:border-b [&>*]:border-rule sm:[&>*]:border-b-0">
      {stats.map((s) => {
        const inner = (
          <>
            <dt className="text-xs text-subtle">{s.label}</dt>
            <dd className={cn('mt-1 text-2xl font-semibold tabular-nums', s.tone === 'alert' && Number(s.value) > 0 ? 'text-crit' : 'text-ink')}>
              {loading ? <Skeleton className="mt-1 h-6 w-10" /> : s.value}
            </dd>
          </>
        )
        return s.to ? (
          <Link key={s.label} to={s.to} className="block px-4 py-3 transition-colors hover:bg-paper/70">
            {inner}
          </Link>
        ) : (
          <div key={s.label} className="px-4 py-3">
            {inner}
          </div>
        )
      })}
    </dl>
  )
}

export default function DashboardPage() {
  const { user, isStaff } = useAuth()
  return isStaff ? <StaffDashboard name={user!.fullName} /> : <RequesterDashboard name={user!.fullName} />
}

function firstName(name: string) {
  return name.split(' ')[0]
}

function StaffDashboard({ name }: { name: string }) {
  const summary = useQuery({ queryKey: ['summary'], queryFn: reportsApi.summary, refetchInterval: 30_000 })
  const waiting = useQuery({
    queryKey: ['tickets', 'dashboard', 'unassigned'],
    queryFn: () => ticketsApi.list('all', { status: 'OPEN', unassigned: true, sort: 'createdAt,asc', size: 6 }),
    refetchInterval: 30_000,
  })
  const recent = useQuery({
    queryKey: ['tickets', 'dashboard', 'recent'],
    queryFn: () => ticketsApi.list('all', { sort: 'updatedAt,desc', size: 6 }),
    refetchInterval: 30_000,
  })
  const byCategory = useQuery({ queryKey: ['reports', 'category'], queryFn: reportsApi.byCategory })

  const s = summary.data
  const stats: Stat[] = [
    { label: 'Open', value: s?.open ?? 0, to: '/tickets?status=OPEN' },
    { label: 'In progress', value: s?.inProgress ?? 0, to: '/tickets?status=IN_PROGRESS' },
    { label: 'Waiting for user', value: s?.waitingForUser ?? 0, to: '/tickets?status=WAITING_FOR_USER' },
    { label: 'Unassigned', value: s?.unassignedActive ?? 0, to: '/tickets?status=OPEN&unassigned=true' },
    { label: 'Critical', value: s?.criticalActive ?? 0, to: '/tickets?priority=CRITICAL', tone: 'alert' },
    { label: 'Past target', value: s?.slaBreachedActive ?? 0, tone: 'alert' },
    { label: 'Assigned to me', value: s?.myAssignedActive ?? 0, to: '/assigned-tickets' },
    { label: 'Avg. resolution', value: formatHours(s?.averageResolutionHours) },
  ]

  return (
    <>
      <PageHeader
        title={`Hello, ${firstName(name)}`}
        subtitle={s ? `${s.createdLast7Days} tickets raised and ${s.resolvedLast7Days} resolved in the last 7 days.` : undefined}
        actions={
          <Link to="/tickets/new">
            <Button variant="primary">
              <Plus className="h-4 w-4" aria-hidden />
              New ticket
            </Button>
          </Link>
        }
      />
      {summary.isError && <div className="mb-4"><ErrorNotice message={errorMessage(summary.error)} onRetry={() => summary.refetch()} /></div>}
      <StatStrip stats={stats} loading={summary.isLoading} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          <Panel title="Waiting to be picked up" bodyClassName="p-0" actions={<Link to="/tickets?status=OPEN&unassigned=true" className="text-sm text-accent hover:underline">View all</Link>}>
            {waiting.isLoading ? (
              <TicketRowsSkeleton rows={3} />
            ) : waiting.data && waiting.data.content.length > 0 ? (
              waiting.data.content.map((t) => <TicketRow key={t.id} ticket={t} showRequester />)
            ) : (
              <EmptyState title="The queue is clear" body="Every open ticket has someone working on it." />
            )}
          </Panel>

          <Panel title="Recently updated" bodyClassName="p-0" actions={<Link to="/tickets?sort=updatedAt,desc" className="text-sm text-accent hover:underline">View all</Link>}>
            {recent.isLoading ? (
              <TicketRowsSkeleton rows={4} />
            ) : recent.data && recent.data.content.length > 0 ? (
              recent.data.content.map((t) => <TicketRow key={t.id} ticket={t} showRequester />)
            ) : (
              <EmptyState title="No tickets yet" />
            )}
          </Panel>
        </div>

        <Panel title="Tickets by category">
          {byCategory.isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : byCategory.data && byCategory.data.length > 0 ? (
            <div className="h-64" role="img" aria-label="Bar chart of tickets per category">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byCategory.data} layout="vertical" margin={{ left: 0, right: 12 }}>
                  <XAxis type="number" allowDecimals={false} hide />
                  <YAxis type="category" dataKey="label" width={118} tick={{ fontSize: 12, fill: '#5B6B7A' }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: '#EEF1F4' }} formatter={(v: number) => [v, 'Tickets']} />
                  <Bar dataKey="count" radius={[0, 3, 3, 0]} barSize={14}>
                    {byCategory.data.map((_, i) => (
                      <Cell key={i} fill="#0E5A8A" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState title="Nothing to chart yet" />
          )}
        </Panel>
      </div>
    </>
  )
}

function RequesterDashboard({ name }: { name: string }) {
  const summary = useQuery({ queryKey: ['summary', 'mine'], queryFn: ticketsApi.mySummary, refetchInterval: 30_000 })
  const recent = useQuery({
    queryKey: ['tickets', 'dashboard', 'mine'],
    queryFn: () => ticketsApi.list('mine', { sort: 'updatedAt,desc', size: 6 }),
    refetchInterval: 30_000,
  })
  const s = summary.data
  const stats: Stat[] = [
    { label: 'Open', value: s?.open ?? 0, to: '/my-tickets?status=OPEN' },
    { label: 'In progress', value: s?.inProgress ?? 0, to: '/my-tickets?status=IN_PROGRESS' },
    { label: 'Waiting for your reply', value: s?.waitingForUser ?? 0, to: '/my-tickets?status=WAITING_FOR_USER' },
    { label: 'Fixed, awaiting your check', value: s?.resolved ?? 0, to: '/my-tickets?status=RESOLVED' },
  ]
  const needsYou = (s?.waitingForUser ?? 0) + (s?.resolved ?? 0)

  return (
    <>
      <PageHeader
        title={`Hello, ${firstName(name)}`}
        subtitle={needsYou > 0 ? `${needsYou} of your tickets need a response from you.` : 'Nothing needs your attention right now.'}
        actions={
          <Link to="/tickets/new">
            <Button variant="primary">
              <Plus className="h-4 w-4" aria-hidden />
              Report a problem
            </Button>
          </Link>
        }
      />
      {summary.isError && <div className="mb-4"><ErrorNotice message={errorMessage(summary.error)} onRetry={() => summary.refetch()} /></div>}
      <div className="[&_dl]:lg:grid-cols-4">
        <StatStrip stats={stats} loading={summary.isLoading} />
      </div>
      <Panel title="Your recent tickets" bodyClassName="p-0" actions={<Link to="/my-tickets" className="text-sm text-accent hover:underline">View all</Link>}>
        {recent.isLoading ? (
          <TicketRowsSkeleton rows={4} />
        ) : recent.data && recent.data.content.length > 0 ? (
          recent.data.content.map((t) => <TicketRow key={t.id} ticket={t} showRequester={false} />)
        ) : (
          <EmptyState
            title="You have not raised any tickets"
            body="Describe what is wrong and the support team will pick it up."
            action={
              <Link to="/tickets/new">
                <Button variant="primary">Report a problem</Button>
              </Link>
            }
          />
        )}
      </Panel>
    </>
  )
}
