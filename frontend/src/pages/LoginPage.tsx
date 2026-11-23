import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '../contexts/AuthContext'
import { errorMessage } from '../api/client'
import AuthShell from '../components/AuthShell'
import { Button, Field, Input } from '../components/ui'

const schema = z.object({
  email: z.string().min(1, 'Enter your email address').email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
})
type Form = z.infer<typeof schema>

// Only shown by `npm run dev`; these accounts exist when the backend seeds demo data.
const DEMO = [
  { label: 'Admin', email: 'admin@helpdesk.local', password: 'Admin123!' },
  { label: 'Technician', email: 'tech1@helpdesk.local', password: 'Password123!' },
  { label: 'User', email: 'user@helpdesk.local', password: 'Password123!' },
]

export default function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [error, setError] = useState('')
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<Form>({ resolver: zodResolver(schema) })

  if (user) return <Navigate to="/dashboard" replace />
  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard'

  const onSubmit = async (values: Form) => {
    setError('')
    try {
      await login(values.email, values.password)
      navigate(from, { replace: true })
    } catch (e) {
      setError(errorMessage(e, 'We could not sign you in. Please try again.'))
    }
  }

  return (
    <AuthShell title="Sign in" subtitle="Use your help desk account to continue.">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {error && (
          <div role="alert" className="rounded border border-crit/30 bg-red-50 px-3 py-2 text-sm text-crit">
            {error}
          </div>
        )}
        <Field label="Email" htmlFor="email" error={errors.email?.message}>
          <Input id="email" type="email" autoComplete="username" autoFocus {...register('email')} />
        </Field>
        <Field label="Password" htmlFor="password" error={errors.password?.message}>
          <Input id="password" type="password" autoComplete="current-password" {...register('password')} />
        </Field>
        <Button type="submit" variant="primary" loading={isSubmitting} className="w-full">
          Sign in
        </Button>
      </form>

      <p className="mt-6 text-sm text-subtle">
        New here?{' '}
        <Link to="/register" className="font-medium text-accent hover:underline">
          Create an account
        </Link>
      </p>

      {import.meta.env.DEV && (
        <div className="mt-8 rounded border border-dashed border-rule p-3">
          <p className="text-xs font-medium text-subtle">Demo accounts (development only)</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {DEMO.map((d) => (
              <Button
                key={d.label}
                type="button"
                size="sm"
                onClick={() => {
                  setValue('email', d.email)
                  setValue('password', d.password)
                }}
              >
                {d.label}
              </Button>
            ))}
          </div>
        </div>
      )}
    </AuthShell>
  )
}
