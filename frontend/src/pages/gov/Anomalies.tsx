import { useState, useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import { govAPI } from '../../lib/api'
import { timeAgo } from '../../lib/format'
import { DataTable, FilterBar } from '../../components/ui'
import type { Column, FilterConfig } from '../../components/ui'
import { toast } from 'sonner'

interface Anomaly {
  id: string
  type: string
  risk: string
  tender: string
  tenderId: string
  ts: string
}

export default function GovAnomalies() {
  const [loading, setLoading] = useState(true)
  const [anomalies, setAnomalies] = useState<Anomaly[]>([])
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 })
  const [filters, setFilters] = useState<Record<string, any>>({})

  const filterConfigs: FilterConfig[] = [
    {
      key: 'severity',
      label: 'Severity',
      type: 'select',
      options: [
        { label: 'High', value: 'high' },
        { label: 'Medium', value: 'medium' },
        { label: 'Low', value: 'low' },
      ],
    },
  ]

  useEffect(() => {
    loadAnomalies()
  }, [pagination.page, filters])

  const loadAnomalies = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: String(pagination.page),
        limit: String(pagination.pageSize),
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== '')),
      })

      const data = await govAPI.getAnomalies(params)
      setAnomalies(data.anomalies || [])
      setPagination((prev) => ({
        ...prev,
        total: data.pagination?.total || 0,
      }))
    } catch (error: any) {
      console.error('Failed to load anomalies:', error)
      toast.error(error.message || 'Failed to load anomalies')
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (newFilters: Record<string, any>) => {
    setFilters(newFilters)
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'high':
        return 'var(--danger)'
      case 'medium':
        return 'var(--warning)'
      case 'low':
        return 'var(--success)'
      default:
        return 'var(--text-muted)'
    }
  }

  const columns: Column<Anomaly>[] = [
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
      key: 'risk',
      label: 'Risk',
      render: (value) => (
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: getRiskColor(value),
            textTransform: 'uppercase',
          }}
        >
          {value}
        </span>
      ),
    },
    {
      key: 'tender',
      label: 'Tender',
      render: (value) => <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{value}</span>,
    },
    {
      key: 'ts',
      label: 'Reported',
      render: (value) => timeAgo(value),
    },
  ]

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
        <AlertTriangle size={20} color="var(--gov)" />
        <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }}>Anomaly Alerts</h1>
      </div>

      <FilterBar
        filters={filterConfigs}
        values={filters}
        onChange={handleFilterChange}
        onClear={() => setFilters({})}
      />

      <DataTable
        columns={columns}
        data={anomalies}
        loading={loading}
        pagination={{
          ...pagination,
          onPageChange: (page) => setPagination((prev) => ({ ...prev, page })),
        }}
        emptyMessage="No anomalies found"
      />
    </div>
  )
}
