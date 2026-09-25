import { useEffect, useState } from 'react'
import { Settings, ListTree } from 'lucide-react'
import { AdminLayout } from '../components/layout'
import { AutoFields, Card, EmptyState, LoadingBlock, SectionTitle, Tabs } from '../components/ui'
import { ConfigAPI } from '../lib/api'
import { titleCase } from '../lib/formatters'

export default function ConfigPage() {
  const [tab, setTab] = useState('policy')
  const [policy, setPolicy] = useState(null)
  const [fieldOptions, setFieldOptions] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    Promise.all([ConfigAPI.bookingPolicy(), ConfigAPI.fieldOptions()])
      .then(([policyRes, optionsRes]) => {
        if (cancelled) return
        setPolicy(policyRes.data)
        setFieldOptions(optionsRes.data)
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || 'Failed to load platform configuration.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const tabs = [
    { key: 'policy', label: 'Booking Policy' },
    { key: 'fields', label: 'Field Options' },
  ]

  return (
    <AdminLayout title="Platform Config" description="Reference data used across the platform">
      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      <div className="mt-5">
        {loading && <LoadingBlock />}
        {error && !loading && <EmptyState icon={Settings} title="Couldn't load configuration" description={error} />}

        {!loading && !error && tab === 'policy' && (
          <Card className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <Settings className="h-4 w-4 text-brand-400" />
              <h3 className="text-sm font-semibold text-slate-200">Booking policy</h3>
            </div>
            {policy ? (
              <PolicyGrid policy={policy} />
            ) : (
              <EmptyState title="No policy data" />
            )}
          </Card>
        )}

        {!loading && !error && tab === 'fields' && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {fieldOptions?.availabilityRequest ? (
              Object.entries(fieldOptions.availabilityRequest).map(([field, values]) => (
                <Card key={field} className="p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <ListTree className="h-4 w-4 text-brand-400" />
                    <h3 className="text-sm font-semibold text-slate-200">{titleCase(field)}</h3>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(Array.isArray(values) ? values : []).map((v) => (
                      <span key={v} className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-0.5 text-xs text-slate-300">
                        {v}
                      </span>
                    ))}
                  </div>
                </Card>
              ))
            ) : (
              <EmptyState title="No field options" />
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

function PolicyGrid({ policy }) {
  const entries = Object.entries(policy)
  const simple = entries.filter(([, v]) => typeof v !== 'object' || v === null)
  const nested = entries.filter(([, v]) => typeof v === 'object' && v !== null)

  return (
    <div className="space-y-5">
      {simple.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {simple.map(([key, value]) => (
            <div key={key} className="rounded-xl border border-white/8 bg-white/[0.02] p-3.5">
              <p className="text-xs uppercase tracking-wide text-slate-500">{titleCase(key)}</p>
              <p className="mt-0.5 text-sm font-medium text-slate-100">{String(value)}</p>
            </div>
          ))}
        </div>
      )}
      {nested.map(([key, value]) => (
        <div key={key} className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
          <SectionTitle>{titleCase(key)}</SectionTitle>
          <AutoFields data={value} />
        </div>
      ))}
    </div>
  )
}
