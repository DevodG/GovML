import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Users, ArrowLeft, Star, CheckCircle, XCircle, ShieldCheck, FileText, Award } from 'lucide-react'
import { publicAPI } from '../../lib/api'
import { truncateAddress } from '../../lib/format'
import { LoadingState } from '../../components/ui'
import { toast } from 'sonner'

interface ContractorData {
  name: string
  organization: string
  reputationScore: number
  completedProjects: number
  kycVerified: boolean
  walletAddress?: string
  gstNumber?: string
}

export default function ContractorProfile() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [contractor, setContractor] = useState<ContractorData | null>(null)

  useEffect(() => {
    if (id) loadContractor()
  }, [id])

  const loadContractor = async () => {
    try {
      setLoading(true)
      const data = await publicAPI.getContractor(id!)
      setContractor(data.contractor)
    } catch (error: any) {
      console.error('Failed to load contractor:', error)
      toast.error(error.message || 'Failed to load contractor profile')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <LoadingState type="card" />

  if (!contractor) {
    return (
      <div className="animate-fade-in" style={{ textAlign: 'center', padding: 60 }}>
        <Users size={40} color="var(--text-muted)" />
        <h2 style={{ fontSize: 18, fontWeight: 600, marginTop: 16, color: 'var(--text-primary)' }}>Contractor Not Found</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 8 }}>The contractor profile you're looking for doesn't exist.</p>
        <button onClick={() => navigate('/public/contractors')} className="btn btn-ghost" style={{ marginTop: 16 }}>
          <ArrowLeft size={14} /> Back to Search
        </button>
      </div>
    )
  }

  const rating = (contractor.reputationScore / 20).toFixed(1)

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <button onClick={() => navigate('/public/contractors')} className="btn btn-ghost" style={{ padding: '6px 10px' }}>
          <ArrowLeft size={16} />
        </button>
        <Users size={20} color="var(--public)" />
        <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }}>Contractor Profile</h1>
      </div>

      {/* Profile Card */}
      <div className="card" style={{ padding: 28, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 'var(--radius-lg)',
            background: 'color-mix(in srgb, var(--contractor) 12%, transparent)',
            border: '1px solid color-mix(in srgb, var(--contractor) 25%, transparent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Users size={28} color="var(--contractor)" />
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{contractor.name || contractor.organization}</h2>
            {contractor.organization && contractor.name && (
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>{contractor.organization}</p>
            )}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <span className={contractor.kycVerified ? 'badge badge-success' : 'badge badge-warning'}>
                {contractor.kycVerified ? <><CheckCircle size={10} /> ZKP Verified</> : <><XCircle size={10} /> Unverified</>}
              </span>
              {contractor.walletAddress && (
                <span className="badge badge-contractor" style={{ fontFamily: 'var(--font-mono)' }}>
                  {truncateAddress(contractor.walletAddress)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 20 }}>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <Star size={14} color="var(--warning)" />
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>Rating</span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{rating}<span style={{ fontSize: 14, color: 'var(--text-muted)' }}>/5</span></div>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <FileText size={14} color="var(--gov)" />
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>Projects</span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{contractor.completedProjects || 0}</div>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <Award size={14} color="var(--contractor)" />
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>Reputation</span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{contractor.reputationScore || 0}<span style={{ fontSize: 14, color: 'var(--text-muted)' }}>/100</span></div>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <ShieldCheck size={14} color="var(--success)" />
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>KYC Status</span>
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: contractor.kycVerified ? 'var(--success)' : 'var(--text-muted)' }}>
            {contractor.kycVerified ? 'Verified' : 'Pending'}
          </div>
        </div>
      </div>

      {/* GST Info */}
      {contractor.gstNumber && (
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Registration Details</h3>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <div>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>GST Number</span>
              <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)' }}>{contractor.gstNumber}</span>
            </div>
            {contractor.walletAddress && (
              <div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Wallet Address</span>
                <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)' }}>{contractor.walletAddress}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
