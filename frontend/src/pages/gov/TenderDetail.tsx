import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Clock, CheckCircle, FileText, Users, Calendar, DollarSign } from 'lucide-react'
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
  createdBy?: {
    name: string
    organization: string
  }
}

interface Bid {
  _id: string
  tenderId: string
  contractorId: {
    name: string
    organization: string
  }
  amount: number
  status: string
  mlScore?: number
  fraudScore?: number
  zkpVerified?: boolean
  submittedAt: string
}

export default function TenderDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [tender, setTender] = useState<Tender | null>(null)
  const [bids] = useState<Bid[]>([])
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)
  const [showAllotConfirm, setShowAllotConfirm] = useState(false)
  const [selectedWinner, setSelectedWinner] = useState<string | null>(null)

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
      // This would be a new endpoint, for now we'll use the bids endpoint
      // const data = await bidAPI.getByTender(id)
      // setBids(data.bids || [])
    } catch (error) {
      console.error('Failed to load bids:', error)
    }
  }

  const handleCloseBidding = async () => {
    if (!tender) return

    try {
      await tenderAPI.closeBids(tender._id)
      toast.success('Bidding closed successfully')
      setShowCloseConfirm(false)
      loadTender()
    } catch (error: any) {
      console.error('Failed to close bidding:', error)
      toast.error(error.message || 'Failed to close bidding')
    }
  }

  const handleAllotWinner = async () => {
    if (!tender || !selectedWinner) return

    try {
      await tenderAPI.allot(tender._id, selectedWinner)
      toast.success('Winner allotted successfully')
      setShowAllotConfirm(false)
      loadTender()
    } catch (error: any) {
      console.error('Failed to allot winner:', error)
      toast.error(error.message || 'Failed to allot winner')
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

  const canCloseBidding = tender.status === 'open'
  const canAllotWinner = tender.status === 'closed' || tender.status === 'bidding_closed'

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <button
          onClick={() => navigate('/gov/tenders')}
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

          <div style={{ display: 'flex', gap: 8 }}>
            {canCloseBidding && (
              <button
                onClick={() => setShowCloseConfirm(true)}
                className="btn btn-primary"
                style={{ padding: '10px 20px', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Clock size={16} />
                Close Bidding
              </button>
            )}
            {canAllotWinner && (
              <button
                onClick={() => setShowAllotConfirm(true)}
                className="btn btn-primary"
                style={{ padding: '10px 20px', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}
                disabled={!selectedWinner}
              >
                <CheckCircle size={16} />
                Allot Winner
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tender Details */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <DollarSign size={16} color="var(--gov)" />
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>Budget</span>
          </div>
          <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)' }}>{formatINR(tender.budget)}</div>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Calendar size={16} color="var(--gov)" />
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>Deadline</span>
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>{timeAgo(tender.deadline)}</div>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <FileText size={16} color="var(--gov)" />
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>Document</span>
          </div>
          <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', wordBreak: 'break-all' }}>
            {tender.ipfsDocHash}
          </div>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Users size={16} color="var(--gov)" />
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>Created By</span>
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>
            {tender.createdBy?.name || 'Unknown'} ({tender.createdBy?.organization || ''})
          </div>
        </div>
      </div>

      {/* Winner Info */}
      {tender.winner && (
        <div className="card" style={{ padding: 20, marginBottom: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Winner</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: 'var(--success)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CheckCircle size={20} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{tender.winner.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{tender.winner.organization}</div>
            </div>
          </div>
        </div>
      )}

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
      {canAllotWinner && (
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
                    border: `1px solid ${selectedWinner === bid._id ? 'var(--gov)' : 'var(--border)'}`,
                    cursor: 'pointer',
                  }}
                  onClick={() => setSelectedWinner(bid._id)}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4 }}>
                      {bid.contractorId.name}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {bid.contractorId.organization}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                      {formatINR(bid.amount)}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      Score: {bid.mlScore || 'N/A'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Close Bidding Confirmation */}
      <ConfirmModal
        isOpen={showCloseConfirm}
        title="Close Bidding"
        message={`Are you sure you want to close bidding for "${tender.title}"? No new bids will be accepted after this action.`}
        confirmLabel="Close Bidding"
        onCancel={() => setShowCloseConfirm(false)}
        onConfirm={handleCloseBidding}
      />

      {/* Allot Winner Confirmation */}
      <ConfirmModal
        isOpen={showAllotConfirm}
        title="Allot Winner"
        message={`Are you sure you want to allot this tender to the selected contractor? This action cannot be undone.`}
        confirmLabel="Allot Winner"
        onCancel={() => setShowAllotConfirm(false)}
        onConfirm={handleAllotWinner}
      />
    </div>
  )
}
