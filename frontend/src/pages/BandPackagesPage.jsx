import { useCallback, useEffect, useState } from 'react'
import { Package, Trash2 } from 'lucide-react'
import { AdminLayout } from '../components/layout'
import { Badge, Button, Card, ConfirmDialog, EmptyState, Pagination, RawPanel, Select, Table, TextInput } from '../components/ui'
import { BandPackagesAPI } from '../lib/api'
import { useToast } from '../context/ToastContext'
import { formatCurrency, formatDate } from '../lib/formatters'

export default function BandPackagesPage() {
  const toast = useToast()
  const [filters, setFilters] = useState({ bandId: '', isActive: '' })
  const [page, setPage] = useState(1)
  const limit = 20
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [busy, setBusy] = useState(false)
  const [rawId, setRawId] = useState(null)

  const fetchList = useCallback(() => {
    setLoading(true)
    setError('')
    BandPackagesAPI.list({ ...filters, page, limit })
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

  const rawRow = data?.items?.find((p) => p._id === rawId)

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
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setRawId(p._id)
            }}
            className="focus-ring rounded-lg px-2 py-1 text-xs text-slate-400 hover:bg-white/5 hover:text-slate-200"
          >
            Details
          </button>
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
          <TextInput placeholder="Band ID" value={filters.bandId} onChange={(e) => updateFilter('bandId', e.target.value)} />
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

      {rawRow && (
        <div className="mt-4">
          <RawPanel data={rawRow} label={`Package ${rawRow._id}`} />
        </div>
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
