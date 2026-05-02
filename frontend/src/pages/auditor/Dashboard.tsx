import { LayoutDashboard, AlertTriangle, Search, CheckCircle } from 'lucide-react'

const stats = [
  { label: 'Total Audits', value: '48', icon: LayoutDashboard, color: 'var(--auditor)' },
  { label: 'Pending Reviews', value: '7', icon: Search, color: 'var(--warning)' },
  { label: 'Anomalies Detected', value: '14', icon: AlertTriangle, color: 'var(--danger)' },
  { label: 'High Severity', value: '3', icon: CheckCircle, color: 'var(--danger)' },
]

export default function AuditorDashboard() {
  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
        <LayoutDashboard size={20} color="var(--auditor)" />
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Audit Dashboard</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
        {stats.map(s => (
          <div key={s.label} className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>{s.label}</span>
              <s.icon size={16} style={{ color: s.color }} />
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em' }}>{s.value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
