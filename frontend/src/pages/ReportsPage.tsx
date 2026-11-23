import { useQuery } from '@tanstack/react-query'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { reportsApi } from '../api/endpoints'
import { errorMessage } from '../api/client'
import { useAuth } from '../contexts/AuthContext'
import { EmptyState, ErrorNotice, PageHeader, Panel, Skeleton } from '../components/ui'
import { PRIORITY_LABEL, STATUS_LABEL, type Priority, type TicketStatus } from '../types'
import { formatHours } from '../utils/format'

const STATUS_COLOR: Record<TicketStatus, string> = {
  OPEN: '#6FA3C7',
  IN_PROGRESS: '#0E5A8A',
  WAITING_FOR_USER: '#D9A21B',
  RESOLVED: '#1B7F4B',
  CLOSED: '#9AA8B5',
  CANCELLED: '#C9D1D9',
}
const PRIORITY_COLOR: Record<Priority, string> = { LOW: '#4B6272', MEDIUM: '#8A6500', HIGH: '#C2570C', CRITICAL: '#B42318' }
const AXIS = { fontSize: 12, fill: '#5B6B7A' }

function ChartBox({ label, children, height = 240 }: { label: string; children: React.ReactNode; height?: number }) {
  return (
    <div role="img" aria-label={label} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        {children as React.ReactElement}
      </ResponsiveContainer>
    </div>
  )
}

export default function ReportsPage() {
  const { isAdmin } = useAuth()
  const status = useQuery({ queryKey: ['reports', 'status'], queryFn: reportsApi.byStatus })
  const priority = useQuery({ queryKey: ['reports', 'priority'], queryFn: reportsApi.byPriority })
  const category = useQuery({ queryKey: ['reports', 'category'], queryFn: reportsApi.byCategory })
  const times = useQuery({ queryKey: ['reports', 'times'], queryFn: reportsApi.resolutionTimes })
  const incidents = useQuery({ queryKey: ['reports', 'incidents'], queryFn: reportsApi.commonIncidents })
  const techs = useQuery({ queryKey: ['reports', 'techs'], queryFn: reportsApi.technicianPerformance, enabled: isAdmin })

  const failed = [status, priority, category, times, incidents].find((q) => q.isError)

  return (
    <>
      <PageHeader title="Reports" subtitle="Where tickets come from, how long they take, and who is carrying the load." />
      {failed && <div className="mb-4"><ErrorNotice message={errorMessage(failed.error)} onRetry={() => failed.refetch()} /></div>}

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Tickets by status">
          {status.isLoading ? <Skeleton className="h-60 w-full" /> : (
            <ChartBox label="Bar chart of ticket counts per status">
              <BarChart data={status.data!.map((d) => ({ ...d, name: STATUS_LABEL[d.label as TicketStatus], key: d.label }))}>
                <CartesianGrid vertical={false} stroke="#EEF1F4" />
                <XAxis dataKey="name" tick={AXIS} axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end" height={56} />
                <YAxis allowDecimals={false} tick={AXIS} axisLine={false} tickLine={false} width={28} />
                <Tooltip cursor={{ fill: '#EEF1F4' }} formatter={(v: number) => [v, 'Tickets']} />
                <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                  {status.data!.map((d) => <Cell key={d.label} fill={STATUS_COLOR[d.label as TicketStatus]} />)}
                </Bar>
              </BarChart>
            </ChartBox>
          )}
        </Panel>

        <Panel title="Tickets by priority">
          {priority.isLoading ? <Skeleton className="h-60 w-full" /> : (
            <ChartBox label="Bar chart of ticket counts per priority">
              <BarChart data={priority.data!.map((d) => ({ ...d, name: PRIORITY_LABEL[d.label as Priority] }))}>
                <CartesianGrid vertical={false} stroke="#EEF1F4" />
                <XAxis dataKey="name" tick={AXIS} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={AXIS} axisLine={false} tickLine={false} width={28} />
                <Tooltip cursor={{ fill: '#EEF1F4' }} formatter={(v: number) => [v, 'Tickets']} />
                <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                  {priority.data!.map((d) => <Cell key={d.label} fill={PRIORITY_COLOR[d.label as Priority]} />)}
                </Bar>
              </BarChart>
            </ChartBox>
          )}
        </Panel>

        <Panel title="Tickets by category">
          {category.isLoading ? <Skeleton className="h-60 w-full" /> : category.data!.length === 0 ? <EmptyState title="No tickets yet" /> : (
            <ChartBox label="Bar chart of ticket counts per category" height={Math.max(200, category.data!.length * 34)}>
              <BarChart data={category.data} layout="vertical" margin={{ right: 16 }}>
                <XAxis type="number" allowDecimals={false} hide />
                <YAxis type="category" dataKey="label" width={130} tick={AXIS} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: '#EEF1F4' }} formatter={(v: number) => [v, 'Tickets']} />
                <Bar dataKey="count" fill="#0E5A8A" radius={[0, 3, 3, 0]} barSize={16} />
              </BarChart>
            </ChartBox>
          )}
        </Panel>

        <Panel
          title="Average time to resolve, by priority"
          actions={times.data && <span className="text-xs text-subtle">Overall {formatHours(times.data.averageHours)} across {times.data.resolvedCount} tickets</span>}
        >
          {times.isLoading ? <Skeleton className="h-60 w-full" /> : times.data!.resolvedCount === 0 ? (
            <EmptyState title="Nothing resolved yet" body="Resolution times appear once tickets are resolved." />
          ) : (
            <ChartBox label="Bar chart of average resolution hours per priority">
              <BarChart data={times.data!.byPriority.map((d) => ({ ...d, name: PRIORITY_LABEL[d.label as Priority] }))}>
                <CartesianGrid vertical={false} stroke="#EEF1F4" />
                <XAxis dataKey="name" tick={AXIS} axisLine={false} tickLine={false} />
                <YAxis tick={AXIS} axisLine={false} tickLine={false} width={34} unit=" h" />
                <Tooltip cursor={{ fill: '#EEF1F4' }} formatter={(v: number, _n, p) => [formatHours(v), `Average (${p.payload.count} tickets)`]} />
                <Bar dataKey="averageHours" radius={[3, 3, 0, 0]}>
                  {times.data!.byPriority.map((d) => <Cell key={d.label} fill={PRIORITY_COLOR[d.label as Priority]} />)}
                </Bar>
              </BarChart>
            </ChartBox>
          )}
        </Panel>

        <Panel title="Problems that keep coming back" bodyClassName="p-0">
          {incidents.isLoading ? <div className="p-4"><Skeleton className="h-24 w-full" /></div> : incidents.data!.length === 0 ? (
            <EmptyState title="No repeat problems" body="Tickets with the same title appear here once they happen more than once." />
          ) : (
            <ol className="divide-y divide-rule">
              {incidents.data!.map((i) => (
                <li key={i.title} className="flex items-center justify-between gap-4 px-4 py-2.5 text-sm">
                  <span className="truncate capitalize">{i.title}</span>
                  <span className="shrink-0 tabular-nums text-subtle">{i.count} tickets</span>
                </li>
              ))}
            </ol>
          )}
        </Panel>

        <Panel title="Average time to resolve, by category" bodyClassName="p-0">
          {times.isLoading ? <div className="p-4"><Skeleton className="h-24 w-full" /></div> : times.data!.byCategory.length === 0 ? (
            <EmptyState title="Nothing resolved yet" />
          ) : (
            <ul className="divide-y divide-rule">
              {times.data!.byCategory.map((c) => (
                <li key={c.label} className="flex items-center justify-between gap-4 px-4 py-2.5 text-sm">
                  <span>{c.label}</span>
                  <span className="tabular-nums text-subtle">{formatHours(c.averageHours)} ({c.count})</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {isAdmin && (
        <Panel title="Technician workload and performance" className="mt-6" bodyClassName="p-0">
          {techs.isError && <div className="p-4"><ErrorNotice message={errorMessage(techs.error)} onRetry={() => techs.refetch()} /></div>}
          {techs.isLoading ? <div className="p-4"><Skeleton className="h-24 w-full" /></div> : techs.data && techs.data.length === 0 ? (
            <EmptyState title="No technicians yet" body="Add a user with the Technician role to see their numbers here." />
          ) : techs.data ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b border-rule bg-paper/60 text-left text-xs font-medium text-subtle">
                    <th className="px-4 py-2">Technician</th>
                    <th className="px-4 py-2 text-right">Assigned</th>
                    <th className="px-4 py-2 text-right">Active now</th>
                    <th className="px-4 py-2 text-right">Resolved</th>
                    <th className="px-4 py-2 text-right">Avg. resolution</th>
                  </tr>
                </thead>
                <tbody>
                  {techs.data.map((t) => (
                    <tr key={t.technicianId} className="border-b border-rule last:border-0">
                      <td className="px-4 py-2.5 font-medium">{t.name}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{t.assigned}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{t.active}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{t.resolved}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{formatHours(t.averageResolutionHours)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </Panel>
      )}
    </>
  )
}
