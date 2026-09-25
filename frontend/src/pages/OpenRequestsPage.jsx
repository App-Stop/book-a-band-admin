import { useCallback, useEffect, useState } from 'react'
import { Inbox, TimerOff } from 'lucide-react'
import { AdminLayout } from '../components/layout'
import {
  AutoFields,
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
import { OpenRequestsAPI } from '../lib/api'
import { useToast } from '../context/ToastContext'
import { formatDateTime } from '../lib/formatters'

const STATUS_OPTIONS = ['open', 'closed', 'expired', 'cancelled']
const REQUEST_KNOWN_KEYS = ['_id', 'user', 'status', 'createdAt', 'updatedAt']

export default function OpenRequestsPage() {
  const toast = useToast()
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const limit = 20
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expireTarget, setExpireTarget] = useState(null)
  const [busy, setBusy] = useState(false)
  const [selectedId, setSelectedId] = useState(null)

  const fetchList = useCallback(() => {
    setLoading(true)
    setError('')
    OpenRequestsAPI.list({ status, page, limit })
      .then((res) => setData(res.data))
      .catch((err) => setError(err?.message || 'Failed to load open requests.'))
      .finally(() => setLoading(false))
  }, [status, page])

  useEffect(() => {
    fetchList()
  }, [fetchList])

  async function handleExpire() {
    if (!expireTarget) return
    setBusy(true)
    try {
      await OpenRequestsAPI.expire(expireTarget._id)
      toast.success('Request expired.')
      setExpireTarget(null)
      fetchList()
    } catch (err) {
      toast.error(err?.message || 'Failed to expire request.')
    } finally {
      setBusy(false)
    }
  }

  const columns = [
    {
      key: 'requester',
      header: 'Requester',
      render: (r) => (
        <div>
          <p className="text-sm font-medium text-slate-100">{r.user?.fullName || '—'}</p>
          <p className="text-xs text-slate-500">{r.user?.email}</p>
        </div>
      ),
    },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'created', header: 'Created', render: (r) => formatDateTime(r.createdAt) },
    {
      key: 'actions',
      header: '',
      headClassName: 'text-right',
      className: 'text-right',
      render: (r) => (
        <div className="flex justify-end gap-2">
          {r.status === 'open' && (
            <Button
              size="sm"
              variant="danger"
              onClick={(e) => {
                e.stopPropagation()
                setExpireTarget(r)
              }}
            >
              <TimerOff className="h-3.5 w-3.5" /> Expire
            </Button>
          )}
        </div>
      ),
    },
  ]

  const selectedRequest = data?.items?.find((r) => r._id === selectedId)

  return (
    <AdminLayout title="Open Requests" description="Manage open booking requests posted by customers">
      <Card className="mb-4 p-4">
        <div className="grid grid-cols-1 gap-3 sm:max-w-xs">
          <Select value={status} onChange={(e) => (setPage(1), setStatus(e.target.value))}>
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      <Card>
        <Table
          columns={columns}
          rows={data?.items || []}
          rowKey={(r) => r._id}
          loading={loading}
          onRowClick={(r) => setSelectedId(r._id)}
          emptyState={<EmptyState icon={Inbox} title="No open requests" description="Try adjusting your filters." />}
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

      {selectedRequest && (
        <OpenRequestDrawer
          request={selectedRequest}
          onClose={() => setSelectedId(null)}
          onExpire={(r) => {
            setSelectedId(null)
            setExpireTarget(r)
          }}
        />
      )}

      <ConfirmDialog
        open={Boolean(expireTarget)}
        onClose={() => setExpireTarget(null)}
        onConfirm={handleExpire}
        title="Expire this request?"
        description="All pending offers on this request will also be force-expired, and the requester plus any pending bands will be notified."
        confirmLabel="Expire request"
        variant="danger"
        loading={busy}
      />
    </AdminLayout>
  )
}

function OpenRequestDrawer({ request, onClose, onExpire }) {
  const hasExtraFields = Object.keys(request).some((k) => !REQUEST_KNOWN_KEYS.includes(k) && k !== '__v')

  return (
    <Drawer
      open
      onClose={onClose}
      title="Open request detail"
      subtitle={request._id}
      footer={
        request.status === 'open' && (
          <Button variant="danger" onClick={() => onExpire(request)}>
            <TimerOff className="h-4 w-4" /> Expire request
          </Button>
        )
      }
    >
      <div className="space-y-5">
        <StatusBadge status={request.status} />

        <Card className="p-4">
          <KeyValue label="Request ID" value={request._id} mono />
          <KeyValue label="Requester" value={request.user?.fullName} />
          <KeyValue label="Requester email" value={request.user?.email} />
          <KeyValue label="Created" value={formatDateTime(request.createdAt)} />
          {request.updatedAt && <KeyValue label="Last updated" value={formatDateTime(request.updatedAt)} />}
        </Card>

        {hasExtraFields && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Request details</p>
            <Card className="p-4">
              <AutoFields data={request} exclude={REQUEST_KNOWN_KEYS} />
            </Card>
          </div>
        )}
      </div>
    </Drawer>
  )
}
