import { useState, useEffect } from 'react'
import { ShieldCheck, Upload, CheckCircle, Clock } from 'lucide-react'
import { bountyAPI } from '../../lib/api'
import { LoadingState, ConfirmModal } from '../../components/ui'
import { toast } from 'sonner'

const AUTH_TOKEN_KEY = 'govchain_token'

function hasAuthToken(): boolean {
  if (typeof window === 'undefined') return false
  return Boolean(localStorage.getItem(AUTH_TOKEN_KEY))
}

function tenderLabel(tender: unknown): string {
  if (tender && typeof tender === 'object' && 'title' in tender) {
    return String((tender as { title?: string }).title ?? '')
  }
  return String(tender ?? '')
}

export default function BountyHunter() {
  const [loading, setLoading] = useState(true)
  const [isRegistered, setIsRegistered] = useState(false)
  const [stakeAmount, setStakeAmount] = useState('0.01')
  const [assignments, setAssignments] = useState<
    Array<{ id: string; tender?: unknown; milestone?: string; amount?: number }>
  >([])
  const [showRegister, setShowRegister] = useState(false)
  const signedIn = hasAuthToken()

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      setLoading(true)
      try {
        await checkRegistration()
        if (!hasAuthToken()) {
          if (!cancelled) setAssignments([])
          return
        }
        const data = await bountyAPI.getAssignments()
        if (!cancelled) setAssignments(data.assignments || [])
      } catch {
        if (!cancelled) setAssignments([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [])

  const checkRegistration = async () => {
    try {
      setIsRegistered(false)
    } catch (error) {
      console.error('Failed to check registration:', error)
    }
  }

  const handleRegister = async () => {
    if (!hasAuthToken()) {
      toast.info('Sign in with an account that has a JWT (e.g. via your app login) to register.')
      setShowRegister(false)
      return
    }
    try {
      await bountyAPI.register(parseFloat(stakeAmount))
      setIsRegistered(true)
      setShowRegister(false)
      toast.success('Registered as bounty hunter successfully!')
    } catch (error: unknown) {
      console.error('Failed to register:', error)
      const msg = error instanceof Error ? error.message : 'Failed to register'
      toast.error(msg)
    }
  }

  if (loading) {
    return <LoadingState type="card" />
  }

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
        <ShieldCheck size={20} color="var(--public)" />
        <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }}>Bounty Hunter</h1>
      </div>

      {!signedIn && (
        <div
          className="card"
          style={{
            padding: 16,
            marginBottom: 20,
            border: '1px solid color-mix(in srgb, var(--public) 25%, transparent)',
            background: 'color-mix(in srgb, var(--public) 08%, transparent)',
          }}
        >
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.55 }}>
            <strong style={{ color: 'var(--text-primary)' }}>Browse in demo mode.</strong> To register or load assignments you need an API session token (
            <code style={{ fontSize: 11 }}>{AUTH_TOKEN_KEY}</code>
            ). Use your app&apos;s login flow when wired, or continue exploring the rest of the public portal.
          </p>
        </div>
      )}

      {/* Registration Status */}
      {isRegistered ? (
        <div
          style={{
            padding: 16,
            background: 'color-mix(in srgb, var(--success) 12%, transparent)',
            border: '1px solid color-mix(in srgb, var(--success) 25%, transparent)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 24,
          }}
        >
          <CheckCircle size={16} color="var(--success)" />
          <span style={{ fontSize: 13, color: 'var(--success)', fontWeight: 500 }}>Registered as Bounty Hunter</span>
        </div>
      ) : (
        <div
          style={{
            padding: 16,
            background: 'color-mix(in srgb, var(--warning) 12%, transparent)',
            border: '1px solid color-mix(in srgb, var(--warning) 25%, transparent)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 24,
          }}
        >
          <Clock size={16} color="var(--warning)" />
          <span style={{ fontSize: 13, color: 'var(--warning)', fontWeight: 500 }}>Not Registered</span>
        </div>
      )}

      {/* Registration Form */}
      {!isRegistered && (
        <div className="card" style={{ padding: 24, marginBottom: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>Register as Bounty Hunter</h3>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Stake Amount (ETH)</label>
            <input
              type="number"
              value={stakeAmount}
              onChange={(e) => setStakeAmount(e.target.value)}
              className="input"
              placeholder="0.01"
              step="0.01"
              min="0.01"
              disabled={!signedIn}
              style={{ fontSize: 14, opacity: signedIn ? 1 : 0.6 }}
            />
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Minimum stake: 0.01 ETH</p>
          </div>

          <button
            type="button"
            onClick={() => (signedIn ? setShowRegister(true) : toast.info('Sign in to register as a bounty hunter.'))}
            disabled={!signedIn}
            title={!signedIn ? 'Sign in required to register' : undefined}
            className="btn btn-primary"
            style={{
              padding: '12px 24px',
              fontSize: 14,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              width: 'fit-content',
              opacity: signedIn ? 1 : 0.55,
              cursor: signedIn ? 'pointer' : 'not-allowed',
            }}
          >
            <Upload size={16} />
            Register (stake ETH)
          </button>
        </div>
      )}

      {/* Active Assignments */}
      {signedIn && assignments.length > 0 && (
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>Active Assignments</h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {assignments.map((assignment) => (
              <div
                key={assignment.id}
                style={{
                  padding: 16,
                  background: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4 }}>
                  {tenderLabel(assignment.tender)}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{assignment.milestone}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{assignment.amount != null ? String(assignment.amount) : ''}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {signedIn && assignments.length === 0 && (
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Active Assignments</h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>No active assignments right now.</p>
        </div>
      )}

      {/* Register Modal */}
      <ConfirmModal
        isOpen={showRegister}
        title="Register as Bounty Hunter"
        message={`Registering requires staking ${stakeAmount} ETH as collateral. You will be randomly assigned to review milestones and earn rewards for accurate reviews.`}
        confirmLabel="Register"
        onCancel={() => setShowRegister(false)}
        onConfirm={handleRegister}
      />
    </div>
  )
}
