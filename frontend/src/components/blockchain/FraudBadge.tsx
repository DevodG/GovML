import { AlertTriangle, ShieldCheck, AlertCircle } from 'lucide-react'

export function FraudBadge({ status }: { status: 'clean' | 'medium' | 'high' }) {
  if (status === 'clean') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-[#1D9E75]/10 text-[#1D9E75] border border-[#1D9E75]/20">
        <ShieldCheck size={14} />
        Clean
      </span>
    )
  }
  
  if (status === 'medium') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-[#EF9F27]/10 text-[#EF9F27] border border-[#EF9F27]/20">
        <AlertTriangle size={14} />
        Review
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-[#D85A30]/10 text-[#D85A30] border border-[#D85A30]/20 cursor-help" title="Isolation Forest flagged anomaly">
      <AlertCircle size={14} />
      High Risk
    </span>
  )
}
