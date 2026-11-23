import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Plus } from 'lucide-react'
import { categoriesApi } from '../api/endpoints'
import { errorMessage } from '../api/client'
import { Button, EmptyState, ErrorNotice, Field, Input, Modal, PageHeader, Skeleton, Textarea } from '../components/ui'
import type { Category } from '../types'

export default function AdminCategoriesPage() {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<Category | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Category | null>(null)
  const categories = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list })

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['categories'] })
  const remove = useMutation({
    mutationFn: (id: number) => categoriesApi.remove(id),
    onSuccess: () => {
      toast.success('Category deleted')
      setDeleting(null)
      refresh()
    },
    onError: (e) => {
      toast.error(errorMessage(e))
      setDeleting(null)
    },
  })

  return (
    <>
      <PageHeader
        title="Categories"
        subtitle="Categories help requesters describe a problem and help you see where problems cluster."
        actions={
          <Button variant="primary" onClick={() => setEditing('new')}>
            <Plus className="h-4 w-4" aria-hidden />
            Add category
          </Button>
        }
      />
      {categories.isError && <ErrorNotice message={errorMessage(categories.error)} onRetry={() => categories.refetch()} />}
      <div className="overflow-hidden rounded-lg border border-rule bg-white">
        {categories.isLoading && (
          <div className="space-y-2 p-4">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
          </div>
        )}
        {categories.data?.length === 0 && <EmptyState title="No categories yet" body="Add the first one so requesters can classify their tickets." />}
        <ul>
          {categories.data?.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-4 border-b border-rule px-4 py-3 last:border-0">
              <div className="min-w-0">
                <p className="text-sm font-medium">{c.name}</p>
                {c.description && <p className="truncate text-sm text-subtle">{c.description}</p>}
              </div>
              <div className="flex shrink-0 gap-2">
                <Button size="sm" onClick={() => setEditing(c)}>
                  Edit
                </Button>
                <Button size="sm" variant="danger" onClick={() => setDeleting(c)}>
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {editing && <CategoryDialog category={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onDone={refresh} />}

      <Modal
        open={deleting !== null}
        title="Delete category?"
        onClose={() => setDeleting(null)}
        footer={
          <>
            <Button onClick={() => setDeleting(null)}>Keep it</Button>
            <Button variant="danger" loading={remove.isPending} onClick={() => deleting && remove.mutate(deleting.id)}>
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm">
          Delete <strong>{deleting?.name}</strong>? A category that existing tickets use cannot be deleted.
        </p>
      </Modal>
    </>
  )
}

function CategoryDialog({ category, onClose, onDone }: { category: Category | null; onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState(category?.name ?? '')
  const [description, setDescription] = useState(category?.description ?? '')
  const save = useMutation({
    mutationFn: () => {
      const body = { name: name.trim(), description: description.trim() || undefined }
      return category ? categoriesApi.update(category.id, body) : categoriesApi.create(body)
    },
    onSuccess: () => {
      toast.success(category ? 'Category updated' : 'Category added')
      onDone()
      onClose()
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  return (
    <Modal
      open
      title={category ? 'Edit category' : 'Add category'}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!name.trim()} loading={save.isPending} onClick={() => save.mutate()}>
            {category ? 'Save changes' : 'Add category'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Name" htmlFor="cat-name">
          <Input id="cat-name" value={name} maxLength={100} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Description" htmlFor="cat-desc" hint="Shown to help people choose the right category.">
          <Textarea id="cat-desc" rows={3} maxLength={1000} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
      </div>
    </Modal>
  )
}
