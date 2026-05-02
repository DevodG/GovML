import { useState, useEffect, type CSSProperties } from 'react'
import { ShieldCheck, Upload, Award } from 'lucide-react'
import { bountyAPI } from '../../lib/api'
import { formatETH } from '../../lib/format'
import { LoadingState, ConfirmModal } from '../../components/ui'
import { toast } from 'sonner'

const AUTH_TOKEN_KEY = 'govchain_token'
const DEFAULT_STAKE_ETH = 0.01

function hasAuthToken(): boolean {
  if (typeof window === 'undefined') return false
  return Boolean(localStorage.getItem(AUTH_TOKEN_KEY))
}

function earningsLabel(eth: number): string {
  const n = Number(eth) || 0
  try {
    return formatETH(BigInt(Math.round(n * 1e18)))
  } catch {
    return `${n.toFixed(4)} ETH`
  }
}

interface LeaderboardEntry {
  rank: number
  name: string
  reputation: number
  completedReviews: number
  earnings: number
}

function rankPillStyle(rank: number): CSSProperties {
  if (rank === 1) {
    return {
      background: 'color-mix(in srgb, var(--warning) 18%, transparent)',
      border: '1px solid color-mix(in srgb, var(--warning) 45%, transparent)',
    }
  }
  if (rank === 2) {
    return {
      background: 'color-mix(in srgb, var(--text-muted) 14%, transparent)',
      border: '1px solid color-mix(in srgb, var(--text-muted) 35%, transparent)',
    }
  }
  if (rank === 3) {
    return {
      background: 'color-mix(in srgb, var(--contractor) 14%, transparent)',
      border: '1px solid color-mix(in srgb, var(--contractor) 35%, transparent)',
    }
  }
  return {
    background: 'color-mix(in srgb, var(--public) 12%, transparent)',
    border: '1px solid color-mix(in srgb, var(--public) 25%, transparent)',
  }
}

export default function Leaderboard() {
  const [loading, setLoading] = useState(true)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [showRegister, setShowRegister] = useState(false)
  const signedIn = hasAuthToken()

  useEffect(() => {
    loadLeaderboard()
  }, [])

  const loadLeaderboard = async () => {
    try {
      setLoading(true)
      const data = await bountyAPI.getLeaderboard()
      setLeaderboard(data.leaderboard || [])
    } catch (error: unknown) {
      console.error('Failed to load leaderboard:', error)
      // Only show error for actual failures, not empty data
      const msg = error instanceof Error ? error.message : ''
      if (msg && !msg.includes('404') && !msg.includes('not found')) {
        toast.error('Unable to connect to server. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async () => {
    if (!hasAuthToken()) {
      toast.info('Sign in to register as a bounty hunter.')
      setShowRegister(false)
      return
    }
    try {
      await bountyAPI.register(DEFAULT_STAKE_ETH)
      toast.success('Registered as bounty hunter successfully!')
      setShowRegister(false)
      loadLeaderboard()
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
        <Award size={20} color="var(--public)" />
        <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }}>Bounty Hunter Leaderboard</h1>
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
            <strong style={{ color: 'var(--text-primary)' }}>Leaderboard is public.</strong> Registering still requires an authenticated session (
            <code style={{ fontSize: 11 }}>{AUTH_TOKEN_KEY}</code>
            ). Connect your login flow when ready.
          </p>
        </div>
      )}

      {/* Register CTA */}
      <div className="card" style={{ padding: 24, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <ShieldCheck size={24} color="var(--public)" />
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Become a Bounty Hunter</h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Register with ETH stake to review milestones and earn rewards
            </p>
          </div>
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
          Register ({DEFAULT_STAKE_ETH} ETH)
        </button>
      </div>

      {/* Leaderboard */}
      <div className="card" style={{ padding: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>Top Hunters</h3>

        {leaderboard.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No bounty hunters registered yet</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {leaderboard.map((entry) => (
              <div
                key={`${entry.rank}-${entry.name}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  padding: 16,
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
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 16,
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    ...rankPillStyle(entry.rank),
                  }}
                >
                  {entry.rank}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4 }}>{entry.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
                    {entry.reputation} reputation · {entry.completedReviews} reviews
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--success)', fontWeight: 600 }}>Earnings: {earningsLabel(entry.earnings)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Register Modal */}
      <ConfirmModal
        isOpen={showRegister}
        title="Register as Bounty Hunter"
        message={`Registering requires staking ${DEFAULT_STAKE_ETH} ETH as collateral. You will be randomly assigned to review milestones and earn rewards for accurate reviews.`}
        confirmLabel="Register"
        onCancel={() => setShowRegister(false)}
        onConfirm={handleRegister}
      />
    </div>
  )
}
