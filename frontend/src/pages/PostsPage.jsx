import { useCallback, useEffect, useState } from 'react'
import { MessagesSquare, Trash2 } from 'lucide-react'
import { AdminLayout } from '../components/layout'
import {
  AutoFields,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  Drawer,
  EmptyState,
  EntitySearchSelect,
  KeyValue,
  Pagination,
  Select,
  Table,
  TextInput,
} from '../components/ui'
import { PostsAPI } from '../lib/api'
import { useToast } from '../context/ToastContext'
import { formatDate, formatDateTime, formatNumber } from '../lib/formatters'

export default function PostsPage() {
  const toast = useToast()
  const [filters, setFilters] = useState({ band: '', bandLabel: '', isDeleted: '' })
  const [page, setPage] = useState(1)
  const limit = 20
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [busy, setBusy] = useState(false)
  const [selectedPostId, setSelectedPostId] = useState(null)
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
          <EntitySearchSelect
            role="band"
            placeholder="Search band name…"
            value={filters.band}
            valueLabel={filters.bandLabel}
            onSelect={(id, label) => {
              setPage(1)
              setFilters((f) => ({ ...f, band: id || '', bandLabel: label || '' }))
            }}
          />
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
          onRowClick={(p) => setSelectedPostId(p._id)}
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

      {selectedPostId && (
        <PostDetailDrawer
          post={data?.items?.find((p) => p._id === selectedPostId)}
          onClose={() => setSelectedPostId(null)}
          onRemove={(post) => {
            setSelectedPostId(null)
            setDeleteTarget(post)
          }}
        />
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

const POST_KNOWN_KEYS = ['_id', 'band', 'caption', 'likeCount', 'commentCount', 'isDeleted', 'createdAt', 'updatedAt']

function PostDetailDrawer({ post, onClose, onRemove }) {
  if (!post) return null

  const hasExtraFields = Object.keys(post).some((k) => !POST_KNOWN_KEYS.includes(k) && k !== '__v')

  return (
    <Drawer
      open
      onClose={onClose}
      title="Post detail"
      subtitle={post._id}
      footer={
        !post.isDeleted && (
          <Button variant="danger" onClick={() => onRemove(post)}>
            <Trash2 className="h-4 w-4" /> Remove post
          </Button>
        )
      }
    >
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          {post.band?.profilePicture && (
            <img src={post.band.profilePicture} alt="" className="h-10 w-10 rounded-full object-cover" />
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-100">{post.band?.fullName || 'Unknown band'}</p>
            <Badge tone={post.isDeleted ? 'danger' : 'success'}>{post.isDeleted ? 'Removed' : 'Live'}</Badge>
          </div>
        </div>

        <Card className="p-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Caption</p>
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-100">
            {post.caption || 'No caption.'}
          </p>
        </Card>

        <Card className="p-4">
          <KeyValue label="Post ID" value={post._id} mono />
          <KeyValue label="Likes" value={formatNumber(post.likeCount)} />
          <KeyValue label="Comments" value={formatNumber(post.commentCount)} />
          <KeyValue label="Posted" value={formatDateTime(post.createdAt)} />
          {post.updatedAt && <KeyValue label="Last updated" value={formatDateTime(post.updatedAt)} />}
        </Card>

        {hasExtraFields && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Additional details</p>
            <Card className="p-4">
              <AutoFields data={post} exclude={POST_KNOWN_KEYS} />
            </Card>
          </div>
        )}
      </div>
    </Drawer>
  )
}
