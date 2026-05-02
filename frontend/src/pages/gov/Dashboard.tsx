import { LayoutDashboard, FileText, CheckCircle, AlertTriangle, TrendingUp } from 'lucide-react'

const stats = [
  { label: 'Active Tenders', value: '12', icon: FileText, color: 'var(--gov)' },
  { label: 'Pending Approvals', value: '5', icon: CheckCircle, color: 'var(--warning)' },
  { label: 'High Risk Anomalies', value: '2', icon: AlertTriangle, color: 'var(--danger)' },
  { label: 'Total Escrow', value: '₹84 Cr', icon: TrendingUp, color: 'var(--success)' },
]

export default function GovDashboard() {
  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
        <LayoutDashboard size={20} color="var(--gov)" />
        <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }}>Dashboard</h1>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 28 }}>
        {stats.map(s => (
          <div key={s.label} className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>{s.label}</span>
              <s.icon size={16} style={{ color: s.color }} />
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Chart placeholder */}
      <div className="card" style={{ padding: 24, marginBottom: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 20 }}>Fund Utilisation vs Allocation</h3>
        <div style={{ height: 200, display: 'flex', alignItems: 'end', gap: 8, padding: '0 20px' }}>
          {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'].map((m, i) => (
            <div key={m} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ height: [60, 45, 90, 75, 65, 80, 70][i], background: 'var(--gov)', borderRadius: '4px 4px 0 0', marginBottom: 8, opacity: 0.8 }} />
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{m}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Tenders */}
      <div className="card" style={{ padding: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Recent Tenders</h3>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No tenders yet. Create one to get started.</p>
      </div>
    </div>
  )
}
