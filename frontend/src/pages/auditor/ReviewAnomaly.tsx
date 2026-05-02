import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle, XCircle, Clock } from 'lucide-react'
import { auditorAPI } from '../../lib/api'
import { timeAgo } from '../../lib/format'
import { LoadingState, StatusBadge, ConfirmModal } from '../../components/ui'
import { toast } from 'sonner'

interface Anomaly {
  id: string
  type: string
  anomalyType: string
  severity: number
  description: string
  status: string
  tenderId: string
  bidId: string
  tender?: {
    title: string
    category: string
  }
  entity?: {
    name: string
    organization: string
  }
  flaggedBy: string
  flaggedAt: string
  freezeUntil: string
  resolved: boolean
  slashed: boolean
}

export default function ReviewAnomaly() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [anomaly, setAnomaly] = useState<Anomaly | null>(null)
  const [showApproveConfirm, setShowApproveConfirm] = useState(false)
  const [showRejectConfirm, setShowRejectConfirm] = useState(false)
  const [comments, setComments] = useState('')

  useEffect(() => {
    loadAnomaly()
  }, [id])

  const loadAnomaly = async () => {
    if (!id) return
    try {
      setLoading(true)
      const data = await auditorAPI.getReport(id)
      setAnomaly(data.report)
    } catch (error: any) {
      console.error('Failed to load anomaly:', error)
      toast.error(error.message || 'Failed to load anomaly')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async () => {
    if (!id) return
    setShowApproveConfirm(false)
    try {
      await auditorAPI.reviewAnomaly(id, true, comments)
      toast.success('Anomaly approved successfully')
      navigate('/auditor/anomalies')
    } catch (error: any) {
      console.error('Failed to approve anomaly:', error)
      toast.error(error.message || 'Failed to approve anomaly')
    }
  }

  const handleReject = async () => {
    if (!id) return
    setShowRejectConfirm(false)
    try {
      await auditorAPI.reviewAnomaly(id, false, comments)
      toast.success('Anomaly rejected successfully')
      navigate('/auditor/anomalies')
    } catch (error: any) {
      console.error('Failed to reject anomaly:', error)
      toast.error(error.message || 'Failed to reject anomaly')
    }
  }

  if (loading) {
    return <LoadingState type="card" />
  }

  if (!anomaly) {
    return (
      <div className="card" style={{ padding: 40, textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>Anomaly not found</p>
      </div>
    )
  }

  const isFrozen = new Date(anomaly.freezeUntil) > new Date()
  const canReview = !isFrozen && anomaly.status === 'pending'

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <button
          onClick={() => navigate('/auditor/anomalies')}
          className="btn btn-ghost"
          style={{ padding: '8px 16px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}
        >
          <ArrowLeft size={14} />
          Back to Anomalies
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 8 }}>
              Review Anomaly
            </h1>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              {anomaly.id}
            </div>
          </div>
          <StatusBadge status={anomaly.status} type="anomaly" size="md" />
        </div>
      </div>

      {/* Warning Banner */}
      {isFrozen && (
        <div
          style={{
            padding: 12,
            background: 'color-mix(in srgb, var(--warning) 12%, transparent)',
            border: '1px solid color-mix(in srgb, var(--warning) 25%, transparent)',
            borderRadius: 'var(--radius-md)',
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Clock size={16} color="var(--warning)" />
          <span style={{ fontSize: 13, color: 'var(--warning)', fontWeight: 500 }}>
            Funds frozen until {timeAgo(anomaly.freezeUntil)}
          </span>
        </div>
      )}

      {/* Anomaly Details */}
      <div className="card" style={{ padding: 24, marginBottom: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>Anomaly Details</h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
              Anomaly Type
            </label>
            <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>{anomaly.anomalyType}</div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
              Severity
            </label>
            <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>{anomaly.severity}</div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
              Status
            </label>
            <StatusBadge status={anomaly.status} type="anomaly" />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
              Flagged By
            </label>
            <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>{anomaly.flaggedBy}</div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
              Flagged At
            </label>
            <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>{timeAgo(anomaly.flaggedAt)}</div>
          </div>

          {anomaly.tender && (
            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
                Tender
              </label>
              <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>{anomaly.tender.title}</div>
            </div>
          )}

          {anomaly.entity && (
            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
                Entity
              </label>
              <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>
                {anomaly.entity.name || anomaly.entity.organization}
              </div>
            </div>
          )}
        </div>

        <div style={{ marginTop: 16 }}>
          <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
            Description
          </label>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            {anomaly.description}
          </p>
        </div>
      </div>

      {/* Review Actions */}
      <div className="card" style={{ padding: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Review Decision</h3>

        {anomaly.status === 'pending' ? (
          <>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
              Review the anomaly details above and make your decision. Approving will release the frozen funds, while rejecting will slash the contractor.
            </p>

            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
              Review notes (optional)
            </label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="input"
              rows={3}
              placeholder="Add context for your decision…"
              style={{ width: '100%', marginBottom: 16, resize: 'vertical' }}
            />

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => setShowApproveConfirm(true)}
                disabled={!canReview}
                className="btn btn-primary"
                style={{ padding: '12px 24px', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <CheckCircle size={16} />
                Approve
              </button>
              <button
                onClick={() => setShowRejectConfirm(true)}
                disabled={!canReview}
                className="btn btn-danger"
                style={{ padding: '12px 24px', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <XCircle size={16} />
                Reject
              </button>
            </div>
          </>
        ) : anomaly.status === 'approved' ? (
          <div
            style={{
              padding: 16,
              background: 'color-mix(in srgb, var(--success) 12%, transparent)',
              border: '1px solid color-mix(in srgb, var(--success) 25%, transparent)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <CheckCircle size={16} color="var(--success)" />
            <span style={{ fontSize: 13, color: 'var(--success)', fontWeight: 500 }}>
              Anomaly approved - funds released
            </span>
          </div>
        ) : anomaly.status === 'rejected' ? (
          <div
            style={{
              padding: 16,
              background: 'color-mix(in srgb, var(--danger) 12%, transparent)',
              border: '1px solid color-mix(in srgb, var(--danger) 25%, transparent)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <XCircle size={16} color="var(--danger)" />
            <span style={{ fontSize: 13, color: 'var(--danger)', fontWeight: 500 }}>
              Anomaly rejected - contractor slashed
            </span>
          </div>
        ) : (
          <div
            style={{
              padding: 16,
              background: 'color-mix(in srgb, var(--text-muted) 12%, transparent)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Anomaly already reviewed
            </span>
          </div>
        )}
      </div>

      {/* Approve Confirmation */}
      <ConfirmModal
        isOpen={showApproveConfirm}
        title="Approve Anomaly"
        message="Are you sure you want to approve this anomaly? This will release the frozen funds."
        confirmLabel="Approve"
        onCancel={() => setShowApproveConfirm(false)}
        onConfirm={handleApprove}
      />

      {/* Reject Confirmation */}
      <ConfirmModal
        isOpen={showRejectConfirm}
        title="Reject Anomaly"
        message="Are you sure you want to reject this anomaly? This will slash the contractor's stake."
        confirmLabel="Reject"
        onCancel={() => setShowRejectConfirm(false)}
        onConfirm={handleReject}
      />
    </div>
  )
}
