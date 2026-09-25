import { useState } from 'react'
import { BarChart3, Search } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AdminLayout } from '../components/layout'
import { Button, Card, EmptyState, Field, LoadingBlock, StatCard, TextInput } from '../components/ui'
import { AnalyticsAPI } from '../lib/api'
import { useToast } from '../context/ToastContext'
import { formatNumber, titleCase } from '../lib/formatters'

const CHART_COLORS = ['#8b5cf6', '#ec4899', '#38bdf8', '#34d399', '#fbbf24', '#fb7185', '#a78bfa', '#f472b6']

function byStatusToChartData(byStatus) {
  if (!byStatus) return []
  return Object.entries(byStatus).map(([status, count]) => ({ name: titleCase(status), value: count }))
}

export default function BandAnalyticsPage() {
  const toast = useToast()
  const [bandId, setBandId] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchedId, setSearchedId] = useState('')

  async function handleSearch(e) {
    e.preventDefault()
    if (!bandId.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await AnalyticsAPI.bandAnalytics(bandId.trim())
      setData(res.data)
      setSearchedId(bandId.trim())
    } catch (err) {
      setData(null)
      setError(err?.message || 'Failed to load analytics for this band.')
      toast.error(err?.message || 'Failed to load analytics.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AdminLayout title="Band Analytics" description="Look up booking, request, and content performance for any band">
      <Card className="mb-6 p-4">
        <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Field label="Band ID">
              <TextInput
                icon={Search}
                placeholder="e.g. 6a50caca2da34839fbeec418"
                value={bandId}
                onChange={(e) => setBandId(e.target.value)}
              />
            </Field>
          </div>
          <Button type="submit" loading={loading}>
            Load analytics
          </Button>
        </form>
      </Card>

      {loading && <LoadingBlock />}
      {error && !loading && (
        <EmptyState icon={BarChart3} title="No analytics loaded" description={error} />
      )}

      {!loading && !error && !data && (
        <EmptyState icon={BarChart3} title="Enter a band ID" description="Search for a band above to view their analytics." />
      )}

      {data && !loading && (
        <div className="space-y-6">
          <p className="text-xs text-slate-500">
            Showing analytics for band <span className="font-mono text-slate-300">{searchedId}</span>
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total bookings" value={formatNumber(data.bookings?.total)} accent="brand" />
            <StatCard label="Cancelled bookings" value={formatNumber(data.bookings?.cancelled)} accent="warning" />
            <StatCard label="Total availability requests" value={formatNumber(data.availabilityRequests?.total)} accent="info" />
            <StatCard label="Total posts" value={formatNumber(data.posts?.totalPosts)} accent="accent" />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCard title="Bookings by status" data={byStatusToChartData(data.bookings?.byStatus)} />
            <ChartCard title="Availability requests by status" data={byStatusToChartData(data.availabilityRequests?.byStatus)} />
            <ChartCard title="Offers submitted by status" data={byStatusToChartData(data.openRequests?.offersSubmitted?.byStatus)} />
            <ChartCard title="Participated requests by status" data={byStatusToChartData(data.openRequests?.participatedRequests?.byStatus)} />
          </div>

          <Card className="p-5">
            <h3 className="mb-4 text-sm font-semibold text-slate-200">Post engagement</h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Metric label="Total views" value={formatNumber(data.posts?.totalViews)} />
              <Metric label="Avg views / post" value={formatNumber(data.posts?.averageViewsPerPost)} />
              <Metric label="Total likes" value={formatNumber(data.posts?.totalLikes)} />
              <Metric label="Total comments" value={formatNumber(data.posts?.totalComments)} />
              <Metric label="Total shares" value={formatNumber(data.posts?.totalShares)} />
              <Metric label="Total interactions" value={formatNumber(data.posts?.totalInteractions)} />
              <Metric label="Won open requests" value={formatNumber(data.openRequests?.participatedRequests?.wonByThisBand)} />
              <Metric label="Lost to other band" value={formatNumber(data.openRequests?.participatedRequests?.closedLostToOtherBand)} />
            </div>

            {(data.posts?.mostLikedPost || data.posts?.mostViewedPost) && (
              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {data.posts?.mostLikedPost && <PostHighlight title="Most liked post" post={data.posts.mostLikedPost} />}
                {data.posts?.mostViewedPost && <PostHighlight title="Most viewed post" post={data.posts.mostViewedPost} />}
              </div>
            )}
          </Card>
        </div>
      )}
    </AdminLayout>
  )
}

function ChartCard({ title, data }) {
  const hasData = data.some((d) => d.value > 0)
  return (
    <Card className="p-5">
      <h3 className="mb-3 text-sm font-semibold text-slate-200">{title}</h3>
      {!hasData ? (
        <p className="py-10 text-center text-xs text-slate-500">No data yet</p>
      ) : (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} allowDecimals={false} />
              <YAxis dataKey="name" type="category" width={110} tick={{ fill: '#cbd5e1', fontSize: 12 }} />
              <Tooltip
                contentStyle={{ background: '#160e2b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }}
                labelStyle={{ color: '#f3f0fa' }}
              />
              <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                {data.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  )
}

function Metric({ label, value }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-0.5 text-lg font-semibold text-white">{value}</p>
    </div>
  )
}

function PostHighlight({ title, post }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3.5">
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">{title}</p>
      <p className="truncate text-sm text-slate-200">{post.caption || 'Untitled post'}</p>
      <div className="mt-2 flex gap-3 text-xs text-slate-500">
        <span>{formatNumber(post.likeCount)} likes</span>
        <span>{formatNumber(post.views)} views</span>
        <span>{formatNumber(post.commentCount)} comments</span>
      </div>
    </div>
  )
}
