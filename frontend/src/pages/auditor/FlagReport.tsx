import { useState } from 'react'
import { Card } from '../../components/ui'
import { AlertTriangle, Download, Loader2, CheckCircle } from 'lucide-react'

export default function FlagReport() {
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const handleSubmit = () => {
    setSubmitting(true)
    setTimeout(() => { setSubmitting(false); setDone(true) }, 2500)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#E8EDF5] tracking-tight">Flag Anomaly</h1>
        <p className="text-sm text-[#8B95A8] mt-1">Submit a formal audit flag — stored on-chain and IPFS</p>
      </div>

      {done ? (
        <Card className="text-center py-12 space-y-4">
          <CheckCircle size={48} className="text-[#1D9E75] mx-auto" />
          <h2 className="text-xl font-bold text-[#E8EDF5]">Flag Submitted On-Chain</h2>
          <p className="text-sm text-[#8B95A8]">Your audit flag has been recorded and anchored on IPFS.</p>
          <button className="flex items-center gap-1.5 text-sm text-[#3B8BD4] mx-auto hover:text-[#2A75BB]">
            <Download size={14} />Download Signed Certificate
          </button>
        </Card>
      ) : (
        <Card className="space-y-5">
          <div>
            <label className="block text-xs text-[#8B95A8] mb-1.5">Transaction / Bid ID</label>
            <input defaultValue="B-2024-00892" className="w-full bg-[#151A22] border border-[#1E2530] rounded-lg px-3 py-2 text-sm font-mono text-[#E8EDF5] outline-none focus:border-[#D85A30] transition-colors" />
          </div>
          <div>
            <label className="block text-xs text-[#8B95A8] mb-1.5">Flag Type</label>
            <select className="w-full bg-[#151A22] border border-[#1E2530] rounded-lg px-3 py-2 text-sm text-[#E8EDF5] outline-none focus:border-[#3B8BD4] transition-colors">
              <option>Fraudulent Bid</option>
              <option>GPS Spoofing</option>
              <option>Document Forgery</option>
              <option>Collusion Suspected</option>
              <option>Other</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-[#8B95A8] mb-1.5">Audit Notes</label>
            <textarea rows={5} placeholder="Describe the anomaly in detail. This will be included in the signed audit certificate."
              className="w-full bg-[#151A22] border border-[#1E2530] rounded-lg px-3 py-2 text-sm text-[#E8EDF5] placeholder-[#4A5568] outline-none focus:border-[#3B8BD4] transition-colors resize-none" />
          </div>
          <div className="flex items-start gap-3 bg-[#D85A30]/10 border border-[#D85A30]/20 rounded-lg p-3">
            <AlertTriangle size={16} className="text-[#D85A30] mt-0.5 flex-shrink-0" />
            <p className="text-xs text-[#D85A30]">Submitting this flag will trigger automatic re-evaluation by the ML service and notify the Independent Auditor committee.</p>
          </div>
          <button onClick={handleSubmit} disabled={submitting}
            className="w-full bg-[#D85A30] hover:bg-[#bf4f2a] disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all">
            {submitting ? <><Loader2 size={18} className="animate-spin" />Submitting Flag...</> : <><AlertTriangle size={18} />Submit Audit Flag</>}
          </button>
        </Card>
      )}
    </div>
  )
}
