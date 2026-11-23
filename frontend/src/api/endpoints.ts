import { api } from './client'
import type {
  Attachment,
  AuthResponse,
  Category,
  CommonIncident,
  CountItem,
  MyTicketSummary,
  PageResult,
  Priority,
  ResolutionTimesReport,
  Role,
  SummaryReport,
  TechnicianPerformance,
  Ticket,
  TicketComment,
  TicketHistoryEntry,
  TicketQuery,
  TicketStatus,
  User,
} from '../types'

/** Drops empty values so they never reach the query string. */
function clean(params: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null && v !== false))
}

// ---- auth
export const authApi = {
  login: (email: string, password: string) =>
    api.post<AuthResponse>('/auth/login', { email, password }).then((r) => r.data),
  register: (email: string, password: string, fullName: string) =>
    api.post<AuthResponse>('/auth/register', { email, password, fullName }).then((r) => r.data),
  me: () => api.get<User>('/auth/me').then((r) => r.data),
}

// ---- users
export interface UserForm {
  email: string
  fullName: string
  role: Role
  password?: string
}
export const usersApi = {
  list: (role?: Role) => api.get<User[]>('/users', { params: clean({ role }) }).then((r) => r.data),
  technicians: () => api.get<User[]>('/technicians').then((r) => r.data),
  create: (form: Required<UserForm>) => api.post<User>('/users', form).then((r) => r.data),
  update: (id: number, form: Pick<UserForm, 'fullName' | 'role' | 'password'>) =>
    api.put<User>(`/users/${id}`, form).then((r) => r.data),
  setActive: (id: number, active: boolean) =>
    api.patch<User>(`/users/${id}/${active ? 'activate' : 'deactivate'}`).then((r) => r.data),
  updateProfile: (body: { fullName: string; currentPassword?: string; newPassword?: string }) =>
    api.put<User>('/users/me', body).then((r) => r.data),
}

// ---- categories
export const categoriesApi = {
  list: () => api.get<Category[]>('/categories').then((r) => r.data),
  create: (body: { name: string; description?: string }) => api.post<Category>('/categories', body).then((r) => r.data),
  update: (id: number, body: { name: string; description?: string }) =>
    api.put<Category>(`/categories/${id}`, body).then((r) => r.data),
  remove: (id: number) => api.delete(`/categories/${id}`).then(() => undefined),
}

// ---- tickets
export type TicketScope = 'all' | 'mine' | 'assigned'
const scopePath: Record<TicketScope, string> = { all: '/tickets', mine: '/tickets/my', assigned: '/tickets/assigned' }

export const ticketsApi = {
  list: (scope: TicketScope, q: TicketQuery) =>
    api
      .get<PageResult<Ticket>>(scopePath[scope], {
        params: clean({
          q: q.q,
          status: q.status,
          priority: q.priority,
          categoryId: q.categoryId,
          assigneeId: q.assigneeId,
          unassigned: q.unassigned,
          from: q.from,
          to: q.to,
          page: q.page ?? 0,
          size: q.size ?? 15,
          sort: q.sort ?? 'createdAt,desc',
        }),
      })
      .then((r) => r.data),
  get: (id: number) => api.get<Ticket>(`/tickets/${id}`).then((r) => r.data),
  history: (id: number) => api.get<TicketHistoryEntry[]>(`/tickets/${id}/history`).then((r) => r.data),
  mySummary: () => api.get<MyTicketSummary>('/tickets/my/summary').then((r) => r.data),
  create: (body: { title: string; description: string; priority: Priority; categoryId?: number }) =>
    api.post<Ticket>('/tickets', body).then((r) => r.data),
  update: (id: number, body: { title: string; description: string; categoryId?: number | null }) =>
    api.put<Ticket>(`/tickets/${id}`, body).then((r) => r.data),
  setStatus: (id: number, status: TicketStatus) =>
    api.patch<Ticket>(`/tickets/${id}/status`, { status }).then((r) => r.data),
  assign: (id: number, assigneeId: number | null) =>
    api.patch<Ticket>(`/tickets/${id}/assign`, { assigneeId }).then((r) => r.data),
  setPriority: (id: number, priority: Priority) =>
    api.patch<Ticket>(`/tickets/${id}/priority`, { priority }).then((r) => r.data),
  resolve: (id: number, resolutionNotes: string) =>
    api.post<Ticket>(`/tickets/${id}/resolve`, { resolutionNotes }).then((r) => r.data),
  close: (id: number) => api.post<Ticket>(`/tickets/${id}/close`).then((r) => r.data),
}

// ---- comments & attachments
export const commentsApi = {
  list: (ticketId: number) => api.get<TicketComment[]>(`/tickets/${ticketId}/comments`).then((r) => r.data),
  add: (ticketId: number, content: string, internal: boolean) =>
    api.post<TicketComment>(`/tickets/${ticketId}/comments`, { content, internal }).then((r) => r.data),
}

export const attachmentsApi = {
  list: (ticketId: number) => api.get<Attachment[]>(`/tickets/${ticketId}/attachments`).then((r) => r.data),
  upload: (ticketId: number, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post<Attachment>(`/tickets/${ticketId}/attachments`, form).then((r) => r.data)
  },
  /** Downloads through axios so the Authorization header is sent, then hands the blob to the browser. */
  download: async (a: Attachment) => {
    const res = await api.get<Blob>(`/attachments/${a.id}/download`, { responseType: 'blob' })
    const url = URL.createObjectURL(res.data)
    const link = document.createElement('a')
    link.href = url
    link.download = a.fileName
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  },
}

// ---- reports
export const reportsApi = {
  summary: () => api.get<SummaryReport>('/reports/summary').then((r) => r.data),
  byStatus: () => api.get<CountItem[]>('/reports/tickets-by-status').then((r) => r.data),
  byPriority: () => api.get<CountItem[]>('/reports/tickets-by-priority').then((r) => r.data),
  byCategory: () => api.get<CountItem[]>('/reports/tickets-by-category').then((r) => r.data),
  resolutionTimes: () => api.get<ResolutionTimesReport>('/reports/resolution-times').then((r) => r.data),
  commonIncidents: () => api.get<CommonIncident[]>('/reports/common-incidents').then((r) => r.data),
  technicianPerformance: () =>
    api.get<TechnicianPerformance[]>('/reports/technician-performance').then((r) => r.data),
}
