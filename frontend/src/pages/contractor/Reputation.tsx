import { useState, useEffect } from 'react'
import { Card } from '../../components/ui'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { ShieldCheck, Star, Award } from 'lucide-react'
import api from '../../lib/api'
import { useAuthStore } from '../../store/authStore'
import { useAccount } from 'wagmi'
import { useContractorProfile } from '../../hooks/useContractData'

const ratingHistory = [
  { month: 'Jul', rating: 3.8 }, { month: 'Aug', rating: 4.0 }, { month: 'Sep', rating: 3.9 },
  { month: 'Oct', rating: 4.2 }, { month: 'Nov', rating: 4.5 }, { month: 'Dec', rating: 4.7 },
  { month: 'Jan', rating: 4.6 }, { month: 'Feb', rating: 4.8 }, { month: 'Mar', rating: 4.9 },
]

const reviews = [
  { hunter: 'Bounty Hunter #B-0042', rating: 5, comment: 'GPS coordinates verified on-site. All documentation matches.', date: 'Mar 10, 2024' },
  { hunter: 'Bounty Hunter #B-0019', rating: 4, comment: 'Minor documentation delay, but project quality excellent.', date: 'Dec 5, 2023' },
]

export default function Reputation() {
  const { token, user } = useAuthStore()
  const { address } = useAccount()
  const { data: onChainProfile, isLoading: onChainLoading } = useContractorProfile(address)
  const [reputation, setReputation] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadReputation = async () => {
      if (!token) return

      try {
        const response = await api.contractor.getReputation(token)
        setReputation(response.reputation)
      } catch (error) {
        console.error('Failed to load reputation:', error)
      } finally {
        setLoading(false)
      }
    }

    loadReputation()
  }, [token])

  const stats = (reputation || onChainProfile) ? [
    { label: 'On-Chain Rating', value: onChainProfile ? `${(Number(onChainProfile.rating) / 1000000).toFixed(1)} / 5.0` : `${(reputation?.reputationScore / 20).toFixed(1)} / 5.0`, color: 'text-[#EF9F27]', icon: Star },
    { label: 'Completed Projects', value: onChainProfile ? Number(onChainProfile.tender_count).toString() : (reputation?.completedProjects || 0), color: 'text-[#1D9E75]', icon: Award },
    { label: 'Completion Rate', value: onChainProfile ? `${(Number(onChainProfile.completion_rate) / 100).toFixed(0)}%` : `${reputation?.completionRate || 0}%`, color: 'text-[#3B8BD4]', icon: ShieldCheck },
  ] : []

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#E8EDF5] tracking-tight">Reputation Profile</h1>
            <p className="text-sm text-[#8B95A8] mt-1">Loading...</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="h-32 animate-pulse bg-[#151A22]" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#E8EDF5] tracking-tight">Reputation Profile</h1>
          <p className="text-sm text-[#8B95A8] mt-1">{reputation?.organization || user?.name || 'Contractor'}</p>
        </div>
        {reputation?.kycVerified && (
          <div className="flex items-center gap-2 px-4 py-2 bg-[#7F77DD]/10 border border-[#7F77DD]/20 rounded-xl">
            <ShieldCheck size={18} className="text-[#7F77DD]" />
            <span className="text-sm font-semibold text-[#7F77DD]">ZKP Verified</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {stats.map(s => (
          <Card key={s.label} className="text-center space-y-2">
            <s.icon size={24} className={`${s.color} mx-auto`} />
            <div className={`text-2xl font-bold tracking-tight ${s.color}`}>{s.value}</div>
            <div className="text-xs text-[#8B95A8]">{s.label}</div>
          </Card>
        ))}
      </div>

      <Card>
        <h3 className="font-semibold text-[#E8EDF5] mb-4">Rating History (On-Chain)</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={ratingHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E2530" vertical={false} />
              <XAxis dataKey="month" stroke="#8B95A8" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
              <YAxis domain={[3, 5]} stroke="#8B95A8" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ backgroundColor: '#0F1318', border: '1px solid #1E2530', borderRadius: '8px' }} />
              <Line type="monotone" dataKey="rating" stroke="#EF9F27" strokeWidth={2} dot={{ fill: '#EF9F27', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <h3 className="font-semibold text-[#E8EDF5] mb-4">Bounty Hunter Reviews</h3>
        <div className="space-y-4">
          {reviews.map((r, i) => (
            <div key={i} className="bg-[#0A0C10] border border-[#1E2530] rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-[#E8EDF5]">{r.hunter}</span>
                <div className="flex items-center gap-1">
                  {Array.from({length:5}).map((_,j) => (
                    <Star key={j} size={12} className={j < r.rating ? 'text-[#EF9F27] fill-[#EF9F27]' : 'text-[#1E2530]'} />
                  ))}
                </div>
              </div>
              <p className="text-sm text-[#8B95A8]">{r.comment}</p>
              <p className="text-xs text-[#4A5568] mt-2">{r.date}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
