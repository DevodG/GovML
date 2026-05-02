import { useState, useEffect } from 'react'
import { Shield, CheckCircle, Clock } from 'lucide-react'
import { auditorAPI } from '../../lib/api'
import { formatINR, timeAgo } from '../../lib/format'
import { LoadingState } from '../../components/ui'
import { toast } from 'sonner'

interface Milestone {
  id: string
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
  gps: string
  deadline: string
  signers: Array<{
    name: string
    signed: boolean
  }>
}

export default function OracleSign() {
  const [loading, setLoading] = useState(true)
  const [milestones] = useState<Milestone[]>([])

  useEffect(() => {
    loadMilestones()
  }, [])

  const loadMilestones = async () => {
    try {
      setLoading(true)
      // Load milestones awaiting oracle signature
      // This would be a new endpoint, for now we'll use placeholder
      // const data = await auditorAPI.getOracleMilestones()
      // setMilestones(data.milestones || [])
    } catch (error: any) {
      console.error('Failed to load milestones:', error)
      toast.error(error.message || 'Failed to load milestones')
    } finally {
      setLoading(false)
    }
  }

  const handleSign = async (milestoneId: string) => {
    try {
      await auditorAPI.oracleSign(milestoneId)
      toast.success('Signed as oracle successfully')
      loadMilestones()
    } catch (error: any) {
      console.error('Failed to sign milestone:', error)
      toast.error(error.message || 'Failed to sign milestone')
    }
  }

  if (loading) {
    return <LoadingState type="card" />
  }

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
        <Shield size={20} color="var(--auditor)" />
        <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }}>Oracle Sign</h1>
      </div>

      {milestones.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)' }}>No milestones awaiting oracle signature</p>
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
                  <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                    {formatINR(milestone.amount)}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {timeAgo(milestone.deadline)}
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
                    Contractor
                  </label>
                  <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{milestone.contractor.name}</div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
                  Organization
                  </label>
                  <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{milestone.contractor.organization}</div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
                    GPS
                  </label>
                  <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                    {milestone.gps || 'N/A'}
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
                    IPFS
                  </label>
                  <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                    {milestone.ipfsHash || 'N/A'}
                  </div>
                </div>
              </div>

              <div style={{ padding: 12, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
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
                        background: signer.signed
                          ? 'color-mix(in srgb, var(--success) 12%, transparent)'
                          : 'var(--bg-elevated)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                      }}
                    >
                      {signer.signed ? <CheckCircle size={12} color="var(--success)" /> : <Clock size={12} color="var(--text-muted)" />}
                      <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{signer.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {milestone.signers.length} / 3 signatures
                </span>
                <button
                  onClick={() => handleSign(milestone.id)}
                  className="btn btn-primary"
                  style={{ padding: '8px 16px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <Shield size={14} />
                  Sign
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
