export interface ValidationResult {
  valid: boolean
  errors: Record<string, string>
}

export interface TenderFormData {
  title: string
  category: string
  budget: string
  deadline: string
  ipfsDocHash: string
  milestones: MilestoneFormData[]
}

export interface MilestoneFormData {
  name: string
  percentage: string
  daysToComplete: string
}

export interface BidFormData {
  amount: string
  salt?: string
}

export interface KYCFormData {
  companyName: string
  gstNumber: string
  cinNumber: string
  contactEmail: string
  zkpProof?: string
}

export interface MilestoneSubmitFormData {
  ipfsHash: string
  gpsCoordinates: string
  evidence: string[]
}

export interface AnomalyFormData {
  entityId: string
  entityType: string
  anomalyType: string
  severity: string
  description: string
}

// Validation functions
export function validateTenderForm(data: Partial<TenderFormData>): ValidationResult {
  const errors: Record<string, string> = {}

  if (!data.title || data.title.trim().length === 0) {
    errors.title = 'Title is required'
  } else if (data.title.length > 200) {
    errors.title = 'Title must be less than 200 characters'
  }

  if (!data.category) {
    errors.category = 'Category is required'
  }

  if (!data.budget) {
    errors.budget = 'Budget is required'
  } else {
    const budget = parseFloat(data.budget)
    if (isNaN(budget) || budget <= 0) {
      errors.budget = 'Budget must be a positive number'
    } else if (budget > 1e15) {
      errors.budget = 'Budget is too large'
    }
  }

  if (!data.deadline) {
    errors.deadline = 'Deadline is required'
  } else {
    const deadline = new Date(data.deadline)
    if (isNaN(deadline.getTime())) {
      errors.deadline = 'Invalid deadline format'
    }
    // Note: past dates are warned but not blocked for demo flexibility
  }

  if (!data.ipfsDocHash || data.ipfsDocHash.trim().length === 0) {
    errors.ipfsDocHash = 'IPFS document hash is required'
  } else if (data.ipfsDocHash.length < 10) {
    errors.ipfsDocHash = 'IPFS hash is too short (minimum 10 characters)'
  }
  // Relaxed validation for demo - accept any reasonable hash format
  // In production, use: /^Qm[a-zA-Z0-9]{44,}$/

  if (!data.milestones || data.milestones.length === 0) {
    errors.milestones = 'At least one milestone is required'
  } else {
    const totalPercentage = data.milestones.reduce((sum, m) => {
      const pct = parseFloat(m.percentage) || 0
      return sum + pct
    }, 0)

    // Allow 99-101% for rounding tolerance
    if (totalPercentage < 99 || totalPercentage > 101) {
      errors.milestones = `Milestone percentages must sum to 100% (currently ${totalPercentage.toFixed(1)}%)`
    }

    data.milestones.forEach((m, i) => {
      if (!m.name || m.name.trim().length === 0) {
        errors[`milestone_${i}_name`] = 'Milestone name is required'
      }
      const pct = parseFloat(m.percentage)
      if (!m.percentage || isNaN(pct) || pct <= 0) {
        errors[`milestone_${i}_percentage`] = 'Percentage must be positive'
      } else if (pct > 100) {
        errors[`milestone_${i}_percentage`] = 'Percentage cannot exceed 100'
      }
      const days = parseInt(m.daysToComplete)
      if (!m.daysToComplete || isNaN(days) || days <= 0) {
        errors[`milestone_${i}_days`] = 'Days must be positive'
      }
    })
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  }
}

export function validateBidForm(data: Partial<BidFormData>): ValidationResult {
  const errors: Record<string, string> = {}

  if (!data.amount) {
    errors.amount = 'Bid amount is required'
  } else {
    const amount = parseFloat(data.amount)
    if (isNaN(amount) || amount <= 0) {
      errors.amount = 'Bid amount must be a positive number'
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  }
}

export function validateKYCForm(data: Partial<KYCFormData>): ValidationResult {
  const errors: Record<string, string> = {}

  if (!data.companyName || data.companyName.trim().length === 0) {
    errors.companyName = 'Company name is required'
  }

  if (!data.gstNumber || data.gstNumber.trim().length === 0) {
    errors.gstNumber = 'GST number is required'
  } else if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(data.gstNumber)) {
    errors.gstNumber = 'Invalid GST number format'
  }

  if (!data.cinNumber || data.cinNumber.trim().length === 0) {
    errors.cinNumber = 'CIN number is required'
  } else if (!/^[A-Z]{1}[0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/.test(data.cinNumber)) {
    errors.cinNumber = 'Invalid CIN number format'
  }

  if (!data.contactEmail || data.contactEmail.trim().length === 0) {
    errors.contactEmail = 'Contact email is required'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.contactEmail)) {
    errors.contactEmail = 'Invalid email format'
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  }
}

export function validateMilestoneForm(data: Partial<MilestoneSubmitFormData>): ValidationResult {
  const errors: Record<string, string> = {}

  if (!data.ipfsHash || data.ipfsHash.trim().length === 0) {
    errors.ipfsHash = 'IPFS hash is required'
  } else if (data.ipfsHash.length < 10) {
    errors.ipfsHash = 'IPFS hash is too short (minimum 10 characters)'
  }
  // Relaxed validation for demo

  if (!data.gpsCoordinates || data.gpsCoordinates.trim().length === 0) {
    errors.gpsCoordinates = 'GPS coordinates are required'
  }

  if (!data.evidence || data.evidence.length === 0) {
    errors.evidence = 'At least one evidence file is required'
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  }
}

export function validateAnomalyForm(data: Partial<AnomalyFormData>): ValidationResult {
  const errors: Record<string, string> = {}

  if (!data.entityId || data.entityId.trim().length === 0) {
    errors.entityId = 'Entity ID is required'
  }

  if (!data.entityType) {
    errors.entityType = 'Entity type is required'
  } else if (!['tender', 'bid', 'milestone', 'contractor'].includes(data.entityType)) {
    errors.entityType = 'Invalid entity type'
  }

  if (!data.anomalyType || data.anomalyType.trim().length === 0) {
    errors.anomalyType = 'Anomaly type is required'
  }

  if (!data.severity) {
    errors.severity = 'Severity is required'
  } else {
    const severity = parseInt(data.severity)
    if (isNaN(severity) || severity < 1 || severity > 10) {
      errors.severity = 'Severity must be between 1 and 10'
    }
  }

  if (!data.description || data.description.trim().length === 0) {
    errors.description = 'Description is required'
  } else if (data.description.length < 10) {
    errors.description = 'Description must be at least 10 characters'
  } else if (data.description.length > 1000) {
    errors.description = 'Description must be less than 1000 characters'
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  }
}

// Helper to get error message for a field
export function getErrorMessage(errors: Record<string, string>, field: string): string {
  return errors[field] || ''
}

// Helper to check if a field has an error
export function hasError(errors: Record<string, string>, field: string): boolean {
  return !!errors[field]
}
