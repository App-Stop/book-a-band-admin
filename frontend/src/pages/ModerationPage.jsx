import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Flag, LifeBuoy, Save, ShieldCheck, Trash2 } from 'lucide-react'
import { AdminLayout } from '../components/layout'
import {
  AutoFields,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  Drawer,
  EmptyState,
  ExternalLink,
  Field,
  FilterBar,
  KeyValue,
  LoadingBlock,
  Pagination,
  SearchInput,
  Select,
  StatusBadge,
  Table,
  Tabs,
  Textarea,
} from '../components/ui'
import { ReportsAPI, SupportMessagesAPI } from '../lib/api'
import { useToast } from '../context/ToastContext'
import { findUrl, formatDateTime, titleCase } from '../lib/formatters'

const REPORT_STATUS_OPTIONS = ['pending', 'resolved', 'dismissed', 'all']
const REPORT_TYPE_OPTIONS = ['review', 'post', 'comment']
const TYPE_TONE = { review: 'warning', post: 'info', comment: 'neutral' }

const SUPPORT_STATUS_OPTIONS = ['new', 'pending', 'in_progress', 'resolved', 'closed']

const REPORT_KNOWN_KEYS = ['_id', '__v', 'type', 'status', 'targetId', 'reportedBy', 'resolvedBy', 'createdAt', 'updatedAt', 'resolvedAt']
const LOCATION_KEY = /location|address|coordinates|latitude|longitude|geo|lat$|lng$|lon$/i
const TARGET_KNOWN_KEYS = ['_id', '__v', 'post', 'postId', 'caption', 'comment', 'text', 'content', 'rating', 'band', 'user', 'createdAt', 'updatedAt']

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

export default function ModerationPage() {
  const [tab, setTab] = useState('reports')
  const [reportsPendingCount, setReportsPendingCount] = useState(null)

  const tabs = [
    { key: 'reports', label: 'Reports', count: reportsPendingCount ?? undefined },
    { key: 'support', label: 'Support Tickets' },
  ]

  return (
    <AdminLayout title="Moderation" description="Triage user-reported content and incoming support tickets">
      <div className="mb-4">
        <Tabs tabs={tabs} active={tab} onChange={setTab} />
      </div>
      {tab === 'reports' && <ReportsTab onPendingCount={setReportsPendingCount} />}
      {tab === 'support' && <SupportTab />}
    </AdminLayout>
  )
}

/* -------------------------------- Reports -------------------------------- */

function ReportsTab({ onPendingCount }) {
  const [filters, setFilters] = useState({ status: '', type: '' })
  const [page, setPage] = useState(1)
  const limit = 20
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchParams] = useSearchParams()
  const [selectedId, setSelectedId] = useState(searchParams.get('open'))

  const fetchList = useCallback(() => {
    setLoading(true)
    setError('')
    ReportsAPI.list({ ...filters, status: filters.status || 'all', page, limit })
      .then((res) => {
        const items = res.data?.items || res.data?.reports || []
        setData({ items, pagination: res.data?.pagination })
        if (filters.status === 'pending') onPendingCount?.(res.data?.pagination?.total)
      })
      .catch((err) => setError(err?.message || 'Failed to load reports.'))
      .finally(() => setLoading(false))
  }, [filters, page, onPendingCount])

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
    {
      key: 'content',
      header: 'Reported content',
      className: 'max-w-[160px] truncate sm:max-w-[220px] lg:max-w-sm',
      render: (r) => getContentPreview(r),
    },
    {
      key: 'reportedBy',
      header: 'Reported by',
      headClassName: 'hidden md:table-cell',
      className: 'hidden md:table-cell',
      render: (r) => (
        <div>
          <p className="text-sm font-medium text-slate-100">{r.reportedBy?.fullName || '—'}</p>
          <p className="text-xs text-slate-500">{r.reportedBy?.email}</p>
        </div>
      ),
    },
    { key: 'status', header: 'Status', className: 'whitespace-nowrap', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'created',
      header: 'Reported',
      headClassName: 'hidden lg:table-cell',
      className: 'hidden whitespace-nowrap lg:table-cell',
      render: (r) => formatDateTime(r.createdAt),
    },
  ]

  return (
    <>
      <Card className="mb-4 p-4">
        <FilterBar
          values={filters}
          onChange={updateFilter}
          onClear={() => {
            setPage(1)
            setFilters({ status: '', type: '' })
          }}
          fields={[
            { key: 'status', label: 'Status', type: 'select', options: REPORT_STATUS_OPTIONS.filter((v) => v !== 'all').map((v) => ({ value: v, label: titleCase(v) })) },
            { key: 'type', label: 'Type', type: 'select', options: REPORT_TYPE_OPTIONS.map((v) => ({ value: v, label: titleCase(v) })) },
          ]}
        />
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
    </>
  )
}

function ReportDetailDrawer({ report, onClose, onResolved }) {
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const [confirmAction, setConfirmAction] = useState(null)

  const target = report.targetId && typeof report.targetId === 'object' ? report.targetId : null
  const isPending = report.status === 'pending'
  const hasExtraReportFields = Object.keys(report).some((k) => !REPORT_KNOWN_KEYS.includes(k))
  const hasExtraTargetFields =
    target && Object.keys(target).some((k) => !TARGET_KNOWN_KEYS.includes(k) && !LOCATION_KEY.test(k))
  const postUrl = report.type === 'comment' && target ? findUrl(target.post) || findUrl(target.postUrl) : report.type === 'post' ? findUrl(target) : null

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
      // subtitle={report._id}
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
          {postUrl && (
            <p className="mt-3 text-sm">
              <ExternalLink href={postUrl}>Click here to view post</ExternalLink>
            </p>
          )}
        </Card>

        <Card className="p-4">
          {/* <KeyValue label="Report ID" value={report._id} mono />*/}
          {/* <KeyValue label="Reported by" value={report.reportedBy?.fullName} />*/}
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
              <AutoFields data={target} exclude={TARGET_KNOWN_KEYS} excludeMatch={LOCATION_KEY} />
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

/* -------------------------------- Support -------------------------------- */

function SupportTab() {
  const [filters, setFilters] = useState({ status: '', search: '' })
  const [page, setPage] = useState(1)
  const limit = 20
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedId, setSelectedId] = useState(null)

  const fetchList = useCallback(() => {
    setLoading(true)
    setError('')
    SupportMessagesAPI.list({ ...filters, page, limit })
      .then((res) => setData(res.data))
      .catch((err) => setError(err?.message || 'Failed to load support messages.'))
      .finally(() => setLoading(false))
  }, [filters, page])

  useEffect(() => {
    fetchList()
  }, [fetchList])

  function updateFilter(key, value) {
    setPage(1)
    setFilters((f) => ({ ...f, [key]: value }))
  }

  const columns = [
    {
      key: 'from',
      header: 'From',
      render: (m) => (
        <div>
          <p className="text-sm font-medium text-slate-100">{m.name || '—'}</p>
          <p className="text-xs text-slate-500">{m.email}</p>
        </div>
      ),
    },
    { key: 'message', header: 'Message', className: 'max-w-sm truncate', render: (m) => m.message },
    { key: 'status', header: 'Status', render: (m) => <StatusBadge status={m.status} /> },
    { key: 'created', header: 'Received', render: (m) => formatDateTime(m.createdAt) },
  ]

  return (
    <>
      <Card className="mb-4 p-4">
        <FilterBar
          search={filters.search}
          onSearch={(v) => updateFilter('search', v)}
          placeholder="Search name, email, message…"
          values={filters}
          onChange={updateFilter}
          onClear={() => {
            setPage(1)
            setFilters({ status: '', search: '' })
          }}
          fields={[{ key: 'status', label: 'Status', type: 'select', options: SUPPORT_STATUS_OPTIONS.map((v) => ({ value: v, label: titleCase(v) })) }]}
        />
      </Card>

      <Card>
        <Table
          columns={columns}
          rows={data?.items || []}
          rowKey={(m) => m._id}
          loading={loading}
          onRowClick={(m) => setSelectedId(m._id)}
          emptyState={<EmptyState icon={LifeBuoy} title="No support messages" description="Try adjusting your filters." />}
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

      {selectedId && <SupportMessageDrawer id={selectedId} onClose={() => setSelectedId(null)} onChanged={fetchList} />}
    </>
  )
}

function SupportMessageDrawer({ id, onClose, onChanged }) {
  const toast = useToast()
  const [message, setMessage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [adminNote, setAdminNote] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    SupportMessagesAPI.get(id)
      .then((res) => {
        setMessage(res.data)
        setStatus(res.data?.status || '')
        setAdminNote(res.data?.adminNote || '')
      })
      .catch((err) => setError(err?.message || 'Failed to load message.'))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  async function handleSave() {
    if (!status.trim()) {
      toast.error('Status is required.')
      return
    }
    setBusy(true)
    try {
      await SupportMessagesAPI.updateStatus(id, { status: status.trim(), adminNote: adminNote.trim() || undefined })
      toast.success('Support message updated.')
      load()
      onChanged()
    } catch (err) {
      toast.error(err?.message || 'Failed to update message.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Drawer
      open
      onClose={onClose}
      title={message?.name || 'Support message'}
      subtitle={message?.email}
      footer={
        message && (
          <Button onClick={handleSave} loading={busy}>
            <Save className="h-4 w-4" /> Save status
          </Button>
        )
      }
    >
      {loading && <LoadingBlock />}
      {error && !loading && <p className="text-sm text-danger-400">{error}</p>}

      {message && (
        <div className="space-y-5">
          <StatusBadge status={message.status} />

          <Card className="p-4">
            <KeyValue label="Name" value={message.name} />
            <KeyValue label="Email" value={message.email} />
            <KeyValue label="Received" value={formatDateTime(message.createdAt)} />
          </Card>

          <Card className="p-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Message</p>
            <p className="whitespace-pre-wrap text-sm text-slate-200">{message.message}</p>
          </Card>

          <Card className="space-y-3 p-4">
            <Field label="Status">
              <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                {SUPPORT_STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {titleCase(s)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Admin note (optional)">
              <Textarea rows={3} value={adminNote} onChange={(e) => setAdminNote(e.target.value)} placeholder="Internal note about this message…" />
            </Field>
          </Card>
        </div>
      )}
    </Drawer>
  )
}
