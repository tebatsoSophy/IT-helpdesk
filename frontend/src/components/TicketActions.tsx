import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { CheckCircle2, Pencil, Play, RotateCcw, UserCheck, XCircle, Hourglass } from 'lucide-react'
import { categoriesApi, ticketsApi, usersApi } from '../api/endpoints'
import { errorMessage } from '../api/client'
import { useAuth } from '../contexts/AuthContext'
import { Button, Field, Input, Modal, Select, Textarea } from './ui'
import type { Ticket, TicketStatus } from '../types'

/** Everything the signed-in person is allowed to do to this ticket, and nothing else. */
export default function TicketActions({ ticket }: { ticket: Ticket }) {
  const { user, isStaff, isAdmin } = useAuth()
  const queryClient = useQueryClient()
  const [dialog, setDialog] = useState<'resolve' | 'cancel' | 'edit' | null>(null)
  const [assignee, setAssignee] = useState('')

  const isFinal = ticket.status === 'CLOSED' || ticket.status === 'CANCELLED'
  const assignedToMe = ticket.assignee?.id === user?.id
  const assignedToOther = !!ticket.assignee && !assignedToMe
  const staffBlocked = !isAdmin && assignedToOther // technicians cannot work another technician's ticket

  const technicians = useQuery({ queryKey: ['technicians'], queryFn: usersApi.technicians, enabled: isAdmin && !isFinal, staleTime: 60_000 })

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['ticket', ticket.id] })
    queryClient.invalidateQueries({ queryKey: ['history', ticket.id] })
    queryClient.invalidateQueries({ queryKey: ['tickets'] })
    queryClient.invalidateQueries({ queryKey: ['summary'] })
  }
  const run = <T,>(fn: (v: T) => Promise<unknown>, success: string) => ({
    mutationFn: fn,
    onSuccess: () => {
      toast.success(success)
      setDialog(null)
      refresh()
    },
    onError: (e: unknown) => toast.error(errorMessage(e)),
  })

  const setStatus = useMutation(run((s: TicketStatus) => ticketsApi.setStatus(ticket.id, s), 'Status updated'))
  const assign = useMutation(run((id: number | null) => ticketsApi.assign(ticket.id, id), 'Assignment updated'))
  const close = useMutation(run(() => ticketsApi.close(ticket.id), 'Ticket closed'))
  const resolve = useMutation(run((notes: string) => ticketsApi.resolve(ticket.id, notes), 'Ticket resolved'))
  const edit = useMutation(run((b: { title: string; description: string; categoryId: number | null }) => ticketsApi.update(ticket.id, b), 'Ticket updated'))
  const busy = setStatus.isPending || assign.isPending || close.isPending

  if (isFinal) {
    return <p className="text-sm text-subtle">This ticket is {ticket.status === 'CLOSED' ? 'closed' : 'cancelled'}, so it can no longer be changed.</p>
  }

  const buttons: JSX.Element[] = []
  const add = (el: JSX.Element) => buttons.push(el)

  if (isStaff) {
    if (staffBlocked) {
      add(
        <p key="blocked" className="text-sm text-subtle">
          This ticket is assigned to {ticket.assignee!.fullName}. Only they or an administrator can work on it.
        </p>,
      )
    } else {
      if (!ticket.assignee && !isAdmin) {
        add(
          <Button key="take" variant="primary" className="w-full" loading={assign.isPending} onClick={() => assign.mutate(user!.id)}>
            <UserCheck className="h-4 w-4" aria-hidden />
            Take this ticket
          </Button>,
        )
      }
      if (ticket.status === 'OPEN' || ticket.status === 'WAITING_FOR_USER') {
        add(
          <Button key="start" variant={ticket.assignee || isAdmin ? 'primary' : 'secondary'} className="w-full" disabled={busy} onClick={() => setStatus.mutate('IN_PROGRESS')}>
            <Play className="h-4 w-4" aria-hidden />
            {ticket.status === 'OPEN' ? 'Start work' : 'Resume work'}
          </Button>,
        )
      }
      if (ticket.status === 'OPEN' || ticket.status === 'IN_PROGRESS') {
        add(
          <Button key="wait" className="w-full" disabled={busy} onClick={() => setStatus.mutate('WAITING_FOR_USER')}>
            <Hourglass className="h-4 w-4" aria-hidden />
            Waiting for the user
          </Button>,
        )
      }
      if (ticket.status !== 'RESOLVED') {
        add(
          <Button key="resolve" className="w-full" disabled={busy} onClick={() => setDialog('resolve')}>
            <CheckCircle2 className="h-4 w-4" aria-hidden />
            Resolve ticket
          </Button>,
        )
      } else {
        add(
          <Button key="close" variant="primary" className="w-full" loading={close.isPending} onClick={() => close.mutate(undefined)}>
            <CheckCircle2 className="h-4 w-4" aria-hidden />
            Close ticket
          </Button>,
        )
        add(
          <Button key="reopen" className="w-full" disabled={busy} onClick={() => setStatus.mutate('IN_PROGRESS')}>
            <RotateCcw className="h-4 w-4" aria-hidden />
            Reopen
          </Button>,
        )
      }
      add(
        <Button key="edit" className="w-full" onClick={() => setDialog('edit')}>
          <Pencil className="h-4 w-4" aria-hidden />
          Edit details
        </Button>,
      )
      add(
        <Button key="cancel" variant="danger" className="w-full" disabled={busy} onClick={() => setDialog('cancel')}>
          <XCircle className="h-4 w-4" aria-hidden />
          Cancel ticket
        </Button>,
      )
    }
  } else {
    if (ticket.status === 'RESOLVED') {
      add(
        <p key="hint" className="text-sm text-subtle">
          The support team says this is fixed. Is it working for you now?
        </p>,
      )
      add(
        <Button key="close" variant="primary" className="w-full" loading={close.isPending} onClick={() => close.mutate(undefined)}>
          <CheckCircle2 className="h-4 w-4" aria-hidden />
          Yes, it is fixed
        </Button>,
      )
      add(
        <Button key="reopen" className="w-full" disabled={busy} onClick={() => setStatus.mutate('OPEN')}>
          <RotateCcw className="h-4 w-4" aria-hidden />
          No, reopen the ticket
        </Button>,
      )
    }
    if (ticket.status === 'OPEN') {
      add(
        <Button key="edit" className="w-full" onClick={() => setDialog('edit')}>
          <Pencil className="h-4 w-4" aria-hidden />
          Edit ticket
        </Button>,
      )
    }
    if (ticket.status !== 'RESOLVED') {
      add(
        <Button key="cancel" variant="danger" className="w-full" disabled={busy} onClick={() => setDialog('cancel')}>
          <XCircle className="h-4 w-4" aria-hidden />
          Cancel ticket
        </Button>,
      )
    }
  }

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div>
          <Field label="Assign to" htmlFor="assignee">
            <div className="flex gap-2">
              <Select id="assignee" value={assignee} onChange={(e) => setAssignee(e.target.value)}>
                <option value="">{ticket.assignee ? `Currently ${ticket.assignee.fullName}` : 'Choose a technician'}</option>
                {technicians.data?.filter((t) => t.id !== ticket.assignee?.id).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.fullName}
                  </option>
                ))}
              </Select>
              <Button disabled={!assignee || assign.isPending} onClick={() => assign.mutate(Number(assignee), { onSuccess: () => setAssignee('') })}>
                Assign
              </Button>
            </div>
          </Field>
          {ticket.assignee && (
            <button className="mt-1.5 text-xs text-subtle underline hover:text-ink" onClick={() => assign.mutate(null)}>
              Remove assignee
            </button>
          )}
        </div>
      )}

      <div className="space-y-2">{buttons}</div>

      <Modal
        open={dialog === 'cancel'}
        title="Cancel this ticket?"
        onClose={() => setDialog(null)}
        footer={
          <>
            <Button onClick={() => setDialog(null)}>Keep ticket</Button>
            <Button variant="danger" loading={setStatus.isPending} onClick={() => setStatus.mutate('CANCELLED')}>
              Cancel ticket
            </Button>
          </>
        }
      >
        <p className="text-sm">A cancelled ticket cannot be reopened. If the problem comes back, raise a new ticket.</p>
      </Modal>

      <ResolveDialog open={dialog === 'resolve'} onClose={() => setDialog(null)} loading={resolve.isPending} onSubmit={(n) => resolve.mutate(n)} />
      <EditDialog key={ticket.updatedAt} open={dialog === 'edit'} ticket={ticket} onClose={() => setDialog(null)} loading={edit.isPending} onSubmit={(b) => edit.mutate(b)} />
    </div>
  )
}

function ResolveDialog({ open, onClose, onSubmit, loading }: { open: boolean; onClose: () => void; onSubmit: (notes: string) => void; loading: boolean }) {
  const [notes, setNotes] = useState('')
  const valid = notes.trim().length >= 5
  return (
    <Modal
      open={open}
      title="Resolve ticket"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!valid} loading={loading} onClick={() => onSubmit(notes.trim())}>
            Mark as resolved
          </Button>
        </>
      }
    >
      <Field label="What fixed it?" htmlFor="notes" hint="The requester sees this and can confirm the fix or reopen the ticket.">
        <Textarea id="notes" rows={5} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
    </Modal>
  )
}

function EditDialog({
  open,
  ticket,
  onClose,
  onSubmit,
  loading,
}: {
  open: boolean
  ticket: Ticket
  onClose: () => void
  onSubmit: (b: { title: string; description: string; categoryId: number | null }) => void
  loading: boolean
}) {
  const categories = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list, staleTime: 5 * 60_000 })
  const [title, setTitle] = useState(ticket.title)
  const [description, setDescription] = useState(ticket.description)
  const [categoryId, setCategoryId] = useState(ticket.category ? String(ticket.category.id) : '')
  const valid = title.trim().length >= 5 && description.trim().length >= 10
  return (
    <Modal
      open={open}
      title="Edit ticket"
      wide
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!valid} loading={loading} onClick={() => onSubmit({ title: title.trim(), description: description.trim(), categoryId: categoryId ? Number(categoryId) : null })}>
            Save changes
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Title" htmlFor="edit-title">
          <Input id="edit-title" value={title} maxLength={255} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label="Category" htmlFor="edit-category">
          <Select id="edit-category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">No category</option>
            {categories.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Details" htmlFor="edit-description">
          <Textarea id="edit-description" rows={8} value={description} maxLength={4000} onChange={(e) => setDescription(e.target.value)} />
        </Field>
      </div>
    </Modal>
  )
}
