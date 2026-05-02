import { CheckCircle, Clock, AlertTriangle, XCircle, PauseCircle } from 'lucide-react'

export type StatusType = 'tender' | 'bid' | 'milestone' | 'anomaly' | 'contractor'

interface StatusBadgeProps {
  status: string
  type?: StatusType
  size?: 'sm' | 'md' | 'lg'
}

type StatusEntry = { color: string; icon: typeof Clock; label: string }

const tenderStatusConfig: Record<string, StatusEntry> = {
  draft: { color: 'var(--text-muted)', icon: Clock, label: 'Draft' },
  open: { color: 'var(--success)', icon: CheckCircle, label: 'Open' },
  closed: { color: 'var(--warning)', icon: Clock, label: 'Closed' },
  allotted: { color: 'var(--gov)', icon: CheckCircle, label: 'Allotted' },
  completed: { color: 'var(--success)', icon: CheckCircle, label: 'Completed' },
  disputed: { color: 'var(--danger)', icon: AlertTriangle, label: 'Disputed' },
  cancelled: { color: 'var(--text-muted)', icon: XCircle, label: 'Cancelled' },
}

const bidStatusConfig: Record<string, StatusEntry> = {
  pending: { color: 'var(--warning)', icon: Clock, label: 'Pending' },
  won: { color: 'var(--success)', icon: CheckCircle, label: 'Won' },
  lost: { color: 'var(--text-muted)', icon: XCircle, label: 'Lost' },
  withdrawn: { color: 'var(--text-muted)', icon: XCircle, label: 'Withdrawn' },
  flagged: { color: 'var(--danger)', icon: AlertTriangle, label: 'Flagged' },
}

const milestoneStatusConfig: Record<string, StatusEntry> = {
  submitted: { color: 'var(--warning)', icon: Clock, label: 'Submitted' },
  approved: { color: 'var(--success)', icon: CheckCircle, label: 'Approved' },
  redistributed: { color: 'var(--danger)', icon: AlertTriangle, label: 'Redistributed' },
}

const anomalyStatusConfig: Record<string, StatusEntry> = {
  pending_review: { color: 'var(--warning)', icon: Clock, label: 'Pending Review' },
  approved: { color: 'var(--success)', icon: CheckCircle, label: 'Approved' },
  rejected: { color: 'var(--danger)', icon: XCircle, label: 'Rejected' },
  resolved: { color: 'var(--success)', icon: CheckCircle, label: 'Resolved' },
}

const contractorStatusConfig: Record<string, StatusEntry> = {
  active: { color: 'var(--success)', icon: CheckCircle, label: 'Active' },
  frozen: { color: 'var(--danger)', icon: XCircle, label: 'Frozen' },
  suspended: { color: 'var(--warning)', icon: PauseCircle, label: 'Suspended' },
}

const statusConfigByType: Record<StatusType, Record<string, StatusEntry>> = {
  tender: tenderStatusConfig,
  bid: bidStatusConfig,
  milestone: milestoneStatusConfig,
  anomaly: anomalyStatusConfig,
  contractor: contractorStatusConfig,
}

const sizeStyles = {
  sm: { padding: '2px 6px', fontSize: '10px', gap: 3 },
  md: { padding: '4px 10px', fontSize: '11px', gap: 4 },
  lg: { padding: '6px 12px', fontSize: '12px', gap: 5 },
}

export function StatusBadge({ status, type = 'tender', size = 'md' }: StatusBadgeProps) {
  const normalizedStatus = status.toLowerCase().replace(/ /g, '_')
  const map = statusConfigByType[type]
  const config = map[normalizedStatus] || {
    color: 'var(--text-muted)',
    icon: Clock,
    label: status,
  }

  const Icon = config.icon
  const styles = sizeStyles[size]

  return (
    <div
      className="badge"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: styles.gap,
        padding: styles.padding,
        borderRadius: 'var(--radius-full)',
        fontSize: styles.fontSize,
        fontWeight: 600,
        letterSpacing: '0.02em',
        background: `color-mix(in srgb, ${config.color} 12%, transparent)`,
        color: config.color,
        border: `1px solid color-mix(in srgb, ${config.color} 25%, transparent)`,
      }}
    >
      <Icon size={size === 'sm' ? 12 : size === 'md' ? 14 : 16} />
      <span>{config.label}</span>
    </div>
  )
}
