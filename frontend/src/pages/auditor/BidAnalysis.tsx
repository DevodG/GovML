import { useState, useEffect } from 'react'
import { Card } from '../../components/ui'
import { FraudBadge } from '../../components/blockchain/FraudBadge'
import { formatINR } from '../../lib/format'
import { ShieldCheck, ShieldOff, X, Bot } from 'lucide-react'
import api from '../../lib/api'
import { useAuthStore } from '../../store/authStore'

export default function BidAnalysis() {
  const { token } = useAuthStore()
  const [bids, setBids] = useState<any[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadBids = async () => {
      if (!token) return

      try {
        const response = await api.auditor.getBids(token)
        setBids(response.bids || [])
      } catch (error) {
        console.error('Failed to load bids:', error)
      } finally {
        setLoading(false)
      }
    }

    loadBids()
  }, [token])

  const selectedBid = bids.find(b => b.id === selected)

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#E8EDF5] tracking-tight">Bid Analysis</h1>
          <p className="text-sm text-[#8B95A8] mt-1">Full ML score breakdown — all bids visible to auditors only</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="h-64 animate-pulse bg-[#151A22]" />
          </div>
          <Card className="h-64 animate-pulse bg-[#151A22]" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#E8EDF5] tracking-tight">Bid Analysis</h1>
        <p className="text-sm text-[#8B95A8] mt-1">Full ML score breakdown — all bids visible to auditors only</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1E2530]">
                  {['Contractor', 'Amount', 'ML Score', 'Fraud Flag', 'ZKP', 'Rank'].map(h => (
                    <th key={h} className="text-left text-xs text-[#8B95A8] font-medium px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bids.length > 0 ? bids.map((bid, i) => (
                  <tr key={bid.id} onClick={() => setSelected(bid.id === selected ? null : bid.id)}
                    className={`border-b border-[#1E2530] last:border-0 cursor-pointer transition-colors ${selected === bid.id ? 'bg-[#7F77DD]/10' : i % 2 === 1 ? 'bg-[#151A22]/50 hover:bg-[rgba(255,255,255,0.03)]' : 'hover:bg-[rgba(255,255,255,0.03)]'}`}>
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-[#E8EDF5]">{bid.contractor}</div>
                      <div className="text-xs font-mono text-[#4A5568]">{bid.wallet}</div>
                    </td>
                    <td className="px-3 py-3.5 font-medium text-[#E8EDF5]">{formatINR(bid.amount)}</td>
                    <td className="px-3 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-14 h-1.5 bg-[#1E2530] rounded-full">
                          <div className="h-full rounded-full bg-gradient-to-r from-[#7F77DD] to-[#3B8BD4]" style={{ width: `${bid.score * 100}%` }} />
                        </div>
                        <span className="font-mono text-xs text-[#E8EDF5]">{bid.score.toFixed(3)}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3.5"><FraudBadge status={bid.fraud as any} /></td>
                    <td className="px-3 py-3.5">
                      {bid.zkp
                        ? <span className="text-xs text-[#7F77DD] flex items-center gap-1"><ShieldCheck size={13} />Valid</span>
                        : <span className="text-xs text-[#D85A30] flex items-center gap-1"><ShieldOff size={13} />Failed</span>}
                    </td>
                    <td className="px-3 py-3.5 font-bold text-sm text-[#8B95A8]">#{bid.rank}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-[#8B95A8]">No bids found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </Card>
        </div>

        <div>
          {selectedBid ? (
            <Card className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bot size={16} className="text-[#7F77DD]" />
                  <h3 className="font-semibold text-[#E8EDF5] text-sm">Bid Details</h3>
                </div>
                <button onClick={() => setSelected(null)}><X size={16} className="text-[#8B95A8]" /></button>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#8B95A8]">Contractor</span>
                  <span className="text-[#E8EDF5]">{selectedBid.contractor}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8B95A8]">Wallet</span>
                  <span className="font-mono text-[#4A5568]">{selectedBid.wallet}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8B95A8]">Amount</span>
                  <span className="text-[#E8EDF5]">{formatINR(selectedBid.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8B95A8]">ML Score</span>
                  <span className="font-mono text-[#7F77DD]">{selectedBid.score.toFixed(3)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8B95A8]">Fraud Risk</span>
                  <span className={selectedBid.fraud === 'high' ? 'text-[#D85A30]' : selectedBid.fraud === 'medium' ? 'text-[#EF9F27]' : 'text-[#1D9E75]'}>{selectedBid.fraud.toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8B95A8]">ZKP Status</span>
                  <span className={selectedBid.zkp ? 'text-[#7F77DD]' : 'text-[#D85A30]'}>{selectedBid.zkp ? 'Valid' : 'Failed'}</span>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="flex flex-col items-center justify-center text-center h-48">
              <Bot size={32} className="text-[#4A5568] mb-3" />
              <p className="text-sm text-[#8B95A8]">Select a bid to view details</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
