import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
import { AdminLayout } from '../components/layout'
import {
  Card,
  EmptyState,
  EntitySearchSelect,
  KeyValue,
  Drawer,
  LoadingBlock,
  Pagination,
  SearchInput,
  SectionTitle,
  Select,
  StatusBadge,
  Table,
  TextInput,
} from '../components/ui'
import { DisputesAPI } from '../lib/api'
import { formatCurrency, formatDate, formatDateTime, titleCase } from '../lib/formatters'

const STATUS_OPTIONS = ['open', 'under_review', 'resolved_for_customer', 'resolved_for_band', 'rejected', 'closed']

export default function DisputesPage() {
  const [filters, setFilters] = useState({
    status: '',
    band: '',
    bandLabel: '',
    customer: '',
    customerLabel: '',
    booking: '',
    search: '',
    from: '',
    to: '',
  })
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
    const { bandLabel: _bandLabel, customerLabel: _customerLabel, ...apiFilters } = filters
    DisputesAPI.list({ ...apiFilters, page, limit })
      .then((res) => setData(res.data))
      .catch((err) => setError(err?.message || 'Failed to load disputes.'))
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
      render: (d) => (
        <div>
          <p className="text-sm font-medium text-slate-100">{d.customer?.fullName || '—'}</p>
          <p className="text-xs text-slate-500">{d.customer?.email}</p>
        </div>
      ),
    },
    { key: 'band', header: 'Band', render: (d) => d.band?.fullName || '—' },
    { key: 'booking', header: 'Event date', render: (d) => formatDate(d.booking?.eventDate) },
    { key: 'amount', header: 'Booking total', render: (d) => formatCurrency(d.booking?.totalAmount) },
    { key: 'status', header: 'Status', className: 'whitespace-nowrap', render: (d) => <StatusBadge status={d.status} /> },
    { key: 'opened', header: 'Opened', render: (d) => formatDate(d.openedAt || d.createdAt) },
  ]

  return (
    <AdminLayout title="Disputes" description="Triage open disputes between customers and bands">
      <Card className="mb-4 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SearchInput
            placeholder="Search by booking, customer, band…"
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
          />
          <Select value={filters.status} onChange={(e) => updateFilter('status', e.target.value)}>
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {titleCase(s)}
              </option>
            ))}
          </Select>
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
          <EntitySearchSelect
            role="user"
            placeholder="Search customer name…"
            value={filters.customer}
            valueLabel={filters.customerLabel}
            onSelect={(id, label) => {
              setPage(1)
              setFilters((f) => ({ ...f, customer: id || '', customerLabel: label || '' }))
            }}
          />
          <TextInput type="date" value={filters.from} onChange={(e) => updateFilter('from', e.target.value)} />
          <TextInput type="date" value={filters.to} onChange={(e) => updateFilter('to', e.target.value)} />
        </div>
      </Card>

      <Card>
        <Table
          columns={columns}
          rows={data?.items || []}
          rowKey={(d) => d._id}
          loading={loading}
          onRowClick={(d) => setSelectedId(d._id)}
          emptyState={<EmptyState icon={ShieldAlert} title="No disputes found" description="Try adjusting your filters." />}
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

      {selectedId && <DisputeDetailDrawer disputeId={selectedId} onClose={() => setSelectedId(null)} />}
    </AdminLayout>
  )
}

function DisputeDetailDrawer({ disputeId, onClose }) {
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    DisputesAPI.get(disputeId)
      .then((res) => setDetail(res.data))
      .catch((err) => setError(err?.message || 'Failed to load dispute.'))
      .finally(() => setLoading(false))
  }, [disputeId])

  const dispute = detail?.dispute
  const payout = detail?.payout

  return (
    <Drawer open onClose={onClose} title="Dispute detail" subtitle={dispute?.band?.fullName}>
      {loading && <LoadingBlock />}
      {error && !loading && <p className="text-sm text-danger-400">{error}</p>}

      {dispute && (
        <div className="space-y-5">
          <StatusBadge status={dispute.status} />

          <Card className="p-4">
            <SectionTitle>Customer</SectionTitle>
            <KeyValue label="Name" value={dispute.customer?.fullName} />
            <KeyValue label="Email" value={dispute.customer?.email} />
          </Card>

          <Card className="p-4">
            <SectionTitle>Band</SectionTitle>
            <KeyValue label="Name" value={dispute.band?.fullName} />
          </Card>

          <Card className="p-4">
            <SectionTitle>Booking</SectionTitle>
            <KeyValue label="Customer" value={dispute.customer?.fullName} />
            <KeyValue label="Event date" value={formatDate(dispute.booking?.eventDate)} />
            <KeyValue label="Booking status" value={<StatusBadge status={dispute.booking?.bookingStatus} />} />
            <KeyValue label="Total amount" value={formatCurrency(dispute.booking?.totalAmount)} />
          </Card>

          <Card className="p-4">
            <SectionTitle>Dispute</SectionTitle>
            <KeyValue label="Reason" value={dispute.reason} />
            <KeyValue label="Opened" value={formatDateTime(dispute.openedAt || dispute.createdAt)} />
            {dispute.resolvedBy && <KeyValue label="Resolved by" value={dispute.resolvedBy?.fullName} />}
            {dispute.resolution && <KeyValue label="Resolution" value={dispute.resolution} />}
          </Card>

          {payout && (
            <Card className="p-4">
              <SectionTitle>Associated payout</SectionTitle>
              <KeyValue label="Status" value={<StatusBadge status={payout.status} />} />
              <KeyValue label="Gross amount" value={formatCurrency(payout.grossAmount)} />
              <KeyValue label="Platform fee" value={formatCurrency(payout.platformFee)} />
              <KeyValue label="Payout amount" value={formatCurrency(payout.payoutAmount)} />
              {payout.transferredAt && <KeyValue label="Transferred" value={formatDateTime(payout.transferredAt)} />}
            </Card>
          )}
        </div>
      )}
    </Drawer>
  )
}
