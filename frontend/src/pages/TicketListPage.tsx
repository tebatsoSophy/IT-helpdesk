import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Plus, Search, X } from 'lucide-react'
import { categoriesApi, ticketsApi, usersApi, type TicketScope } from '../api/endpoints'
import { errorMessage } from '../api/client'
import { useAuth } from '../contexts/AuthContext'
import { Button, EmptyState, ErrorNotice, Input, PageHeader, Pagination, Panel, Select } from '../components/ui'
import { TicketRow, TicketRowHeader, TicketRowsSkeleton } from '../components/TicketRow'
import { PRIORITIES, PRIORITY_LABEL, STATUSES, STATUS_LABEL, type Priority, type TicketStatus } from '../types'

const PAGE_SIZE = 15

const COPY: Record<TicketScope, { title: string; subtitle: string; empty: string }> = {
  all: { title: 'All tickets', subtitle: 'Every ticket in the help desk.', empty: 'No tickets have been raised yet.' },
  mine: { title: 'My tickets', subtitle: 'Tickets you have raised.', empty: 'You have not raised any tickets yet.' },
  assigned: { title: 'Assigned to me', subtitle: 'Tickets you are responsible for.', empty: 'Nothing is assigned to you right now.' },
}

export default function TicketListPage({ scope }: { scope: TicketScope }) {
  const { isStaff } = useAuth()
  const [params, setParams] = useSearchParams()

  const get = (key: string) => params.get(key) ?? ''
  const page = Number(get('page') || 0)
  const q = get('q')

  // Debounced search box that writes to the URL, so filtered views can be bookmarked and shared.
  const [search, setSearch] = useState(q)
  useEffect(() => setSearch(q), [q])
  useEffect(() => {
    if (search === q) return
    const t = setTimeout(() => update({ q: search }), 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  function update(changes: Record<string, string>) {
    const next = new URLSearchParams(params)
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)))
    if (!('page' in changes)) next.delete('page')
    setParams(next, { replace: true })
  }

  const filters = {
    q,
    status: get('status') as TicketStatus | '',
    priority: get('priority') as Priority | '',
    categoryId: get('categoryId'),
    assigneeId: get('assigneeId'),
    unassigned: get('unassigned') === 'true',
    from: get('from'),
    to: get('to'),
  }
  const sort = get('sort') || 'createdAt,desc'
  const hasFilters = Object.values(filters).some(Boolean)

  const tickets = useQuery({
    queryKey: ['tickets', scope, filters, sort, page],
    queryFn: () => ticketsApi.list(scope, { ...filters, sort, page, size: PAGE_SIZE }),
    placeholderData: keepPreviousData,
    refetchInterval: 20_000,
  })
  const categories = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list, staleTime: 5 * 60_000 })
  const technicians = useQuery({
    queryKey: ['technicians'],
    queryFn: usersApi.technicians,
    enabled: isStaff && scope === 'all',
    staleTime: 5 * 60_000,
  })

  const copy = COPY[scope]
  const showRequester = isStaff && scope !== 'mine'
  const data = tickets.data

  return (
    <>
      <PageHeader
        title={copy.title}
        subtitle={copy.subtitle}
        actions={
          <Link to="/tickets/new">
            <Button variant="primary">
              <Plus className="h-4 w-4" aria-hidden />
              New ticket
            </Button>
          </Link>
        }
      />

      <Panel className="mb-4" bodyClassName="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative sm:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" aria-hidden />
          <Input
            type="search"
            aria-label="Search tickets"
            placeholder="Search title or description"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select aria-label="Filter by status" value={filters.status} onChange={(e) => update({ status: e.target.value })}>
          <option value="">Any status</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </Select>
        <Select aria-label="Filter by priority" value={filters.priority} onChange={(e) => update({ priority: e.target.value })}>
          <option value="">Any priority</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {PRIORITY_LABEL[p]}
            </option>
          ))}
        </Select>
        <Select aria-label="Filter by category" value={filters.categoryId} onChange={(e) => update({ categoryId: e.target.value })}>
          <option value="">Any category</option>
          {categories.data?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        {isStaff && scope === 'all' ? (
          <Select
            aria-label="Filter by assignee"
            value={filters.unassigned ? 'none' : filters.assigneeId}
            onChange={(e) => {
              const v = e.target.value
              update(v === 'none' ? { unassigned: 'true', assigneeId: '' } : { assigneeId: v, unassigned: '' })
            }}
          >
            <option value="">Anyone</option>
            <option value="none">Unassigned</option>
            {technicians.data?.map((t) => (
              <option key={t.id} value={t.id}>
                {t.fullName}
              </option>
            ))}
          </Select>
        ) : (
          <Select aria-label="Sort order" value={sort} onChange={(e) => update({ sort: e.target.value === 'createdAt,desc' ? '' : e.target.value })}>
            <option value="createdAt,desc">Newest first</option>
            <option value="createdAt,asc">Oldest first</option>
            <option value="updatedAt,desc">Recently updated</option>
          </Select>
        )}
        <label className="flex items-center gap-2 text-sm text-subtle">
          <span className="w-10 shrink-0">From</span>
          <Input type="date" aria-label="Created from" value={filters.from} max={filters.to || undefined} onChange={(e) => update({ from: e.target.value })} />
        </label>
        <label className="flex items-center gap-2 text-sm text-subtle">
          <span className="w-10 shrink-0">To</span>
          <Input type="date" aria-label="Created to" value={filters.to} min={filters.from || undefined} onChange={(e) => update({ to: e.target.value })} />
        </label>
        {isStaff && scope === 'all' && (
          <Select aria-label="Sort order" value={sort} onChange={(e) => update({ sort: e.target.value === 'createdAt,desc' ? '' : e.target.value })}>
            <option value="createdAt,desc">Newest first</option>
            <option value="createdAt,asc">Oldest first</option>
            <option value="updatedAt,desc">Recently updated</option>
          </Select>
        )}
        {hasFilters && (
          <div className="flex items-center sm:col-span-2 lg:col-span-4">
            <Button variant="ghost" size="sm" onClick={() => setParams({}, { replace: true })}>
              <X className="h-3.5 w-3.5" aria-hidden />
              Clear all filters
            </Button>
          </div>
        )}
      </Panel>

      {tickets.isError && <ErrorNotice message={errorMessage(tickets.error)} onRetry={() => tickets.refetch()} />}

      <section className="overflow-hidden rounded-lg border border-rule bg-white" aria-busy={tickets.isFetching}>
        <TicketRowHeader showRequester={showRequester} />
        {tickets.isLoading ? (
          <TicketRowsSkeleton />
        ) : data && data.content.length > 0 ? (
          <>
            <div role="list">
              {data.content.map((t) => (
                <TicketRow key={t.id} ticket={t} showRequester={showRequester} />
              ))}
            </div>
            <Pagination
              page={data.page}
              size={data.size}
              totalPages={data.totalPages}
              totalElements={data.totalElements}
              onPage={(p) => update({ page: p === 0 ? '' : String(p) })}
            />
          </>
        ) : !tickets.isError ? (
          hasFilters ? (
            <EmptyState
              title="No tickets match these filters"
              body="Try removing a filter or searching for different words."
              action={
                <Button onClick={() => setParams({}, { replace: true })}>Clear all filters</Button>
              }
            />
          ) : (
            <EmptyState
              title={copy.empty}
              action={
                scope !== 'assigned' ? (
                  <Link to="/tickets/new">
                    <Button variant="primary">Raise a ticket</Button>
                  </Link>
                ) : undefined
              }
            />
          )
        ) : null}
      </section>
    </>
  )
}
