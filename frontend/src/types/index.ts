export type Role = 'USER' | 'TECHNICIAN' | 'ADMIN'
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING_FOR_USER' | 'RESOLVED' | 'CLOSED' | 'CANCELLED'
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export const STATUSES: TicketStatus[] = ['OPEN', 'IN_PROGRESS', 'WAITING_FOR_USER', 'RESOLVED', 'CLOSED', 'CANCELLED']
export const PRIORITIES: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
export const ROLES: Role[] = ['USER', 'TECHNICIAN', 'ADMIN']

export const STATUS_LABEL: Record<TicketStatus, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In progress',
  WAITING_FOR_USER: 'Waiting for user',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
  CANCELLED: 'Cancelled',
}

export const PRIORITY_LABEL: Record<Priority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
}

export const ROLE_LABEL: Record<Role, string> = {
  USER: 'User',
  TECHNICIAN: 'Technician',
  ADMIN: 'Admin',
}

export interface User {
  id: number
  email: string
  fullName: string
  role: Role
  active: boolean
  createdAt: string
}

export interface UserSummary {
  id: number
  fullName: string
  email: string
}

export interface Category {
  id: number
  name: string
  description: string | null
}

export interface Ticket {
  id: number
  title: string
  description: string
  status: TicketStatus
  priority: Priority
  category: Category | null
  requester: UserSummary
  assignee: UserSummary | null
  createdAt: string
  updatedAt: string
  resolvedAt: string | null
  resolutionNotes: string | null
  resolutionMinutes: number | null
  slaDueAt: string | null
  slaBreached: boolean
}

export interface TicketHistoryEntry {
  id: number
  changedBy: UserSummary
  field: string
  oldValue: string | null
  newValue: string | null
  changedAt: string
}

export interface TicketComment {
  id: number
  ticketId: number
  author: UserSummary
  content: string
  internal: boolean
  createdAt: string
}

export interface Attachment {
  id: number
  ticketId: number
  fileName: string
  contentType: string | null
  size: number
  uploadedBy: UserSummary
  uploadedAt: string
}

export interface PageResult<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export interface AuthResponse {
  token: string
  tokenType: string
  user: User
}

export interface MyTicketSummary {
  total: number
  open: number
  inProgress: number
  waitingForUser: number
  resolved: number
  closed: number
  cancelled: number
}

export interface SummaryReport {
  totalTickets: number
  open: number
  inProgress: number
  waitingForUser: number
  resolved: number
  closed: number
  cancelled: number
  unassignedActive: number
  criticalActive: number
  slaBreachedActive: number
  createdLast7Days: number
  resolvedLast7Days: number
  myAssignedActive: number
  averageResolutionHours: number | null
}

export interface CountItem {
  label: string
  count: number
}

export interface CommonIncident {
  title: string
  count: number
}

export interface ResolutionTimeItem {
  label: string
  count: number
  averageHours: number
}

export interface ResolutionTimesReport {
  resolvedCount: number
  averageHours: number | null
  byPriority: ResolutionTimeItem[]
  byCategory: ResolutionTimeItem[]
}

export interface TechnicianPerformance {
  technicianId: number
  name: string
  assigned: number
  active: number
  resolved: number
  averageResolutionHours: number | null
}

export interface TicketQuery {
  q?: string
  status?: TicketStatus | ''
  priority?: Priority | ''
  categoryId?: string
  assigneeId?: string
  unassigned?: boolean
  from?: string
  to?: string
  page?: number
  size?: number
  sort?: string
}
