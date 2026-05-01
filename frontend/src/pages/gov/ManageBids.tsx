import { useState } from 'react'
import { Card } from '../../components/ui'
import { FraudBadge } from '../../components/blockchain/FraudBadge'
import { formatINR } from '../../lib/format'
import { ShieldCheck, ShieldOff, CheckCircle, X, Info, ExternalLink } from 'lucide-react'

const bids = [
  { id: 'B-2024-00891', contractor: 'BuildRight Infra Pvt Ltd', wallet: '0x1a2b3c4d5e6f7a8b', amount: 41000000, score: 0.785, fraud: 'clean', zkp: true, rank: 1, stake: 2.1 },
  { id: 'B-2024-00893', contractor: 'NovaBuild Solutions', wallet: '0x9f8e7d6c5b4a3210', amount: 39500000, score: 0.711, fraud: 'medium', zkp: true, rank: 2, stake: 1.975 },
  { id: 'B-2024-00894', contractor: 'PrimeContractors LLC', wallet: '0xdeadbeef1234abcd', amount: 38000000, score: 0.654, fraud: 'clean', zkp: true, rank: 3, stake: 1.9 },
  { id: 'B-2024-00892', contractor: 'ShadyConstructions Corp', wallet: '0xbad0c0de1337face', amount: 25000000, score: 0.320, fraud: 'high', zkp: false, rank: 4, stake: 1.25 },
]

const breakdown = [
  { name: 'Bid Amount', value: 26, max: 40, color: '#3B8BD4' },
  { name: 'On-Chain Rating', value: 39.6, max: 45, color: '#1D9E75' },
  { name: 'Completion Rate', value: 9.2, max: 10, color: '#7F77DD' },
  { name: 'Newcomer Boost', value: 0, max: 5, color: '#EF9F27' },
]

export default function ManageBids() {
  const [selected, setSelected] = useState<string | null>(null)
  const [allotting, setAllotting] = useState(false)
  const selectedBid = bids.find(b => b.id === selected)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#E8EDF5] tracking-tight">Manage Bids</h1>
          <p className="text-sm text-[#8B95A8] mt-1">NH-48 Road Repair — Pune to Mumbai Section 3 <span className="font-mono text-[#4A5568]">T-2024-00142</span></p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs text-[#8B95A8]"><span className="w-2 h-2 rounded-full bg-[#1D9E75]" /> Bidding Closed</span>
          <button onClick={() => { setAllotting(true); setTimeout(() => setAllotting(false), 2500) }}
            disabled={!selected || allotting}
            className="bg-[#1D9E75] disabled:opacity-40 hover:bg-[#17845f] text-white font-semibold px-4 py-2 rounded-lg flex items-center gap-2 transition-all text-sm">
            {allotting ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Confirming...</> : <><CheckCircle size={16} />Allot Winner</>}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1E2530]">
                  {['Contractor', 'Amount', 'ML Score', 'Fraud', 'ZKP', 'Rank'].map(h => (
                    <th key={h} className="text-left text-xs text-[#8B95A8] font-medium px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bids.map((bid, i) => (
                  <tr key={bid.id} onClick={() => setSelected(bid.id === selected ? null : bid.id)}
                    className={`border-b border-[#1E2530] last:border-0 cursor-pointer transition-colors ${selected === bid.id ? 'bg-[#3B8BD4]/10' : i % 2 === 1 ? 'bg-[#151A22]/50 hover:bg-[rgba(255,255,255,0.03)]' : 'hover:bg-[rgba(255,255,255,0.03)]'}`}>
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-[#E8EDF5]">{bid.contractor}</div>
                      <div className="text-xs font-mono text-[#4A5568] mt-0.5">{bid.wallet.slice(0,6)}...{bid.wallet.slice(-4)}</div>
                    </td>
                    <td className="px-3 py-3.5 font-medium text-[#E8EDF5]">{formatINR(bid.amount)}</td>
                    <td className="px-3 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-[#1E2530] rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-[#3B8BD4] to-[#7F77DD]" style={{ width: `${bid.score * 100}%` }} />
                        </div>
                        <span className="text-[#E8EDF5] font-mono text-xs">{bid.score.toFixed(3)}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3.5"><FraudBadge status={bid.fraud as any} /></td>
                    <td className="px-3 py-3.5">
                      {bid.zkp
                        ? <span className="inline-flex items-center gap-1 text-xs text-[#7F77DD]"><ShieldCheck size={14} />Valid</span>
                        : <span className="inline-flex items-center gap-1 text-xs text-[#D85A30]"><ShieldOff size={14} />Failed</span>}
                    </td>
                    <td className="px-3 py-3.5">
                      <span className={`font-bold text-sm ${bid.rank === 1 ? 'text-[#EF9F27]' : 'text-[#8B95A8]'}`}>#{bid.rank}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>

        <div>
          {selectedBid ? (
            <Card className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-[#E8EDF5]">Score Breakdown</h3>
                <button onClick={() => setSelected(null)}><X size={16} className="text-[#8B95A8]" /></button>
              </div>
              <div className="text-center py-4 border border-[#1E2530] rounded-lg bg-[#0A0C10]">
                <div className="text-4xl font-bold text-[#E8EDF5] tracking-tight">{selectedBid.score.toFixed(3)}</div>
                <div className="text-xs text-[#8B95A8] mt-1">Final ML Score</div>
              </div>
              <div className="space-y-3">
                {breakdown.map(item => (
                  <div key={item.name}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[#8B95A8]">{item.name}</span>
                      <span className="font-mono text-[#E8EDF5]">{item.value}/{item.max}</span>
                    </div>
                    <div className="h-1.5 bg-[#1E2530] rounded-full">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(item.value/item.max)*100}%`, backgroundColor: item.color }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-[#1E2530] pt-3 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-[#8B95A8]">ZKP Proof</span>
                  <span className={selectedBid.zkp ? 'text-[#7F77DD]' : 'text-[#D85A30]'}>{selectedBid.zkp ? '✓ PLONK Verified' : '✗ Invalid'}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[#8B95A8]">Stake Locked</span>
                  <span className="font-mono text-[#EF9F27]">{selectedBid.stake} ETH</span>
                </div>
              </div>
              <a href="#" className="flex items-center gap-1.5 text-xs text-[#3B8BD4] hover:text-[#2A75BB] transition-colors">
                <ExternalLink size={12} />View on Etherscan
              </a>
            </Card>
          ) : (
            <Card className="flex flex-col items-center justify-center text-center h-64">
              <Info size={32} className="text-[#4A5568] mb-3" />
              <p className="text-[#8B95A8] text-sm">Click a bid row to view ML score breakdown</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
