import { useCallback, useEffect, useState } from 'react'
import { Inbox, TimerOff } from 'lucide-react'
import { AdminLayout } from '../components/layout'
import {
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Pagination,
  RawPanel,
  Select,
  StatusBadge,
  Table,
} from '../components/ui'
import { OpenRequestsAPI } from '../lib/api'
import { useToast } from '../context/ToastContext'
import { formatDate } from '../lib/formatters'

const STATUS_OPTIONS = ['open', 'closed', 'expired', 'cancelled']

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
  const [rawId, setRawId] = useState(null)

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
    { key: 'created', header: 'Created', render: (r) => formatDate(r.createdAt) },
    {
      key: 'actions',
      header: '',
      headClassName: 'text-right',
      className: 'text-right',
      render: (r) => (
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setRawId(r._id)
            }}
            className="focus-ring rounded-lg px-2 py-1 text-xs text-slate-400 hover:bg-white/5 hover:text-slate-200"
          >
            Details
          </button>
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

  const rawRow = data?.items?.find((r) => r._id === rawId)

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

      {rawRow && (
        <div className="mt-4">
          <RawPanel data={rawRow} label={`Request ${rawRow._id}`} />
        </div>
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
