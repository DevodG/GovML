import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, CheckCircle } from 'lucide-react'
import { contractorAPI } from '../../lib/api'
import { formatINR, timeAgo } from '../../lib/format'
import { DataTable } from '../../components/ui'
import type { Column } from '../../components/ui'
import { toast } from 'sonner'

interface Milestone {
  id: string
  tender: string
  name: string
  pct: number
  amount: number
  dueDate: string
}

export default function ContractorMilestones() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [milestones, setMilestones] = useState<Milestone[]>([])

  useEffect(() => {
    loadMilestones()
  }, [])

  const loadMilestones = async () => {
    try {
      setLoading(true)
      const data = await contractorAPI.getMilestones()
      setMilestones(data.milestones || [])
    } catch (error: any) {
      console.error('Failed to load milestones:', error)
      toast.error(error.message || 'Failed to load milestones')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitMilestone = (milestoneId: string) => {
    navigate(`/contractor/milestones/${milestoneId}`)
  }

  const columns: Column<Milestone>[] = [
    {
      key: 'id',
      label: 'ID',
      render: (value) => <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{value}</span>,
    },
    {
      key: 'tender',
      label: 'Tender',
      render: (value) => <span style={{ fontSize: 13 }}>{value}</span>,
    },
    {
      key: 'name',
      label: 'Milestone',
      render: (value) => <span style={{ fontWeight: 500 }}>{value}</span>,
    },
    {
      key: 'pct',
      label: 'Progress',
      render: (value) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1, height: 6, background: 'var(--bg-elevated)', borderRadius: '3px' }}>
            <div
              style={{
                width: `${value}%`,
                height: '100%',
                background: 'var(--contractor)',
                borderRadius: '3px',
              }}
            />
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{value}%</span>
        </div>
      ),
    },
    {
      key: 'amount',
      label: 'Amount',
      render: (value) => formatINR(value),
    },
    {
      key: 'dueDate',
      label: 'Due Date',
      render: (value) => timeAgo(value),
    },
  ]

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
        <CheckCircle size={20} color="var(--contractor)" />
        <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }}>My Milestones</h1>
      </div>

      <DataTable
        columns={columns}
        data={milestones}
        loading={loading}
        actions={(milestone) => [
          {
            label: 'Submit Evidence',
            onClick: () => handleSubmitMilestone(milestone.id),
            icon: <Upload size={14} />,
          },
        ]}
        emptyMessage="No active milestones"
      />
    </div>
  )
}
