import { List } from 'lucide-react'

export default function TenderFeed() {
  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <List size={20} color="var(--public)" />
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Public Tender Feed</h1>
      </div>
      <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24 }}>Explore all active government tenders. Full transparency — every bid, every rupee, on-chain.</p>
      <div className="card" style={{ padding: 24, textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Connect to backend to load live tenders.</p>
      </div>
    </div>
  )
}
