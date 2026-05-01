import { useState, useEffect } from 'react'
import { Card, Badge } from '../../components/ui'
import { formatINR } from '../../lib/format'
import { MapPin, ChevronRight, Clock, Building2 } from 'lucide-react'
import api from '../../lib/api'

const cats = ['All', 'Infrastructure', 'Energy', 'Smart City', 'Healthcare']

export default function BrowseTenders() {
  const [cat, setCat] = useState('All')
  const [search, setSearch] = useState('')
  const [tenders, setTenders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadTenders = async () => {
      try {
        const response = await api.public.getTenders()
        setTenders(response.tenders || [])
      } catch (error) {
        console.error('Failed to load tenders:', error)
      } finally {
        setLoading(false)
      }
    }

    loadTenders()
  }, [])

  const filtered = tenders.filter(t =>
    (cat === 'All' || t.category === cat) &&
    (t.title.toLowerCase().includes(search.toLowerCase()) || t.tenderId?.includes(search))
  )

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#E8EDF5] tracking-tight">Browse Tenders</h1>
          <p className="text-sm text-[#8B95A8] mt-1">Active government tenders open for bidding</p>
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="h-24 animate-pulse bg-[#151A22]" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#E8EDF5] tracking-tight">Browse Tenders</h1>
        <p className="text-sm text-[#8B95A8] mt-1">Active government tenders open for bidding</p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tenders..."
          className="bg-[#151A22] border border-[#1E2530] rounded-lg px-3 py-2 text-sm text-[#E8EDF5] placeholder-[#4A5568] outline-none focus:border-[#3B8BD4] transition-colors w-64" />
        <div className="flex gap-2">
          {cats.map(c => (
            <button key={c} onClick={() => setCat(c)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${cat === c ? 'bg-[#3B8BD4] text-white' : 'bg-[#151A22] border border-[#1E2530] text-[#8B95A8] hover:text-[#E8EDF5]'}`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filtered.length > 0 ? filtered.map(t => (
          <Card key={t._id} className="hover:border-[rgba(255,255,255,0.12)] transition-all cursor-pointer group">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono text-[#4A5568]">{t.tenderId}</span>
                  <Badge variant="blue">{t.category}</Badge>
                  <div className="flex items-center gap-1 text-xs text-[#8B95A8]"><MapPin size={10} />{t.state || 'N/A'}</div>
                </div>
                <h3 className="font-semibold text-[#E8EDF5] group-hover:text-white transition-colors truncate">{t.title}</h3>
                <div className="flex items-center gap-4 mt-2 text-xs text-[#8B95A8]">
                  <span className="flex items-center gap-1"><Clock size={11} />Deadline: {new Date(t.deadline).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-lg font-bold text-[#1D9E75]">{formatINR(t.budget)}</div>
                <button className="mt-2 bg-[#3B8BD4] hover:bg-[#2A75BB] text-white text-xs font-semibold px-4 py-1.5 rounded-lg flex items-center gap-1 ml-auto transition-colors">
                  Bid Now <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </Card>
        )) : (
          <Card className="text-center py-12">
            <p className="text-[#8B95A8]">No tenders found</p>
          </Card>
        )}
      </div>
    </div>
  )
}
