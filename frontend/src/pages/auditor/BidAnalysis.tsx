import { useState, useEffect } from 'react'
import { Search } from 'lucide-react'
import { auditorAPI } from '../../lib/api'
import { formatINR } from '../../lib/format'
import { DataTable } from '../../components/ui'
import type { Column } from '../../components/ui'
import { toast } from 'sonner'

interface BidAnalysis {
  id: string
  contractor: string
  wallet: string
  amount: number
  score: number
  fraud: string
  zkp: boolean
  rank: number
}

export default function BidAnalysis() {
  const [loading, setLoading] = useState(true)
  const [bids, setBids] = useState<BidAnalysis[]>([])
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 })

  useEffect(() => {
    loadBids()
  }, [pagination.page])

  const loadBids = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: String(pagination.page),
        limit: String(pagination.pageSize),
      })

      const data = await auditorAPI.getBids(params)
      setBids(data.bids || [])
      setPagination((prev) => ({
        ...prev,
        total: data.pagination?.total || 0,
      }))
    } catch (error: any) {
      console.error('Failed to load bid analysis:', error)
      toast.error(error.message || 'Failed to load bid analysis')
    } finally {
      setLoading(false)
    }
  }

  const getFraudColor = (fraud: string) => {
    switch (fraud) {
      case 'high':
        return 'var(--danger)'
      case 'medium':
        return 'var(--warning)'
      case 'clean':
        return 'var(--success)'
      default:
        return 'var(--text-muted)'
    }
  }

  const columns: Column<BidAnalysis>[] = [
    {
      key: 'id',
      label: 'ID',
      render: (value) => <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{value}</span>,
    },
    {
      key: 'contractor',
      label: 'Contractor',
      render: (value) => <span style={{ fontSize: 13 }}>{value}</span>,
    },
    {
      key: 'wallet',
      label: 'Wallet',
      render: (value) => <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{value}</span>,
    },
    {
      key: 'amount',
      label: 'Amount',
      render: (value) => formatINR(value),
    },
    {
      key: 'score',
      label: 'Score',
      render: (value) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 24, height: 24, borderRadius: '50%', background: value >= 80 ? 'color-mix(in srgb, var(--success) 12%, transparent)' : 'color-mix(in srgb, var(--warning) 12%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: value >= 80 ? 'var(--success)' : 'var(--text-primary)' }}>
            {value}
          </div>
        </div>
      ),
    },
    {
      key: 'fraud',
      label: 'Fraud Risk',
      render: (value) => (
        <span style={{ fontSize: 12, color: getFraudColor(value), fontWeight: 600, textTransform: 'uppercase' }}>
          {value}
        </span>
      ),
    },
    {
      key: 'zkp',
      label: 'ZKP',
      render: (value) => (
        <span style={{ fontSize: 12, color: value ? 'var(--success)' : 'var(--text-muted)' }}>
          {value ? '✓' : '✗'}
        </span>
      ),
    },
    {
      key: 'rank',
      label: 'Rank',
      render: (value) => (
        <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>#{value}</span>
      ),
    },
  ]

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
        <Search size={20} color="var(--auditor)" />
        <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }}>Bid Analysis</h1>
      </div>

      <DataTable
        columns={columns}
        data={bids}
        loading={loading}
        pagination={{
          ...pagination,
          onPageChange: (page) => setPagination((prev) => ({ ...prev, page })),
        }}
        emptyMessage="No bids found"
      />
    </div>
  )
}
