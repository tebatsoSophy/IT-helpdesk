import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { Plus } from 'lucide-react'
import { usersApi } from '../api/endpoints'
import { errorMessage } from '../api/client'
import { useAuth } from '../contexts/AuthContext'
import { Avatar, Button, EmptyState, ErrorNotice, Field, Input, Modal, PageHeader, Select, Skeleton } from '../components/ui'
import { ROLES, ROLE_LABEL, type Role, type User } from '../types'
import { formatDate, cn } from '../utils/format'

const createSchema = z.object({
  fullName: z.string().trim().min(1, 'Enter a name').max(255),
  email: z.string().min(1, 'Enter an email address').email('Enter a valid email address'),
  password: z.string().min(8, 'Use at least 8 characters').max(100),
  role: z.enum(['USER', 'TECHNICIAN', 'ADMIN']),
})
type CreateForm = z.infer<typeof createSchema>

const editSchema = z.object({
  fullName: z.string().trim().min(1, 'Enter a name').max(255),
  role: z.enum(['USER', 'TECHNICIAN', 'ADMIN']),
  password: z.string().max(100).refine((v) => v === '' || v.length >= 8, 'Use at least 8 characters, or leave blank to keep the current one'),
})
type EditForm = z.infer<typeof editSchema>

export default function AdminUsersPage() {
  const { user: me } = useAuth()
  const queryClient = useQueryClient()
  const [roleFilter, setRoleFilter] = useState<Role | ''>('')
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)

  const users = useQuery({ queryKey: ['users', roleFilter], queryFn: () => usersApi.list(roleFilter || undefined) })
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['users'] })
    queryClient.invalidateQueries({ queryKey: ['technicians'] })
  }

  const toggle = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) => usersApi.setActive(id, active),
    onSuccess: (u) => {
      toast.success(u.active ? `${u.fullName} can sign in again` : `${u.fullName} has been deactivated`)
      refresh()
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  return (
    <>
      <PageHeader
        title="Users"
        subtitle="Create accounts and decide who can work on tickets."
        actions={
          <Button variant="primary" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" aria-hidden />
            Add user
          </Button>
        }
      />

      <div className="mb-4 max-w-xs">
        <Select aria-label="Filter by role" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as Role | '')}>
          <option value="">All roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABEL[r]}
            </option>
          ))}
        </Select>
      </div>

      {users.isError && <ErrorNotice message={errorMessage(users.error)} onRetry={() => users.refetch()} />}

      <div className="overflow-x-auto rounded-lg border border-rule bg-white">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-rule bg-paper/60 text-left text-xs font-medium text-subtle">
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Role</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Joined</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.isLoading &&
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-b border-rule last:border-0">
                  <td colSpan={5} className="px-4 py-3">
                    <Skeleton className="h-5 w-full" />
                  </td>
                </tr>
              ))}
            {users.data?.map((u) => (
              <tr key={u.id} className={cn('border-b border-rule last:border-0', !u.active && 'bg-paper/50 text-subtle')}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={u.fullName} />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink">{u.fullName}</p>
                      <p className="truncate text-xs text-subtle">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">{ROLE_LABEL[u.role]}</td>
                <td className="px-4 py-3">{u.active ? 'Active' : 'Deactivated'}</td>
                <td className="px-4 py-3">{formatDate(u.createdAt)}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Button size="sm" onClick={() => setEditing(u)}>
                      Edit
                    </Button>
                    {u.id !== me?.id && (
                      <Button
                        size="sm"
                        variant={u.active ? 'danger' : 'secondary'}
                        disabled={toggle.isPending}
                        onClick={() => toggle.mutate({ id: u.id, active: !u.active })}
                      >
                        {u.active ? 'Deactivate' : 'Reactivate'}
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.data?.length === 0 && <EmptyState title="No users with this role" />}
      </div>

      <CreateUserDialog open={creating} onClose={() => setCreating(false)} onDone={refresh} />
      {editing && <EditUserDialog user={editing} isSelf={editing.id === me?.id} onClose={() => setEditing(null)} onDone={refresh} />}
    </>
  )
}

function CreateUserDialog({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateForm>({ resolver: zodResolver(createSchema), defaultValues: { role: 'USER' } })

  const create = useMutation({
    mutationFn: (v: CreateForm) => usersApi.create(v),
    onSuccess: (u) => {
      toast.success(`${u.fullName} was added`)
      reset({ role: 'USER', fullName: '', email: '', password: '' })
      onDone()
      onClose()
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  return (
    <Modal
      open={open}
      title="Add user"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={create.isPending} onClick={handleSubmit((v) => create.mutate(v))}>
            Add user
          </Button>
        </>
      }
    >
      <form className="space-y-4" noValidate onSubmit={handleSubmit((v) => create.mutate(v))}>
        <Field label="Full name" htmlFor="c-name" error={errors.fullName?.message}>
          <Input id="c-name" {...register('fullName')} />
        </Field>
        <Field label="Email" htmlFor="c-email" error={errors.email?.message}>
          <Input id="c-email" type="email" {...register('email')} />
        </Field>
        <Field label="Temporary password" htmlFor="c-pass" error={errors.password?.message} hint="Ask them to change it from their profile after signing in.">
          <Input id="c-pass" type="password" autoComplete="new-password" {...register('password')} />
        </Field>
        <Field label="Role" htmlFor="c-role">
          <Select id="c-role" {...register('role')}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </Select>
        </Field>
      </form>
    </Modal>
  )
}

function EditUserDialog({ user, isSelf, onClose, onDone }: { user: User; isSelf: boolean; onClose: () => void; onDone: () => void }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EditForm>({ resolver: zodResolver(editSchema), defaultValues: { fullName: user.fullName, role: user.role, password: '' } })

  const save = useMutation({
    mutationFn: (v: EditForm) => usersApi.update(user.id, { fullName: v.fullName, role: v.role, password: v.password || undefined }),
    onSuccess: () => {
      toast.success('User updated')
      onDone()
      onClose()
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  return (
    <Modal
      open
      title={`Edit ${user.fullName}`}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={save.isPending} onClick={handleSubmit((v) => save.mutate(v))}>
            Save changes
          </Button>
        </>
      }
    >
      <form className="space-y-4" noValidate onSubmit={handleSubmit((v) => save.mutate(v))}>
        <p className="text-sm text-subtle">{user.email}</p>
        <Field label="Full name" htmlFor="e-name" error={errors.fullName?.message}>
          <Input id="e-name" {...register('fullName')} />
        </Field>
        <Field label="Role" htmlFor="e-role" hint={isSelf ? 'You cannot change your own role.' : undefined}>
          <Select id="e-role" disabled={isSelf} {...register('role')}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Reset password" htmlFor="e-pass" error={errors.password?.message} hint="Leave blank to keep the current password.">
          <Input id="e-pass" type="password" autoComplete="new-password" {...register('password')} />
        </Field>
      </form>
    </Modal>
  )
}
