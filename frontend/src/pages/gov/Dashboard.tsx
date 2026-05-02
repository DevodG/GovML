import { useEffect, useState } from 'react'
import { LayoutDashboard, FileText, CheckCircle, AlertTriangle, TrendingUp, ArrowRight } from 'lucide-react'
import { govAPI } from '../../lib/api'
import { formatINR, timeAgo } from '../../lib/format'
import { LoadingState } from '../../components/ui'
import { StatusBadge } from '../../components/ui'

interface DashboardStats {
  activeTenders: number
  pendingApprovals: number
  highRiskAnomalies: number
  totalEscrow: number
}

interface RecentTender {
  _id: string
  tenderId: string
  title: string
  category: string
  budget: number
  status: string
  createdAt: string
}

export default function GovDashboard() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentTenders, setRecentTenders] = useState<RecentTender[]>([])

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    try {
      setLoading(true)
      const data = await govAPI.getDashboard()
      setStats(data.stats)
      setRecentTenders(data.recentTenders || [])
    } catch (error) {
      console.error('Failed to load dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <LoadingState type="card" count={4} />
  }

  const statCards = [
    {
      label: 'Active Tenders',
      value: stats?.activeTenders || 0,
      icon: FileText,
      color: 'var(--gov)',
    },
    {
      label: 'Pending Approvals',
      value: stats?.pendingApprovals || 0,
      icon: CheckCircle,
      color: 'var(--warning)',
    },
    {
      label: 'High Risk Anomalies',
      value: stats?.highRiskAnomalies || 0,
      icon: AlertTriangle,
      color: 'var(--danger)',
    },
    {
      label: 'Total Escrow',
      value: formatINR(stats?.totalEscrow || 0),
      icon: TrendingUp,
      color: 'var(--success)',
    },
  ]

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
        <LayoutDashboard size={20} color="var(--gov)" />
        <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }}>Dashboard</h1>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 28 }}>
        {statCards.map((s) => (
          <div key={s.label} className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>{s.label}</span>
              <s.icon size={16} style={{ color: s.color }} />
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Recent Tenders */}
      <div className="card" style={{ padding: 24, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600 }}>Recent Tenders</h3>
          {recentTenders.length > 0 && (
            <button
              className="btn btn-ghost"
              style={{ padding: '6px 12px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}
            >
              View All <ArrowRight size={12} />
            </button>
          )}
        </div>

        {recentTenders.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No tenders yet. Create one to get started.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {recentTenders.map((tender) => (
              <div
                key={tender._id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 12,
                  background: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4 }}>
                    {tender.title}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {tender.category} • {formatINR(tender.budget)}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <StatusBadge status={tender.status} type="tender" size="sm" />
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{timeAgo(tender.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="card" style={{ padding: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Quick Actions</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          <button
            className="btn btn-primary"
            style={{ padding: '12px 20px', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            <FileText size={16} />
            Create Tender
          </button>
          <button
            className="btn btn-ghost"
            style={{ padding: '12px 20px', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            <CheckCircle size={16} />
            Review Milestones
          </button>
          <button
            className="btn btn-ghost"
            style={{ padding: '12px 20px', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            <AlertTriangle size={16} />
            View Anomalies
          </button>
        </div>
      </div>
    </div>
  )
}
