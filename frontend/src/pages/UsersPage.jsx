import { useCallback, useEffect, useState } from 'react'
import { Users as UsersIcon, ShieldCheck, UserCog, Ban, RotateCcw } from 'lucide-react'
import { AdminLayout } from '../components/layout'
import {
  Badge,
  BoolBadge,
  Button,
  Card,
  ConfirmDialog,
  Drawer,
  EmptyState,
  Field,
  KeyValue,
  LoadingBlock,
  Modal,
  Pagination,
  RawPanel,
  SearchInput,
  Select,
  StatusBadge,
  Table,
  Tabs,
  Textarea,
} from '../components/ui'
import { UsersAPI } from '../lib/api'
import { useToast } from '../context/ToastContext'
import { formatCurrency, formatDate, formatDateTime, initials, titleCase } from '../lib/formatters'

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
            <p className="truncate text-sm font-medium text-slate-100">{u.fullName || 'Unnamed'}</p>
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

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'bookings', label: 'Bookings', count: detail?.bookings?.length },
    { key: 'payments', label: 'Payments', count: detail?.payments?.length },
    { key: 'disputes', label: 'Disputes', count: detail?.disputes?.length },
    { key: 'availability', label: 'Requests', count: detail?.availabilityRequests?.length },
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
                <KeyValue label="User ID" value={user._id} mono />
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

              <RawPanel data={user} label="Raw user record" />
            </div>
          )}

          {tab === 'bookings' && <RecordList items={detail.bookings} type="booking" />}
          {tab === 'payments' && <RecordList items={detail.payments} type="payment" />}
          {tab === 'disputes' && <RecordList items={detail.disputes} type="dispute" />}
          {tab === 'availability' && <RecordList items={detail.availabilityRequests} type="availability" />}
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

function RecordList({ items, type }) {
  if (!items || items.length === 0) {
    return <EmptyState title="No records" description="Nothing to show here yet." />
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <Card key={item._id} className="p-3.5">
          {type === 'booking' && (
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm text-slate-200">{item.band?.fullName || item.city || item._id}</p>
                <p className="text-xs text-slate-500">{formatDate(item.eventDate || item.createdAt)}</p>
              </div>
              <StatusBadge status={item.status} />
            </div>
          )}
          {type === 'payment' && (
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-slate-200">{formatCurrency(item.amount)}</p>
              <StatusBadge status={item.status} />
            </div>
          )}
          {type === 'dispute' && (
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm text-slate-200">{item.reason || item._id}</p>
              <StatusBadge status={item.status} />
            </div>
          )}
          {type === 'availability' && (
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm text-slate-200">{item.city || item._id}</p>
              <StatusBadge status={item.status} />
            </div>
          )}
        </Card>
      ))}
    </div>
  )
}
