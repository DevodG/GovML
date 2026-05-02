const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || 'Request failed')
  }
  return res.json()
}

// Public endpoints (no auth)
export const publicAPI = {
  getTenders: (params?: string) => request(`/public/tenders${params ? `?${params}` : ''}`),
  getTenderFeed: (params?: string) => request(`/public/tenders/feed${params ? `?${params}` : ''}`),
  getFundDashboard: () => request('/public/funds/dashboard'),
  getFundMap: () => request('/public/funds/map'),
  getContractors: (params?: string) => request(`/public/contractors${params ? `?${params}` : ''}`),
  getContractor: (id: string) => request(`/public/contractors/${id}`),
}

// Bounty endpoints
export const bountyAPI = {
  getLeaderboard: (limit = 10) => request(`/bounty/leaderboard?limit=${limit}`),
  getAssignments: () => request('/bounty/assignments'),
  register: (stakeAmount: number) => request('/bounty/register', { method: 'POST', body: JSON.stringify({ stakeAmount }) }),
  commit: (id: string, commitHash: string) => request(`/bounty/${id}/commit`, { method: 'POST', body: JSON.stringify({ commitHash }) }),
  reveal: (id: string, rating: number, salt: string) => request(`/bounty/${id}/reveal`, { method: 'POST', body: JSON.stringify({ rating, salt }) }),
}

// Gov endpoints
export const govAPI = {
  getDashboard: () => request('/gov/dashboard'),
  getAnomalies: (params?: string) => request(`/gov/anomalies${params ? `?${params}` : ''}`),
  getPendingMilestones: () => request('/gov/milestones/pending'),
  approveMilestone: (id: string) => request(`/gov/milestones/${id}/approve`, { method: 'POST' }),
}

// Tender endpoints
export const tenderAPI = {
  create: (data: Record<string, unknown>) => request('/tenders', { method: 'POST', body: JSON.stringify(data) }),
  getAll: (params?: string) => request(`/tenders${params ? `?${params}` : ''}`),
  getOne: (id: string) => request(`/tenders/${id}`),
  closeBids: (id: string) => request(`/tenders/${id}/close-bids`, { method: 'POST' }),
  allot: (id: string, winnerId: string) => request(`/tenders/${id}/allot`, { method: 'POST', body: JSON.stringify({ winnerId }) }),
}

// Auditor endpoints
export const auditorAPI = {
  getReports: (params?: string) => request(`/auditor/reports${params ? `?${params}` : ''}`),
  getReport: (id: string) => request(`/auditor/reports/${id}`),
  getAnomalies: (params?: string) => request(`/auditor/anomalies${params ? `?${params}` : ''}`),
  flag: (data: Record<string, unknown>) => request('/auditor/flag', { method: 'POST', body: JSON.stringify(data) }),
  getAIReport: (id: string) => request(`/auditor/ai-report/${id}`),
  reviewAnomaly: (id: string, approved: boolean, comments?: string) =>
    request(`/auditor/anomaly/${id}/review`, { method: 'POST', body: JSON.stringify({ approved, comments }) }),
  getStats: () => request('/auditor/statistics'),
  getBids: (params?: string) => request(`/auditor/bids${params ? `?${params}` : ''}`),
  oracleSign: (milestoneId: string) => request('/auditor/oracle/sign', { method: 'POST', body: JSON.stringify({ milestoneId }) }),
}

// Contractor endpoints
export const contractorAPI = {
  getReputation: () => request('/contractor/reputation'),
  submitKYC: (data: Record<string, unknown>) => request('/contractor/kyc', { method: 'POST', body: JSON.stringify(data) }),
  getBids: (params?: string) => request(`/contractor/bids${params ? `?${params}` : ''}`),
  getMilestones: () => request('/contractor/milestones'),
  submitMilestone: (id: string, ipfsHash: string, gpsCoordinates: string) =>
    request(`/contractor/milestones/${id}/submit`, { method: 'POST', body: JSON.stringify({ ipfsHash, gpsCoordinates }) }),
}

// WebSocket
export function connectWebSocket(onMessage?: (data: unknown) => void) {
  const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3001'
  try {
    const ws = new WebSocket(wsUrl)
    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        onMessage?.(data)
      } catch { /* ignore parse errors */ }
    }
    ws.onerror = () => { /* silent reconnect logic can go here */ }
    return ws
  } catch {
    return null
  }
}
