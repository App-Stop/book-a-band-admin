import { useCallback, useEffect, useState } from 'react'
import { Users as UsersIcon, ShieldCheck, UserCog, Ban, RotateCcw, Trash2 } from 'lucide-react'
import { AdminLayout } from '../components/layout'
import {
  AppLink,
  Badge,
  BoolBadge,
  Button,
  Card,
  ConfirmDialog,
  Drawer,
  EmptyState,
  ExternalLink,
  Field,
  KeyValue,
  LoadingBlock,
  Modal,
  Pagination,
  SearchInput,
  Select,
  StatusBadge,
  Table,
  Tabs,
  Textarea,
} from '../components/ui'
import { BandPackagesAPI, PostsAPI, UsersAPI } from '../lib/api'
import { useToast } from '../context/ToastContext'
import { findUrl, formatTimeRange, formatCurrency, formatDate, formatDateTime, formatNumber, initials, refId, titleCase } from '../lib/formatters'

const ROLE_OPTIONS = ['user', 'band', 'admin']

export default function UsersPage() {
  const [filters, setFilters] = useState({ role: '', isDeleted: '', isEmailVerified: '', search: '' })
  const [page, setPage] = useState(1)
  const limit = 20
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedId, setSelectedId] = useState(null)

  const fetchList = useCallback(() => {
    setLoading(true)
    setError('')
    UsersAPI.list({ ...filters, page, limit })
      .then((res) => setData(res.data))
      .catch((err) => setError(err?.message || 'Failed to load users.'))
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
      key: 'user',
      header: 'User',
      render: (u) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-accent-500 text-[11px] font-semibold text-white">
            {initials(u.fullName || u.email)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="truncate text-sm font-medium text-slate-100">{u.bandProfile?.fullName || u.fullName || 'Unnamed'}</p>
              {u.bandProfile && (
                <Badge tone="info" className="shrink-0">
                  Band
                </Badge>
              )}
            </div>
            <p className="truncate text-xs text-slate-500">{u.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (u) => (
        <div className="flex flex-wrap gap-1">
          {(Array.isArray(u.role) ? u.role : [u.role]).filter(Boolean).map((r) => (
            <Badge key={r} tone={r === 'admin' ? 'info' : 'neutral'}>
              {titleCase(r)}
            </Badge>
          ))}
        </div>
      ),
    },
    { key: 'verified', header: 'Email', render: (u) => <BoolBadge value={u.isEmailVerified} trueLabel="Verified" falseLabel="Unverified" /> },
    {
      key: 'status',
      header: 'Status',
      render: (u) => <Badge tone={u.isDeleted ? 'danger' : 'success'}>{u.isDeleted ? 'Suspended' : 'Active'}</Badge>,
    },
    { key: 'joined', header: 'Joined', render: (u) => formatDate(u.createdAt) },
  ]

  return (
    <AdminLayout title="Users & Bands" description="Manage accounts, roles, verification, and access">
      <Card className="mb-4 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SearchInput value={filters.search} onChange={(e) => updateFilter('search', e.target.value)} placeholder="Search name or email…" />
          <Select value={filters.role} onChange={(e) => updateFilter('role', e.target.value)}>
            <option value="">All roles</option>
            {ROLE_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {titleCase(r)}
              </option>
            ))}
          </Select>
          <Select value={filters.isDeleted} onChange={(e) => updateFilter('isDeleted', e.target.value)}>
            <option value="">All statuses</option>
            <option value="false">Active</option>
            <option value="true">Suspended</option>
          </Select>
          <Select value={filters.isEmailVerified} onChange={(e) => updateFilter('isEmailVerified', e.target.value)}>
            <option value="">Email: any</option>
            <option value="true">Verified</option>
            <option value="false">Unverified</option>
          </Select>
        </div>
      </Card>

      <Card>
        <Table
          columns={columns}
          rows={data?.items || []}
          rowKey={(u) => u._id}
          loading={loading}
          onRowClick={(u) => setSelectedId(u._id)}
          emptyState={<EmptyState icon={UsersIcon} title="No users found" description="Try adjusting your filters." />}
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

      {selectedId && <UserDetailDrawer userId={selectedId} onClose={() => setSelectedId(null)} onChanged={fetchList} />}
    </AdminLayout>
  )
}

function UserDetailDrawer({ userId, onClose, onChanged }) {
  const toast = useToast()
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('overview')
  const [busy, setBusy] = useState(false)

  const [roleModal, setRoleModal] = useState(false)
  const [suspendModal, setSuspendModal] = useState(false)
  const [restoreConfirm, setRestoreConfirm] = useState(false)
  const [roleDraft, setRoleDraft] = useState({ role: [], activeRole: '' })
  const [suspendReason, setSuspendReason] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    UsersAPI.get(userId)
      .then((res) => {
        setDetail(res.data)
        const u = res.data?.user
        setRoleDraft({
          role: Array.isArray(u?.role) ? u.role : u?.role ? [u.role] : [],
          activeRole: u?.activeRole || '',
        })
      })
      .catch((err) => setError(err?.message || 'Failed to load user.'))
      .finally(() => setLoading(false))
  }, [userId])

  useEffect(() => {
    load()
  }, [load])

  const user = detail?.user

  async function handleVerifyEmail() {
    setBusy(true)
    try {
      await UsersAPI.verifyEmail(userId)
      toast.success('Email marked as verified.')
      load()
      onChanged()
    } catch (err) {
      toast.error(err?.message || 'Failed to verify email.')
    } finally {
      setBusy(false)
    }
  }

  async function handleSaveRole() {
    if (roleDraft.role.length === 0) {
      toast.error('Select at least one role.')
      return
    }
    setBusy(true)
    try {
      await UsersAPI.setRole(userId, {
        role: roleDraft.role,
        ...(roleDraft.activeRole ? { activeRole: roleDraft.activeRole } : {}),
      })
      toast.success('Role updated.')
      setRoleModal(false)
      load()
      onChanged()
    } catch (err) {
      toast.error(err?.message || 'Failed to update role.')
    } finally {
      setBusy(false)
    }
  }

  async function handleSuspend() {
    setBusy(true)
    try {
      await UsersAPI.suspend(userId, suspendReason.trim() || undefined)
      toast.success('User suspended.')
      setSuspendModal(false)
      setSuspendReason('')
      load()
      onChanged()
    } catch (err) {
      toast.error(err?.message || 'Failed to suspend user.')
    } finally {
      setBusy(false)
    }
  }

  async function handleRestore() {
    setBusy(true)
    try {
      await UsersAPI.restore(userId)
      toast.success('User restored.')
      setRestoreConfirm(false)
      load()
      onChanged()
    } catch (err) {
      toast.error(err?.message || 'Failed to restore user.')
    } finally {
      setBusy(false)
    }
  }

  function toggleRole(role) {
    setRoleDraft((d) => ({
      ...d,
      role: d.role.includes(role) ? d.role.filter((r) => r !== role) : [...d.role, role],
    }))
  }

  const counts = detail?.counts || {}
  const isBand = Boolean(detail?.band)

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'bookings', label: 'Bookings', count: counts.bookings ?? detail?.bookings?.length },
    { key: 'payments', label: 'Payments', count: counts.payments ?? detail?.payments?.length },
    ...(isBand ? [{ key: 'payouts', label: 'Payouts', count: counts.payouts ?? detail?.payouts?.length }] : []),
    ...(isBand ? [{ key: 'packages', label: 'Packages', count: counts.packages ?? detail?.packages?.length }] : []),
    ...(isBand ? [{ key: 'reviews', label: 'Reviews', count: counts.reviews ?? detail?.reviews?.length }] : []),
    ...(isBand ? [{ key: 'posts', label: 'Posts', count: counts.posts ?? detail?.posts?.length }] : []),
    { key: 'disputes', label: 'Disputes', count: counts.disputes ?? detail?.disputes?.length },
    { key: 'availability', label: 'Requests', count: counts.availabilityRequests ?? detail?.availabilityRequests?.length },
  ]

  return (
    <Drawer
      open
      onClose={onClose}
      title={user?.fullName || 'User detail'}
      subtitle={user?.email}
      footer={
        user && (
          <>
            {!user.isEmailVerified && (
              <Button variant="secondary" onClick={handleVerifyEmail} loading={busy}>
                <ShieldCheck className="h-4 w-4" /> Verify email
              </Button>
            )}
            <Button variant="secondary" onClick={() => setRoleModal(true)}>
              <UserCog className="h-4 w-4" /> Change role
            </Button>
            {user.isDeleted ? (
              <Button variant="secondary" onClick={() => setRestoreConfirm(true)}>
                <RotateCcw className="h-4 w-4" /> Restore
              </Button>
            ) : (
              <Button variant="danger" onClick={() => setSuspendModal(true)}>
                <Ban className="h-4 w-4" /> Suspend
              </Button>
            )}
          </>
        )
      }
    >
      {loading && <LoadingBlock />}
      {error && !loading && <p className="text-sm text-danger-400">{error}</p>}

      {user && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            {(Array.isArray(user.role) ? user.role : [user.role]).filter(Boolean).map((r) => (
              <Badge key={r} tone={r === 'admin' ? 'info' : 'neutral'}>
                {titleCase(r)}
              </Badge>
            ))}
            <Badge tone={user.isDeleted ? 'danger' : 'success'}>{user.isDeleted ? 'Suspended' : 'Active'}</Badge>
            <BoolBadge value={user.isEmailVerified} trueLabel="Email verified" falseLabel="Email unverified" />
          </div>

          <Tabs tabs={tabs} active={tab} onChange={setTab} />

          {tab === 'overview' && (
            <div className="space-y-4">
              <Card className="p-4">
                {/* <KeyValue label="User ID" value={user._id} mono />*/}
                <KeyValue label="Full name" value={user.fullName} />
                <KeyValue label="Email" value={user.email} />
                <KeyValue label="Active role" value={user.activeRole ? titleCase(user.activeRole) : '—'} />
                <KeyValue label="City" value={user.city} />
                <KeyValue label="Organizer type" value={user.organizerType ? titleCase(user.organizerType) : '—'} />
                <KeyValue label="Joined" value={formatDateTime(user.createdAt)} />
                <KeyValue label="Last updated" value={formatDateTime(user.updatedAt)} />
              </Card>

              {detail.band && (
                <Card className="p-4">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Band profile</p>
                  <KeyValue label="Band name" value={detail.band.fullName} />
                  <KeyValue label="Ensemble type" value={detail.band.ensembleType ? titleCase(detail.band.ensembleType) : '—'} />
                  <KeyValue label="City" value={detail.band.city} />
                  <KeyValue
                    label="Price range"
                    value={
                      detail.band.minPrice != null || detail.band.maxPrice != null
                        ? `${formatCurrency(detail.band.minPrice)} – ${formatCurrency(detail.band.maxPrice)}`
                        : '—'
                    }
                  />
                  <KeyValue label="Packages" value={detail.band.packagesCount} />
                </Card>
              )}
            </div>
          )}

          {tab === 'bookings' && <RecordList items={detail.bookings} type="booking" />}
          {tab === 'payments' && <RecordList items={detail.payments} type="payment" />}
          {tab === 'payouts' && <RecordList items={detail.payouts} type="payout" />}
          {tab === 'packages' && <PackagesTab items={detail.packages} onChanged={load} />}
          {tab === 'reviews' && <RecordList items={detail.reviews} type="review" />}
          {tab === 'posts' && <PostsTab items={detail.posts} onChanged={load} />}
          {tab === 'disputes' && <RecordList items={detail.disputes} type="dispute" />}
          {tab === 'availability' && (
            <AvailabilityTab availabilityRequests={detail.availabilityRequests} openRequests={detail.openRequests} isBand={isBand} />
          )}
        </div>
      )}

      <Modal
        open={roleModal}
        onClose={() => setRoleModal(false)}
        title="Change role"
        description="Choose which roles this account can act as."
        footer={
          <>
            <Button variant="ghost" onClick={() => setRoleModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveRole} loading={busy}>
              Save changes
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Roles">
            <div className="flex flex-wrap gap-2">
              {ROLE_OPTIONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => toggleRole(r)}
                  className={`focus-ring rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
                    roleDraft.role.includes(r)
                      ? 'border-brand-500/60 bg-brand-500/20 text-brand-200'
                      : 'border-white/10 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {titleCase(r)}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Active role">
            <Select value={roleDraft.activeRole} onChange={(e) => setRoleDraft((d) => ({ ...d, activeRole: e.target.value }))}>
              <option value="">Unchanged</option>
              {roleDraft.role.map((r) => (
                <option key={r} value={r}>
                  {titleCase(r)}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Modal>

      <Modal
        open={suspendModal}
        onClose={() => setSuspendModal(false)}
        title="Suspend user"
        description="If this account has a band profile, active bookings will be force-cancelled."
        footer={
          <>
            <Button variant="ghost" onClick={() => setSuspendModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleSuspend} loading={busy}>
              Suspend account
            </Button>
          </>
        }
      >
        <Field label="Reason (optional)">
          <Textarea rows={3} value={suspendReason} onChange={(e) => setSuspendReason(e.target.value)} placeholder="Why is this account being suspended?" />
        </Field>
      </Modal>

      <ConfirmDialog
        open={restoreConfirm}
        onClose={() => setRestoreConfirm(false)}
        onConfirm={handleRestore}
        title="Restore this user?"
        description="They will regain access to their account immediately."
        confirmLabel="Restore user"
        loading={busy}
      />
    </Drawer>
  )
}

function Row({ label, value }) {
  if (value == null || value === '' || value === '—') return null
  return <KeyValue label={label} value={value} />
}

function personName(v) {
  return v && typeof v === 'object' ? v.fullName || v.email : null
}

function timeWindow(item) {
  return formatTimeRange(item.eventStart, item.eventEnd)
}

function RecordList({ items, type }) {
  if (!items || items.length === 0) {
    return <EmptyState title="No records" description="Nothing to show here yet." />
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const bookingId = type === 'booking' ? item._id : refId(item.booking) || item.bookingId
        return (
          <Card key={item._id} className="p-4">
            {type === 'booking' && (
              <>
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate text-sm font-medium text-slate-100">
                    {personName(item.band) || personName(item.user) || item.city || 'Booking'}
                  </p>
                  <StatusBadge status={item.bookingStatus || item.status} />
                </div>
                <div className="mt-2 divide-y divide-white/5">
                  <Row label="Customer" value={personName(item.user)} />
                  <Row label="Band" value={personName(item.band)} />
                  <Row label="Event date" value={item.eventDate ? formatDate(item.eventDate) : null} />
                  <Row label="Event time" value={timeWindow(item)} />
                  <Row label="City" value={item.city} />
                  <Row label="Address" value={item.address} />
                  <Row label="Total" value={item.totalAmount != null ? formatCurrency(item.totalAmount) : null} />
                  <Row label="Payment" value={item.paymentStatus ? <StatusBadge status={item.paymentStatus} /> : null} />
                  <Row label="Created" value={formatDateTime(item.createdAt)} />
                </div>
              </>
            )}
            {type === 'payment' && (
              <>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-slate-100">{formatCurrency(item.totalAmount)}</p>
                  <StatusBadge status={item.status} />
                </div>
                <div className="mt-2 divide-y divide-white/5">
                  <Row label="Refunded" value={item.refundedAmount > 0 ? formatCurrency(item.refundedAmount) : null} />
                  <Row label="Platform fee" value={item.platformFee != null ? formatCurrency(item.platformFee) : null} />
                  <Row label="Method" value={item.paymentMethod ? titleCase(item.paymentMethod) : null} />
                  <Row label="Paid" value={item.paidAt ? formatDateTime(item.paidAt) : null} />
                  <Row label="Created" value={formatDateTime(item.createdAt)} />
                </div>
              </>
            )}
            {type === 'payout' && (
              <>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-slate-100">{formatCurrency(item.payoutAmount)}</p>
                  <StatusBadge status={item.status} />
                </div>
                <div className="mt-2 divide-y divide-white/5">
                  <Row label="Band" value={personName(item.band)} />
                  <Row label="Transferred" value={item.transferredAt ? formatDateTime(item.transferredAt) : null} />
                  <Row label="Created" value={formatDateTime(item.createdAt)} />
                </div>
              </>
            )}
            {type === 'review' && (
              <>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-slate-100">{item.user?.fullName || 'Anonymous'}</p>
                  {item.rating != null && <Badge tone="warning">{item.rating}★</Badge>}
                </div>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-300">{item.comment || item.text || 'No comment'}</p>
                <p className="mt-1 text-xs text-slate-500">{formatDateTime(item.createdAt)}</p>
              </>
            )}
            {type === 'dispute' && (
              <>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-slate-100">{item.reason || 'Dispute'}</p>
                  <StatusBadge status={item.status} />
                </div>
                <div className="mt-2 divide-y divide-white/5">
                  <Row label="Opened" value={formatDateTime(item.openedAt || item.createdAt)} />
                  <Row label="Resolution" value={item.resolution} />
                </div>
              </>
            )}
            {type === 'availability' && (
              <>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-slate-100">{item.city || 'Availability request'}</p>
                  <StatusBadge status={item.status} />
                </div>
                <div className="mt-2 divide-y divide-white/5">
                  <Row label="Event date" value={item.eventDate ? formatDate(item.eventDate) : null} />
                  <Row label="Event time" value={timeWindow(item)} />
                  <Row label="Address" value={item.address} />
                  <Row label="Created" value={formatDateTime(item.createdAt)} />
                </div>
              </>
            )}

            {(type === 'booking' || type === 'payment') && bookingId && (
              <p className="mt-2.5 text-xs">
                <AppLink to={`/bookings?open=${bookingId}`}>
                  {type === 'booking' ? 'View full booking details' : 'View payment in booking details'}
                </AppLink>
              </p>
            )}
            {type === 'payout' && (
              <p className="mt-2.5 text-xs">
                <AppLink to={`/payouts?open=${item._id}`}>View full payout details</AppLink>
              </p>
            )}
            {type === 'dispute' && (
              <p className="mt-2.5 text-xs">
                <AppLink to={`/disputes?open=${item._id}`}>View full dispute details</AppLink>
              </p>
            )}
            {type === 'review' && bookingId && (
              <p className="mt-2.5 text-xs">
                <AppLink to={`/bookings?open=${bookingId}`}>View related booking</AppLink>
              </p>
            )}
          </Card>
        )
      })}
    </div>
  )
}

function PackagesTab({ items, onChanged }) {
  const toast = useToast()
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [busy, setBusy] = useState(false)

  async function handleDelete() {
    if (!deleteTarget) return
    setBusy(true)
    try {
      await BandPackagesAPI.remove(deleteTarget._id)
      toast.success('Package deleted.')
      setDeleteTarget(null)
      onChanged()
    } catch (err) {
      toast.error(err?.message || 'Failed to delete package.')
    } finally {
      setBusy(false)
    }
  }

  if (!items || items.length === 0) {
    return <EmptyState title="No packages" description="This band hasn't added any packages yet." />
  }

  return (
    <div className="space-y-2">
      {items.map((p) => (
        <Card key={p._id} className="flex items-start justify-between gap-2 p-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-100">{p.name || p.title}</p>
            <p className="text-xs text-slate-500">
              {formatCurrency(p.price)} · {p.duration ? `${p.duration} min` : formatDate(p.createdAt)}
            </p>
            {p.description && <p className="mt-1.5 line-clamp-3 whitespace-pre-wrap break-words text-xs text-slate-400">{p.description}</p>}
            {Array.isArray(p.includes) && p.includes.length > 0 && (
              <p className="mt-1 text-xs text-slate-500">Includes: {p.includes.join(', ')}</p>
            )}
            <p className="mt-1 text-xs text-slate-600">Added {formatDate(p.createdAt)}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge tone={p.isActive ? 'success' : 'neutral'}>{p.isActive ? 'Active' : 'Inactive'}</Badge>
            <Button size="sm" variant="danger" onClick={() => setDeleteTarget(p)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </Card>
      ))}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete this package?"
        description="Blocked if there's any active booking on this package. This permanently removes it."
        confirmLabel="Delete package"
        variant="danger"
        loading={busy}
      />
    </div>
  )
}

function PostsTab({ items, onChanged }) {
  const toast = useToast()
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [busy, setBusy] = useState(false)

  async function handleDelete() {
    if (!deleteTarget) return
    setBusy(true)
    try {
      await PostsAPI.remove(deleteTarget._id)
      toast.success('Post removed.')
      setDeleteTarget(null)
      onChanged()
    } catch (err) {
      toast.error(err?.message || 'Failed to delete post.')
    } finally {
      setBusy(false)
    }
  }

  if (!items || items.length === 0) {
    return <EmptyState title="No posts" description="This band hasn't posted anything yet." />
  }

  return (
    <div className="space-y-2">
      {items.map((p) => (
        <Card key={p._id} className="p-3.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-slate-200">{p.caption || 'Untitled post'}</p>
              <p className="text-xs text-slate-500">
                {formatNumber(p.likeCount)} likes · {formatNumber(p.commentCount)} comments · {formatNumber(p.views)} views ·{' '}
                {formatDate(p.createdAt)}
              </p>
              {findUrl(p) ? (
                <p className="mt-1.5 text-xs">
                  <ExternalLink href={findUrl(p)}>Click here to view post</ExternalLink>
                </p>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Badge tone={p.isDeleted ? 'danger' : 'success'}>{p.isDeleted ? 'Removed' : 'Live'}</Badge>
              {!p.isDeleted && (
                <Button size="sm" variant="danger" onClick={() => setDeleteTarget(p)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        </Card>
      ))}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Remove this post?"
        description="This soft-deletes the post and decrements the band's post count."
        confirmLabel="Remove post"
        variant="danger"
        loading={busy}
      />
    </div>
  )
}

function AvailabilityTab({ availabilityRequests, openRequests, isBand }) {
  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Availability requests</p>
        <RecordList items={availabilityRequests} type="availability" />
      </div>

      {isBand && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Open request offers submitted</p>
          {!openRequests?.offers || openRequests.offers.length === 0 ? (
            <EmptyState title="No offers" description="This band hasn't submitted any open-request offers." />
          ) : (
            <div className="space-y-2">
              {openRequests.offers.map((o) => (
                <Card key={o._id} className="flex items-center justify-between gap-2 p-3.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-slate-200">
                      {o.openRequest?.title || o.openRequest?.eventType || 'Open request'}
                    </p>
                    <p className="text-xs text-slate-500">
                      {o.openRequest?.city} · {formatDate(o.openRequest?.eventDate)}
                      {o.budget != null && ` · ${formatCurrency(o.budget)}`}
                    </p>
                  </div>
                  <StatusBadge status={o.openRequest?.status} />
                </Card>
              ))}
            </div>
          )}

          {openRequests?.stats && (
            <Card className="mt-3 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Participation stats</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <KeyValue label="Offers submitted" value={formatNumber(openRequests.stats.offersSubmitted?.total)} />
                <KeyValue label="Won" value={formatNumber(openRequests.stats.participatedRequests?.wonByThisBand)} />
                <KeyValue label="Lost to other band" value={formatNumber(openRequests.stats.participatedRequests?.closedLostToOtherBand)} />
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
