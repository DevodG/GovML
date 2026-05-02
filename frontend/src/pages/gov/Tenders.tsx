import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, Clock, Filter } from 'lucide-react'
import { tenderAPI } from '../../lib/api'
import { formatINR, timeAgo } from '../../lib/format'
import { DataTable, FilterBar, StatusBadge } from '../../components/ui'
import type { Column, FilterConfig } from '../../components/ui'
import { toast } from 'sonner'

interface Tender {
  _id: string
  tenderId: string
  title: string
  category: string
  budget: number
  deadline: string
  status: string
  createdAt: string
}

export default function Tenders() {
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

      const data = await tenderAPI.getAll(params)
      setTenders(data.tenders || [])
      setPagination((prev) => ({
        ...prev,
        total: data.pagination?.total || 0,
      }))
    } catch (error: any) {
      console.error('Failed to load tenders:', error)
      toast.error(error.message || 'Failed to load tenders')
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (newFilters: Record<string, any>) => {
    setFilters(newFilters)
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  const handleView = (tender: Tender) => {
    navigate(`/gov/tenders/${tender._id}`)
  }

  const handleCloseBidding = async (tender: Tender) => {
    try {
      await tenderAPI.closeBids(tender._id)
      toast.success('Bidding closed successfully')
      loadTenders()
    } catch (error: any) {
      console.error('Failed to close bidding:', error)
      toast.error(error.message || 'Failed to close bidding')
    }
  }

  const columns: Column<Tender>[] = [
    {
      key: 'tenderId',
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
      key: 'deadline',
      label: 'Deadline',
      render: (value) => timeAgo(value),
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => <StatusBadge status={value} type="tender" size="sm" />,
    },
    {
      key: 'createdAt',
      label: 'Created',
      render: (value) => timeAgo(value),
    },
  ]

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
        <Filter size={20} color="var(--gov)" />
        <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }}>Tenders</h1>
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
            label: 'View',
            onClick: () => handleView(tender),
            icon: <Eye size={14} />,
          },
          ...(tender.status === 'open'
            ? [
                {
                  label: 'Close Bidding',
                  onClick: () => handleCloseBidding(tender),
                  icon: <Clock size={14} />,
                },
              ]
            : []),
        ]}
        emptyMessage="No tenders found"
      />
    </div>
  )
}
