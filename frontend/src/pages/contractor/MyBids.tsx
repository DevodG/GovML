import { useState, useEffect } from 'react'
import { Card, Badge } from '../../components/ui'
import { formatINR } from '../../lib/format'
import { ShieldCheck, Clock, RefreshCw } from 'lucide-react'
import api from '../../lib/api'
import { useAuthStore } from '../../store/authStore'

const statusColor: Record<string, string> = {
  Won: 'text-[#1D9E75] bg-[#1D9E75]/10 border-[#1D9E75]/20',
  Pending: 'text-[#EF9F27] bg-[#EF9F27]/10 border-[#EF9F27]/20',
  Lost: 'text-[#D85A30] bg-[#D85A30]/10 border-[#D85A30]/20',
}

export default function MyBids() {
  const { token } = useAuthStore()
  const [bids, setBids] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadBids = async () => {
      if (!token) return

      try {
        const response = await api.contractor.getBids(token)
        setBids(response.bids || [])
      } catch (error) {
        console.error('Failed to load bids:', error)
      } finally {
        setLoading(false)
      }
    }

    loadBids()
  }, [token])

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#E8EDF5] tracking-tight">My Bids</h1>
          <p className="text-sm text-[#8B95A8] mt-1">Track your active and historical bid submissions</p>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="h-24 animate-pulse bg-[#151A22]" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#E8EDF5] tracking-tight">My Bids</h1>
        <p className="text-sm text-[#8B95A8] mt-1">Track your active and historical bid submissions</p>
      </div>

      {bids.length > 0 ? (
        <div className="space-y-4">
          {bids.map(b => (
            <Card key={b.id} className="flex items-center justify-between gap-6">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono text-[#4A5568]">{b.id}</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${statusColor[b.status] || statusColor.Pending}`}>{b.status}</span>
                </div>
                <h3 className="font-medium text-[#E8EDF5] truncate">{b.tender}</h3>
                <div className="flex items-center gap-4 mt-2 text-xs text-[#8B95A8]">
                  <span>Bid: <span className="text-[#E8EDF5] font-semibold">{formatINR(b.amount)}</span></span>
                  <span>ML Score: <span className="font-mono text-[#7F77DD]">{b.score.toFixed(3)}</span></span>
                  <span className="flex items-center gap-1"><ShieldCheck size={11} className="text-[#7F77DD]" />ZKP Valid</span>
                </div>
              </div>

              <div className="text-right flex-shrink-0 space-y-2">
                <div className={`text-xs font-mono px-3 py-1.5 rounded-lg border ${b.stakeStatus === 'claimable' ? 'bg-[#1D9E75]/10 border-[#1D9E75]/20 text-[#1D9E75]' : 'bg-[#EF9F27]/10 border-[#EF9F27]/20 text-[#EF9F27]'}`}>
                  {b.stake} {b.stakeStatus === 'locked' ? '🔒 Locked' : '✓ Claimable'}
                </div>
                {b.stakeStatus === 'claimable' && (
                  <button className="flex items-center gap-1.5 text-xs bg-[#1D9E75] hover:bg-[#17845f] text-white px-3 py-1.5 rounded-lg ml-auto transition-colors">
                    <RefreshCw size={12} />Claim Refund
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="text-center py-12">
          <p className="text-[#8B95A8]">No bids submitted yet</p>
        </Card>
      )}
    </div>
  )
}
