import { useState, useEffect } from 'react'
import { Card } from '../../components/ui'
import { Trophy, Shield, Star, Award } from 'lucide-react'
import api from '../../lib/api'

const badgeColor: Record<string, string> = {
  Elite: 'text-[#EF9F27] bg-[#EF9F27]/10 border-[#EF9F27]/20',
  Senior: 'text-[#7F77DD] bg-[#7F77DD]/10 border-[#7F77DD]/20',
  Standard: 'text-[#3B8BD4] bg-[#3B8BD4]/10 border-[#3B8BD4]/20',
}

const medalColor = ['text-[#EF9F27]', 'text-[#8B95A8]', 'text-[#CD7F32]']

export default function Leaderboard() {
  const [hunters, setHunters] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadLeaderboard = async () => {
      try {
        const response = await api.bounty.getLeaderboard()
        setHunters(response.leaderboard || [])
      } catch (error) {
        console.error('Failed to load leaderboard:', error)
      } finally {
        setLoading(false)
      }
    }

    loadLeaderboard()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#E8EDF5] tracking-tight">Bounty Leaderboard</h1>
          <p className="text-sm text-[#8B95A8] mt-1">Top-ranked citizen auditors — accuracy and honesty rewarded on-chain</p>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="h-48 animate-pulse bg-[#151A22]" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#E8EDF5] tracking-tight">Bounty Leaderboard</h1>
        <p className="text-sm text-[#8B95A8] mt-1">Top-ranked citizen auditors — accuracy and honesty rewarded on-chain</p>
      </div>

      {hunters.length > 0 ? (
        <>
          {/* Top 3 Podium */}
          <div className="grid grid-cols-3 gap-4">
            {hunters.slice(0, 3).map((h, i) => (
              <Card key={h.rank} className={`text-center space-y-3 ${i === 0 ? 'border-[#EF9F27]/30 bg-[#EF9F27]/5' : ''}`}>
                <Trophy size={28} className={`mx-auto ${medalColor[i]}`} />
                <div>
                  <div className="font-bold text-[#E8EDF5]">{h.name}</div>
                  <div className="text-xs font-mono text-[#4A5568] mt-0.5">{h.wallet || '0x...'}</div>
                </div>
                <div className={`text-xs font-semibold px-2 py-0.5 rounded-full border mx-auto inline-block ${badgeColor[h.badge] || badgeColor.Standard}`}>{h.badge || 'Standard'}</div>
                <div className="text-lg font-bold text-[#EF9F27]">{h.earnings || 0} MATIC</div>
                <div className="text-xs text-[#8B95A8]">{h.completedReviews || 0} reviews • {h.reputation || 50}% accuracy</div>
              </Card>
            ))}
          </div>

          {/* Full table */}
          <Card className="p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1E2530]">
                  {['Rank', 'Hunter', 'Badge', 'Reviews', 'Accuracy', 'Earnings'].map(h => (
                    <th key={h} className="text-left text-xs text-[#8B95A8] font-medium px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {hunters.map((h, i) => (
                  <tr key={h.rank} className={`border-b border-[#1E2530] last:border-0 ${i % 2 === 1 ? 'bg-[#151A22]/50' : ''} hover:bg-[rgba(255,255,255,0.03)] transition-colors`}>
                    <td className="px-5 py-3">
                      <span className={`font-bold text-base ${i < 3 ? medalColor[i] : 'text-[#8B95A8]'}`}>#{h.rank}</span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="font-medium text-[#E8EDF5]">{h.name}</div>
                      <div className="text-xs font-mono text-[#4A5568]">{h.wallet || '0x...'}</div>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${badgeColor[h.badge] || badgeColor.Standard}`}>{h.badge || 'Standard'}</span>
                    </td>
                    <td className="px-3 py-3 font-mono text-[#E8EDF5]">{h.completedReviews || 0}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-[#1E2530] rounded-full">
                          <div className="h-full bg-[#1D9E75] rounded-full" style={{ width: `${h.reputation || 50}%` }} />
                        </div>
                        <span className="text-xs font-mono text-[#1D9E75]">{h.reputation || 50}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 font-mono text-[#EF9F27] font-semibold">{h.earnings || 0} MATIC</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      ) : (
        <Card className="text-center py-12">
          <p className="text-[#8B95A8]">No bounty hunters registered yet</p>
        </Card>
      )}
    </div>
  )
}
