import { useState, useEffect } from 'react'
import { CheckCircle, Clock, FileText, MapPin, Calendar, Users } from 'lucide-react'
import { govAPI } from '../../lib/api'
import { formatINR, timeAgo } from '../../lib/format'
import { LoadingState } from '../../components/ui'
import { toast } from 'sonner'

interface Milestone {
  id: string
  tenderId: string
  tender: {
    title: string
    tenderId: string
  }
  name: string
  contractor: {
    name: string
    organization: string
  }
  amount: number
  ipfsHash: string
  gpsCoordinates: string
  deadline: string
  signers: Array<{
    name: string
    signed: boolean
  }>
}

export default function GovMilestones() {
  const [loading, setLoading] = useState(true)
  const [milestones, setMilestones] = useState<Milestone[]>([])

  useEffect(() => {
    loadMilestones()
  }, [])

  const loadMilestones = async () => {
    try {
      setLoading(true)
      const data = await govAPI.getPendingMilestones()
      setMilestones(data.milestones || [])
    } catch (error: any) {
      console.error('Failed to load milestones:', error)
      toast.error(error.message || 'Failed to load milestones')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (milestoneId: string) => {
    try {
      await govAPI.approveMilestone(milestoneId)
      toast.success('Milestone approved successfully')
      loadMilestones()
    } catch (error: any) {
      console.error('Failed to approve milestone:', error)
      toast.error(error.message || 'Failed to approve milestone')
    }
  }

  if (loading) {
    return <LoadingState type="card" count={3} />
  }

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
        <CheckCircle size={20} color="var(--gov)" />
        <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }}>Milestone Approvals</h1>
      </div>

      {milestones.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No pending milestones to review</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 16 }}>
          {milestones.map((milestone) => (
            <div key={milestone.id} className="card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                    {milestone.name}
                  </h3>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {milestone.tender.title}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                    {formatINR(milestone.amount)}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {milestone.tender.tenderId}
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Users size={14} color="var(--text-muted)" />
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{milestone.contractor.name}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Calendar size={14} color="var(--text-muted)" />
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{timeAgo(milestone.deadline)}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <MapPin size={14} color="var(--text-muted)" />
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                    {milestone.gpsCoordinates || 'N/A'}
                  </span>
                </div>
              </div>

              <div style={{ padding: 12, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Signatures</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {milestone.signers.map((signer, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '6px 10px',
                        background: signer.signed ? 'color-mix(in srgb, var(--success) 12%, transparent)' : 'var(--bg-elevated)',
                        border: `1px solid ${signer.signed ? 'var(--success)' : 'var(--border)'}`,
                        borderRadius: 'var(--radius-sm)',
                      }}
                    >
                      <div
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: '50%',
                          background: signer.signed ? 'var(--success)' : 'var(--text-muted)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {signer.signed ? <CheckCircle size={10} color="#fff" /> : <Clock size={10} color="var(--text-muted)" />}
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{signer.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => window.open(`https://ipfs.io/ipfs/${milestone.ipfsHash}`, '_blank')}
                  className="btn btn-ghost"
                  style={{ padding: '8px 16px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <FileText size={14} />
                  View Proof
                </button>
                <button
                  onClick={() => handleApprove(milestone.id)}
                  className="btn btn-primary"
                  style={{ padding: '8px 16px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <CheckCircle size={14} />
                  Approve
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
