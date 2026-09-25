import { useCallback, useEffect, useState } from 'react'
import { Wallet, RefreshCw } from 'lucide-react'
import { AdminLayout } from '../components/layout'
import {
  Button,
  Card,
  ConfirmDialog,
  Drawer,
  EmptyState,
  KeyValue,
  LoadingBlock,
  Pagination,
  RawPanel,
  SectionTitle,
  StatusBadge,
  SuggestInput,
  Table,
  TextInput,
} from '../components/ui'
import { PayoutsAPI } from '../lib/api'
import { useToast } from '../context/ToastContext'
import { formatCurrency, formatDate, formatDateTime } from '../lib/formatters'

const STATUS_SUGGESTIONS = ['pending', 'processing', 'paid', 'failed', 'waiting_onboarding', 'cancelled']

export default function PayoutsPage() {
  const [filters, setFilters] = useState({ status: '', band: '', from: '', to: '' })
  const [page, setPage] = useState(1)
  const limit = 20
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedId, setSelectedId] = useState(null)

  const fetchList = useCallback(() => {
    setLoading(true)
    setError('')
    PayoutsAPI.list({ ...filters, page, limit })
      .then((res) => setData(res.data))
      .catch((err) => setError(err?.message || 'Failed to load payouts.'))
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
    { key: 'band', header: 'Band', render: (p) => p.band?.fullName || '—' },
    { key: 'event', header: 'Event', render: (p) => p.booking?.city || '—' },
    { key: 'eventDate', header: 'Event date', render: (p) => formatDate(p.booking?.eventDate) },
    { key: 'amount', header: 'Amount', render: (p) => formatCurrency(p.amount) },
    { key: 'status', header: 'Status', render: (p) => <StatusBadge status={p.status} /> },
    { key: 'created', header: 'Created', render: (p) => formatDate(p.createdAt) },
  ]

  return (
    <AdminLayout title="Payouts" description="Track and retry band payouts">
      <Card className="mb-4 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SuggestInput
            suggestions={STATUS_SUGGESTIONS}
            placeholder="Status (e.g. failed)"
            value={filters.status}
            onChange={(e) => updateFilter('status', e.target.value)}
          />
          <TextInput placeholder="Band ID" value={filters.band} onChange={(e) => updateFilter('band', e.target.value)} />
          <TextInput type="date" value={filters.from} onChange={(e) => updateFilter('from', e.target.value)} />
          <TextInput type="date" value={filters.to} onChange={(e) => updateFilter('to', e.target.value)} />
        </div>
      </Card>

      <Card>
        <Table
          columns={columns}
          rows={data?.items || []}
          rowKey={(p) => p._id}
          loading={loading}
          onRowClick={(p) => setSelectedId(p._id)}
          emptyState={<EmptyState icon={Wallet} title="No payouts found" description="Try adjusting your filters." />}
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

      {selectedId && <PayoutDetailDrawer payoutId={selectedId} onClose={() => setSelectedId(null)} onChanged={fetchList} />}
    </AdminLayout>
  )
}

function PayoutDetailDrawer({ payoutId, onClose, onChanged }) {
  const toast = useToast()
  const [payout, setPayout] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [retryConfirm, setRetryConfirm] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    PayoutsAPI.get(payoutId)
      .then((res) => setPayout(res.data))
      .catch((err) => setError(err?.message || 'Failed to load payout.'))
      .finally(() => setLoading(false))
  }, [payoutId])

  useEffect(() => {
    load()
  }, [load])

  async function handleRetry() {
    setBusy(true)
    try {
      const res = await PayoutsAPI.retry(payoutId)
      toast.success(res?.message || 'Retry initiated.')
      setRetryConfirm(false)
      load()
      onChanged()
    } catch (err) {
      toast.error(err?.message || 'Failed to retry payout.')
    } finally {
      setBusy(false)
    }
  }

  const canRetry = payout && ['failed', 'waiting_onboarding'].includes(payout.status)

  return (
    <Drawer
      open
      onClose={onClose}
      title="Payout detail"
      subtitle={payout?._id}
      footer={
        canRetry && (
          <Button onClick={() => setRetryConfirm(true)}>
            <RefreshCw className="h-4 w-4" /> Retry payout
          </Button>
        )
      }
    >
      {loading && <LoadingBlock />}
      {error && !loading && <p className="text-sm text-danger-400">{error}</p>}

      {payout && (
        <div className="space-y-5">
          <StatusBadge status={payout.status} />

          <Card className="p-4">
            <KeyValue label="Payout ID" value={payout._id} mono />
            <KeyValue label="Band" value={payout.band?.fullName} />
            <KeyValue label="Amount" value={formatCurrency(payout.amount)} />
            <KeyValue label="Created" value={formatDateTime(payout.createdAt)} />
          </Card>

          {payout.booking && (
            <Card className="p-4">
              <SectionTitle>Booking</SectionTitle>
              <KeyValue label="Event date" value={formatDate(payout.booking.eventDate)} />
              <KeyValue label="Event window" value={`${payout.booking.eventStart || '—'} – ${payout.booking.eventEnd || '—'}`} />
              <KeyValue label="City" value={payout.booking.city} />
              <KeyValue label="Address" value={payout.booking.address} />
            </Card>
          )}

          {payout.payment && (
            <Card className="p-4">
              <SectionTitle>Payment</SectionTitle>
              <KeyValue label="Amount" value={formatCurrency(payout.payment.amount)} />
              <KeyValue label="Status" value={<StatusBadge status={payout.payment.status} />} />
            </Card>
          )}

          {/* <RawPanel data={payout} label="Raw payout record" />*/}
        </div>
      )}

      <ConfirmDialog
        open={retryConfirm}
        onClose={() => setRetryConfirm(false)}
        onConfirm={handleRetry}
        title="Retry this payout?"
        description="This executes the actual Stripe transfer. Requires completed onboarding with payouts enabled."
        confirmLabel="Retry payout"
        loading={busy}
      />
    </Drawer>
  )
}
