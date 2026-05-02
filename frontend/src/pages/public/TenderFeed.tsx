import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { List, Eye } from 'lucide-react'
import { publicAPI } from '../../lib/api'
import { formatINR, timeAgo } from '../../lib/format'
import { DataTable, FilterBar, StatusBadge } from '../../components/ui'
import type { Column, FilterConfig } from '../../components/ui'
import { toast } from 'sonner'

interface Tender {
  id: string
  title: string
  category: string
  budget: number
  allocated: number
  utilised: number
  state: string
  status: string
  deadline: string
}

export default function TenderFeed() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [tenders, setTenders] = useState<Tender[]>([])
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 })
  const [filters, setFilters] = useState<Record<string, any>>({})

  const filterConfigs: FilterConfig[] = [
    {
      key: 'category',
      label: 'Category',
      type: 'select',
      options: [
        { label: 'Infrastructure', value: 'infrastructure' },
        { label: 'Technology', value: 'technology' },
        { label: 'Healthcare', value: 'healthcare' },
        { label: 'Education', value: 'education' },
        { label: 'Transportation', value: 'transportation' },
        { label: 'Other', value: 'other' },
      ],
    },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { label: 'Open', value: 'open' },
        { label: 'Closed', value: 'closed' },
        { label: 'Allotted', value: 'allotted' },
        { label: 'Completed', value: 'completed' },
      ],
    },
  ]

  useEffect(() => {
    loadTenders()
  }, [pagination.page, filters])

  const loadTenders = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: String(pagination.page),
        limit: String(pagination.pageSize),
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== '')),
      })

      const data = await publicAPI.getTenderFeed(params)
      setTenders(data.tenders || [])
      setPagination((prev) => ({
        ...prev,
        total: data.pagination?.total || 0,
      }))
    } catch (error: any) {
      console.error('Failed to load tenders:', error)
      // Only show error toast for actual network/server errors, not empty data
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

  const handleView = (tender: Tender) => {
    navigate(`/public/tenders/${tender.id}`)
  }

  const columns: Column<Tender>[] = [
    {
      key: 'id',
      label: 'ID',
      render: (value) => <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{value}</span>,
    },
    {
      key: 'title',
      label: 'Title',
      render: (value) => <span style={{ fontWeight: 500 }}>{value}</span>,
    },
    {
      key: 'category',
      label: 'Category',
      render: (value) => <span style={{ textTransform: 'capitalize', fontSize: 13 }}>{value}</span>,
    },
    {
      key: 'budget',
      label: 'Budget',
      render: (value) => formatINR(value),
    },
    {
      key: 'allocated',
      label: 'Allocated',
      render: (value) => formatINR(value),
    },
    {
      key: 'utilised',
      label: 'Utilised',
      render: (value) => formatINR(value),
    },
    {
      key: 'state',
      label: 'State',
      render: (value) => <span style={{ fontSize: 13 }}>{value || 'N/A'}</span>,
    },
    {
      key: 'deadline',
      label: 'Deadline',
      render: (value) => timeAgo(value),
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => <StatusBadge status={value} type="tender" size="sm" />,
    },
  ]

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
        <List size={20} color="var(--public)" />
        <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }}>Public Tender Feed</h1>
      </div>

      <div
        className="card"
        style={{
          padding: '14px 18px',
          marginBottom: 22,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 10,
          justifyContent: 'space-between',
        }}
      >
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, flex: '1 1 220px' }}>
          Live tenders, fund flows, and contractor transparency — all in one public portal.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <Link to="/public/map" className="btn btn-ghost" style={{ fontSize: 12, padding: '6px 12px' }}>
            Fund Map
          </Link>
          <Link to="/public/contractors" className="btn btn-ghost" style={{ fontSize: 12, padding: '6px 12px' }}>
            Contractors
          </Link>
          <Link to="/public/leaderboard" className="btn btn-ghost" style={{ fontSize: 12, padding: '6px 12px' }}>
            Leaderboard
          </Link>
        </div>
      </div>

      <FilterBar
        filters={filterConfigs}
        values={filters}
        onChange={handleFilterChange}
        onClear={() => setFilters({})}
      />

      <DataTable
        columns={columns}
        data={tenders}
        loading={loading}
        pagination={{
          ...pagination,
          onPageChange: (page) => setPagination((prev) => ({ ...prev, page })),
        }}
        actions={(tender) => [
          {
            label: 'View Details',
            onClick: () => handleView(tender),
            icon: <Eye size={14} />,
          },
        ]}
        emptyMessage="No tenders found"
      />
    </div>
  )
}
