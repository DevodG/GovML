import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Minus, Upload, ArrowRight, CheckCircle, AlertTriangle } from 'lucide-react'
import { tenderAPI } from '../../lib/api'
import type { TenderFormData, MilestoneFormData } from '../../lib/validation'
import { toast } from 'sonner'
import { LoadingState, ConfirmModal } from '../../components/ui'

const CATEGORIES = [
  { value: 'infrastructure', label: 'Infrastructure' },
  { value: 'technology', label: 'Technology' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'education', label: 'Education' },
  { value: 'transportation', label: 'Transportation' },
  { value: 'other', label: 'Other' },
]

export default function CreateTender() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1)
  const [showConfirm, setShowConfirm] = useState(false)

  const [formData, setFormData] = useState<TenderFormData>({
    title: '',
    category: '',
    budget: '',
    deadline: '',
    ipfsDocHash: '',
    milestones: [
      { name: 'Planning & Design', percentage: '25', daysToComplete: '30' },
      { name: 'Construction', percentage: '50', daysToComplete: '90' },
      { name: 'Completion & Handover', percentage: '25', daysToComplete: '30' },
    ],
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleInputChange = (field: keyof TenderFormData, value: string) => {
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

  const handleMilestoneChange = (index: number, field: keyof MilestoneFormData, value: string) => {
    const newMilestones = [...formData.milestones]
    newMilestones[index] = { ...newMilestones[index], [field]: value }
    setFormData((prev) => ({ ...prev, milestones: newMilestones }))

    // Clear error for this milestone field
    const errorKey = `milestone_${index}_${field}`
    if (errors[errorKey]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[errorKey]
        return newErrors
      })
    }
  }

  const addMilestone = () => {
    setFormData((prev) => ({
      ...prev,
      milestones: [...prev.milestones, { name: '', percentage: '0', daysToComplete: '30' }],
    }))
  }

  const removeMilestone = (index: number) => {
    if (formData.milestones.length <= 1) {
      toast.error('At least one milestone is required')
      return
    }
    setFormData((prev) => ({
      ...prev,
      milestones: prev.milestones.filter((_, i) => i !== index),
    }))
  }

  const validateStep = (currentStep: number): boolean => {
    const stepErrors: Record<string, string> = {}

    if (currentStep === 1) {
      if (!formData.title || formData.title.trim().length === 0) {
        stepErrors.title = 'Title is required'
      }
      if (!formData.category) {
        stepErrors.category = 'Category is required'
      }
      const budget = parseFloat(formData.budget)
      if (!formData.budget || isNaN(budget) || budget <= 0) {
        stepErrors.budget = 'Budget must be a positive number'
      }
      if (!formData.deadline) {
        stepErrors.deadline = 'Deadline is required'
      } else if (isNaN(new Date(formData.deadline).getTime())) {
        stepErrors.deadline = 'Invalid deadline format'
      }
    }

    if (currentStep === 2) {
      if (!formData.ipfsDocHash || formData.ipfsDocHash.trim().length < 3) {
        stepErrors.ipfsDocHash = 'IPFS document hash is required'
      }
    }

    if (currentStep === 3) {
      const totalPct = formData.milestones.reduce((s, m) => s + (parseFloat(m.percentage) || 0), 0)
      if (totalPct < 99 || totalPct > 101) {
        stepErrors.milestones = `Milestone percentages must sum to 100% (currently ${totalPct.toFixed(1)}%)`
      }
      formData.milestones.forEach((m, i) => {
        if (!m.name || m.name.trim().length === 0) stepErrors[`milestone_${i}_name`] = 'Name required'
        const pct = parseFloat(m.percentage)
        if (!m.percentage || isNaN(pct) || pct <= 0) stepErrors[`milestone_${i}_percentage`] = 'Percentage required'
        const days = parseInt(m.daysToComplete)
        if (!m.daysToComplete || isNaN(days) || days <= 0) stepErrors[`milestone_${i}_days`] = 'Days required'
      })
    }

    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors)
      toast.error('Please fix the errors before proceeding')
      return false
    }

    setErrors({})
    return true
  }

  const handleNext = () => {
    if (validateStep(step)) {
      setStep((prev) => Math.min(prev + 1, 3))
    }
  }

  const handleBack = () => {
    setStep((prev) => Math.max(prev - 1, 1))
  }

  const handleSubmit = async () => {
    if (!validateStep(step)) return

    setShowConfirm(true)
  }

  const handleConfirmSubmit = async () => {
    setShowConfirm(false)
    setLoading(true)

    try {
      // Call backend API first
      await tenderAPI.create({
        title: formData.title,
        category: formData.category,
        budget: parseFloat(formData.budget),
        deadline: formData.deadline,
        ipfsDocHash: formData.ipfsDocHash,
        milestones: formData.milestones.map((m) => ({
          name: m.name,
          percentage: parseFloat(m.percentage),
          daysToComplete: parseInt(m.daysToComplete),
        })),
      })

      toast.success('Tender created successfully!')

      // TODO: Call smart contract when deployed
      // const txResult = await sendTransaction('TENDER_REGISTRY', 'createTender', [
      //   formData.title,
      //   formData.category,
      //   ethers.parseEther(formData.budget),
      //   Math.floor(new Date(formData.deadline).getTime() / 1000),
      //   formData.ipfsDocHash,
      //   formData.milestones.map((m) => ({
      //     name: m.name,
      //     percentage: parseFloat(m.percentage),
      //     daysToComplete: parseInt(m.daysToComplete),
      //   })),
      // ])

      navigate('/gov/tenders')
    } catch (error: any) {
      console.error('Failed to create tender:', error)
      toast.error(error.message || 'Failed to create tender')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <LoadingState type="card" message="Creating tender..." />
  }

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
        <Plus size={20} color="var(--gov)" />
        <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }}>Create Tender</h1>
      </div>

      {/* Progress Steps */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 32 }}>
        {[1, 2, 3].map((s) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: step >= s ? 'var(--gov)' : 'var(--bg-secondary)',
                border: `1px solid ${step >= s ? 'var(--gov)' : 'var(--border)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                fontWeight: 600,
                color: step >= s ? '#fff' : 'var(--text-muted)',
              }}
            >
              {s}
            </div>
            {s < 3 && (
              <div
                style={{
                  flex: 1,
                  height: 2,
                  background: step > s ? 'var(--gov)' : 'var(--border)',
                  borderRadius: '1px',
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Basic Info */}
      {step === 1 && (
        <div className="card" style={{ padding: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>Basic Information</h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
                Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className="input"
                placeholder="Enter tender title"
                style={{ borderColor: errors.title ? 'var(--danger)' : undefined }}
              />
              {errors.title && <p style={{ fontSize: 11, color: 'var(--danger)', marginTop: 4 }}>{errors.title}</p>}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
                Category *
              </label>
              <select
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                className="input"
                style={{ borderColor: errors.category ? 'var(--danger)' : undefined }}
              >
                <option value="">Select category</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
              {errors.category && <p style={{ fontSize: 11, color: 'var(--danger)', marginTop: 4 }}>{errors.category}</p>}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
                Budget (₹) *
              </label>
              <input
                type="number"
                value={formData.budget}
                onChange={(e) => handleInputChange('budget', e.target.value)}
                className="input"
                placeholder="Enter budget amount"
                style={{ borderColor: errors.budget ? 'var(--danger)' : undefined }}
              />
              {errors.budget && <p style={{ fontSize: 11, color: 'var(--danger)', marginTop: 4 }}>{errors.budget}</p>}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
                Deadline *
              </label>
              <input
                type="date"
                value={formData.deadline}
                onChange={(e) => handleInputChange('deadline', e.target.value)}
                className="input"
                style={{ borderColor: errors.deadline ? 'var(--danger)' : undefined }}
              />
              {errors.deadline && <p style={{ fontSize: 11, color: 'var(--danger)', marginTop: 4 }}>{errors.deadline}</p>}
            </div>
          </div>

          <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={handleNext} className="btn btn-primary" style={{ padding: '10px 24px', fontSize: 14 }}>
              Next <ArrowRight size={16} style={{ marginLeft: 8 }} />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Document Upload */}
      {step === 2 && (
        <div className="card" style={{ padding: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>Document Upload</h2>

          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
              IPFS Document Hash *
            </label>
            <div style={{ display: 'flex', gap: 12 }}>
              <input
                type="text"
                value={formData.ipfsDocHash}
                onChange={(e) => handleInputChange('ipfsDocHash', e.target.value)}
                className="input"
                placeholder="QmXxx... or any document hash"
                style={{ flex: 1, borderColor: errors.ipfsDocHash ? 'var(--danger)' : undefined }}
              />
              <button 
                type="button"
                onClick={() => handleInputChange('ipfsDocHash', `Qm${Math.random().toString(36).substr(2, 44)}`)}
                className="btn btn-ghost" 
                style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Upload size={16} />
                Generate Demo Hash
              </button>
            </div>
            {errors.ipfsDocHash && <p style={{ fontSize: 11, color: 'var(--danger)', marginTop: 4 }}>{errors.ipfsDocHash}</p>}
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
              Upload your tender specification document to IPFS and paste the hash here, or click "Generate Demo Hash" for testing.
            </p>
          </div>

          <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between' }}>
            <button onClick={handleBack} className="btn btn-ghost" style={{ padding: '10px 24px', fontSize: 14 }}>
              Back
            </button>
            <button onClick={handleNext} className="btn btn-primary" style={{ padding: '10px 24px', fontSize: 14 }}>
              Next <ArrowRight size={16} style={{ marginLeft: 8 }} />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Milestones */}
      {step === 3 && (
        <div className="card" style={{ padding: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>Milestones Configuration</h2>

          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
              Define the project milestones. Total percentage must equal 100%.
            </p>
            {errors.milestones && (
              <p style={{ fontSize: 12, color: 'var(--danger)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertTriangle size={14} />
                {errors.milestones}
              </p>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {formData.milestones.map((milestone, index) => (
              <div
                key={index}
                className="card"
                style={{
                  padding: 16,
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                    Milestone {index + 1}
                  </span>
                  {formData.milestones.length > 1 && (
                    <button
                      onClick={() => removeMilestone(index)}
                      className="btn btn-ghost"
                      style={{ padding: '4px 8px', fontSize: 12 }}
                    >
                      <Minus size={14} />
                    </button>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
                      Name *
                    </label>
                    <input
                      type="text"
                      value={milestone.name}
                      onChange={(e) => handleMilestoneChange(index, 'name', e.target.value)}
                      className="input"
                      placeholder="Milestone name"
                      style={{ fontSize: 13, borderColor: errors[`milestone_${index}_name`] ? 'var(--danger)' : undefined }}
                    />
                    {errors[`milestone_${index}_name`] && (
                      <p style={{ fontSize: 10, color: 'var(--danger)', marginTop: 2 }}>{errors[`milestone_${index}_name`]}</p>
                    )}
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
                      Percentage (%) *
                    </label>
                    <input
                      type="number"
                      value={milestone.percentage}
                      onChange={(e) => handleMilestoneChange(index, 'percentage', e.target.value)}
                      className="input"
                      placeholder="50"
                      style={{ fontSize: 13, borderColor: errors[`milestone_${index}_percentage`] ? 'var(--danger)' : undefined }}
                    />
                    {errors[`milestone_${index}_percentage`] && (
                      <p style={{ fontSize: 10, color: 'var(--danger)', marginTop: 2 }}>{errors[`milestone_${index}_percentage`]}</p>
                    )}
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
                      Days to Complete *
                    </label>
                    <input
                      type="number"
                      value={milestone.daysToComplete}
                      onChange={(e) => handleMilestoneChange(index, 'daysToComplete', e.target.value)}
                      className="input"
                      placeholder="30"
                      style={{ fontSize: 13, borderColor: errors[`milestone_${index}_days`] ? 'var(--danger)' : undefined }}
                    />
                    {errors[`milestone_${index}_days`] && (
                      <p style={{ fontSize: 10, color: 'var(--danger)', marginTop: 2 }}>{errors[`milestone_${index}_days`]}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}

            <button
              onClick={addMilestone}
              className="btn btn-ghost"
              style={{ padding: '10px 16px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, width: 'fit-content' }}
            >
              <Plus size={14} />
              Add Milestone
            </button>
          </div>

          <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between' }}>
            <button onClick={handleBack} className="btn btn-ghost" style={{ padding: '10px 24px', fontSize: 14 }}>
              Back
            </button>
            <button onClick={handleSubmit} className="btn btn-primary" style={{ padding: '10px 24px', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckCircle size={16} />
              Create Tender
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={showConfirm}
        title="Create Tender"
        message={`Are you sure you want to create the tender "${formData.title}" with a budget of ₹${formData.budget}? This action cannot be undone.`}
        confirmLabel="Create Tender"
        onCancel={() => setShowConfirm(false)}
        onConfirm={handleConfirmSubmit}
      />
    </div>
  )
}
