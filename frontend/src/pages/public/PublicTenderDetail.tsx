import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, FileText, Calendar, DollarSign, Copy, CheckCircle } from 'lucide-react'
import { publicAPI, tenderAPI } from '../../lib/api'
import { formatINR, timeAgo } from '../../lib/format'
import { LoadingState, StatusBadge } from '../../components/ui'
import { toast } from 'sonner'

const AUTH_TOKEN_KEY = 'govchain_token'

function hasAuthToken(): boolean {
  if (typeof window === 'undefined') return false
  return Boolean(localStorage.getItem(AUTH_TOKEN_KEY))
}

function isMongoId(id: string): boolean {
  return /^[a-f0-9]{24}$/i.test(id)
}

interface FeedTender {
  id: string
  title: string
  category: string
  budget: number
  allocated: number
  utilised: number
  state: string
  status: string
  deadline: string
}

interface FullTender {
  _id: string
  tenderId?: string
  title: string
  category: string
  budget: number
  deadline: string
  ipfsDocHash?: string
  status: string
  state?: string
  utilisedAmount?: number
  milestones?: Array<{
    name: string
    percentage: number
    daysToComplete: number
    completed: boolean
  }>
}

export default function PublicTenderDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [tender, setTender] = useState<FullTender | null>(null)
  const [displayId, setDisplayId] = useState<string>('')
  const [utilised, setUtilised] = useState<number | null>(null)

  const loadFromFeedByTenderId = useCallback(async (tenderId: string): Promise<FeedTender | null> => {
    const pageSize = 50
    const maxPages = 15
    for (let page = 1; page <= maxPages; page++) {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(pageSize),
      })
      const data = await publicAPI.getTenderFeed(params)
      const list = (data.tenders || []) as FeedTender[]
      const hit = list.find((t) => t.id === tenderId)
      if (hit) return hit
      const total = data.pagination?.total ?? 0
      if (page * pageSize >= total) break
    }
    return null
  }, [])

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      if (!id) {
        setNotFound(true)
        setLoading(false)
        return
      }

      setLoading(true)
      setNotFound(false)
      setTender(null)

      try {
        if (hasAuthToken() && isMongoId(id)) {
          try {
            const data = await tenderAPI.getOne(id)
            if (cancelled) return
            const t = data.tender as FullTender
            setTender(t)
            setDisplayId(t.tenderId || t._id)
            setUtilised(t.utilisedAmount ?? null)
            return
          } catch {
            // fall through to public feed lookup by treating id as tenderId string
          }
        }

        const row = await loadFromFeedByTenderId(id)
        if (cancelled) return
        if (!row) {
          setNotFound(true)
          return
        }

        setDisplayId(row.id)
        setUtilised(row.utilised)
        setTender({
          _id: row.id,
          tenderId: row.id,
          title: row.title,
          category: row.category,
          budget: row.budget,
          deadline: row.deadline,
          status: row.status,
          state: row.state,
          ipfsDocHash: undefined,
          milestones: undefined,
        })
      } catch (e: unknown) {
        if (!cancelled) {
          console.error(e)
          setNotFound(true)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [id, loadFromFeedByTenderId])

  const copyHash = async (hash: string) => {
    try {
      await navigator.clipboard.writeText(hash)
      toast.success('Copied to clipboard')
    } catch {
      toast.error('Could not copy')
    }
  }

  if (loading) {
    return <LoadingState type="card" />
  }

  if (notFound || !tender) {
    return (
      <div className="animate-fade-in" style={{ textAlign: 'center', padding: 60 }}>
        <FileText size={40} color="var(--text-muted)" />
        <h2 style={{ fontSize: 18, fontWeight: 600, marginTop: 16, color: 'var(--text-primary)' }}>Tender not available</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 8, maxWidth: 420, margin: '8px auto 0' }}>
          This tender is not in the public feed, or you need to open it from the tender list. Try another tender or return to the feed.
        </p>
        <button type="button" onClick={() => navigate('/public')} className="btn btn-ghost" style={{ marginTop: 16 }}>
          <ArrowLeft size={14} /> Back to feed
        </button>
      </div>
    )
  }

  const allocated = tender.budget
  const util = utilised ?? tender.utilisedAmount ?? 0
  const stateLabel = tender.state || 'N/A'

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: 24 }}>
        <button
          type="button"
          onClick={() => navigate('/public')}
          className="btn btn-ghost"
          style={{ padding: '8px 16px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}
        >
          <ArrowLeft size={14} />
          Back to feed
        </button>

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 8 }}>{tender.title}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13, color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'var(--font-mono)' }}>{displayId}</span>
              <span>•</span>
              <span style={{ textTransform: 'capitalize' }}>{tender.category}</span>
              <span>•</span>
              <StatusBadge status={tender.status} type="tender" />
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <DollarSign size={16} color="var(--public)" />
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>Budget</span>
          </div>
          <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)' }}>{formatINR(tender.budget)}</div>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <DollarSign size={16} color="var(--public)" />
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>Allocated</span>
          </div>
          <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)' }}>{formatINR(allocated)}</div>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <DollarSign size={16} color="var(--public)" />
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>Utilised</span>
          </div>
          <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)' }}>{formatINR(util)}</div>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Calendar size={16} color="var(--public)" />
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>Deadline</span>
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>{timeAgo(tender.deadline)}</div>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <FileText size={16} color="var(--public)" />
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>State</span>
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>{stateLabel}</div>
        </div>
      </div>

      <div className="card" style={{ padding: 24, marginBottom: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Milestones</h3>
        {tender.milestones && tender.milestones.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {tender.milestones.map((milestone, index) => (
              <div
                key={`${milestone.name}-${index}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: 12,
                  background: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: milestone.completed ? 'var(--success)' : 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {milestone.completed ? <CheckCircle size={14} color="#fff" /> : <span style={{ fontSize: 12 }}>{index + 1}</span>}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4 }}>{milestone.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {milestone.percentage}% • {milestone.daysToComplete} days
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Milestone breakdown is not included in the public tender feed. Sign in to a government or contractor portal to see full milestone timelines.
          </p>
        )}
      </div>

      <div className="card" style={{ padding: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Document</h3>
        {tender.ipfsDocHash ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', wordBreak: 'break-all', flex: 1 }}>
              {tender.ipfsDocHash.length > 36 ? `${tender.ipfsDocHash.slice(0, 18)}…${tender.ipfsDocHash.slice(-12)}` : tender.ipfsDocHash}
            </span>
            <button type="button" className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => copyHash(tender.ipfsDocHash!)}>
              <Copy size={14} /> Copy
            </button>
          </div>
        ) : (
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            IPFS document hash is not exposed in the public API for this tender. Open this tender while signed in for full document metadata.
          </p>
        )}
      </div>
    </div>
  )
}
