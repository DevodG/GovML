import { useState, useEffect } from 'react'
import { Card } from '../../components/ui'
import { MapPin, Image, CheckCircle, Clock, ExternalLink, AlertTriangle } from 'lucide-react'
import api from '../../lib/api'
import { useAuthStore } from '../../store/authStore'
import { useSignMilestone } from '../../hooks/useContractWrite'

function useCountdown(deadline: Date) {
  const [timeLeft, setTimeLeft] = useState('')
  const [isUrgent, setIsUrgent] = useState(false)
  useEffect(() => {
    const tick = () => {
      const diff = deadline.getTime() - Date.now()
      if (diff <= 0) { setTimeLeft('EXPIRED'); return }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setTimeLeft(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`)
      setIsUrgent(diff < 24 * 3600000)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [deadline])
  return { timeLeft, isUrgent }
}

function MilestoneCard({ m, onApprove }: { m: any, onApprove: (id: string) => void }) {
  const { timeLeft, isUrgent } = useCountdown(new Date(m.deadline))
  const [signing, setSigning] = useState(false)
  const signed = m.signers?.filter((s: any) => s.signed).length || 0

  const handleSign = async () => {
    setSigning(true)
    try {
      await onApprove(m.id)
    } finally {
      setSigning(false)
    }
  }

  return (
    <Card className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <span className="text-xs font-mono text-[#4A5568]">{m.tenderId}</span>
          <h3 className="font-semibold text-[#E8EDF5] mt-0.5">{m.name}</h3>
          <p className="text-sm text-[#8B95A8]">{m.tender}</p>
        </div>
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-mono font-bold border ${isUrgent ? 'bg-[#D85A30]/10 border-[#D85A30]/30 text-[#D85A30]' : 'bg-[#EF9F27]/10 border-[#EF9F27]/30 text-[#EF9F27]'}`}>
          {isUrgent && <AlertTriangle size={14} />}
          <Clock size={14} />
          {timeLeft}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#0A0C10] border border-[#1E2530] rounded-lg p-3 flex items-center gap-2">
          <MapPin size={16} className="text-[#3B8BD4]" />
          <div>
            <div className="text-xs text-[#8B95A8]">GPS Coordinates</div>
            <div className="text-xs font-mono text-[#E8EDF5] mt-0.5">{m.gps}</div>
          </div>
        </div>
        <div className="bg-[#0A0C10] border border-[#1E2530] rounded-lg p-3 flex items-center gap-2">
          <Image size={16} className="text-[#7F77DD]" />
          <div>
            <div className="text-xs text-[#8B95A8]">IPFS Evidence</div>
            <div className="text-xs font-mono text-[#7F77DD] mt-0.5">{m.ipfsHash?.slice(0,14)}...</div>
          </div>
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-[#8B95A8]">Multi-Sig Progress</span>
          <span className="text-xs font-mono text-[#E8EDF5]">{signed}/3 signed</span>
        </div>
        <div className="h-1.5 bg-[#1E2530] rounded-full overflow-hidden mb-3">
          <div className="h-full bg-gradient-to-r from-[#3B8BD4] to-[#1D9E75] rounded-full transition-all duration-500" style={{ width: `${(signed/3)*100}%` }} />
        </div>
        <div className="space-y-2">
          {m.signers?.map((s: any, i: number) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              {s.signed ? <CheckCircle size={14} className="text-[#1D9E75]" /> : <div className="w-3.5 h-3.5 rounded-full border border-[#4A5568]" />}
              <span className={s.signed ? 'text-[#8B95A8]' : 'text-[#4A5568]'}>{s.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2 pt-2 border-t border-[#1E2530]">
        <button onClick={handleSign} disabled={signing}
          className="flex-1 bg-[#3B8BD4] hover:bg-[#2A75BB] disabled:opacity-50 text-white font-semibold py-2 rounded-lg flex items-center justify-center gap-2 text-sm transition-all">
          {signing ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Signing...</> : <><CheckCircle size={16} />Sign Milestone</>}
        </button>
        <a href="#" className="flex items-center gap-1.5 px-3 py-2 border border-[#1E2530] rounded-lg text-xs text-[#8B95A8] hover:text-[#E8EDF5] transition-colors">
          <ExternalLink size={14} />
        </a>
      </div>

      {isUrgent && (
        <div className="bg-[#D85A30]/10 border border-[#D85A30]/20 rounded-lg p-3 text-xs text-[#D85A30] flex items-start gap-2">
          <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
          <span>Dead man's switch active — funds auto-redistribute to public goods pool if not signed before deadline.</span>
        </div>
      )}
    </Card>
  )
}

export default function MilestoneApprovals() {
  const { token } = useAuthStore()
  const [milestones, setMilestones] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const signMilestone = useSignMilestone()

  const handleApprove = async (id: string) => {
    if (!token) return

    try {
      // Call on-chain signMilestone
      signMilestone.write(BigInt(id))
      // Also sync with backend
      await api.gov.approveMilestone(token, id)
      const response = await api.gov.getPendingMilestones(token)
      setMilestones(response.milestones || [])
    } catch (error) {
      console.error('Failed to approve milestone:', error)
    }
  }

  useEffect(() => {
    const loadMilestones = async () => {
      if (!token) return

      try {
        const response = await api.gov.getPendingMilestones(token)
        setMilestones(response.milestones || [])
      } catch (error) {
        console.error('Failed to load milestones:', error)
      } finally {
        setLoading(false)
      }
    }

    loadMilestones()
  }, [token])

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#E8EDF5] tracking-tight">Milestone Approvals</h1>
          <p className="text-sm text-[#8B95A8] mt-1">Review evidence and co-sign on-chain fund releases</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map(i => (
            <Card key={i} className="h-64 animate-pulse bg-[#151A22]" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#E8EDF5] tracking-tight">Milestone Approvals</h1>
        <p className="text-sm text-[#8B95A8] mt-1">Review evidence and co-sign on-chain fund releases</p>
      </div>
      {milestones.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {milestones.map(m => <MilestoneCard key={m.id} m={m} onApprove={handleApprove} />)}
        </div>
      ) : (
        <Card className="text-center py-12">
          <p className="text-[#8B95A8]">No pending milestone approvals</p>
        </Card>
      )}
    </div>
  )
}
