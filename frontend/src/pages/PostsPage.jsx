import { useCallback, useEffect, useState } from 'react'
import { MessagesSquare, Trash2 } from 'lucide-react'
import { AdminLayout } from '../components/layout'
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Pagination,
  RawPanel,
  Select,
  Table,
  TextInput,
} from '../components/ui'
import { PostsAPI } from '../lib/api'
import { useToast } from '../context/ToastContext'
import { formatDate, formatNumber } from '../lib/formatters'

export default function PostsPage() {
  const toast = useToast()
  const [filters, setFilters] = useState({ band: '', isDeleted: '' })
  const [page, setPage] = useState(1)
  const limit = 20
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [busy, setBusy] = useState(false)
  const [rawId, setRawId] = useState(null)
  const [commentId, setCommentId] = useState('')
  const [commentBusy, setCommentBusy] = useState(false)
  const [commentDeleteConfirm, setCommentDeleteConfirm] = useState(false)

  const fetchList = useCallback(() => {
    setLoading(true)
    setError('')
    PostsAPI.list({ ...filters, page, limit })
      .then((res) => setData(res.data))
      .catch((err) => setError(err?.message || 'Failed to load posts.'))
      .finally(() => setLoading(false))
  }, [filters, page])

  useEffect(() => {
    fetchList()
  }, [fetchList])

  function updateFilter(key, value) {
    setPage(1)
    setFilters((f) => ({ ...f, [key]: value }))
  }

  async function handleDeletePost() {
    if (!deleteTarget) return
    setBusy(true)
    try {
      await PostsAPI.remove(deleteTarget._id)
      toast.success('Post removed.')
      setDeleteTarget(null)
      fetchList()
    } catch (err) {
      toast.error(err?.message || 'Failed to delete post.')
    } finally {
      setBusy(false)
    }
  }

  async function handleDeleteComment() {
    if (!commentId.trim()) return
    setCommentBusy(true)
    try {
      await PostsAPI.removeComment(commentId.trim())
      toast.success('Comment removed.')
      setCommentId('')
      setCommentDeleteConfirm(false)
    } catch (err) {
      toast.error(err?.message || 'Failed to delete comment.')
    } finally {
      setCommentBusy(false)
    }
  }

  const rawRow = data?.items?.find((p) => p._id === rawId)

  const columns = [
    {
      key: 'band',
      header: 'Band',
      render: (p) => (
        <div className="flex items-center gap-2.5">
          {p.band?.profilePicture && (
            <img src={p.band.profilePicture} alt="" className="h-7 w-7 rounded-full object-cover" />
          )}
          <span className="text-sm text-slate-200">{p.band?.fullName || '—'}</span>
        </div>
      ),
    },
    { key: 'caption', header: 'Caption', className: 'max-w-xs truncate', render: (p) => p.caption || '—' },
    { key: 'likes', header: 'Likes', render: (p) => formatNumber(p.likeCount) },
    { key: 'comments', header: 'Comments', render: (p) => formatNumber(p.commentCount) },
    { key: 'status', header: 'Status', render: (p) => <Badge tone={p.isDeleted ? 'danger' : 'success'}>{p.isDeleted ? 'Removed' : 'Live'}</Badge> },
    { key: 'created', header: 'Posted', render: (p) => formatDate(p.createdAt) },
    {
      key: 'actions',
      header: '',
      headClassName: 'text-right',
      className: 'text-right',
      render: (p) => (
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setRawId(p._id)
            }}
            className="focus-ring rounded-lg px-2 py-1 text-xs text-slate-400 hover:bg-white/5 hover:text-slate-200"
          >
            Details
          </button>
          {!p.isDeleted && (
            <Button
              size="sm"
              variant="danger"
              onClick={(e) => {
                e.stopPropagation()
                setDeleteTarget(p)
              }}
            >
              <Trash2 className="h-3.5 w-3.5" /> Remove
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <AdminLayout title="Posts & Comments" description="Moderate band posts and individual comments">
      <Card className="mb-4 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <TextInput placeholder="Band ID" value={filters.band} onChange={(e) => updateFilter('band', e.target.value)} />
          <Select value={filters.isDeleted} onChange={(e) => updateFilter('isDeleted', e.target.value)}>
            <option value="">All posts</option>
            <option value="false">Live only</option>
            <option value="true">Removed only</option>
          </Select>
        </div>
      </Card>

      <Card className="mb-4 p-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Remove a comment by ID</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <TextInput
            placeholder="Comment ID"
            value={commentId}
            onChange={(e) => setCommentId(e.target.value)}
            className="sm:max-w-sm"
          />
          <Button
            variant="danger"
            disabled={!commentId.trim()}
            onClick={() => setCommentDeleteConfirm(true)}
          >
            <Trash2 className="h-4 w-4" /> Remove comment
          </Button>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Removing a top-level comment also removes its replies. Removing a reply only affects that reply.
        </p>
      </Card>

      <Card>
        <Table
          columns={columns}
          rows={data?.items || []}
          rowKey={(p) => p._id}
          loading={loading}
          emptyState={<EmptyState icon={MessagesSquare} title="No posts found" description="Try adjusting your filters." />}
        />
        {data?.pagination && (
          <Pagination
            page={data.pagination.page}
            totalPages={data.pagination.totalPages}
            total={data.pagination.total}
            limit={data.pagination.limit}
            onPageChange={setPage}
          />
        )}
      </Card>

      {error && !data && <p className="mt-4 text-sm text-danger-400">{error}</p>}

      {rawRow && (
        <div className="mt-4">
          <RawPanel data={rawRow} label={`Post ${rawRow._id}`} />
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeletePost}
        title="Remove this post?"
        description="This soft-deletes the post and decrements the band's post count."
        confirmLabel="Remove post"
        variant="danger"
        loading={busy}
      />

      <ConfirmDialog
        open={commentDeleteConfirm}
        onClose={() => setCommentDeleteConfirm(false)}
        onConfirm={handleDeleteComment}
        title="Remove this comment?"
        description={`Comment ID: ${commentId}`}
        confirmLabel="Remove comment"
        variant="danger"
        loading={commentBusy}
      />
    </AdminLayout>
  )
}
