import { useState, useEffect } from 'react'
import { Award, TrendingUp, CheckCircle, Clock, DollarSign } from 'lucide-react'
import { contractorAPI } from '../../lib/api'
import { formatINR } from '../../lib/format'
import { LoadingState } from '../../components/ui'
import { toast } from 'sonner'

interface ReputationData {
  name: string
  organization: string
  gstNumber: string
  walletAddress: string
  reputationScore: number
  completedProjects: number
  kycVerified: boolean
  aadhaarVerified: boolean
  totalBids: number
  wonBids: number
  winRate: number
  totalBidAmount: number
  totalMilestones: number
  completedMilestones: number
  completionRate: string
  totalEarnings: number
}

export default function Reputation() {
  const [loading, setLoading] = useState(true)
  const [reputation, setReputation] = useState<ReputationData | null>(null)

  useEffect(() => {
    loadReputation()
  }, [])

  const loadReputation = async () => {
    try {
      setLoading(true)
      const data = await contractorAPI.getReputation()
      setReputation(data.reputation as ReputationData)
    } catch (error: any) {
      console.error('Failed to load reputation:', error)
      toast.error(error.message || 'Failed to load reputation')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <LoadingState type="card" />
  }

  if (!reputation) {
    return (
      <div className="card" style={{ padding: 40, textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>Failed to load reputation data</p>
      </div>
    )
  }

  const stats = [
    {
      label: 'Reputation Score',
      value: reputation.reputationScore,
      icon: Award,
      color: 'var(--contractor)',
    },
    {
      label: 'Completed Projects',
      value: reputation.completedProjects,
      icon: CheckCircle,
      color: 'var(--success)',
    },
    {
      label: 'Win Rate',
      value: `${reputation.winRate}%`,
      icon: TrendingUp,
      color: 'var(--success)',
    },
    {
      label: 'Total Earnings',
      value: formatINR(reputation.totalEarnings),
      icon: DollarSign,
      color: 'var(--success)',
    },
  ]

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
        <Award size={20} color="var(--contractor)" />
        <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }}>Reputation Dashboard</h1>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 28 }}>
        {stats.map((stat) => (
          <div key={stat.label} className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>{stat.label}</span>
              <stat.icon size={16} style={{ color: stat.color }} />
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Verification Status */}
      <div className="card" style={{ padding: 24, marginBottom: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Verification Status</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          <div
            style={{
              padding: 16,
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: reputation.kycVerified ? 'var(--success)' : 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {reputation.kycVerified ? <CheckCircle size={16} color="#fff" /> : <Clock size={16} color="var(--text-muted)" />}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4 }}>
                KYC Verified
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {reputation.kycVerified ? 'Verified' : 'Not verified'}
              </div>
            </div>
          </div>

          <div
            style={{
              padding: 16,
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: reputation.aadhaarVerified ? 'var(--success)' : 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {reputation.aadhaarVerified ? <CheckCircle size={16} color="#fff" /> : <Clock size={16} color="var(--text-muted)" />}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4 }}>
                Aadhaar Verified
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {reputation.aadhaarVerified ? 'Verified' : 'Not verified'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Stats */}
      <div className="card" style={{ padding: 24, marginBottom: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Performance Statistics</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          <div
            style={{
              padding: 16,
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
            }}
          >
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Total Bids</div>
            <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)' }}>{reputation.totalBids}</div>
          </div>

          <div
            style={{
              padding: 16,
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
            }}
          >
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Won Bids</div>
            <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)' }}>{reputation.wonBids}</div>
          </div>

          <div
            style={{
              padding: 16,
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
            }}
          >
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Total Milestones</div>
            <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)' }}>{reputation.totalMilestones}</div>
          </div>

          <div
            style={{
              padding: 16,
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
            }}
          >
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Completed</div>
            <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)' }}>{reputation.completedMilestones}</div>
          </div>

          <div
            style={{
              padding: 16,
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
            }}
          >
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Completion Rate</div>
            <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)' }}>{reputation.completionRate}%</div>
          </div>
        </div>
      </div>

      {/* Profile Information */}
      <div className="card" style={{ padding: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Profile Information</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
              Company Name
            </label>
            <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>{reputation.name}</div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
              Organization
            </label>
            <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>{reputation.organization}</div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
              GST Number
            </label>
            <div style={{ fontSize: 14, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{reputation.gstNumber}</div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
              Wallet Address
            </label>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
              {reputation.walletAddress}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
