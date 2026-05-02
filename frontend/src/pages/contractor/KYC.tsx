import { useState, useEffect } from 'react'
import { ShieldCheck, FileText, CheckCircle, Clock } from 'lucide-react'
import { contractorAPI } from '../../lib/api'
import { validateKYCForm, type KYCFormData } from '../../lib/validation'
import { ConfirmModal } from '../../components/ui'
import { toast } from 'sonner'

export default function KYC() {
  const [submitting, setSubmitting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [formData, setFormData] = useState<KYCFormData>({
    companyName: '',
    gstNumber: '',
    cinNumber: '',
    contactEmail: '',
    zkpProof: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [kycStatus, setKycStatus] = useState<'pending' | 'verified' | 'not_verified'>('not_verified')

  useEffect(() => {
    loadKYCStatus()
  }, [])

  const loadKYCStatus = async () => {
    try {
      const data = await contractorAPI.getReputation()
      const rep = data.reputation as { kycVerified?: boolean } | undefined
      setKycStatus(rep?.kycVerified ? 'verified' : 'not_verified')
    } catch (error) {
      console.error('Failed to load KYC status:', error)
    }
  }

  const handleInputChange = (field: keyof KYCFormData, value: string) => {
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
    const validation = validateKYCForm(formData)

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
      await contractorAPI.submitKYC({ ...formData } as Record<string, unknown>)
      toast.success('KYC verification submitted successfully!')
      setKycStatus('verified')
      setFormData({
        companyName: '',
        gstNumber: '',
        cinNumber: '',
        contactEmail: '',
        zkpProof: '',
      })
    } catch (error: any) {
      console.error('Failed to submit KYC:', error)
      toast.error(error.message || 'Failed to submit KYC')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
        <ShieldCheck size={20} color="var(--contractor)" />
        <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }}>KYC & ZKP Verification</h1>
      </div>

      {/* Status Card */}
      <div className="card" style={{ padding: 24, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          {kycStatus === 'verified' ? (
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: 'var(--success)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CheckCircle size={20} color="#fff" />
            </div>
          ) : (
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: 'var(--warning)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Clock size={20} color="#fff" />
            </div>
          )}
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
              {kycStatus === 'verified' ? 'KYC Verified' : 'KYC Not Verified'}
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {kycStatus === 'verified'
                ? 'Your identity has been verified with ZKP proof'
                : 'Complete KYC verification to participate in tenders'}
            </p>
          </div>
        </div>

        {kycStatus === 'verified' && (
          <div
            style={{
              padding: 12,
              background: 'color-mix(in srgb, var(--success) 12%, transparent)',
              border: '1px solid color-mix(in srgb, var(--success) 25%, transparent)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <CheckCircle size={16} color="var(--success)" />
            <span style={{ fontSize: 13, color: 'var(--success)', fontWeight: 500 }}>
              ZKP Proof Valid
            </span>
          </div>
        )}
      </div>

      {/* KYC Form */}
      {kycStatus !== 'verified' && (
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>KYC Information</h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
                Company Name *
              </label>
              <input
                type="text"
                value={formData.companyName}
                onChange={(e) => handleInputChange('companyName', e.target.value)}
                className="input"
                placeholder="Enter company name"
                style={{ borderColor: errors.companyName ? 'var(--danger)' : undefined }}
              />
              {errors.companyName && <p style={{ fontSize: 11, color: 'var(--danger)', marginTop: 4 }}>{errors.companyName}</p>}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
                GST Number *
              </label>
              <input
                type="text"
                value={formData.gstNumber}
                onChange={(e) => handleInputChange('gstNumber', e.target.value)}
                className="input"
                placeholder="22AAAAA0000A1Z5"
                style={{ borderColor: errors.gstNumber ? 'var(--danger)' : undefined }}
              />
              {errors.gstNumber && <p style={{ fontSize: 11, color: 'var(--danger)', marginTop: 4 }}>{errors.gstNumber}</p>}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
                CIN Number *
              </label>
              <input
                type="text"
                value={formData.cinNumber}
                onChange={(e) => handleInputChange('cinNumber', e.target.value)}
                className="input"
                placeholder="U12345MH2024PTC12345"
                style={{ borderColor: errors.cinNumber ? 'var(--danger)' : undefined }}
              />
              {errors.cinNumber && <p style={{ fontSize: 11, color: 'var(--danger)', marginTop: 4 }}>{errors.cinNumber}</p>}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
                Contact Email *
              </label>
              <input
                type="email"
                value={formData.contactEmail}
                onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                className="input"
                placeholder="contact@company.com"
                style={{ borderColor: errors.contactEmail ? 'var(--danger)' : undefined }}
              />
              {errors.contactEmail && <p style={{ fontSize: 11, color: 'var(--danger)', marginTop: 4 }}>{errors.contactEmail}</p>}
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
                  Submitting...
                </>
              ) : (
                <>
                  <ShieldCheck size={16} />
                  Submit KYC
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ZKP Information */}
      <div className="card" style={{ padding: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>ZKP Verification</h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
          <div style={{ padding: 16, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <FileText size={16} color="var(--contractor)" />
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>Circuit</span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>kyc_verify.circom (Groth16)</div>
          </div>

          <div style={{ padding: 16, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <ShieldCheck size={16} color="var(--contractor)" />
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>On-Chain</span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>ZKPVerifier.sol ✓</div>
          </div>
        </div>

        <div style={{ marginTop: 16, padding: 12, background: 'color-mix(in srgb, var(--info) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--info) 25%, transparent)', borderRadius: 'var(--radius-md)' }}>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            <strong>Note:</strong> ZKP verification ensures your identity is proven without revealing sensitive data. Your Aadhaar and GST information never leaves your browser.
          </p>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={showConfirm}
        title="Submit KYC Verification"
        message="Are you sure you want to submit your KYC information? This will verify your identity using ZKP proof."
        confirmLabel="Submit KYC"
        onCancel={() => setShowConfirm(false)}
        onConfirm={handleConfirmSubmit}
      />
    </div>
  )
}
