import { Search, Filter } from 'lucide-react'

const mockTenders = [
  { id: 'T-001', title: 'Smart Highway — NH48 Bangalore–Pune', category: 'Infrastructure', budget: '₹245 Cr', deadline: '2026-06-15', status: 'Open', bids: 8 },
  { id: 'T-002', title: 'District Hospital Digitization — Tier 2', category: 'Healthcare', budget: '₹18.5 Cr', deadline: '2026-05-28', status: 'Open', bids: 3 },
  { id: 'T-003', title: 'Solar Micro-Grid — 12 Villages', category: 'Infrastructure', budget: '₹42 Cr', deadline: '2026-07-01', status: 'Open', bids: 12 },
]

export default function BrowseTenders() {
  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Browse Tenders</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="input" placeholder="Search tenders..." style={{ paddingLeft: 34, width: 240 }} />
          </div>
          <button className="btn btn-ghost"><Filter size={14} /> Filter</button>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 12 }}>
        {mockTenders.map(t => (
          <div key={t.id} className="card" style={{ padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{t.id}</span>
                <span className="badge badge-success">{t.status}</span>
              </div>
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{t.title}</h3>
              <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-secondary)' }}>
                <span>{t.category}</span>
                <span>{t.budget}</span>
                <span>Deadline: {t.deadline}</span>
                <span>{t.bids} bids</span>
              </div>
            </div>
            <button className="btn btn-primary" style={{ fontSize: 12, padding: '8px 16px' }}>Commit Bid</button>
          </div>
        ))}
      </div>
    </div>
  )
}
