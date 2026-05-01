import { useState } from 'react'
import { Card } from '../../components/ui'
import { AlertTriangle, ExternalLink, FileText, Bot, X, Copy } from 'lucide-react'

const anomalies = [
  {
    id: 'A-2024-551', risk: 'high', bidId: 'B-2024-00892',
    contractor: 'ShadyConstructions Corp', tenderId: 'T-2024-00142',
    type: 'Low Bid Outlier',
    description: 'Bid is 40% below market average. Isolation Forest score: 0.92 anomaly probability.',
    timestamp: '2024-03-10T09:45:00Z',
    aiReport: `ANOMALY ANALYSIS REPORT — A-2024-551\n\nExecutive Summary:\nThis bid from ShadyConstructions Corp has been flagged by our ML anomaly detection system with 92% confidence as a fraudulent outlier.\n\nKey Findings:\n1. Bid amount (₹2.5 Cr) is 40% below the market median (₹4.1 Cr) for comparable road repair projects.\n2. The contractor's on-chain wallet was created only 3 days before bid submission.\n3. ZKP proof failed verification — KYC identity cannot be confirmed on-chain.\n4. Isolation Forest model placed this bid in the top 2% of anomalous patterns in our training dataset.\n\nRecommendation:\nReject bid and flag wallet address for further review by the Independent Auditor. Consider initiating a bounty hunter review.`,
  },
  {
    id: 'A-2024-498', risk: 'medium', bidId: 'B-2024-00870',
    contractor: 'NovaBuild Solutions', tenderId: 'T-2024-00219',
    type: 'Repeat Pattern',
    description: 'Contractor submitted identical GPS coordinates on 3 different projects simultaneously.',
    timestamp: '2024-03-08T14:22:00Z',
    aiReport: `ANOMALY ANALYSIS REPORT — A-2024-498\n\nExecutive Summary:\nNovaBuild Solutions appears to be submitting milestone evidence from identical locations for multiple concurrent projects, which is physically impossible.\n\nKey Findings:\n1. GPS coordinates 15.3173° N, 75.7139° E appear in 3 milestone submissions within a 4-hour window.\n2. Photo IPFS hashes are unique but metadata timestamps suggest batch upload.\n\nRecommendation:\nFlag for auditor review. Issue is likely GPS spoofing during milestone photo upload.`,
  },
]

function AnomalyCard({ a, onView }: { a: typeof anomalies[0], onView: (a: typeof anomalies[0]) => void }) {
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
            <p className="text-sm text-[#8B95A8] mt-0.5">{a.description}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-[#0A0C10] border border-[#1E2530] rounded-lg p-2.5">
          <span className="text-[#4A5568]">Contractor</span>
          <div className="text-[#E8EDF5] font-medium mt-0.5">{a.contractor}</div>
        </div>
        <div className="bg-[#0A0C10] border border-[#1E2530] rounded-lg p-2.5">
          <span className="text-[#4A5568]">Bid ID</span>
          <div className="text-[#E8EDF5] font-mono mt-0.5">{a.bidId}</div>
        </div>
      </div>

      <div className="flex gap-2 pt-1 border-t border-[#1E2530]">
        <button onClick={() => onView(a)} className="flex items-center gap-1.5 px-3 py-2 bg-[#7F77DD]/10 border border-[#7F77DD]/20 text-[#7F77DD] rounded-lg text-xs font-medium hover:bg-[#7F77DD]/20 transition-colors">
          <Bot size={14} />AI Report
        </button>
        <a href="#" className="flex items-center gap-1.5 px-3 py-2 border border-[#1E2530] rounded-lg text-xs text-[#8B95A8] hover:text-[#E8EDF5] transition-colors">
          <ExternalLink size={14} />On-chain
        </a>
      </div>
    </Card>
  )
}

function ReportModal({ anomaly, onClose }: { anomaly: typeof anomalies[0], onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0F1318] border border-[#1E2530] rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-[#1E2530]">
          <div className="flex items-center gap-2">
            <Bot size={20} className="text-[#7F77DD]" />
            <h2 className="font-semibold text-[#E8EDF5]">AI Audit Narrator</h2>
            <span className="text-xs bg-[#7F77DD]/10 text-[#7F77DD] px-2 py-0.5 rounded-full border border-[#7F77DD]/20">IPFS-anchored</span>
          </div>
          <button onClick={onClose}><X size={18} className="text-[#8B95A8] hover:text-[#E8EDF5]" /></button>
        </div>
        <div className="p-5 overflow-y-auto flex-1">
          <pre className="text-sm text-[#8B95A8] font-mono leading-relaxed whitespace-pre-wrap">{anomaly.aiReport}</pre>
        </div>
        <div className="p-4 border-t border-[#1E2530] flex items-center justify-between">
          <span className="text-xs font-mono text-[#4A5568]">IPFS: Qm7f4ai...report <span className="text-[#1D9E75]">✓ On-chain</span></span>
          <button className="flex items-center gap-1.5 text-xs text-[#3B8BD4] hover:text-[#2A75BB]"><Copy size={12} />Copy Hash</button>
        </div>
      </div>
    </div>
  )
}

export default function AnomalyAlerts() {
  const [viewing, setViewing] = useState<typeof anomalies[0] | null>(null)
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#E8EDF5] tracking-tight">Anomaly Alerts</h1>
        <p className="text-sm text-[#8B95A8] mt-1">ML-flagged transactions — priority queue sorted by risk level</p>
      </div>
      <div className="space-y-4">
        {anomalies.map(a => <AnomalyCard key={a.id} a={a} onView={setViewing} />)}
      </div>
      {viewing && <ReportModal anomaly={viewing} onClose={() => setViewing(null)} />}
    </div>
  )
}
