import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { Paperclip, X } from 'lucide-react'
import { attachmentsApi, categoriesApi, ticketsApi } from '../api/endpoints'
import { errorMessage } from '../api/client'
import { Button, Field, Input, PageHeader, Panel, Select, Textarea } from '../components/ui'
import { PRIORITIES, PRIORITY_LABEL, type Priority } from '../types'
import { formatBytes } from '../utils/format'

const MAX_FILE = 10 * 1024 * 1024

const schema = z.object({
  title: z.string().trim().min(5, 'Give the problem a short title (at least 5 characters)').max(255),
  description: z.string().trim().min(10, 'Describe what is wrong (at least 10 characters)').max(4000),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  categoryId: z.string().optional(),
})
type Form = z.infer<typeof schema>

const PRIORITY_HELP: Record<Priority, string> = {
  LOW: 'A minor annoyance, with a workaround',
  MEDIUM: 'It slows you down but you can still work',
  HIGH: 'You cannot do an important part of your job',
  CRITICAL: 'A whole team or a critical service is down',
}

export default function NewTicketPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const fileInput = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<File[]>([])
  const categories = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list, staleTime: 5 * 60_000 })

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<Form>({ resolver: zodResolver(schema), defaultValues: { priority: 'MEDIUM', categoryId: '' } })
  const priority = watch('priority')

  const create = useMutation({
    mutationFn: async (v: Form) => {
      const ticket = await ticketsApi.create({
        title: v.title,
        description: v.description,
        priority: v.priority,
        categoryId: v.categoryId ? Number(v.categoryId) : undefined,
      })
      const failed: string[] = []
      for (const f of files) {
        try {
          await attachmentsApi.upload(ticket.id, f)
        } catch {
          failed.push(f.name)
        }
      }
      return { ticket, failed }
    },
    onSuccess: ({ ticket, failed }) => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
      queryClient.invalidateQueries({ queryKey: ['summary'] })
      if (failed.length) toast.error(`Ticket #${ticket.id} was created, but these files could not be uploaded: ${failed.join(', ')}`)
      else toast.success(`Ticket #${ticket.id} created`)
      navigate(`/tickets/${ticket.id}`)
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const addFiles = (list: FileList | null) => {
    if (!list) return
    const next: File[] = []
    for (const f of Array.from(list)) {
      if (f.size > MAX_FILE) toast.error(`${f.name} is larger than 10 MB`)
      else if (f.size === 0) toast.error(`${f.name} is empty`)
      else next.push(f)
    }
    setFiles((prev) => [...prev, ...next])
    if (fileInput.current) fileInput.current.value = ''
  }

  return (
    <>
      <PageHeader title="Report a problem" subtitle="The more detail you give, the faster we can help." />
      <form onSubmit={handleSubmit((v) => create.mutate(v))} noValidate>
        <Panel className="max-w-3xl" bodyClassName="space-y-5">
          <Field label="What is the problem?" htmlFor="title" error={errors.title?.message}>
            <Input id="title" placeholder="For example: Cannot connect to the VPN from home" autoFocus {...register('title')} />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Category" htmlFor="categoryId">
              <Select id="categoryId" {...register('categoryId')}>
                <option value="">Not sure</option>
                {categories.data?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="How urgent is it?" htmlFor="priority" hint={PRIORITY_HELP[priority]}>
              <Select id="priority" {...register('priority')}>
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {PRIORITY_LABEL[p]}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Details" htmlFor="description" error={errors.description?.message} hint="What happened, what you expected, and any error message you saw.">
            <Textarea id="description" rows={7} {...register('description')} />
          </Field>

          <div>
            <p className="mb-1.5 text-sm font-medium">Attachments</p>
            <input ref={fileInput} type="file" multiple hidden onChange={(e) => addFiles(e.target.files)} />
            <Button type="button" onClick={() => fileInput.current?.click()}>
              <Paperclip className="h-4 w-4" aria-hidden />
              Add files
            </Button>
            <span className="ml-3 text-xs text-subtle">Screenshots or logs, up to 10 MB each.</span>
            {files.length > 0 && (
              <ul className="mt-3 divide-y divide-rule rounded border border-rule">
                {files.map((f, i) => (
                  <li key={`${f.name}-${i}`} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                    <span className="truncate">{f.name}</span>
                    <span className="flex shrink-0 items-center gap-3 text-xs text-subtle">
                      {formatBytes(f.size)}
                      <button type="button" aria-label={`Remove ${f.name}`} onClick={() => setFiles((p) => p.filter((_, j) => j !== i))} className="rounded p-1 hover:bg-paper hover:text-ink">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex justify-end gap-2 border-t border-rule pt-4">
            <Link to="/my-tickets">
              <Button type="button">Cancel</Button>
            </Link>
            <Button type="submit" variant="primary" loading={create.isPending}>
              Submit ticket
            </Button>
          </div>
        </Panel>
      </form>
    </>
  )
}
