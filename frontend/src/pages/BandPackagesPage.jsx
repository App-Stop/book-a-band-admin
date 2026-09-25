import { useCallback, useEffect, useState } from 'react'
import { Package, Trash2 } from 'lucide-react'
import { AdminLayout } from '../components/layout'
import {
  AutoFields,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  Drawer,
  EmptyState,
  EntitySearchSelect,
  KeyValue,
  Pagination,
  Select,
  Table,
} from '../components/ui'
import { BandPackagesAPI } from '../lib/api'
import { useToast } from '../context/ToastContext'
import { formatCurrency, formatDate, formatDateTime } from '../lib/formatters'

const PACKAGE_KNOWN_KEYS = ['_id', 'bandId', 'name', 'title', 'price', 'isActive', 'createdAt', 'updatedAt']

export default function BandPackagesPage() {
  const toast = useToast()
  const [filters, setFilters] = useState({ bandId: '', bandLabel: '', isActive: '' })
  const [page, setPage] = useState(1)
  const limit = 20
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [busy, setBusy] = useState(false)
  const [selectedId, setSelectedId] = useState(null)

  const fetchList = useCallback(() => {
    setLoading(true)
    setError('')
    const { bandLabel: _bandLabel, ...apiFilters } = filters
    BandPackagesAPI.list({ ...apiFilters, page, limit })
      .then((res) => setData(res.data))
      .catch((err) => setError(err?.message || 'Failed to load band packages.'))
      .finally(() => setLoading(false))
  }, [filters, page])

  useEffect(() => {
    fetchList()
  }, [fetchList])

  function updateFilter(key, value) {
    setPage(1)
    setFilters((f) => ({ ...f, [key]: value }))
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setBusy(true)
    try {
      await BandPackagesAPI.remove(deleteTarget._id)
      toast.success('Package deleted.')
      setDeleteTarget(null)
      fetchList()
    } catch (err) {
      toast.error(err?.message || 'Failed to delete package.')
    } finally {
      setBusy(false)
    }
  }

  const selectedPackage = data?.items?.find((p) => p._id === selectedId)

  const columns = [
    {
      key: 'band',
      header: 'Band',
      render: (p) => (
        <div className="flex items-center gap-2.5">
          {p.bandId?.profilePicture && (
            <img src={p.bandId.profilePicture} alt="" className="h-7 w-7 rounded-full object-cover" />
          )}
          <span className="text-sm text-slate-200">{p.bandId?.fullName || '—'}</span>
        </div>
      ),
    },
    { key: 'name', header: 'Package', render: (p) => p.name || p.title || '—' },
    { key: 'price', header: 'Price', render: (p) => formatCurrency(p.price) },
    { key: 'status', header: 'Status', render: (p) => <Badge tone={p.isActive ? 'success' : 'neutral'}>{p.isActive ? 'Active' : 'Inactive'}</Badge> },
    { key: 'created', header: 'Created', render: (p) => formatDate(p.createdAt) },
    {
      key: 'actions',
      header: '',
      headClassName: 'text-right',
      className: 'text-right',
      render: (p) => (
        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            variant="danger"
            onClick={(e) => {
              e.stopPropagation()
              setDeleteTarget(p)
            }}
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </Button>
        </div>
      ),
    },
  ]

  return (
    <AdminLayout title="Band Packages" description="Review and remove band service packages">
      <Card className="mb-4 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <EntitySearchSelect
            role="band"
            placeholder="Search band name…"
            value={filters.bandId}
            valueLabel={filters.bandLabel}
            onSelect={(id, label) => {
              setPage(1)
              setFilters((f) => ({ ...f, bandId: id || '', bandLabel: label || '' }))
            }}
          />
          <Select value={filters.isActive} onChange={(e) => updateFilter('isActive', e.target.value)}>
            <option value="">All packages</option>
            <option value="true">Active only</option>
            <option value="false">Inactive only</option>
          </Select>
        </div>
      </Card>

      <Card>
        <Table
          columns={columns}
          rows={data?.items || []}
          rowKey={(p) => p._id}
          loading={loading}
          onRowClick={(p) => setSelectedId(p._id)}
          emptyState={<EmptyState icon={Package} title="No packages found" description="Try adjusting your filters." />}
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

      {selectedPackage && (
        <PackageDetailDrawer
          pkg={selectedPackage}
          onClose={() => setSelectedId(null)}
          onDelete={(p) => {
            setSelectedId(null)
            setDeleteTarget(p)
          }}
        />
      )}

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
    </AdminLayout>
  )
}

function PackageDetailDrawer({ pkg, onClose, onDelete }) {
  const hasExtraFields = Object.keys(pkg).some((k) => !PACKAGE_KNOWN_KEYS.includes(k) && k !== '__v')

  return (
    <Drawer
      open
      onClose={onClose}
      title="Package detail"
      subtitle={pkg._id}
      footer={
        <Button variant="danger" onClick={() => onDelete(pkg)}>
          <Trash2 className="h-4 w-4" /> Delete package
        </Button>
      }
    >
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          {pkg.bandId?.profilePicture && (
            <img src={pkg.bandId.profilePicture} alt="" className="h-10 w-10 rounded-full object-cover" />
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-100">{pkg.bandId?.fullName || 'Unknown band'}</p>
            <Badge tone={pkg.isActive ? 'success' : 'neutral'}>{pkg.isActive ? 'Active' : 'Inactive'}</Badge>
          </div>
        </div>

        <Card className="p-4">
          <KeyValue label="Package ID" value={pkg._id} mono />
          <KeyValue label="Name" value={pkg.name || pkg.title} />
          <KeyValue label="Price" value={formatCurrency(pkg.price)} />
          <KeyValue label="Created" value={formatDateTime(pkg.createdAt)} />
          {pkg.updatedAt && <KeyValue label="Last updated" value={formatDateTime(pkg.updatedAt)} />}
        </Card>

        {hasExtraFields && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Additional details</p>
            <Card className="p-4">
              <AutoFields data={pkg} exclude={PACKAGE_KNOWN_KEYS} />
            </Card>
          </div>
        )}
      </div>
    </Drawer>
  )
}
