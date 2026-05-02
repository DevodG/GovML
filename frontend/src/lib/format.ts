export function truncateAddress(addr?: string): string {
  if (!addr) return '—'
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

export function formatETH(wei: bigint | number): string {
  const val = typeof wei === 'bigint' ? Number(wei) / 1e18 : wei / 1e18
  return val.toLocaleString('en-IN', { maximumFractionDigits: 4 }) + ' ETH'
}

export function formatINR(amount: number): string {
  if (amount >= 1e7) return `₹${(amount / 1e7).toFixed(1)} Cr`
  if (amount >= 1e5) return `₹${(amount / 1e5).toFixed(1)} L`
  return `₹${amount.toLocaleString('en-IN')}`
}

export function timeAgo(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}
