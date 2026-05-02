import { useState, useEffect, useMemo } from 'react'
import { MapPin, DollarSign, TrendingUp, FileText } from 'lucide-react'
import { publicAPI } from '../../lib/api'
import { formatINR } from '../../lib/format'
import { LoadingState } from '../../components/ui'
import { toast } from 'sonner'

interface FundStats {
  categoryStats: Array<{
    _id: string
    totalBudget: number
    count: number
  }>
  totalBudget: number
  totalTenders: number
}

interface StateRow {
  state: string
  tenders: number
  allocated: number
  utilised: number
}

function parseStateMap(raw: unknown): StateRow[] {
  if (!raw || typeof raw !== 'object') return []
  return Object.entries(raw as Record<string, { tenders?: number; allocated?: number; utilised?: number }>).map(
    ([key, v]) => ({
      state: key === 'null' || key === 'undefined' || !key ? '—' : key,
      tenders: v?.tenders ?? 0,
      allocated: v?.allocated ?? 0,
      utilised: v?.utilised ?? 0,
    })
  )
}

export default function FundMap() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<FundStats | null>(null)
  const [stateRows, setStateRows] = useState<StateRow[]>([])

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const [dash, map] = await Promise.all([publicAPI.getFundDashboard(), publicAPI.getFundMap()])
        setStats(dash as FundStats)
        const rows = parseStateMap((map as { stateData?: unknown }).stateData)
        setStateRows(rows.sort((a, b) => b.allocated - a.allocated))
      } catch (error: unknown) {
        console.error('Failed to load fund stats:', error)
        // Only show error for actual failures
        const msg = error instanceof Error ? error.message : ''
        if (msg && !msg.includes('404') && !msg.includes('not found')) {
          toast.error('Unable to load fund data. Please try again.')
        }
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  const { totalUtilised, utilisationPct } = useMemo(() => {
    const total = stateRows.reduce((s, r) => s + (r.utilised || 0), 0)
    const budget = stats?.totalBudget ?? 0
    const pct = budget > 0 ? (total / budget) * 100 : 0
    return { totalUtilised: total, utilisationPct: pct }
  }, [stateRows, stats?.totalBudget])

  if (loading) {
    return <LoadingState type="card" />
  }

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
        <MapPin size={20} color="var(--public)" />
        <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }}>Fund Map</h1>
      </div>

      {/* Total Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <DollarSign size={16} color="var(--public)" />
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>Total Budget</span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>
            {formatINR(stats?.totalBudget || 0)}
          </div>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <FileText size={16} color="var(--public)" />
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>Total Tenders</span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>
            {stats?.totalTenders || 0}
          </div>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <TrendingUp size={16} color="var(--public)" />
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>Utilisation</span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>
            {utilisationPct.toFixed(1)}%
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
            {formatINR(totalUtilised)} utilised of {formatINR(stats?.totalBudget || 0)} budget
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="card" style={{ padding: 24, marginBottom: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Budget by Category</h3>
        {stats?.categoryStats && stats.categoryStats.length > 0 ? (
          stats.categoryStats.map((cat) => {
            const maxBudget = Math.max(...stats.categoryStats.map((c) => c.totalBudget))
            const widthPct = maxBudget > 0 ? (cat.totalBudget / maxBudget) * 100 : 0
            return (
              <div key={cat._id} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: 'var(--text-primary)', textTransform: 'capitalize' as const }}>
                    {cat._id || 'Uncategorized'}
                  </span>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{formatINR(cat.totalBudget)}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{cat.count} tenders</span>
                  </div>
                </div>
                <div style={{ height: 8, background: 'var(--bg-elevated)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${widthPct}%`,
                      background: 'var(--public)',
                      borderRadius: '4px',
                      transition: 'width 0.6s var(--ease-out)',
                    }}
                  />
                </div>
              </div>
            )
          })
        ) : (
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No category data available. Connect backend to load live stats.</p>
        )}
      </div>

      {/* State-wise table */}
      <div className="card" style={{ padding: 24, marginBottom: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Funds by State / Region</h3>
        {stateRows.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '10px 8px', fontWeight: 600 }}>State</th>
                  <th style={{ padding: '10px 8px', fontWeight: 600 }}>Tenders</th>
                  <th style={{ padding: '10px 8px', fontWeight: 600 }}>Allocated</th>
                  <th style={{ padding: '10px 8px', fontWeight: 600 }}>Utilised</th>
                  <th style={{ padding: '10px 8px', fontWeight: 600 }}>Util %</th>
                </tr>
              </thead>
              <tbody>
                {stateRows.map((row) => {
                  const pct = row.allocated > 0 ? (row.utilised / row.allocated) * 100 : 0
                  return (
                    <tr key={row.state} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px 8px', textTransform: 'capitalize' as const }}>{row.state}</td>
                      <td style={{ padding: '10px 8px' }}>{row.tenders}</td>
                      <td style={{ padding: '10px 8px' }}>{formatINR(row.allocated)}</td>
                      <td style={{ padding: '10px 8px' }}>{formatINR(row.utilised)}</td>
                      <td style={{ padding: '10px 8px' }}>{pct.toFixed(1)}%</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No state-level allocation data yet.</p>
        )}
      </div>
    </div>
  )
}
