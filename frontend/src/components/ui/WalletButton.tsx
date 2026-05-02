import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { injected } from 'wagmi/connectors'
import { Wallet, LogOut } from 'lucide-react'
import { truncateAddress } from '../../lib/format'

interface WalletButtonProps {
  showAddress?: boolean
  variant?: 'default' | 'compact'
}

export function WalletButton({ showAddress = true, variant = 'default' }: WalletButtonProps) {
  const { address, isConnected } = useAccount()
  const { connect } = useConnect()
  const { disconnect } = useDisconnect()

  const handleConnect = () => {
    connect({ connector: injected() })
  }

  const handleDisconnect = () => {
    disconnect()
  }

  if (!isConnected) {
    return (
      <button
        onClick={handleConnect}
        className="btn btn-primary"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: variant === 'compact' ? '8px 16px' : '10px 20px',
          fontSize: variant === 'compact' ? 13 : 14,
        }}
      >
        <Wallet size={variant === 'compact' ? 14 : 16} />
        Connect Wallet
      </button>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}
    >
      {showAddress && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 12px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-full)',
          }}
        >
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)' }} />
          <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
            {truncateAddress(address)}
          </span>
        </div>
      )}
      <button
        onClick={handleDisconnect}
        className="btn btn-ghost"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: variant === 'compact' ? '8px 12px' : '8px 16px',
          fontSize: 13,
        }}
        title="Disconnect wallet"
      >
        <LogOut size={14} />
        {variant === 'default' && 'Disconnect'}
      </button>
    </div>
  )
}
