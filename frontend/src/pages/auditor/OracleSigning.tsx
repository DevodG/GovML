import { useState, useEffect } from 'react'
import { Card } from '../../components/ui'
import { MapPin, Image, CheckCircle, Loader2, ExternalLink } from 'lucide-react'
import api from '../../lib/api'
import { useAuthStore } from '../../store/authStore'

export default function OracleSigning() {
  const { token } = useAuthStore()
  const [pending, setPending] = useState<any[]>([])
  const [signing, setSigning] = useState<Record<string, boolean>>({})
  const [signed, setSigned] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)

  const handleSign = async (id: string) => {
    if (!token) return

    setSigning(prev => ({ ...prev, [id]: true }))
    try {
      await api.auditor.signOracle(token, { milestoneId: id })
      setSigned(prev => ({ ...prev, [id]: true }))
    } catch (error) {
      console.error('Failed to sign:', error)
    } finally {
      setSigning(prev => ({ ...prev, [id]: false }))
    }
  }

  useEffect(() => {
    const loadPending = async () => {
      if (!token) return

      try {
        const response = await api.auditor.getAnomalies(token)
        // Filter for pending milestone approvals
        const pendingMilestones = response.anomalies?.filter((a: any) => a.status === 'pending') || []
        setPending(pendingMilestones)
      } catch (error) {
        console.error('Failed to load pending milestones:', error)
      } finally {
        setLoading(false)
      }
    }

    loadPending()
  }, [token])

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#E8EDF5] tracking-tight">Oracle Signing</h1>
          <p className="text-sm text-[#8B95A8] mt-1">Sign pending milestone approvals as Independent Auditor (multi-sig party)</p>
        </div>
        <div className="space-y-6">
          {[1].map(i => (
            <Card key={i} className="h-64 animate-pulse bg-[#151A22]" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#E8EDF5] tracking-tight">Oracle Signing</h1>
        <p className="text-sm text-[#8B95A8] mt-1">Sign pending milestone approvals as Independent Auditor (multi-sig party)</p>
      </div>

      {pending.length > 0 ? pending.map((m: any) => (
        <Card key={m._id} className="space-y-5">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-mono text-[#4A5568]">{m._id?.toString().slice(-8)}</span>
              <h3 className="font-semibold text-[#E8EDF5] mt-0.5">{m.anomalyType || 'Milestone Review'}</h3>
              <p className="text-sm text-[#8B95A8]">{m.tenderId?.title || 'N/A'}</p>
            </div>
            <div className="text-right">
              <div className="text-[#1D9E75] font-bold">Severity: {m.severity}</div>
              <div className="text-xs text-[#4A5568]">Pending review</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#0A0C10] border border-[#1E2530] rounded-lg p-3 flex items-center gap-2">
              <MapPin size={16} className="text-[#3B8BD4]" />
              <div>
                <div className="text-xs text-[#8B95A8]">Status</div>
                <div className="text-xs font-mono text-[#E8EDF5] mt-0.5">{m.status}</div>
              </div>
            </div>
            <div className="bg-[#0A0C10] border border-[#1E2530] rounded-lg p-3 flex items-center gap-2">
              <Image size={16} className="text-[#7F77DD]" />
              <div>
                <div className="text-xs text-[#8B95A8]">Created</div>
                <div className="text-xs font-mono text-[#7F77DD] mt-0.5">{new Date(m.createdAt).toLocaleDateString()}</div>
              </div>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-[#8B95A8]">Review Status</span>
              {signed[m._id] && <span className="text-xs text-[#1D9E75] font-semibold">✓ Your signature recorded</span>}
            </div>
            <div className="h-2 bg-[#1E2530] rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#3B8BD4] to-[#1D9E75] rounded-full transition-all duration-700"
                style={{ width: `${signed[m._id] ? 100 : 0}%` }} />
            </div>
          </div>

          <div className="flex gap-2 pt-2 border-t border-[#1E2530]">
            {signed[m._id] ? (
              <div className="flex-1 flex items-center justify-center gap-2 py-2 text-sm text-[#1D9E75] font-semibold">
                <CheckCircle size={16} />Signed as Independent Auditor
              </div>
            ) : (
              <button onClick={() => handleSign(m._id)} disabled={signing[m._id]}
                className="flex-1 bg-[#7F77DD] hover:bg-[#6b63cc] disabled:opacity-50 text-white font-semibold py-2 rounded-lg flex items-center justify-center gap-2 text-sm transition-all">
                {signing[m._id] ? <><Loader2 size={16} className="animate-spin" />Signing...</> : <><CheckCircle size={16} />Sign as Oracle</>}
              </button>
            )}
            <a href="#" className="flex items-center gap-1.5 px-3 py-2 border border-[#1E2530] rounded-lg text-xs text-[#8B95A8] hover:text-[#E8EDF5] transition-colors">
              <ExternalLink size={14} />
            </a>
          </div>
        </Card>
      )) : (
        <Card className="text-center py-12">
          <p className="text-[#8B95A8]">No pending milestone approvals</p>
        </Card>
      )}
    </div>
  )
}
