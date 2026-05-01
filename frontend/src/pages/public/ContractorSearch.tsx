import { useState, useEffect } from 'react'
import { Card } from '../../components/ui'
import { Search, ShieldCheck, Star, ExternalLink } from 'lucide-react'
import api from '../../lib/api'

export default function ContractorSearch() {
  const [q, setQ] = useState('')
  const [contractors, setContractors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadContractors = async () => {
      try {
        const response = await api.public.getContractors()
        setContractors(response.contractors || [])
      } catch (error) {
        console.error('Failed to load contractors:', error)
      } finally {
        setLoading(false)
      }
    }

    loadContractors()
  }, [])

  const filtered = contractors.filter(c =>
    c.name.toLowerCase().includes(q.toLowerCase()) || c.gst.includes(q)
  )

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#E8EDF5] tracking-tight">Contractor Transparency</h1>
          <p className="text-sm text-[#8B95A8] mt-1">On-chain ratings cannot be manipulated — search any registered contractor</p>
        </div>
        <div className="flex items-center gap-2 bg-[#151A22] border border-[#1E2530] rounded-lg px-4 py-2.5 max-w-lg">
          <Search size={16} className="text-[#8B95A8]" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by company name or GST number..."
            className="flex-1 bg-transparent text-sm text-[#E8EDF5] placeholder-[#4A5568] outline-none" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="h-48 animate-pulse bg-[#151A22]" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#E8EDF5] tracking-tight">Contractor Transparency</h1>
        <p className="text-sm text-[#8B95A8] mt-1">On-chain ratings cannot be manipulated — search any registered contractor</p>
      </div>

      <div className="flex items-center gap-2 bg-[#151A22] border border-[#1E2530] rounded-lg px-4 py-2.5 max-w-lg">
        <Search size={16} className="text-[#8B95A8]" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by company name or GST number..."
          className="flex-1 bg-transparent text-sm text-[#E8EDF5] placeholder-[#4A5568] outline-none" />
      </div>

      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(c => (
            <Card key={c.id} className={`space-y-4 ${c.flagged ? 'border-[#D85A30]/30' : ''}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-[#E8EDF5]">{c.name}</h3>
                    {c.zkp
                      ? <span className="flex items-center gap-1 text-xs text-[#7F77DD] bg-[#7F77DD]/10 border border-[#7F77DD]/20 px-2 py-0.5 rounded-full"><ShieldCheck size={11} />ZKP Verified</span>
                      : <span className="text-xs text-[#D85A30] bg-[#D85A30]/10 border border-[#D85A30]/20 px-2 py-0.5 rounded-full">Unverified</span>
                    }
                    {c.flagged && <span className="text-xs text-[#D85A30] bg-[#D85A30]/10 border border-[#D85A30]/20 px-2 py-0.5 rounded-full">⚠ Flagged</span>}
                  </div>
                  <div className="text-xs font-mono text-[#4A5568] mt-1">{c.gst}</div>
                </div>
                <div className="flex items-center gap-1 text-[#EF9F27]">
                  <Star size={16} className="fill-[#EF9F27]" />
                  <span className="font-bold text-lg">{c.rating}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-[#0A0C10] border border-[#1E2530] rounded-lg p-2.5">
                  <div className="text-[#4A5568]">Completed Projects</div>
                  <div className="text-[#E8EDF5] font-semibold text-base mt-0.5">{c.projects}</div>
                </div>
                <div className="bg-[#0A0C10] border border-[#1E2530] rounded-lg p-2.5">
                  <div className="text-[#4A5568]">Completion Rate</div>
                  <div className={`font-semibold text-base mt-0.5 ${c.completionRate > 85 ? 'text-[#1D9E75]' : c.completionRate > 60 ? 'text-[#EF9F27]' : 'text-[#D85A30]'}`}>{c.completionRate}%</div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-2 border-t border-[#1E2530]">
                <span className="font-mono text-[#4A5568]">{c.wallet.slice(0,8)}...{c.wallet.slice(-4)}</span>
                <a href="#" className="flex items-center gap-1 text-[#3B8BD4] hover:text-[#2A75BB]"><ExternalLink size={12} />View on-chain</a>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="text-center py-12">
          <p className="text-[#8B95A8]">No contractors found</p>
        </Card>
      )}
    </div>
  )
}
