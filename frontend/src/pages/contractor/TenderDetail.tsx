import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, FileText, Calendar, DollarSign, Lock, CheckCircle } from 'lucide-react'
import { tenderAPI } from '../../lib/api'
import { formatINR, timeAgo } from '../../lib/format'
import { LoadingState, StatusBadge, ConfirmModal } from '../../components/ui'
import { toast } from 'sonner'

interface Tender {
  _id: string
  tenderId: string
  title: string
  category: string
  budget: number
  deadline: string
  ipfsDocHash: string
  status: string
  createdAt: string
  milestones?: Array<{
    name: string
    percentage: number
    daysToComplete: number
    completed: boolean
  }>
  winner?: {
    _id: string
    name: string
    organization: string
  }
}

interface Bid {
  _id: string
  tenderId: string
  amount: number
  status: string
  mlScore?: number
  fraudScore?: number
  zkpVerified?: boolean
  submittedAt: string
}

export default function ContractorTenderDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [tender, setTender] = useState<Tender | null>(null)
  const [bids] = useState<Bid[]>([])
  const [myBid] = useState<Bid | null>(null)
  const [showBidModal, setShowBidModal] = useState(false)
  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState(false)

  useEffect(() => {
    loadTender()
    loadBids()
  }, [id])

  const loadTender = async () => {
    if (!id) return
    try {
      setLoading(true)
      const data = await tenderAPI.getOne(id)
      setTender(data.tender)
    } catch (error: any) {
      console.error('Failed to load tender:', error)
      toast.error(error.message || 'Failed to load tender')
    } finally {
      setLoading(false)
    }
  }

  const loadBids = async () => {
    try {
      // Load bids for this tender
      // This would be a new endpoint, for now we'll use placeholder
      // const data = await bidAPI.getByTender(id)
      // setBids(data.bids || [])
    } catch (error) {
      console.error('Failed to load bids:', error)
    }
  }

  const handleBidSubmit = async () => {
    if (!tender) return

    try {
      // TODO: Implement commit-reveal bidding flow
      // For now, just show a placeholder
      toast.info('Bid submission will be implemented with commit-reveal flow')
      setShowBidModal(false)
    } catch (error: any) {
      console.error('Failed to submit bid:', error)
      toast.error(error.message || 'Failed to submit bid')
    }
  }

  const handleWithdrawBid = async () => {
    if (!myBid) return

    try {
      // TODO: Implement bid withdrawal
      toast.info('Bid withdrawal will be implemented')
      setShowWithdrawConfirm(false)
    } catch (error: any) {
      console.error('Failed to withdraw bid:', error)
      toast.error(error.message || 'Failed to withdraw bid')
    }
  }

  if (loading) {
    return <LoadingState type="card" />
  }

  if (!tender) {
    return (
      <div className="card" style={{ padding: 40, textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>Tender not found</p>
      </div>
    )
  }

  const canBid = tender.status === 'open' && !myBid
  const canWithdraw = myBid && myBid.status === 'pending'

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <button
          onClick={() => navigate('/contractor')}
          className="btn btn-ghost"
          style={{ padding: '8px 16px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}
        >
          <ArrowLeft size={14} />
          Back to Tenders
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 8 }}>
              {tender.title}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13, color: 'var(--text-secondary)' }}>
              <span style={{ fontFamily: 'var(--font-mono)' }}>{tender.tenderId}</span>
              <span>•</span>
              <span style={{ textTransform: 'capitalize' }}>{tender.category}</span>
              <span>•</span>
              <StatusBadge status={tender.status} type="tender" />
            </div>
          </div>

          {canBid && (
            <button
              onClick={() => setShowBidModal(true)}
              className="btn btn-primary"
              style={{ padding: '10px 20px', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <DollarSign size={16} />
              Submit Bid
            </button>
          )}
          {canWithdraw && (
            <button
              onClick={() => setShowWithdrawConfirm(true)}
              className="btn btn-ghost"
              style={{ padding: '10px 20px', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Lock size={16} />
              Withdraw Bid
            </button>
          )}
        </div>
      </div>

      {/* Tender Details */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <DollarSign size={16} color="var(--contractor)" />
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>Budget</span>
          </div>
          <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)' }}>{formatINR(tender.budget)}</div>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Calendar size={16} color="var(--contractor)" />
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>Deadline</span>
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>{timeAgo(tender.deadline)}</div>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <FileText size={16} color="var(--contractor)" />
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>Document</span>
          </div>
          <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', wordBreak: 'break-all' }}>
            {tender.ipfsDocHash}
          </div>
        </div>
      </div>

      {/* Milestones */}
      <div className="card" style={{ padding: 24, marginBottom: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Milestones</h3>
        {tender.milestones && tender.milestones.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {tender.milestones.map((milestone, index) => (
              <div
                key={index}
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
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4 }}>
                    {milestone.name}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {milestone.percentage}% • {milestone.daysToComplete} days
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No milestones configured</p>
        )}
      </div>

      {/* Bids */}
      <div className="card" style={{ padding: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Bids</h3>
        {bids.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No bids submitted yet</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {bids.map((bid) => (
              <div
                key={bid._id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 16,
                  background: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4 }}>
                    {formatINR(bid.amount)}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Score: {bid.mlScore || 'N/A'} • ZKP: {bid.zkpVerified ? '✓' : '✗'}
                  </div>
                </div>
                <StatusBadge status={bid.status} type="bid" size="sm" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bid Modal */}
      <ConfirmModal
        isOpen={showBidModal}
        title="Submit Bid"
        message={`Enter your bid amount for "${tender.title}". This will require staking ETH as collateral.`}
        confirmLabel="Submit Bid"
        onCancel={() => setShowBidModal(false)}
        onConfirm={handleBidSubmit}
      />

      {/* Withdraw Confirmation */}
      <ConfirmModal
        isOpen={showWithdrawConfirm}
        title="Withdraw Bid"
        message="Are you sure you want to withdraw your bid? Your stake will be refunded."
        confirmLabel="Withdraw"
        onCancel={() => setShowWithdrawConfirm(false)}
        onConfirm={handleWithdrawBid}
      />
    </div>
  )
}
