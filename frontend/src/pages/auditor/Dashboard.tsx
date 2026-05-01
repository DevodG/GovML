import { useState, useEffect } from 'react'
import { Card } from '../../components/ui'
import { FraudBadge } from '../../components/blockchain/FraudBadge'
import { FundFlowChart } from '../../components/charts/FundFlow'
import { AlertTriangle, FileText, ShieldCheck, Activity } from 'lucide-react'
import api from '../../lib/api'
import { useAuthStore } from '../../store/authStore'

export default function AuditDashboard() {
  const { token } = useAuthStore()
  const [stats, setStats] = useState<any>(null)
  const [anomalies, setAnomalies] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadDashboard = async () => {
      if (!token) return

      try {
        const [statsResponse, anomaliesResponse] = await Promise.all([
          api.auditor.getDashboard(token),
          api.auditor.getAnomalies(token)
        ])
        setStats(statsResponse.statistics)
        setAnomalies(anomaliesResponse.anomalies || [])
      } catch (error) {
        console.error('Failed to load dashboard:', error)
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [token])

  const statsData = stats ? [
    { label: 'Total Audits', value: stats.totalAudits || 0, icon: FileText, color: 'text-[#3B8BD4]', bg: 'bg-[#3B8BD4]/10' },
    { label: 'Active Anomalies', value: stats.anomaliesDetected || 0, icon: AlertTriangle, color: 'text-[#D85A30]', bg: 'bg-[#D85A30]/10' },
    { label: 'Pending Reviews', value: stats.pendingReviews || 0, icon: ShieldCheck, color: 'text-[#7F77DD]', bg: 'bg-[#7F77DD]/10' },
    { label: 'Recent Activity', value: stats.recentActivity || 0, icon: Activity, color: 'text-[#1D9E75]', bg: 'bg-[#1D9E75]/10' },
  ] : []

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#E8EDF5] tracking-tight">Audit Dashboard</h1>
          <p className="text-sm text-[#8B95A8] mt-1">Full system visibility — all tenders, anomalies and fund flows</p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="h-20 animate-pulse bg-[#151A22]" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#E8EDF5] tracking-tight">Audit Dashboard</h1>
        <p className="text-sm text-[#8B95A8] mt-1">Full system visibility — all tenders, anomalies and fund flows</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsData.map(s => (
          <Card key={s.label} className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.bg} ${s.color}`}>
              <s.icon size={20} />
            </div>
            <div>
              <div className="text-xl font-bold text-[#E8EDF5]">{s.value}</div>
              <div className="text-xs text-[#8B95A8]">{s.label}</div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <h3 className="font-semibold text-[#E8EDF5] mb-4">Fund Flow Overview</h3>
            <FundFlowChart />
          </Card>
        </div>
        <Card className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-[#E8EDF5]">Anomaly Queue</h3>
            <span className="text-xs bg-[#D85A30]/10 text-[#D85A30] border border-[#D85A30]/20 px-2 py-0.5 rounded-full">{anomalies.length} active</span>
          </div>
          {anomalies.length > 0 ? anomalies.map(a => (
            <div key={a._id} className="flex items-start gap-3 p-3 bg-[#0A0C10] border border-[#1E2530] rounded-lg hover:border-[rgba(255,255,255,0.08)] cursor-pointer transition-colors">
              <FraudBadge status={a.severity >= 7 ? 'high' : a.severity >= 4 ? 'medium' : 'low'} />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-[#E8EDF5] truncate">{a.anomalyType}</div>
                <div className="text-xs text-[#4A5568] font-mono">{a.tenderId?.tenderId || 'N/A'} • {new Date(a.createdAt).toLocaleDateString()}</div>
              </div>
            </div>
          )) : (
            <div className="text-center py-8 text-[#8B95A8]">No anomalies detected</div>
          )}
        </Card>
      </div>
    </div>
  )
}
