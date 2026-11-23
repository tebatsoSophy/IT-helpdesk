import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { EyeOff } from 'lucide-react'
import { commentsApi } from '../api/endpoints'
import { errorMessage } from '../api/client'
import { useAuth } from '../contexts/AuthContext'
import { Avatar, Button, ErrorNotice, Skeleton, Textarea } from './ui'
import { cn, formatDateTime } from '../utils/format'

export default function CommentThread({ ticketId, locked }: { ticketId: number; locked: boolean }) {
  const { isStaff } = useAuth()
  const queryClient = useQueryClient()
  const [text, setText] = useState('')
  const [internal, setInternal] = useState(false)

  const comments = useQuery({
    queryKey: ['comments', ticketId],
    queryFn: () => commentsApi.list(ticketId),
    refetchInterval: 15_000,
  })

  const add = useMutation({
    mutationFn: () => commentsApi.add(ticketId, text.trim(), internal),
    onSuccess: () => {
      setText('')
      setInternal(false)
      queryClient.invalidateQueries({ queryKey: ['comments', ticketId] })
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] })
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  return (
    <div>
      {comments.isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      )}
      {comments.isError && <ErrorNotice message={errorMessage(comments.error)} onRetry={() => comments.refetch()} />}
      {comments.data && comments.data.length === 0 && <p className="text-sm text-subtle">No replies yet.</p>}

      <ol className="space-y-4">
        {comments.data?.map((c) => (
          <li key={c.id} className={cn('flex gap-3 rounded-lg p-3', c.internal ? 'border border-amber-300 bg-amber-50' : 'bg-paper/70')}>
            <Avatar name={c.author.fullName} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                <span className="text-sm font-medium">{c.author.fullName}</span>
                <time className="text-xs text-subtle" dateTime={c.createdAt}>
                  {formatDateTime(c.createdAt)}
                </time>
                {c.internal && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-900">
                    <EyeOff className="h-3 w-3" aria-hidden />
                    Internal note, hidden from the requester
                  </span>
                )}
              </div>
              <p className="mt-1 whitespace-pre-wrap break-words text-sm">{c.content}</p>
            </div>
          </li>
        ))}
      </ol>

      {locked ? (
        <p className="mt-4 text-sm text-subtle">This ticket is closed, so no more replies can be added.</p>
      ) : (
        <form
          className="mt-5"
          onSubmit={(e) => {
            e.preventDefault()
            if (text.trim()) add.mutate()
          }}
        >
          <label htmlFor="reply" className="sr-only">
            Write a reply
          </label>
          <Textarea
            id="reply"
            rows={3}
            placeholder={internal ? 'Write an internal note for the support team' : 'Write a reply'}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className={internal ? 'border-amber-300 bg-amber-50' : undefined}
          />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            {isStaff ? (
              <label className="flex items-center gap-2 text-sm text-subtle">
                <input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} className="h-4 w-4 rounded border-rule accent-accent" />
                Internal note (the requester will not see it)
              </label>
            ) : (
              <span />
            )}
            <Button type="submit" variant="primary" loading={add.isPending} disabled={!text.trim()}>
              {internal ? 'Add internal note' : 'Send reply'}
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
