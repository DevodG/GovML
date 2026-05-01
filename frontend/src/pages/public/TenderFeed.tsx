import { useState, useEffect } from 'react'
import { Card, Badge } from '../../components/ui'
import { formatINR } from '../../lib/format'
import { MapPin, Clock, Building2, Filter } from 'lucide-react'
import api from '../../lib/api'

const statusColor: Record<string, string> = {
  open: 'teal', awarded: 'blue', completed: 'gray',
}

export default function TenderFeed() {
  const [search, setSearch] = useState('')
  const [filterState, setFilterState] = useState('All')
  const [tenders, setTenders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadTenders = async () => {
      try {
        const response = await api.public.getTenderFeed()
        setTenders(response.tenders || [])
      } catch (error) {
        console.error('Failed to load tenders:', error)
      } finally {
        setLoading(false)
      }
    }

    loadTenders()
  }, [])

  const states = ['All', 'Maharashtra', 'Karnataka', 'Telangana', 'Rajasthan', 'Tamil Nadu']
  const filtered = tenders.filter(t =>
    (filterState === 'All' || t.state === filterState) &&
    t.title.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#E8EDF5] tracking-tight">Live Tender Feed</h1>
          <p className="text-sm text-[#8B95A8] mt-1">All government tenders — real-time transparency</p>
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <Card key={i} className="h-32 animate-pulse bg-[#151A22]" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#E8EDF5] tracking-tight">Live Tender Feed</h1>
        <p className="text-sm text-[#8B95A8] mt-1">All government tenders — real-time transparency</p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-[#151A22] border border-[#1E2530] rounded-lg px-3 py-2">
          <Filter size={14} className="text-[#8B95A8]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tenders..."
            className="bg-transparent text-sm text-[#E8EDF5] placeholder-[#4A5568] outline-none w-48" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {states.map(s => (
            <button key={s} onClick={() => setFilterState(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filterState === s ? 'bg-[#3B8BD4] text-white' : 'bg-[#151A22] border border-[#1E2530] text-[#8B95A8] hover:text-[#E8EDF5]'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filtered.length > 0 ? filtered.map(t => {
          const utilisedPct = t.allocated > 0 ? Math.round((t.utilised / t.allocated) * 100) : 0
          return (
            <Card key={t._id} className="hover:border-[rgba(255,255,255,0.1)] transition-all group cursor-pointer">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-xs font-mono text-[#4A5568]">{t.id}</span>
                    <Badge variant={statusColor[t.status] as any}>{t.status.charAt(0).toUpperCase() + t.status.slice(1)}</Badge>
                    <span className="flex items-center gap-1 text-xs text-[#8B95A8]"><MapPin size={10} />{t.state}</span>
                  </div>
                  <h3 className="font-semibold text-[#E8EDF5] group-hover:text-white transition-colors">{t.title}</h3>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-[#8B95A8]">
                    <span className="flex items-center gap-1"><Clock size={10} />Due: {new Date(t.deadline).toLocaleDateString()}</span>
                    <span className="flex items-center gap-1"><Building2 size={10} />{t.category}</span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="font-bold text-[#E8EDF5]">{formatINR(t.budget)}</div>
                  <div className="text-xs text-[#8B95A8]">Total Budget</div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-[#8B95A8]">Fund Utilisation</span>
                  <span className="font-mono text-[#E8EDF5]">{formatINR(t.utilised)} / {formatINR(t.allocated)} ({utilisedPct}%)</span>
                </div>
                <div className="h-1.5 bg-[#1E2530] rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${utilisedPct}%`, backgroundColor: utilisedPct > 80 ? '#1D9E75' : utilisedPct > 40 ? '#3B8BD4' : '#EF9F27' }} />
                </div>
              </div>
            </Card>
          )
        }) : (
          <Card className="text-center py-12">
            <p className="text-[#8B95A8]">No tenders found</p>
          </Card>
        )}
      </div>
    </div>
  )
}
