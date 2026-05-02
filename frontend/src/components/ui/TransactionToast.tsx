import { useEffect } from 'react'
import { ExternalLink, Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import type { TransactionStatus } from '../../lib/contracts'
import { getBlockExplorerUrl } from '../../lib/contracts'

interface TransactionToastProps {
  hash: string
  status: TransactionStatus
  description?: string
  error?: string
}

export function TransactionToast({ hash, status, description, error }: TransactionToastProps) {
  useEffect(() => {
    if (status === 'pending') {
      toast.loading(description || 'Transaction pending...', { id: hash })
    } else if (status === 'confirmed') {
      toast.success(description || 'Transaction confirmed!', {
        id: hash,
        action: {
          label: 'View',
          onClick: () => window.open(getBlockExplorerUrl(hash), '_blank'),
        },
      })
    } else if (status === 'failed') {
      toast.error(error || 'Transaction failed', { id: hash })
    }
  }, [hash, status, description, error])

  return null
}

// Helper to show transaction toast
export function showTransactionToast(
  hash: string,
  status: TransactionStatus,
  description?: string,
  error?: string
) {
  if (status === 'pending') {
    return toast.loading(description || 'Transaction pending...', { id: hash })
  } else if (status === 'confirmed') {
    return toast.success(description || 'Transaction confirmed!', {
      id: hash,
      action: {
        label: 'View',
        onClick: () => window.open(getBlockExplorerUrl(hash), '_blank'),
      },
    })
  } else if (status === 'failed') {
    return toast.error(error || 'Transaction failed', { id: hash })
  }

  return null
}

// Transaction status icon component
export function TransactionStatusIcon({ status, size = 16 }: { status: TransactionStatus; size?: number }) {
  switch (status) {
    case 'pending':
      return <Loader2 size={size} className="animate-spin" />
    case 'confirmed':
      return <CheckCircle size={size} color="var(--success)" />
    case 'failed':
      return <XCircle size={size} color="var(--danger)" />
    default:
      return <AlertTriangle size={size} color="var(--warning)" />
  }
}

// Transaction link component
export function TransactionLink({ hash, label = 'View Transaction' }: { hash: string; label?: string }) {
  return (
    <a
      href={getBlockExplorerUrl(hash)}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        color: 'var(--gov)',
        textDecoration: 'none',
        fontSize: 12,
        fontWeight: 500,
      }}
    >
      <ExternalLink size={12} />
      {label}
    </a>
  )
}
