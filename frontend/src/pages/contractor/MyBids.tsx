import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText } from 'lucide-react'
import { contractorAPI } from '../../lib/api'
import { formatINR } from '../../lib/format'
import { DataTable, FilterBar, StatusBadge } from '../../components/ui'
import type { Column, FilterConfig } from '../../components/ui'
import { toast } from 'sonner'

interface Bid {
  id: string
  tender: string
  amount: number
  score: number
  status: string
  stake: string
  stakeStatus: string
}

export default function MyBids() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [bids, setBids] = useState<Bid[]>([])
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 })
  const [filters, setFilters] = useState<Record<string, any>>({})

  const filterConfigs: FilterConfig[] = [
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Won', value: 'won' },
        { label: 'Lost', value: 'lost' },
        { label: 'Withdrawn', value: 'withdrawn' },
      ],
    },
  ]

  useEffect(() => {
    loadBids()
  }, [pagination.page, filters])

  const loadBids = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: String(pagination.page),
        limit: String(pagination.pageSize),
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== '')),
      })

      const data = await contractorAPI.getBids(params)
      setBids(data.bids || [])
      setPagination((prev) => ({
        ...prev,
        total: data.pagination?.total || 0,
      }))
    } catch (error: any) {
      console.error('Failed to load bids:', error)
      toast.error(error.message || 'Failed to load bids')
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (newFilters: Record<string, any>) => {
    setFilters(newFilters)
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  const handleViewTender = (tenderId: string) => {
    navigate(`/contractor/tenders/${tenderId}`)
  }

  const columns: Column<Bid>[] = [
    {
      key: 'id',
      label: 'ID',
      render: (value) => <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{value}</span>,
    },
    {
      key: 'tender',
      label: 'Tender',
      render: (value) => (
        <button
          onClick={() => handleViewTender(value)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--gov)',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 500,
            textDecoration: 'underline',
          }}
        >
          {value}
        </button>
      ),
    },
    {
      key: 'amount',
      label: 'Amount',
      render: (value) => formatINR(value),
    },
    {
      key: 'score',
      label: 'Score',
      render: (value) => <span style={{ fontSize: 13 }}>{value}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => <StatusBadge status={value} type="bid" size="sm" />,
    },
    {
      key: 'stake',
      label: 'Stake',
      render: (value) => <span style={{ fontSize: 13 }}>{value}</span>,
    },
    {
      key: 'stakeStatus',
      label: 'Stake Status',
      render: (value) => (
        <span
          style={{
            fontSize: 12,
            color: value === 'claimable' ? 'var(--success)' : 'var(--text-muted)',
          }}
        >
          {value}
        </span>
      ),
    },
  ]

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
        <FileText size={20} color="var(--contractor)" />
        <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }}>My Bids</h1>
      </div>

      <FilterBar
        filters={filterConfigs}
        values={filters}
        onChange={handleFilterChange}
        onClear={() => setFilters({})}
      />

      <DataTable
        columns={columns}
        data={bids}
        loading={loading}
        pagination={{
          ...pagination,
          onPageChange: (page) => setPagination((prev) => ({ ...prev, page })),
        }}
        emptyMessage="No bids submitted yet"
      />
    </div>
  )
}
