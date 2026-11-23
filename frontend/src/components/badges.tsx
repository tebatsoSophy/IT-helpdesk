import { PRIORITY_LABEL, STATUS_LABEL, type Priority, type TicketStatus } from '../types'
import { cn } from '../utils/format'

const statusStyle: Record<TicketStatus, string> = {
  OPEN: 'bg-accent-soft text-accent-dark',
  IN_PROGRESS: 'bg-accent text-white',
  WAITING_FOR_USER: 'bg-amber-100 text-amber-900',
  RESOLVED: 'bg-green-100 text-good',
  CLOSED: 'bg-paper text-subtle ring-1 ring-inset ring-rule',
  CANCELLED: 'bg-paper text-subtle ring-1 ring-inset ring-rule line-through',
}

export function StatusBadge({ status, className }: { status: TicketStatus; className?: string }) {
  return (
    <span className={cn('inline-flex items-center whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium', statusStyle[status], className)}>
      {STATUS_LABEL[status]}
    </span>
  )
}

export const priorityText: Record<Priority, string> = {
  CRITICAL: 'text-crit',
  HIGH: 'text-high',
  MEDIUM: 'text-med',
  LOW: 'text-low',
}

/** Left edge of a ticket row: the colour carries the priority so a queue can be scanned at a glance. */
export const priorityEdge: Record<Priority, string> = {
  CRITICAL: 'border-l-crit',
  HIGH: 'border-l-high',
  MEDIUM: 'border-l-med',
  LOW: 'border-l-low',
}

const priorityFill: Record<Priority, string> = {
  CRITICAL: 'bg-crit',
  HIGH: 'bg-high',
  MEDIUM: 'bg-med',
  LOW: 'bg-low',
}

export function PriorityBadge({ priority, className }: { priority: Priority; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium', priorityText[priority], className)}>
      <span aria-hidden className={cn('h-2 w-2 rounded-sm', priorityFill[priority])} />
      {PRIORITY_LABEL[priority]}
    </span>
  )
}
