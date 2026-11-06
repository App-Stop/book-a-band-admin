import { useCallback, useEffect, useState } from 'react'
import { useListParams, useOpenParam } from '../lib/hooks'
import { AlertTriangle, Gavel, ShieldAlert } from 'lucide-react'
import { AdminLayout } from '../components/layout'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ExternalLink,
  FilterBar,
  Field,
  PersonCell,
  ProfileCard,
  KeyValue,
  Drawer,
  LoadingBlock,
  Modal,
  Pagination,
  SectionTitle,
  StatusBadge,
  Table,
  Textarea,
  TextInput,
} from '../components/ui'
import { DisputesAPI } from '../lib/api'
import { useToast } from '../context/ToastContext'
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

      {selectedId && <DisputeDetailDrawer disputeId={selectedId} onClose={() => closeDetail()} onChanged={fetchList} />}
    </AdminLayout>
  )
}

const ACTIONABLE_STATUSES = ['open', 'under_review']

const isStripeChargeback = (dispute) => Boolean(dispute?.metadata?.stripeDisputeId)

function refundLimits(payment) {
  const subtotal = payment?.subtotal ?? 0
  const refundable = (payment?.totalAmount ?? 0) - (payment?.refundedAmount ?? 0)
  const centsFor = (pct) => Math.round((subtotal * pct) / 100)
  // Refunds are a % of the full band fee, but Stripe only holds the card payment, so the % is capped below 100.
  let maxPct = subtotal > 0 ? Math.floor((refundable / subtotal) * 10000) / 100 : 0
  if (centsFor(maxPct) > refundable) maxPct = Math.max(0, +(maxPct - 0.01).toFixed(2))
  return { refundable, centsFor, maxPct: Math.min(100, maxPct) }
}

function Notice({ tone, children }) {
  const tones = {
    danger: 'border-danger-500/30 bg-danger-500/10 text-danger-400',
    warning: 'border-warning-500/30 bg-warning-500/10 text-warning-400',
    info: 'border-info-500/30 bg-info-500/10 text-info-400',
  }
  return (
    <div className={`flex items-start gap-2 rounded-xl border p-3.5 text-sm ${tones[tone]}`}>
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <p>{children}</p>
    </div>
  )
}

function DisputeDetailDrawer({ disputeId, onClose, onChanged }) {
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [resolveOpen, setResolveOpen] = useState(false)
  const [notice, setNotice] = useState(null)

  const load = useCallback(() => {
    setError('')
    return DisputesAPI.get(disputeId)
      .then((res) => {
        setDetail(res.data)
        return res.data
      })
      .catch((err) => {
        setError(err?.message || 'Failed to load dispute.')
        return null
      })
      .finally(() => setLoading(false))
  }, [disputeId])

  useEffect(() => {
    setLoading(true)
    load()
  }, [load])

  const dispute = detail?.dispute
  const payout = detail?.payout
  const payment = dispute?.payment && typeof dispute.payment === 'object' ? dispute.payment : null
  const chargeback = isStripeChargeback(dispute)
  const open = ACTIONABLE_STATUSES.includes(dispute?.status)
  const releaseFailed = dispute?.status === 'resolved_for_band' && !chargeback && !payout
  const cashDue = payment?.subtotal != null && payment?.depositBaseAmount != null ? payment.subtotal - payment.depositBaseAmount : null

  return (
    <Drawer
      open
      onClose={onClose}
      title="Dispute detail"
      subtitle={dispute?.band?.fullName}
      footer={
        open &&
        !chargeback &&
        !notice?.blocking && (
          <Button onClick={() => setResolveOpen(true)}>
            <Gavel className="h-4 w-4" /> Resolve dispute
          </Button>
        )
      }
    >
      {loading && <LoadingBlock />}
      {error && !loading && <p className="text-sm text-danger-400">{error}</p>}

      {dispute && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={dispute.status} />
            <Badge tone={chargeback ? 'warning' : 'neutral'}>{chargeback ? 'Stripe chargeback' : 'In-app dispute'}</Badge>
          </div>

          {notice && <Notice tone="danger">{notice.message}</Notice>}
          {releaseFailed && (
            <Notice tone="warning">
              Resolved in the band's favor, but no payout was created, so the band hasn't been paid. The transfer needs manual follow-up
              (usually the band hasn't finished Stripe onboarding).
            </Notice>
          )}
          {chargeback && open && (
            <Notice tone="info">
              This is a card chargeback opened by the customer's bank, so it can't be resolved here. Submit evidence in the{' '}
              <ExternalLink href={`https://dashboard.stripe.com/disputes/${dispute.metadata.stripeDisputeId}`}>Stripe Dashboard</ExternalLink>
              . The result is applied automatically when Stripe closes it.
            </Notice>
          )}

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
            {dispute.evidence?.length > 0 && (
              <KeyValue
                label="Evidence"
                value={
                  <span className="flex flex-col items-end gap-1">
                    {dispute.evidence.map((url, i) => (
                      <ExternalLink key={url} href={url}>{`Evidence ${i + 1}`}</ExternalLink>
                    ))}
                  </span>
                }
              />
            )}
            {dispute.resolvedBy && <KeyValue label="Resolved by" value={dispute.resolvedBy?.fullName} />}
            {dispute.resolvedAt && <KeyValue label="Resolved" value={formatDateTime(dispute.resolvedAt)} />}
            {dispute.resolution && <KeyValue label="Resolution" value={titleCase(dispute.resolution)} />}
            {dispute.refundAmount > 0 && <KeyValue label="Refunded" value={formatCurrency(dispute.refundAmount)} />}
            {dispute.adminNotes && <KeyValue label="Admin notes" value={dispute.adminNotes} />}
          </Card>

          {payment && (
            <Card className="p-4">
              <SectionTitle>Payment</SectionTitle>
              <KeyValue label="Band fee" value={formatCurrency(payment.subtotal)} />
              <KeyValue label="Charged by card" value={formatCurrency(payment.totalAmount)} />
              <KeyValue label="Platform fee" value={formatCurrency(payment.platformFee)} />
              <KeyValue label="Already refunded" value={formatCurrency(payment.refundedAmount ?? 0)} />
              {cashDue != null && <KeyValue label="Cash due to band (outside platform)" value={formatCurrency(cashDue)} />}
            </Card>
          )}

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

      {dispute && resolveOpen && (
        <ResolveDisputeModal
          dispute={dispute}
          payment={payment}
          onClose={() => setResolveOpen(false)}
          reload={load}
          onChanged={onChanged}
          setNotice={setNotice}
        />
      )}
    </Drawer>
  )
}

function ResolveDisputeModal({ dispute, payment, onClose, reload, onChanged, setNotice }) {
  const toast = useToast()
  const [decision, setDecision] = useState('user')
  const [pct, setPct] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)

  const { refundable, centsFor, maxPct } = refundLimits(payment)
  const p = Number(pct)
  const pctValid = decision === 'band' || (p > 0 && p <= maxPct)
  const bandAmount = payment ? payment.totalAmount - ((payment.platformFee ?? 0) - (payment.referralCreditApplied ?? 0)) : null

  async function submit() {
    setBusy(true)
    const refundedBefore = payment?.refundedAmount ?? 0
    try {
      const res = await DisputesAPI.resolve(dispute._id, {
        decision,
        ...(decision === 'user' ? { refundAmount: p } : {}),
        ...(notes.trim() ? { adminNotes: notes.trim() } : {}),
      })
      const moneyMovement = res.data?.moneyMovement
      if (decision === 'band' && moneyMovement && moneyMovement.status !== 'released') {
        toast.warning(`Resolved, but the band was NOT paid: ${(moneyMovement.error || 'transfer failed').replace(/\.$/, '')}. Needs manual follow-up.`)
      } else {
        toast.success(res.message || 'Dispute resolved.')
      }
    } catch (err) {
      toast.error(err?.message || 'Failed to resolve dispute.')
    }

    // A failed resolve can leave partial state (e.g. refund sent, dispute still open), so always re-check.
    const fresh = await reload()
    onChanged?.()
    const after = fresh?.dispute
    const refundedAfter = after?.payment?.refundedAmount ?? 0
    if (after && ACTIONABLE_STATUSES.includes(after.status) && refundedAfter > refundedBefore) {
      setNotice({ blocking: true, message: "A refund was issued but the dispute wasn't closed. Don't retry. Contact engineering." })
    }
    setBusy(false)
    onClose()
  }

  return (
    <Modal
      open
      onClose={busy ? undefined : onClose}
      title="Resolve dispute"
      description="This decision is final and cannot be undone."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant={decision === 'user' ? 'danger' : 'primary'} onClick={submit} loading={busy} disabled={!pctValid}>
            {decision === 'user' ? 'Refund customer' : 'Release to band'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {[
            ['user', 'Customer wins: refund'],
            ['band', 'Band wins: release funds'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setDecision(value)}
              className={`focus-ring rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
                decision === value
                  ? 'border-brand-500/60 bg-brand-500/20 text-brand-200'
                  : 'border-slate-900/10 text-slate-400 hover:text-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {decision === 'user' && (
          <Field label="Refund % of band fee" hint={`Max ${maxPct}% (only the card payment can be refunded: ${formatCurrency(refundable)} available)`}>
            <div className="flex gap-2">
              <TextInput type="number" step="0.01" min="0.01" max={maxPct} value={pct} onChange={(e) => setPct(e.target.value)} placeholder="e.g. 10" />
              <Button type="button" variant="secondary" onClick={() => setPct(String(maxPct))}>
                Max
              </Button>
            </div>
            {pct !== '' && !pctValid && <span className="mt-1 block text-xs text-danger-400">Enter a value between 0.01 and {maxPct}.</span>}
            {pctValid && p > 0 && <span className="mt-1 block text-xs text-slate-400">Customer receives {formatCurrency(centsFor(p))}.</span>}
          </Field>
        )}

        {decision === 'band' && (
          <p className="text-sm text-slate-400">
            About {formatCurrency(bandAmount)} will be transferred to the band immediately. If the band hasn't finished Stripe onboarding, the
            dispute still resolves but the transfer won't happen.
          </p>
        )}

        <Field label="Admin notes (optional)">
          <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Why this decision was made" />
        </Field>
      </div>
    </Modal>
  )
}
