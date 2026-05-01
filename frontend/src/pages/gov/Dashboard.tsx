import { useState, useEffect } from 'react'
import { Card } from '../../components/ui'
import { FundFlowChart } from '../../components/charts/FundFlow'
import { FileText, CheckCircle, AlertTriangle, IndianRupee } from 'lucide-react'
import { formatINR } from '../../lib/format'
import api from '../../lib/api'
import { useAuthStore } from '../../store/authStore'

export default function GovDashboard() {
  const { token } = useAuthStore()
  const [stats, setStats] = useState<any>(null)
  const [recentTenders, setRecentTenders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadDashboard = async () => {
      if (!token) return

      try {
        const response = await api.gov.getDashboard(token)
        setStats(response.stats)
        setRecentTenders(response.recentTenders || [])
      } catch (error) {
        console.error('Failed to load dashboard:', error)
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [token])

  const statsData = stats ? [
    { label: 'Active Tenders', value: stats.activeTenders || 0, icon: FileText, color: 'text-[#3B8BD4]', bg: 'bg-[#3B8BD4]/10' },
    { label: 'Pending Approvals', value: stats.pendingApprovals || 0, icon: CheckCircle, color: 'text-[#EF9F27]', bg: 'bg-[#EF9F27]/10' },
    { label: 'High Risk Anomalies', value: stats.highRiskAnomalies || 0, icon: AlertTriangle, color: 'text-[#D85A30]', bg: 'bg-[#D85A30]/10' },
    { label: 'Total Escrow', value: `₹${((stats.totalEscrow || 0) / 10000000).toFixed(1)}Cr`, icon: IndianRupee, color: 'text-[#1D9E75]', bg: 'bg-[#1D9E75]/10' },
  ] : []

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="h-24 animate-pulse bg-[#151A22]" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsData.map((s, i) => (
          <Card key={i} className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${s.bg} ${s.color}`}>
              <s.icon size={24} />
            </div>
            <div>
              <div className="text-2xl font-bold text-[#E8EDF5] tracking-tight">{s.value}</div>
              <div className="text-sm text-[#8B95A8]">{s.label}</div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <Card className="col-span-2">
          <h3 className="text-lg font-semibold text-[#E8EDF5] mb-6">Fund Utilisation vs Allocation</h3>
          <FundFlowChart />
        </Card>

        {/* Recent Tenders */}
        <Card className="flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-[#E8EDF5]">Recent Tenders</h3>
            <button className="text-sm text-[#3B8BD4] hover:text-[#2A75BB]">View All</button>
          </div>

          <div className="space-y-4 flex-1">
            {recentTenders.length > 0 ? recentTenders.map((t: any) => (
              <div key={t._id} className="flex justify-between items-center p-3 rounded-lg hover:bg-[rgba(255,255,255,0.03)] transition-colors border border-transparent hover:border-[rgba(255,255,255,0.05)] cursor-pointer">
                <div>
                  <div className="font-medium text-[#E8EDF5] truncate max-w-[200px]" title={t.title}>{t.title}</div>
                  <div className="text-xs text-[#8B95A8] mt-1">{t.tenderId} • {t.category}</div>
                </div>
                <div className="text-right">
                  <div className="font-medium text-[#1D9E75]">{formatINR(t.budget)}</div>
                  <div className="text-xs text-[#4A5568] mt-1 font-mono">{t._id?.toString().slice(0,8)}...</div>
                </div>
              </div>
            )) : (
              <div className="text-center text-[#8B95A8] py-8">No recent tenders</div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
