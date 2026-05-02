import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { auditorAPI } from '../../lib/api'
import { validateAnomalyForm, type AnomalyFormData } from '../../lib/validation'
import { ConfirmModal } from '../../components/ui'
import { toast } from 'sonner'

export default function FlagAnomaly() {
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [formData, setFormData] = useState<AnomalyFormData>({
    entityId: '',
    entityType: 'tender',
    anomalyType: '',
    severity: '5',
    description: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const entityTypes = [
    { value: 'tender', label: 'Tender' },
    { value: 'bid', label: 'Bid' },
    { value: 'milestone', label: 'Milestone' },
    { value: 'contractor', label: 'Contractor' },
  ]

  const anomalyTypes = [
    { value: 'price_manipulation', label: 'Price Manipulation' },
    { value: 'collusion', label: 'Collusion' },
    { value: 'document_fraud', label: 'Document Fraud' },
    { value: 'identity_mismatch', label: 'Identity Mismatch' },
    { value: 'timeline_violation', label: 'Timeline Violation' },
    { value: 'other', label: 'Other' },
  ]

  const handleInputChange = (field: keyof AnomalyFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const handleSubmit = () => {
    const validation = validateAnomalyForm(formData)

    if (!validation.valid) {
      setErrors(validation.errors)
      toast.error('Please fix the errors before submitting')
      return
    }

    setShowConfirm(true)
  }

  const handleConfirmSubmit = async () => {
    setShowConfirm(false)
    setSubmitting(true)

    try {
      await auditorAPI.flag({ ...formData } as Record<string, unknown>)
      toast.success('Anomaly flagged successfully!')
      navigate('/auditor/anomalies')
    } catch (error: any) {
      console.error('Failed to flag anomaly:', error)
      toast.error(error.message || 'Failed to flag anomaly')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
        <AlertTriangle size={20} color="var(--auditor)" />
        <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }}>Flag Anomaly</h1>
      </div>

      <div className="card" style={{ padding: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>Anomaly Details</h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
              Entity Type *
            </label>
            <select
              value={formData.entityType}
              onChange={(e) => handleInputChange('entityType', e.target.value)}
              className="input"
              style={{ borderColor: errors.entityType ? 'var(--danger)' : undefined }}
            >
              {entityTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            {errors.entityType && <p style={{ fontSize: 11, color: 'var(--danger)', marginTop: 4 }}>{errors.entityType}</p>}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
              Entity ID *
            </label>
            <input
              type="text"
              value={formData.entityId}
              onChange={(e) => handleInputChange('entityId', e.target.value)}
              className="input"
              placeholder="Enter entity ID"
              style={{ borderColor: errors.entityId ? 'var(--danger)' : undefined }}
            />
            {errors.entityId && <p style={{ fontSize: 11, color: 'var(--danger)', marginTop: 4 }}>{errors.entityId}</p>}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
              Anomaly Type *
            </label>
            <select
              value={formData.anomalyType}
              onChange={(e) => handleInputChange('anomalyType', e.target.value)}
              className="input"
              style={{ borderColor: errors.anomalyType ? 'var(--danger)' : undefined }}
            >
              <option value="">Select type</option>
              {anomalyTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            {errors.anomalyType && <p style={{ fontSize: 11, color: 'var(--danger)', marginTop: 4 }}>{errors.anomalyType}</p>}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
              Severity (1-10) *
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={formData.severity}
              onChange={(e) => handleInputChange('severity', e.target.value)}
              className="input"
              style={{ borderColor: errors.severity ? 'var(--danger)' : undefined }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Severity: {formData.severity}</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {Number(formData.severity) <= 3 ? 'Low' : Number(formData.severity) <= 7 ? 'Medium' : 'High'}
              </span>
            </div>
            {errors.severity && <p style={{ fontSize: 11, color: 'var(--danger)', marginTop: 4 }}>{errors.severity}</p>}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
              Description *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className="input"
              placeholder="Describe the anomaly in detail..."
              rows={4}
              style={{ borderColor: errors.description ? 'var(--danger)' : undefined, resize: 'vertical' }}
            />
            {errors.description && <p style={{ fontSize: 11, color: 'var(--danger)', marginTop: 4 }}>{errors.description}</p>}
          </div>
        </div>

        <div style={{ marginTop: 24 }}>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="btn btn-primary"
            style={{
              padding: '12px 24px',
              fontSize: 14,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              width: 'fit-content',
            }}
          >
            {submitting ? (
              <>
                <div className="skeleton" style={{ width: 16, height: 16, borderRadius: '50%' }} />
                Flagging...
              </>
            ) : (
              <>
                <AlertTriangle size={16} />
                Flag Anomaly
              </>
            )}
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={showConfirm}
        title="Flag Anomaly"
        message="Are you sure you want to flag this anomaly? This will freeze the associated funds for 72 hours pending review."
        confirmLabel="Flag Anomaly"
        onCancel={() => setShowConfirm(false)}
        onConfirm={handleConfirmSubmit}
      />
    </div>
  )
}
