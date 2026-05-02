import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Star } from 'lucide-react'
import { publicAPI } from '../../lib/api'
import { truncateAddress } from '../../lib/format'
import { DataTable, FilterBar } from '../../components/ui'
import type { Column } from '../../components/ui'
import { toast } from 'sonner'

interface Contractor {
  id: string
  displayId?: string
  name: string
  gst: string
  rating: string
  projects: number
  zkp: boolean
  wallet: string
  completionRate: number
  flagged: boolean
}

export default function Contractors() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [contractors, setContractors] = useState<Contractor[]>([])
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 })
  const [filters, setFilters] = useState<Record<string, any>>({})

  useEffect(() => {
    loadContractors()
  }, [pagination.page, filters])

  const loadContractors = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: String(pagination.page),
        limit: String(pagination.pageSize),
      })
      const q = String(filters.search ?? filters.q ?? '')
        .trim()
      if (q) params.set('q', q)

      const data = await publicAPI.getContractors(params)
      setContractors(data.contractors || [])
      setPagination((prev) => ({
        ...prev,
        total: data.pagination?.total || 0,
      }))
    } catch (error: any) {
      console.error('Failed to load contractors:', error)
      // Only show error for actual failures, not empty results
      if (error.message && !error.message.includes('404')) {
        toast.error('Unable to connect to server. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (newFilters: Record<string, any>) => {
    setFilters(newFilters)
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  const handleView = (contractor: Contractor) => {
    navigate(`/public/contractors/${contractor.id}`)
  }

  const columns: Column<Contractor>[] = [
    {
      key: 'displayId',
      label: 'ID',
      render: (value, row) => (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
          {value || `C-${row.id.slice(-4)}`}
        </span>
      ),
    },
    {
      key: 'name',
      label: 'Name',
      render: (value) => <span style={{ fontWeight: 500 }}>{value}</span>,
    },
    {
      key: 'gst',
      label: 'GST',
      render: (value) => <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{value}</span>,
    },
    {
      key: 'wallet',
      label: 'Wallet',
      render: (value) => (
        <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
          {value && value !== 'N/A' ? truncateAddress(String(value)) : '—'}
        </span>
      ),
    },
    {
      key: 'rating',
      label: 'Rating',
      render: (value) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Star size={14} color="var(--warning)" />
          <span style={{ fontSize: 13 }}>{value}</span>
        </div>
      ),
    },
    {
      key: 'projects',
      label: 'Projects',
      render: (value) => <span style={{ fontSize: 13 }}>{value}</span>,
    },
    {
      key: 'zkp',
      label: 'ZKP',
      render: (value) => (
        <span
          style={{
            fontSize: 12,
            color: value ? 'var(--success)' : 'var(--text-muted)',
            fontWeight: 500,
          }}
        >
          {value ? '✓' : '✗'}
        </span>
      ),
    },
    {
      key: 'completionRate',
      label: 'Completion',
      render: (value) => (
        <span style={{ fontSize: 13 }}>{value}%</span>
      ),
    },
    {
      key: 'flagged',
      label: 'Status',
      render: (value) => (
        <span
          style={{
            fontSize: 12,
            color: value ? 'var(--danger)' : 'var(--text-muted)',
            fontWeight: 500,
          }}
        >
          {value ? 'Flagged' : 'Active'}
        </span>
      ),
    },
  ]

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
        <Users size={20} color="var(--public)" />
        <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }}>Contractor Search</h1>
      </div>

      <FilterBar filters={[]} values={filters} onChange={handleFilterChange} onClear={() => setFilters({})} />

      <DataTable
        columns={columns}
        data={contractors}
        loading={loading}
        pagination={{
          ...pagination,
          onPageChange: (page) => setPagination((prev) => ({ ...prev, page })),
        }}
        actions={(contractor) => [
          {
            label: 'View Profile',
            onClick: () => handleView(contractor),
            icon: <Users size={14} />,
          },
        ]}
        emptyMessage="No contractors found"
      />
    </div>
  )
}
