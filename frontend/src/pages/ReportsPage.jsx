import { useCallback, useEffect, useState } from 'react'
import { Flag, ShieldCheck, Trash2 } from 'lucide-react'
import { AdminLayout } from '../components/layout'
import {
  AutoFields,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  Drawer,
  EmptyState,
  KeyValue,
  Pagination,
  Select,
  StatusBadge,
  Table,
} from '../components/ui'
import { ReportsAPI } from '../lib/api'
import { useToast } from '../context/ToastContext'
import { formatDateTime, titleCase } from '../lib/formatters'

const STATUS_OPTIONS = ['pending', 'resolved', 'dismissed', 'all']
const TYPE_OPTIONS = ['review', 'post', 'comment']

const TYPE_TONE = { review: 'warning', post: 'info', comment: 'neutral' }

const REPORT_KNOWN_KEYS = ['_id', '__v', 'type', 'status', 'targetId', 'reportedBy', 'resolvedBy', 'createdAt', 'updatedAt', 'resolvedAt']
const TARGET_KNOWN_KEYS = ['_id', '__v', 'caption', 'comment', 'text', 'content', 'rating', 'band', 'user', 'createdAt', 'updatedAt']

function getContentPreview(report) {
  const t = report.targetId
  if (!t || typeof t !== 'object') return '—'
  if (report.type === 'review') {
    const text = t.comment || t.text || t.review
    return text ? text : t.rating != null ? `${t.rating}★ rating` : 'Review'
  }
  if (report.type === 'post') return t.caption || 'Untitled post'
  if (report.type === 'comment') return t.text || t.comment || t.content || 'Comment'
  return t.caption || t.text || t.comment || '—'
}

export default function ReportsPage() {
  const [filters, setFilters] = useState({ status: 'pending', type: '' })
  const [page, setPage] = useState(1)
  const limit = 20
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedId, setSelectedId] = useState(null)

  const fetchList = useCallback(() => {
    setLoading(true)
    setError('')
    ReportsAPI.list({ ...filters, page, limit })
      .then((res) => {
        const items = res.data?.items || res.data?.reports || []
        setData({ items, pagination: res.data?.pagination })
      })
      .catch((err) => setError(err?.message || 'Failed to load reports.'))
      .finally(() => setLoading(false))
  }, [filters, page])

  useEffect(() => {
    fetchList()
  }, [fetchList])

  function updateFilter(key, value) {
    setPage(1)
    setFilters((f) => ({ ...f, [key]: value }))
  }

  const items = data?.items || []
  const selectedReport = items.find((r) => r._id === selectedId)

  const columns = [
    { key: 'type', header: 'Type', render: (r) => <Badge tone={TYPE_TONE[r.type] || 'neutral'}>{titleCase(r.type)}</Badge> },
    { key: 'content', header: 'Reported content', className: 'max-w-sm truncate', render: (r) => getContentPreview(r) },
    {
      key: 'reportedBy',
      header: 'Reported by',
      render: (r) => (
        <div>
          <p className="text-sm font-medium text-slate-100">{r.reportedBy?.fullName || '—'}</p>
          <p className="text-xs text-slate-500">{r.reportedBy?.email}</p>
        </div>
      ),
    },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'created', header: 'Reported', render: (r) => formatDateTime(r.createdAt) },
  ]

  return (
    <AdminLayout title="Reports" description="Triage user-reported reviews, posts, and comments">
      <Card className="mb-4 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Select value={filters.status} onChange={(e) => updateFilter('status', e.target.value)}>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s === 'all' ? '' : s}>
                {s === 'all' ? 'All statuses' : titleCase(s)}
              </option>
            ))}
          </Select>
          <Select value={filters.type} onChange={(e) => updateFilter('type', e.target.value)}>
            <option value="">All types</option>
            {TYPE_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {titleCase(t)}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      <Card>
        <Table
          columns={columns}
          rows={items}
          rowKey={(r) => r._id}
          loading={loading}
          onRowClick={(r) => setSelectedId(r._id)}
          emptyState={<EmptyState icon={Flag} title="No reports found" description="Try adjusting your filters." />}
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

      {selectedReport && (
        <ReportDetailDrawer report={selectedReport} onClose={() => setSelectedId(null)} onResolved={fetchList} />
      )}
    </AdminLayout>
  )
}

function ReportDetailDrawer({ report, onClose, onResolved }) {
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const [confirmAction, setConfirmAction] = useState(null)

  const target = report.targetId && typeof report.targetId === 'object' ? report.targetId : null
  const isPending = report.status === 'pending'
  const hasExtraReportFields = Object.keys(report).some((k) => !REPORT_KNOWN_KEYS.includes(k))
  const hasExtraTargetFields = target && Object.keys(target).some((k) => !TARGET_KNOWN_KEYS.includes(k))

  async function handleResolve(action) {
    setBusy(true)
    try {
      await ReportsAPI.resolve(report._id, action)
      toast.success(action === 'remove_content' ? 'Content removed and report resolved.' : 'Report dismissed.')
      setConfirmAction(null)
      onResolved()
      onClose()
    } catch (err) {
      toast.error(err?.message || 'Failed to resolve report.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Drawer
      open
      onClose={onClose}
      title="Report detail"
      subtitle={report._id}
      footer={
        isPending && (
          <>
            <Button variant="secondary" onClick={() => setConfirmAction('dismiss')}>
              <ShieldCheck className="h-4 w-4" /> Dismiss
            </Button>
            <Button variant="danger" onClick={() => setConfirmAction('remove_content')}>
              <Trash2 className="h-4 w-4" /> Remove content
            </Button>
          </>
        )
      }
    >
      <div className="space-y-5">
        <div className="flex items-center gap-2">
          <Badge tone={TYPE_TONE[report.type] || 'neutral'}>{titleCase(report.type)}</Badge>
          <StatusBadge status={report.status} />
        </div>

        <Card className="p-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Reported content</p>
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-100">
            {getContentPreview(report)}
          </p>
          {target?.rating != null && (
            <p className="mt-2 text-xs text-slate-400">Rating: <span className="text-slate-200">{target.rating} / 5</span></p>
          )}
        </Card>

        <Card className="p-4">
          <KeyValue label="Report ID" value={report._id} mono />
          <KeyValue label="Reported by" value={report.reportedBy?.fullName} />
          <KeyValue label="Reporter email" value={report.reportedBy?.email} />
          <KeyValue label="Reported" value={formatDateTime(report.createdAt)} />
          {report.resolvedBy && <KeyValue label="Resolved by" value={report.resolvedBy?.fullName} />}
          {report.resolvedAt && <KeyValue label="Resolved" value={formatDateTime(report.resolvedAt)} />}
        </Card>

        {hasExtraReportFields && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Additional report details</p>
            <Card className="p-4">
              <AutoFields data={report} exclude={REPORT_KNOWN_KEYS} />
            </Card>
          </div>
        )}

        {hasExtraTargetFields && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Content details</p>
            <Card className="p-4">
              <AutoFields data={target} exclude={TARGET_KNOWN_KEYS} />
            </Card>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmAction === 'remove_content'}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => handleResolve('remove_content')}
        title="Remove this content?"
        description="This soft-deletes the underlying review/post/comment and marks the report as resolved."
        confirmLabel="Remove content"
        variant="danger"
        loading={busy}
      />

      <ConfirmDialog
        open={confirmAction === 'dismiss'}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => handleResolve('dismiss')}
        title="Dismiss this report?"
        description="The content stays untouched and the report is marked as dismissed."
        confirmLabel="Dismiss report"
        loading={busy}
      />
    </Drawer>
  )
}
