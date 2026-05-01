import { useState, useEffect } from 'react'
import { Card } from '../../components/ui'
import { AlertTriangle, ExternalLink, FileText, Bot, X, Copy } from 'lucide-react'
import api from '../../lib/api'
import { useAuthStore } from '../../store/authStore'

function AnomalyCard({ a, onView }: { a: any, onView: (a: any) => void }) {
  const riskColor = a.risk === 'high' ? { bg: 'bg-[#D85A30]/10', border: 'border-[#D85A30]/20', text: 'text-[#D85A30]' }
    : { bg: 'bg-[#EF9F27]/10', border: 'border-[#EF9F27]/20', text: 'text-[#EF9F27]' }

  return (
    <Card className={`border ${riskColor.border} space-y-4`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${riskColor.bg}`}>
            <AlertTriangle size={18} className={riskColor.text} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${riskColor.bg} ${riskColor.text}`}>{a.risk.toUpperCase()} RISK</span>
              <span className="text-xs text-[#4A5568] font-mono">{a.id}</span>
            </div>
            <h3 className="font-semibold text-[#E8EDF5] mt-1">{a.type}</h3>
            <p className="text-sm text-[#8B95A8] mt-0.5">Detected at {a.ts}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-[#0A0C10] border border-[#1E2530] rounded-lg p-2.5">
          <span className="text-[#4A5568]">Tender ID</span>
          <div className="text-[#E8EDF5] font-mono mt-0.5">{a.tender}</div>
        </div>
        <div className="bg-[#0A0C10] border border-[#1E2530] rounded-lg p-2.5">
          <span className="text-[#4A5568]">Risk Level</span>
          <div className={`text-[#E8EDF5] font-medium mt-0.5 ${riskColor.text}`}>{a.risk.toUpperCase()}</div>
        </div>
      </div>

      <div className="flex gap-2 pt-1 border-t border-[#1E2530]">
        <button onClick={() => onView(a)} className="flex items-center gap-1.5 px-3 py-2 bg-[#7F77DD]/10 border border-[#7F77DD]/20 text-[#7F77DD] rounded-lg text-xs font-medium hover:bg-[#7F77DD]/20 transition-colors">
          <Bot size={14} />View Details
        </button>
        <a href="#" className="flex items-center gap-1.5 px-3 py-2 border border-[#1E2530] rounded-lg text-xs text-[#8B95A8] hover:text-[#E8EDF5] transition-colors">
          <ExternalLink size={14} />On-chain
        </a>
      </div>
    </Card>
  )
}

function ReportModal({ anomaly, onClose }: { anomaly: any, onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0F1318] border border-[#1E2530] rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-[#1E2530]">
          <div className="flex items-center gap-2">
            <Bot size={20} className="text-[#7F77DD]" />
            <h2 className="font-semibold text-[#E8EDF5]">Anomaly Details</h2>
            <span className="text-xs bg-[#7F77DD]/10 text-[#7F77DD] px-2 py-0.5 rounded-full border border-[#7F77DD]/20">ID: {anomaly.id}</span>
          </div>
          <button onClick={onClose}><X size={18} className="text-[#8B95A8] hover:text-[#E8EDF5]" /></button>
        </div>
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-[#E8EDF5] mb-2">Anomaly Type</h3>
            <p className="text-sm text-[#8B95A8]">{anomaly.type}</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#E8EDF5] mb-2">Risk Assessment</h3>
            <p className="text-sm text-[#8B95A8]">{anomaly.risk.toUpperCase()} risk anomaly detected</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#E8EDF5] mb-2">Timestamp</h3>
            <p className="text-sm text-[#8B95A8]">{anomaly.ts}</p>
          </div>
        </div>
        <div className="p-4 border-t border-[#1E2530] flex items-center justify-between">
          <span className="text-xs font-mono text-[#4A5568]">Tender: {anomaly.tender}</span>
          <button className="flex items-center gap-1.5 text-xs text-[#3B8BD4] hover:text-[#2A75BB]"><Copy size={12} />Copy ID</button>
        </div>
      </div>
    </div>
  )
}

export default function AnomalyAlerts() {
  const { token } = useAuthStore()
  const [anomalies, setAnomalies] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [viewing, setViewing] = useState<any | null>(null)

  useEffect(() => {
    const loadAnomalies = async () => {
      if (!token) return

      try {
        const response = await api.gov.getAnomalies(token)
        setAnomalies(response.anomalies || [])
      } catch (error) {
        console.error('Failed to load anomalies:', error)
      } finally {
        setLoading(false)
      }
    }

    loadAnomalies()
  }, [token])

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#E8EDF5] tracking-tight">Anomaly Alerts</h1>
          <p className="text-sm text-[#8B95A8] mt-1">ML-flagged transactions — priority queue sorted by risk level</p>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="h-32 animate-pulse bg-[#151A22]" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#E8EDF5] tracking-tight">Anomaly Alerts</h1>
        <p className="text-sm text-[#8B95A8] mt-1">ML-flagged transactions — priority queue sorted by risk level</p>
      </div>
      {anomalies.length > 0 ? (
        <div className="space-y-4">
          {anomalies.map(a => <AnomalyCard key={a.id} a={a} onView={setViewing} />)}
        </div>
      ) : (
        <Card className="text-center py-12">
          <p className="text-[#8B95A8]">No anomalies detected</p>
        </Card>
      )}
      {viewing && <ReportModal anomaly={viewing} onClose={() => setViewing(null)} />}
    </div>
  )
}
