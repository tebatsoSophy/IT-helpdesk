import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { usersApi } from '../api/endpoints'
import { errorMessage } from '../api/client'
import { useAuth } from '../contexts/AuthContext'
import { Button, Field, Input, PageHeader, Panel } from '../components/ui'
import { ROLE_LABEL } from '../types'

const schema = z
  .object({
    fullName: z.string().trim().min(1, 'Enter your name').max(255),
    currentPassword: z.string().optional(),
    newPassword: z.string().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.newPassword) {
      if (v.newPassword.length < 8) ctx.addIssue({ code: 'custom', path: ['newPassword'], message: 'Use at least 8 characters' })
      if (!v.currentPassword) ctx.addIssue({ code: 'custom', path: ['currentPassword'], message: 'Enter your current password to set a new one' })
    }
  })
type Form = z.infer<typeof schema>

export default function ProfilePage() {
  const { user, setUser } = useAuth()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Form>({ resolver: zodResolver(schema), defaultValues: { fullName: user!.fullName, currentPassword: '', newPassword: '' } })

  const save = useMutation({
    mutationFn: (v: Form) =>
      usersApi.updateProfile({ fullName: v.fullName, currentPassword: v.currentPassword || undefined, newPassword: v.newPassword || undefined }),
    onSuccess: (u) => {
      setUser(u)
      reset({ fullName: u.fullName, currentPassword: '', newPassword: '' })
      toast.success('Profile saved')
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  return (
    <>
      <PageHeader title="Your profile" />
      <form onSubmit={handleSubmit((v) => save.mutate(v))} noValidate>
        <Panel className="max-w-xl" bodyClassName="space-y-5">
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-subtle">Email</dt>
              <dd className="mt-0.5 break-all font-medium">{user!.email}</dd>
            </div>
            <div>
              <dt className="text-subtle">Role</dt>
              <dd className="mt-0.5 font-medium">{ROLE_LABEL[user!.role]}</dd>
            </div>
          </dl>
          <Field label="Full name" htmlFor="fullName" error={errors.fullName?.message}>
            <Input id="fullName" autoComplete="name" {...register('fullName')} />
          </Field>
          <fieldset className="space-y-4 border-t border-rule pt-5">
            <legend className="text-sm font-semibold">Change password</legend>
            <Field label="Current password" htmlFor="currentPassword" error={errors.currentPassword?.message}>
              <Input id="currentPassword" type="password" autoComplete="current-password" {...register('currentPassword')} />
            </Field>
            <Field label="New password" htmlFor="newPassword" error={errors.newPassword?.message} hint="Leave both blank to keep your password.">
              <Input id="newPassword" type="password" autoComplete="new-password" {...register('newPassword')} />
            </Field>
          </fieldset>
          <div className="flex justify-end">
            <Button type="submit" variant="primary" loading={save.isPending}>
              Save changes
            </Button>
          </div>
        </Panel>
      </form>
    </>
  )
}
