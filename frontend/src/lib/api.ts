const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

// Get auth token from localStorage
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('govchain_token')
}

// Set auth token
export function setAuthToken(token: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem('govchain_token', token)
}

// Clear auth token
export function clearAuthToken(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem('govchain_token')
}

// Request options with auth
function getRequestOptions(options?: RequestInit): RequestInit {
  const token = getAuthToken()
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  return {
    headers,
    ...options,
  }
}

// Retry configuration
const MAX_RETRIES = 3
const RETRY_DELAY = 1000 // 1 second

// Sleep helper for retry delay
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Check if error is retryable
function isRetryableError(status: number, error?: any): boolean {
  // Retry on 5xx errors
  if (status >= 500) return true

  // Retry on network errors
  if (!status && error) return true

  // Don't retry on 4xx errors (except 429 Too Many Requests)
  if (status === 429) return true

  return false
}

/** Accept either a pre-built query string or URLSearchParams from callers. */
export type QueryParams = string | URLSearchParams | undefined

export function querySuffix(params?: QueryParams): string {
  if (params === undefined) return ''
  const s = typeof params === 'string' ? params : params.toString()
  return s ? `?${s}` : ''
}

async function request<T = any>(path: string, options?: RequestInit, retryCount = 0): Promise<T> {
  const url = `${API_URL}${path}`
  const requestOptions = getRequestOptions(options)

  try {
    const res = await fetch(url, requestOptions)

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText, message: res.statusText }))

      // Check if we should retry
      if (isRetryableError(res.status, err) && retryCount < MAX_RETRIES) {
        console.warn(`Request failed (${res.status}), retrying... (${retryCount + 1}/${MAX_RETRIES})`)
        await sleep(RETRY_DELAY * (retryCount + 1)) // Exponential backoff
        return request<T>(path, options, retryCount + 1)
      }

      // Handle specific error cases
      if (res.status === 401) {
        clearAuthToken()
        throw new Error('Authentication required. Please login again.')
      }

      if (res.status === 403) {
        throw new Error('Access denied. You do not have permission to perform this action.')
      }

      if (res.status === 404) {
        throw new Error('Resource not found.')
      }

      if (res.status === 429) {
        throw new Error('Too many requests. Please try again later.')
      }

      throw new Error(err.error || err.message || 'Request failed')
    }

    return res.json() as T
  } catch (error: any) {
    // If it's a network error and we haven't exceeded retries
    if (!error.status && retryCount < MAX_RETRIES) {
      console.warn(`Network error, retrying... (${retryCount + 1}/${MAX_RETRIES})`)
      await sleep(RETRY_DELAY * (retryCount + 1))
      return request<T>(path, options, retryCount + 1)
    }

    // Re-throw if it's already a formatted error
    if (error.message) {
      throw error
    }

    throw new Error('Network error. Please check your connection.')
  }
}

// Public endpoints (no auth)
export const publicAPI = {
  getTenders: (params?: QueryParams) => request(`/public/tenders${querySuffix(params)}`),
  getTenderFeed: (params?: QueryParams) => request(`/public/tenders/feed${querySuffix(params)}`),
  getFundDashboard: () => request('/public/funds/dashboard'),
  getFundMap: () => request('/public/funds/map'),
  getContractors: (params?: QueryParams) => request(`/public/contractors${querySuffix(params)}`),
  getContractor: (id: string) => request(`/public/contractors/${id}`),
}

// Wallet-based login — connects wallet address to a backend JWT for the given role
export async function walletLogin(walletAddress: string, role: string): Promise<void> {
  try {
    const data: any = await fetch(`${API_URL}/auth/wallet-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress, role }),
    }).then((r) => r.json())

    if (data.token) {
      setAuthToken(data.token)
      localStorage.setItem('govchain_user', JSON.stringify(data.user))
    }
  } catch (e) {
    console.warn('Wallet login failed, proceeding without token:', e)
  }
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
  getAnomalies: (params?: QueryParams) => request(`/gov/anomalies${querySuffix(params)}`),
  getPendingMilestones: () => request('/gov/milestones/pending'),
  approveMilestone: (id: string) => request(`/gov/milestones/${id}/approve`, { method: 'POST' }),
}

// Tender endpoints
export const tenderAPI = {
  create: (data: Record<string, unknown>) => request('/tenders', { method: 'POST', body: JSON.stringify(data) }),
  getAll: (params?: QueryParams) => request(`/tenders${querySuffix(params)}`),
  getOne: (id: string) => request(`/tenders/${id}`),
  closeBids: (id: string) => request(`/tenders/${id}/close-bids`, { method: 'POST' }),
  allot: (id: string, winnerId: string) => request(`/tenders/${id}/allot`, { method: 'POST', body: JSON.stringify({ winnerId }) }),
}

// Auditor endpoints
export const auditorAPI = {
  getReports: (params?: QueryParams) => request(`/auditor/reports${querySuffix(params)}`),
  getReport: (id: string) => request(`/auditor/reports/${id}`),
  getAnomalies: (params?: QueryParams) => request(`/auditor/anomalies${querySuffix(params)}`),
  flag: (data: Record<string, unknown>) => request('/auditor/flag', { method: 'POST', body: JSON.stringify(data) }),
  getAIReport: (id: string) => request(`/auditor/ai-report/${id}`),
  reviewAnomaly: (id: string, approved: boolean, comments?: string) =>
    request(`/auditor/anomaly/${id}/review`, { method: 'POST', body: JSON.stringify({ approved, comments }) }),
  getStats: () => request('/auditor/statistics'),
  getBids: (params?: QueryParams) => request(`/auditor/bids${querySuffix(params)}`),
  oracleSign: (milestoneId: string) => request('/auditor/oracle/sign', { method: 'POST', body: JSON.stringify({ milestoneId }) }),
}

// Contractor endpoints
export const contractorAPI = {
  getReputation: () => request('/contractor/reputation'),
  submitKYC: (data: Record<string, unknown>) => request('/contractor/kyc', { method: 'POST', body: JSON.stringify(data) }),
  getBids: (params?: QueryParams) => request(`/contractor/bids${querySuffix(params)}`),
  getMilestones: () => request('/contractor/milestones'),
  submitMilestone: (id: string, ipfsHash: string, gpsCoordinates: string) =>
    request(`/contractor/milestones/${id}/submit`, { method: 'POST', body: JSON.stringify({ ipfsHash, gpsCoordinates }) }),
}

// WebSocket connection with reconnection
export function connectWebSocket(onMessage?: (data: unknown) => void): WebSocket | null {
  const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3001'

  try {
    const ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      console.log('WebSocket connected')
    }

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        onMessage?.(data)
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err)
      }
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }

    ws.onclose = () => {
      console.log('WebSocket disconnected')
      // Auto-reconnect after 5 seconds
      setTimeout(() => {
        console.log('Attempting to reconnect WebSocket...')
        connectWebSocket(onMessage)
      }, 5000)
    }

    return ws
  } catch (error) {
    console.error('Failed to create WebSocket connection:', error)
    return null
  }
}

// Helper to format API errors for display
export function formatApiError(error: unknown): string {
  if (typeof error === 'string') {
    return error
  }

  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message)
  }

  return 'An unexpected error occurred'
}
