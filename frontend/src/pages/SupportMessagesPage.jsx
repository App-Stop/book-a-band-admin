import { useCallback, useEffect, useState } from 'react'
import { LifeBuoy, Save } from 'lucide-react'
import { AdminLayout } from '../components/layout'
import {
  Button,
  Card,
  Drawer,
  EmptyState,
  Field,
  KeyValue,
  LoadingBlock,
  Pagination,
  RawPanel,
  SearchInput,
  StatusBadge,
  SuggestInput,
  Table,
  Textarea,
} from '../components/ui'
import { SupportMessagesAPI } from '../lib/api'
import { useToast } from '../context/ToastContext'
import { formatDateTime } from '../lib/formatters'

const STATUS_SUGGESTIONS = ['new', 'pending', 'in_progress', 'resolved', 'closed']

export default function SupportMessagesPage() {
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
    <AdminLayout title="Support Messages" description="Respond to and triage incoming support requests">
      <Card className="mb-4 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <SearchInput placeholder="Search name, email, message…" value={filters.search} onChange={(e) => updateFilter('search', e.target.value)} />
          <SuggestInput
            suggestions={STATUS_SUGGESTIONS}
            placeholder="Status"
            value={filters.status}
            onChange={(e) => updateFilter('status', e.target.value)}
          />
        </div>
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
    </AdminLayout>
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
              <SuggestInput suggestions={STATUS_SUGGESTIONS} value={status} onChange={(e) => setStatus(e.target.value)} />
            </Field>
            <Field label="Admin note (optional)">
              <Textarea rows={3} value={adminNote} onChange={(e) => setAdminNote(e.target.value)} placeholder="Internal note about this message…" />
            </Field>
          </Card>

          <RawPanel data={message} label="Raw support message" />
        </div>
      )}
    </Drawer>
  )
}
