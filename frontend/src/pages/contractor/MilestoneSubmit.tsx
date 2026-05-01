import { useState, useEffect } from 'react'
import { Card } from '../../components/ui'
import { Upload, MapPin, CheckCircle, Loader2 } from 'lucide-react'
import { useSubmitMilestone } from '../../hooks/useContractWrite'

const activeMilestones = [
  { id: 'M-001', tender: 'NH-48 Road Repair', name: 'Foundation Work', pct: 30, amount: 12600000, dueDate: '2024-04-20' },
]

export default function MilestoneSubmit() {
  const submitMilestone = useSubmitMilestone()
  const [uploading, setUploading] = useState(false)
  const [uploaded, setUploaded] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const handleUpload = () => {
    setUploading(true)
    setTimeout(() => { setUploading(false); setUploaded(true) }, 1800)
  }

  // Watch for tx success
  useEffect(() => {
    if (submitMilestone.isSuccess) {
      setSubmitting(false)
      setDone(true)
    }
  }, [submitMilestone.isSuccess])

  const handleSubmit = () => {
    setSubmitting(true)
    // Call MilestoneEscrow.submitMilestoneProof() on-chain
    const ipfsHash = '0x' + 'a'.repeat(64) as `0x${string}` // placeholder — real flow: upload to IPFS first
    const gpsHash = '0x' + 'b'.repeat(64) as `0x${string}` // hashed GPS coords
    submitMilestone.write(BigInt(1), BigInt(0), ipfsHash, gpsHash)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#E8EDF5] tracking-tight">Milestone Submissions</h1>
        <p className="text-sm text-[#8B95A8] mt-1">Upload evidence and submit for multi-sig approval</p>
      </div>

      {activeMilestones.map(m => (
        <Card key={m.id} className="space-y-5">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold text-[#E8EDF5]">{m.name}</h3>
              <p className="text-sm text-[#8B95A8]">{m.tender}</p>
            </div>
            <div className="text-right">
              <div className="text-[#1D9E75] font-bold">₹{(m.amount / 100000).toFixed(1)} Lakh</div>
              <div className="text-xs text-[#4A5568]">{m.pct}% of total</div>
            </div>
          </div>

          {done ? (
            <div className="text-center py-8 space-y-3">
              <CheckCircle size={40} className="text-[#1D9E75] mx-auto" />
              <p className="font-medium text-[#E8EDF5]">Submitted for multi-sig approval</p>
              <p className="text-xs font-mono text-[#4A5568]">IPFS: QmEvidence1234abc... <span className="text-[#1D9E75]">✓</span></p>
            </div>
          ) : (
            <>
              {/* Photo Upload */}
              <div>
                <label className="text-xs text-[#8B95A8] mb-2 block">Evidence Photos (IPFS)</label>
                <div onClick={handleUpload}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${uploaded ? 'border-[#1D9E75]/40 bg-[#1D9E75]/5' : 'border-[#1E2530] hover:border-[#3B8BD4]/40'}`}>
                  {uploading ? (
                    <Loader2 size={28} className="animate-spin text-[#3B8BD4] mx-auto mb-2" />
                  ) : uploaded ? (
                    <CheckCircle size={28} className="text-[#1D9E75] mx-auto mb-2" />
                  ) : (
                    <Upload size={28} className="text-[#4A5568] mx-auto mb-2" />
                  )}
                  <p className="text-sm text-[#8B95A8]">
                    {uploading ? 'Uploading to IPFS...' : uploaded ? 'QmPhoto1abc...def — Uploaded ✓' : 'Click to upload site photos'}
                  </p>
                </div>
              </div>

              {/* GPS */}
              <div>
                <label className="text-xs text-[#8B95A8] mb-1.5 block">GPS Coordinates</label>
                <div className="flex items-center gap-2">
                  <MapPin size={16} className="text-[#3B8BD4] flex-shrink-0" />
                  <input defaultValue="18.5204° N, 73.8567° E"
                    className="flex-1 bg-[#151A22] border border-[#1E2530] rounded-lg px-3 py-2 text-sm font-mono text-[#E8EDF5] outline-none focus:border-[#3B8BD4] transition-colors" />
                </div>
              </div>

              <button onClick={handleSubmit} disabled={!uploaded || submitting}
                className="w-full bg-[#3B8BD4] hover:bg-[#2A75BB] disabled:opacity-40 text-white font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all">
                {submitting ? <><Loader2 size={18} className="animate-spin" />Submitting On-Chain...</> : <><CheckCircle size={18} />Submit Milestone Evidence</>}
              </button>
            </>
          )}
        </Card>
      ))}
    </div>
  )
}
