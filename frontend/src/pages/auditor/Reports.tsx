import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Eye } from 'lucide-react'
import { auditorAPI } from '../../lib/api'
import { timeAgo } from '../../lib/format'
import { DataTable, StatusBadge, FilterBar } from '../../components/ui'
import type { FilterConfig } from '../../components/ui'
import type { Column } from '../../components/ui'
import { toast } from 'sonner'

interface Report {
  id: string
  type: string
  anomalyType: string
  severity: number
  description: string
  status: string
  createdAt: string
  tender?: {
    title: string
    category: string
  }
  entity?: {
    name: string
    organization: string
  }
}

export default function AuditorReports() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [reports, setReports] = useState<Report[]>([])
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 })
  const [filters, setFilters] = useState<Record<string, any>>({})

  const filterConfigs: FilterConfig[] = [
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Approved', value: 'approved' },
        { label: 'Rejected', value: 'rejected' },
        { label: 'Resolved', value: 'resolved' },
      ],
    },
  ]

  useEffect(() => {
    loadReports()
  }, [pagination.page, filters])

  const loadReports = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: String(pagination.page),
        limit: String(pagination.pageSize),
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== '')),
      })

      const data = await auditorAPI.getReports(params)
      setReports(data.auditLogs || [])
      setPagination((prev) => ({
        ...prev,
        total: data.pagination?.total || 0,
      }))
    } catch (error: any) {
      console.error('Failed to load reports:', error)
      toast.error(error.message || 'Failed to load reports')
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (newFilters: Record<string, any>) => {
    setFilters(newFilters)
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  const getSeverityColor = (severity: number) => {
    if (severity >= 7) return 'var(--danger)'
    if (severity >= 4) return 'var(--warning)'
    return 'var(--success)'
  }

  const columns: Column<Report>[] = [
    {
      key: 'id',
      label: 'ID',
      render: (value) => <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{value}</span>,
    },
    {
      key: 'type',
      label: 'Type',
      render: (value) => <span style={{ textTransform: 'capitalize', fontSize: 13 }}>{value}</span>,
    },
    {
      key: 'anomalyType',
      label: 'Anomaly Type',
      render: (value) => <span style={{ fontSize: 13 }}>{value}</span>,
    },
    {
      key: 'severity',
      label: 'Severity',
      render: (value) => (
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: getSeverityColor(value),
            textTransform: 'uppercase',
          }}
        >
          {value}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => <StatusBadge status={value} type="anomaly" size="sm" />,
    },
    {
      key: 'createdAt',
      label: 'Reported',
      render: (value) => timeAgo(value),
    },
  ]

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
        <FileText size={20} color="var(--auditor)" />
        <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }}>Audit Reports</h1>
      </div>

      <FilterBar
        filters={filterConfigs}
        values={filters}
        onChange={handleFilterChange}
        onClear={() => setFilters({})}
      />

      <DataTable
        columns={columns}
        data={reports}
        loading={loading}
        pagination={{
          ...pagination,
          onPageChange: (page) => setPagination((prev) => ({ ...prev, page })),
        }}
        actions={(report) => [
          {
            label: 'View Details',
            onClick: () => navigate(`/auditor/reports/${report.id}`),
            icon: <Eye size={14} />,
          },
        ]}
        emptyMessage="No reports found"
      />
    </div>
  )
}
