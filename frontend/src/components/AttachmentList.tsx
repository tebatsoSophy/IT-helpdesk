import { useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Download, FileText, Paperclip } from 'lucide-react'
import { attachmentsApi } from '../api/endpoints'
import { errorMessage } from '../api/client'
import { Button, ErrorNotice, Skeleton } from './ui'
import { formatBytes, formatDateTime } from '../utils/format'

const MAX_FILE = 10 * 1024 * 1024

export default function AttachmentList({ ticketId, locked }: { ticketId: number; locked: boolean }) {
  const queryClient = useQueryClient()
  const input = useRef<HTMLInputElement>(null)
  const list = useQuery({ queryKey: ['attachments', ticketId], queryFn: () => attachmentsApi.list(ticketId) })

  const upload = useMutation({
    mutationFn: (file: File) => attachmentsApi.upload(ticketId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attachments', ticketId] })
      toast.success('File attached')
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const download = useMutation({
    mutationFn: attachmentsApi.download,
    onError: (e) => toast.error(errorMessage(e, 'The file could not be downloaded.')),
  })

  const onPick = (files: FileList | null) => {
    const file = files?.[0]
    if (input.current) input.current.value = ''
    if (!file) return
    if (file.size > MAX_FILE) return void toast.error('That file is larger than 10 MB')
    if (file.size === 0) return void toast.error('That file is empty')
    upload.mutate(file)
  }

  return (
    <div>
      {list.isLoading && <Skeleton className="h-10 w-full" />}
      {list.isError && <ErrorNotice message={errorMessage(list.error)} onRetry={() => list.refetch()} />}
      {list.data && list.data.length === 0 && <p className="text-sm text-subtle">No files attached.</p>}
      {list.data && list.data.length > 0 && (
        <ul className="divide-y divide-rule rounded border border-rule">
          {list.data.map((a) => (
            <li key={a.id} className="flex items-center gap-3 px-3 py-2.5">
              <FileText className="h-4 w-4 shrink-0 text-subtle" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{a.fileName}</p>
                <p className="text-xs text-subtle">
                  {formatBytes(a.size)}, added by {a.uploadedBy.fullName} on {formatDateTime(a.uploadedAt)}
                </p>
              </div>
              <Button size="sm" onClick={() => download.mutate(a)} aria-label={`Download ${a.fileName}`} disabled={download.isPending}>
                <Download className="h-3.5 w-3.5" aria-hidden />
                Download
              </Button>
            </li>
          ))}
        </ul>
      )}
      {!locked && (
        <div className="mt-3">
          <input ref={input} type="file" hidden onChange={(e) => onPick(e.target.files)} />
          <Button size="sm" loading={upload.isPending} onClick={() => input.current?.click()}>
            <Paperclip className="h-3.5 w-3.5" aria-hidden />
            Attach a file
          </Button>
        </div>
      )}
    </div>
  )
}
