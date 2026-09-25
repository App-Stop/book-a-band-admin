import { useCallback, useEffect, useState } from 'react'
import { CalendarClock, XCircle, CheckCircle2 } from 'lucide-react'
import { AdminLayout } from '../components/layout'
import {
  Button,
  Card,
  ConfirmDialog,
  Drawer,
  EmptyState,
  Field,
  KeyValue,
  LoadingBlock,
  Pagination,
  RawPanel,
  SectionTitle,
  Select,
  StatusBadge,
  Table,
  TextInput,
  Textarea,
} from '../components/ui'
import { BookingsAPI } from '../lib/api'
import { useToast } from '../context/ToastContext'
import { formatCurrency, formatDate, formatDateTime } from '../lib/formatters'

const STATUS_OPTIONS = ['pending', 'confirmed', 'completed', 'cancelled', 'expired']

export default function BookingsPage() {
  const [filters, setFilters] = useState({ status: '', band: '', user: '', from: '', to: '' })
  const [page, setPage] = useState(1)
  const limit = 20
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedId, setSelectedId] = useState(null)

  const fetchList = useCallback(() => {
    setLoading(true)
    setError('')
    BookingsAPI.list({ ...filters, page, limit })
      .then((res) => setData(res.data))
      .catch((err) => setError(err?.message || 'Failed to load bookings.'))
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
      key: 'customer',
      header: 'Customer',
      render: (b) => (
        <div>
          <p className="text-sm font-medium text-slate-100">{b.user?.fullName || '—'}</p>
          <p className="text-xs text-slate-500">{b.user?.email}</p>
        </div>
      ),
    },
    { key: 'band', header: 'Band', render: (b) => b.band?.fullName || '—' },
    { key: 'status', header: 'Status', render: (b) => <StatusBadge status={b.status} /> },
    { key: 'eventDate', header: 'Event date', render: (b) => formatDate(b.eventDate) },
    { key: 'created', header: 'Created', render: (b) => formatDate(b.createdAt) },
  ]

  return (
    <AdminLayout title="Bookings" description="Monitor and intervene on customer bookings">
      <Card className="mb-4 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Select value={filters.status} onChange={(e) => updateFilter('status', e.target.value)}>
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
          <TextInput placeholder="Band ID" value={filters.band} onChange={(e) => updateFilter('band', e.target.value)} />
          <TextInput placeholder="User ID" value={filters.user} onChange={(e) => updateFilter('user', e.target.value)} />
          <TextInput type="date" value={filters.from} onChange={(e) => updateFilter('from', e.target.value)} />
          <TextInput type="date" value={filters.to} onChange={(e) => updateFilter('to', e.target.value)} />
        </div>
      </Card>

      <Card>
        <Table
          columns={columns}
          rows={data?.items || []}
          rowKey={(b) => b._id}
          loading={loading}
          onRowClick={(b) => setSelectedId(b._id)}
          emptyState={<EmptyState icon={CalendarClock} title="No bookings found" description="Try adjusting your filters." />}
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

      {selectedId && <BookingDetailDrawer bookingId={selectedId} onClose={() => setSelectedId(null)} onChanged={fetchList} />}
    </AdminLayout>
  )
}

function BookingDetailDrawer({ bookingId, onClose, onChanged }) {
  const toast = useToast()
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [cancelModal, setCancelModal] = useState(false)
  const [completeConfirm, setCompleteConfirm] = useState(false)
  const [reason, setReason] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    BookingsAPI.get(bookingId)
      .then((res) => setDetail(res.data))
      .catch((err) => setError(err?.message || 'Failed to load booking.'))
      .finally(() => setLoading(false))
  }, [bookingId])

  useEffect(() => {
    load()
  }, [load])

  const booking = detail?.booking

  async function handleCancel() {
    setBusy(true)
    try {
      await BookingsAPI.cancel(bookingId, reason.trim() || undefined)
      toast.success('Booking cancelled.')
      setCancelModal(false)
      setReason('')
      load()
      onChanged()
    } catch (err) {
      toast.error(err?.message || 'Failed to cancel booking.')
    } finally {
      setBusy(false)
    }
  }

  async function handleForceComplete() {
    setBusy(true)
    try {
      await BookingsAPI.forceComplete(bookingId)
      toast.success('Booking marked as completed.')
      setCompleteConfirm(false)
      load()
      onChanged()
    } catch (err) {
      toast.error(err?.message || 'Failed to complete booking.')
    } finally {
      setBusy(false)
    }
  }

  const canCancel = booking && !['cancelled', 'completed', 'expired'].includes(booking.status)
  const canComplete = booking?.status === 'confirmed'

  return (
    <Drawer
      open
      onClose={onClose}
      title="Booking detail"
      subtitle={booking?._id}
      footer={
        booking && (
          <>
            {canComplete && (
              <Button variant="secondary" onClick={() => setCompleteConfirm(true)}>
                <CheckCircle2 className="h-4 w-4" /> Force complete
              </Button>
            )}
            {canCancel && (
              <Button variant="danger" onClick={() => setCancelModal(true)}>
                <XCircle className="h-4 w-4" /> Cancel booking
              </Button>
            )}
          </>
        )
      }
    >
      {loading && <LoadingBlock />}
      {error && !loading && <p className="text-sm text-danger-400">{error}</p>}

      {booking && (
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <StatusBadge status={booking.status} />
          </div>

          <Card className="p-4">
            <KeyValue label="Booking ID" value={booking._id} mono />
            <KeyValue label="Customer" value={booking.user?.fullName} />
            <KeyValue label="Customer email" value={booking.user?.email} />
            <KeyValue label="Band" value={booking.band?.fullName} />
            <KeyValue label="Event date" value={formatDate(booking.eventDate)} />
            <KeyValue label="City" value={booking.city} />
            <KeyValue label="Address" value={booking.address} />
            <KeyValue label="Created" value={formatDateTime(booking.createdAt)} />
          </Card>

          {detail.payment && (
            <Card className="p-4">
              <SectionTitle>Payment</SectionTitle>
              <KeyValue label="Amount" value={formatCurrency(detail.payment.amount)} />
              <KeyValue label="Status" value={<StatusBadge status={detail.payment.status} />} />
              <KeyValue label="Payment ID" value={detail.payment._id} mono />
            </Card>
          )}

          {detail.payout && (
            <Card className="p-4">
              <SectionTitle>Payout</SectionTitle>
              <KeyValue label="Amount" value={formatCurrency(detail.payout.amount)} />
              <KeyValue label="Status" value={<StatusBadge status={detail.payout.status} />} />
              <KeyValue label="Payout ID" value={detail.payout._id} mono />
            </Card>
          )}

          {detail.dispute && (
            <Card className="p-4">
              <SectionTitle>Dispute</SectionTitle>
              <KeyValue label="Reason" value={detail.dispute.reason} />
              <KeyValue label="Status" value={<StatusBadge status={detail.dispute.status} />} />
            </Card>
          )}

          {detail.availabilityRequest && (
            <Card className="p-4">
              <SectionTitle>Availability request</SectionTitle>
              <KeyValue label="Status" value={<StatusBadge status={detail.availabilityRequest.status} />} />
              <KeyValue label="City" value={detail.availabilityRequest.city} />
            </Card>
          )}

          {detail.activityLog?.length > 0 && (
            <Card className="p-4">
              <SectionTitle>Activity log</SectionTitle>
              <div className="space-y-2">
                {detail.activityLog.map((entry, i) => (
                  <div key={entry._id || i} className="flex items-start justify-between gap-3 border-b border-white/5 py-2 text-sm last:border-0">
                    <span className="text-slate-300">{entry.action || entry.type || 'Activity'}</span>
                    <span className="shrink-0 text-xs text-slate-500">{formatDateTime(entry.createdAt)}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <RawPanel data={detail} label="Raw booking record" />
        </div>
      )}

      <ConfirmDialog
        open={cancelModal}
        onClose={() => setCancelModal(false)}
        onConfirm={handleCancel}
        title="Cancel this booking?"
        description="This force-cancels the booking via the standard cancellation flow, including any refund logic."
        confirmLabel="Cancel booking"
        variant="danger"
        loading={busy}
      >
        <Field label="Reason (optional)">
          <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this booking being cancelled?" />
        </Field>
      </ConfirmDialog>

      <ConfirmDialog
        open={completeConfirm}
        onClose={() => setCompleteConfirm(false)}
        onConfirm={handleForceComplete}
        title="Force complete this booking?"
        description="This releases escrow and notifies both the customer and the band."
        confirmLabel="Force complete"
        loading={busy}
      />
    </Drawer>
  )
}
