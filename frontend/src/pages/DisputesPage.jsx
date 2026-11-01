import { useCallback, useEffect, useState } from 'react'
import { useListParams, useOpenParam } from '../lib/hooks'
import { ShieldAlert } from 'lucide-react'
import { AdminLayout } from '../components/layout'
import {
  Card,
  EmptyState,
  FilterBar,
  Field,
  PersonCell,
  ProfileCard,
  KeyValue,
  Drawer,
  LoadingBlock,
  Pagination,
  SectionTitle,
  Select,
  StatusBadge,
  Table,
  TextInput,
} from '../components/ui'
import { DisputesAPI } from '../lib/api'
import { formatCurrency, formatDate, formatDateTime, titleCase } from '../lib/formatters'

const STATUS_OPTIONS = ['open', 'under_review', 'resolved_for_customer', 'resolved_for_band', 'rejected', 'closed']

const DEFAULT_FILTERS = { status: '', band: '', bandLabel: '', customer: '', customerLabel: '', booking: '', search: '', from: '', to: '' }

export default function DisputesPage() {
  const { filters, page, setPage, updateFilter, clearFilters } = useListParams(DEFAULT_FILTERS)
  const limit = 20
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedId, openDetail, closeDetail] = useOpenParam()

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

  const columns = [
    {
      key: 'customer',
      header: 'Customer',
      render: (d) => <PersonCell person={d.customer} />,
    },
    { key: 'band', header: 'Band', render: (d) => <PersonCell person={d.band} role="band" /> },
    { key: 'booking', header: 'Event date', render: (d) => formatDate(d.booking?.eventDate) },
    { key: 'amount', header: 'Booking total', render: (d) => formatCurrency(d.booking?.totalAmount) },
    { key: 'status', header: 'Status', className: 'whitespace-nowrap', render: (d) => <StatusBadge status={d.status} /> },
    { key: 'opened', header: 'Opened', render: (d) => formatDate(d.openedAt || d.createdAt) },
  ]

  return (
    <AdminLayout title="Disputes" description="Triage open disputes between customers and bands">
      <Card className="mb-4 p-4">
        <FilterBar
          search={filters.search}
          onSearch={(v) => updateFilter('search', v)}
          placeholder="Search customer, band…"
          values={filters}
          onChange={updateFilter}
          onClear={clearFilters}
          fields={[
            { key: 'status', label: 'Status', type: 'select', options: STATUS_OPTIONS.map((v) => ({ value: v, label: titleCase(v) })) },
            { key: 'band', label: 'Band', type: 'entity', role: 'band', labelKey: 'bandLabel', placeholder: 'Search band name…' },
            { key: 'customer', label: 'Customer', type: 'entity', role: 'user', labelKey: 'customerLabel', placeholder: 'Search customer name…' },
            { key: 'from', label: 'Created from', type: 'date' },
            { key: 'to', label: 'Created to', type: 'date' },
          ]}
        />
      </Card>

      <Card>
        <Table
          columns={columns}
          rows={data?.items || []}
          rowKey={(d) => d._id}
          loading={loading}
          onRowClick={(d) => openDetail(d._id)}
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

      {selectedId && <DisputeDetailDrawer disputeId={selectedId} onClose={() => closeDetail()} />}
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

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <ProfileCard label="Customer" person={dispute.customer} />
            <ProfileCard label="Band" person={dispute.band} />
          </div>

          <Card className="p-4">
            <SectionTitle>Booking</SectionTitle>
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
