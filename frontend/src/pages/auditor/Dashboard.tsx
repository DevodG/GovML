import { useState, useEffect } from 'react'
import { LayoutDashboard, AlertTriangle, Search, CheckCircle, Shield, FileText, TrendingUp } from 'lucide-react'
import { auditorAPI } from '../../lib/api'
import { LoadingState } from '../../components/ui'
import { toast } from 'sonner'

interface DashboardStats {
  totalAudits: number
  pendingReviews: number
  anomaliesDetected: number
  highSeverityAnomalies: number
  recentActivity: number
}

export default function AuditorDashboard() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats | null>(null)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      setLoading(true)
      const data = await auditorAPI.getStats()
      setStats(data.statistics)
    } catch (error: any) {
      console.error('Failed to load stats:', error)
      toast.error(error.message || 'Failed to load statistics')
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    {
      label: 'Total Audits',
      value: stats?.totalAudits || 0,
      icon: LayoutDashboard,
      color: 'var(--auditor)',
    },
    {
      label: 'Pending Reviews',
      value: stats?.pendingReviews || 0,
      icon: Search,
      color: 'var(--warning)',
    },
    {
      label: 'Anomalies Detected',
      value: stats?.anomaliesDetected || 0,
      icon: AlertTriangle,
      color: 'var(--danger)',
    },
    {
      label: 'High Severity',
      value: stats?.highSeverityAnomalies || 0,
      icon: CheckCircle,
      color: 'var(--danger)',
    },
  ]

  if (loading) {
    return <LoadingState type="card" count={4} />
  }

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
        <LayoutDashboard size={20} color="var(--auditor)" />
        <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }}>Audit Dashboard</h1>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 28 }}>
        {statCards.map((s) => (
          <div key={s.label} className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>{s.label}</span>
              <s.icon size={16} style={{ color: s.color }} />
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="card" style={{ padding: 24, marginBottom: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Recent Activity</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 16, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
          <TrendingUp size={16} color="var(--auditor)" />
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {stats?.recentActivity || 0} audits in the last 7 days
          </span>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card" style={{ padding: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Quick Actions</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          <button
            onClick={() => (window.location.href = '/auditor/anomalies')}
            className="btn btn-ghost"
            style={{ padding: '12px 20px', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            <AlertTriangle size={16} />
            View Anomalies
          </button>
          <button
            onClick={() => (window.location.href = '/auditor/bids')}
            className="btn btn-ghost"
            style={{ padding: '12px 20px', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            <Search size={16} />
            Analyze Bids
          </button>
          <button
            onClick={() => (window.location.href = '/auditor/reports')}
            className="btn btn-ghost"
            style={{ padding: '12px 20px', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            <FileText size={16} />
            View Reports
          </button>
          <button
            onClick={() => (window.location.href = '/auditor/sign')}
            className="btn btn-ghost"
            style={{ padding: '12px 20px', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            <Shield size={16} />
            Oracle Sign
          </button>
        </div>
      </div>
    </div>
  )
}
