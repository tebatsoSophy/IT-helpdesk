import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '../contexts/AuthContext'
import { errorMessage } from '../api/client'
import AuthShell from '../components/AuthShell'
import { Button, Field, Input } from '../components/ui'

const schema = z
  .object({
    fullName: z.string().trim().min(1, 'Enter your full name').max(255),
    email: z.string().min(1, 'Enter your email address').email('Enter a valid email address'),
    password: z.string().min(8, 'Use at least 8 characters').max(100),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'The passwords do not match' })
type Form = z.infer<typeof schema>

export default function RegisterPage() {
  const { user, register: signUp } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Form>({ resolver: zodResolver(schema) })

  if (user) return <Navigate to="/dashboard" replace />

  const onSubmit = async (v: Form) => {
    setError('')
    try {
      await signUp(v.email, v.password, v.fullName)
      navigate('/dashboard', { replace: true })
    } catch (e) {
      setError(errorMessage(e, 'We could not create your account. Please try again.'))
    }
  }

  return (
    <AuthShell title="Create your account" subtitle="You will be able to raise tickets and follow their progress.">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {error && (
          <div role="alert" className="rounded border border-crit/30 bg-red-50 px-3 py-2 text-sm text-crit">
            {error}
          </div>
        )}
        <Field label="Full name" htmlFor="fullName" error={errors.fullName?.message}>
          <Input id="fullName" autoComplete="name" autoFocus {...register('fullName')} />
        </Field>
        <Field label="Email" htmlFor="email" error={errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" {...register('email')} />
        </Field>
        <Field label="Password" htmlFor="password" error={errors.password?.message} hint="At least 8 characters.">
          <Input id="password" type="password" autoComplete="new-password" {...register('password')} />
        </Field>
        <Field label="Confirm password" htmlFor="confirm" error={errors.confirm?.message}>
          <Input id="confirm" type="password" autoComplete="new-password" {...register('confirm')} />
        </Field>
        <Button type="submit" variant="primary" loading={isSubmitting} className="w-full">
          Create account
        </Button>
      </form>
      <p className="mt-6 text-sm text-subtle">
        Already registered?{' '}
        <Link to="/login" className="font-medium text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </AuthShell>
  )
}
