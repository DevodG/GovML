import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, FileText, Brain, CheckCircle, Clock, TrendingUp, Shield, Star } from 'lucide-react'
import { auditorAPI } from '../../lib/api'
import { timeAgo } from '../../lib/format'
import { LoadingState, StatusBadge } from '../../components/ui'
import { toast } from 'sonner'

interface AIReport {
  report_id: string
  generated_at: string
  anomaly_type: string
  ai_generated: boolean
  model_used: string
  executive_summary: string
  detailed_analysis: string
  risk_assessment: {
    level: string
    factors: string[]
  }
  recommended_actions: string[]
  conclusion: string
}

interface AuditLog {
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

export default function AIReport() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [report, setReport] = useState<AIReport | null>(null)
  const [auditLog, setAuditLog] = useState<AuditLog | null>(null)

  useEffect(() => {
    loadReport()
  }, [id])

  const loadReport = async () => {
    if (!id) return
    try {
      setLoading(true)
      const data = await auditorAPI.getAIReport(id)
      setReport(data.aiReport)
      setAuditLog(data.auditLog)
    } catch (error: any) {
      console.error('Failed to load AI report:', error)
      toast.error(error.message || 'Failed to load AI report')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <LoadingState type="card" />
  }

  if (!report) {
    return (
      <div className="card" style={{ padding: 40, textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>Report not found</p>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <button
          onClick={() => navigate('/auditor/anomalies')}
          className="btn btn-ghost"
          style={{ padding: '8px 16px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}
        >
          <ArrowLeft size={14} />
          Back to Anomalies
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 8 }}>
              AI Audit Report
            </h1>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              {report.report_id}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {report.ai_generated ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '4px 8px',
                  borderRadius: 'var(--radius-full)',
                  background: 'color-mix(in srgb, var(--success) 12%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--success) 25%, transparent)',
                  fontSize: 11,
                  color: 'var(--success)',
                  fontWeight: 600,
                }}
              >
                <CheckCircle size={12} />
                AI Generated
              </span>
            ) : (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '4px 8px',
                  borderRadius: 'var(--radius-full)',
                  background: 'color-mix(in srgb, var(--warning) 12%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--warning) 25%, transparent)',
                  fontSize: 11,
                  color: 'var(--warning)',
                  fontWeight: 600,
                }}
              >
                <Clock size={12} />
                Template
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Executive Summary */}
      <div className="card" style={{ padding: 24, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Brain size={20} color="var(--auditor)" />
          <h3 style={{ fontSize: 16, fontWeight: 600 }}>Executive Summary</h3>
        </div>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          {report.executive_summary}
        </p>
      </div>

      {/* Detailed Analysis */}
      <div className="card" style={{ padding: 24, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <FileText size={20} color="var(--auditor)" />
          <h3 style={{ fontSize: 16, fontWeight: 600 }}>Detailed Analysis</h3>
        </div>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          {report.detailed_analysis}
        </p>
      </div>

      {/* Risk Assessment */}
      <div className="card" style={{ padding: 24, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Shield size={20} color="var(--auditor)" />
          <h3 style={{ fontSize: 16, fontWeight: 600 }}>Risk Assessment</h3>
        </div>
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 12px',
              borderRadius: 'var(--radius-full)',
              background:
                report.risk_assessment.level === 'high'
                  ? 'color-mix(in srgb, var(--danger) 12%, transparent)'
                  : report.risk_assessment.level === 'medium'
                  ? 'color-mix(in srgb, var(--warning) 12%, transparent)'
                  : 'color-mix(in srgb, var(--success) 12%, transparent)',
              border: `1px solid ${
                report.risk_assessment.level === 'high'
                  ? 'color-mix(in srgb, var(--danger) 25%, transparent)'
                  : report.risk_assessment.level === 'medium'
                  ? 'color-mix(in srgb, var(--warning) 25%, transparent)'
                  : 'color-mix(in srgb, var(--success) 25%, transparent)'
              }`,
              fontSize: 11,
              color:
                report.risk_assessment.level === 'high'
                  ? 'var(--danger)'
                  : report.risk_assessment.level === 'medium'
                  ? 'var(--warning)'
                  : 'var(--success)',
              fontWeight: 600,
            }}
          >
            {report.risk_assessment.level.toUpperCase()}
          </div>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {' '}
            Risk Level
          </span>
        </div>
        <div style={{ marginTop: 12 }}>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Factors:</p>
          <ul style={{ fontSize: 13, color: 'var(--text-secondary)', paddingLeft: 20 }}>
            {report.risk_assessment.factors.map((factor, i) => (
              <li key={i}>{factor}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Recommended Actions */}
      <div className="card" style={{ padding: 24, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <TrendingUp size={20} color="var(--auditor)" />
          <h3 style={{ fontSize: 16, fontWeight: 600 }}>Recommended Actions</h3>
        </div>
        <ul style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, paddingLeft: 20 }}>
          {report.recommended_actions.map((action, i) => (
            <li key={i}>{action}</li>
          ))}
        </ul>
      </div>

      {/* Conclusion */}
      <div className="card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Star size={20} color="var(--auditor)" />
          <h3 style={{ fontSize: 16, fontWeight: 600 }}>Conclusion</h3>
        </div>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          {report.conclusion}
        </p>
      </div>

      {/* Source Data */}
      {auditLog && (
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Source Data</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
                Anomaly Type
              </label>
              <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{auditLog.anomalyType}</div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
                Severity
              </label>
              <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{auditLog.severity}</div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
                Status
              </label>
              <StatusBadge status={auditLog.status} type="anomaly" size="sm" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
                Reported
              </label>
              <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{timeAgo(auditLog.createdAt)}</div>
            </div>
            {auditLog.tender && (
              <div>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
                  Tender
                </label>
                <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{auditLog.tender.title}</div>
              </div>
            )}
            {auditLog.entity && (
              <div>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
                  Entity
                </label>
                <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                  {auditLog.entity.name || auditLog.entity.organization}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
