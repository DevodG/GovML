// API configuration for GovChain frontend
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3000';

// API client
export const api = {
  // Auth endpoints
  auth: {
    login: (email: string, password: string) =>
      fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      }).then(r => r.json()),

    register: (data: any) =>
      fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then(r => r.json()),

    getMe: (token: string) =>
      fetch(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(r => r.json()),

    connectWallet: (token: string, walletAddress: string) =>
      fetch(`${API_BASE_URL}/auth/connect-wallet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ walletAddress })
      }).then(r => r.json())
  },

  // Government endpoints
  gov: {
    getDashboard: (token: string) =>
      fetch(`${API_BASE_URL}/gov/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(r => r.json()),

    getAnomalies: (token: string, params?: any) =>
      fetch(`${API_BASE_URL}/gov/anomalies${params ? '?' + new URLSearchParams(params) : ''}`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(r => r.json()),

    getPendingMilestones: (token: string) =>
      fetch(`${API_BASE_URL}/gov/milestones/pending`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(r => r.json()),

    approveMilestone: (token: string, id: string) =>
      fetch(`${API_BASE_URL}/gov/milestones/${id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      }).then(r => r.json())
  },

  // Contractor endpoints
  contractor: {
    getReputation: (token: string) =>
      fetch(`${API_BASE_URL}/contractor/reputation`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(r => r.json()),

    submitKYC: (token: string, data: any) =>
      fetch(`${API_BASE_URL}/contractor/kyc`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(data)
      }).then(r => r.json()),

    getBids: (token: string, params?: any) =>
      fetch(`${API_BASE_URL}/contractor/bids${params ? '?' + new URLSearchParams(params) : ''}`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(r => r.json()),

    getMilestones: (token: string) =>
      fetch(`${API_BASE_URL}/contractor/milestones`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(r => r.json()),

    submitMilestone: (token: string, id: string, data: any) =>
      fetch(`${API_BASE_URL}/contractor/milestones/${id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(data)
      }).then(r => r.json())
  },

  // Auditor endpoints
  auditor: {
    getDashboard: (token: string) =>
      fetch(`${API_BASE_URL}/auditor/statistics`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(r => r.json()),

    getAnomalies: (token: string, params?: any) =>
      fetch(`${API_BASE_URL}/auditor/anomalies${params ? '?' + new URLSearchParams(params) : ''}`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(r => r.json()),

    getBids: (token: string, params?: any) =>
      fetch(`${API_BASE_URL}/auditor/bids${params ? '?' + new URLSearchParams(params) : ''}`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(r => r.json()),

    getReport: (token: string, id: string) =>
      fetch(`${API_BASE_URL}/auditor/reports/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(r => r.json()),

    flagAnomaly: (token: string, data: any) =>
      fetch(`${API_BASE_URL}/auditor/flag`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(data)
      }).then(r => r.json()),

    signOracle: (token: string, data: any) =>
      fetch(`${API_BASE_URL}/auditor/oracle/sign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(data)
      }).then(r => r.json())
  },

  // Public endpoints
  public: {
    getTenders: (params?: any) =>
      fetch(`${API_BASE_URL}/public/tenders${params ? '?' + new URLSearchParams(params) : ''}`)
        .then(r => r.json()),

    getTenderFeed: (params?: any) =>
      fetch(`${API_BASE_URL}/public/tenders/feed${params ? '?' + new URLSearchParams(params) : ''}`)
        .then(r => r.json()),

    getFundsDashboard: () =>
      fetch(`${API_BASE_URL}/public/funds/dashboard`)
        .then(r => r.json()),

    getFundMap: () =>
      fetch(`${API_BASE_URL}/public/funds/map`)
        .then(r => r.json()),

    getContractors: (params?: any) =>
      fetch(`${API_BASE_URL}/public/contractors${params ? '?' + new URLSearchParams(params) : ''}`)
        .then(r => r.json()),

    getContractor: (id: string) =>
      fetch(`${API_BASE_URL}/public/contractors/${id}`)
        .then(r => r.json())
  },

  // Tender endpoints
  tenders: {
    create: (token: string, data: any) =>
      fetch(`${API_BASE_URL}/tenders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(data)
      }).then(r => r.json()),

    getAll: (token: string, params?: any) =>
      fetch(`${API_BASE_URL}/tenders${params ? '?' + new URLSearchParams(params) : ''}`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(r => r.json()),

    getById: (token: string, id: string) =>
      fetch(`${API_BASE_URL}/tenders/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(r => r.json()),

    closeBids: (token: string, id: string) =>
      fetch(`${API_BASE_URL}/tenders/${id}/close-bids`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      }).then(r => r.json()),

    allotWinner: (token: string, id: string, winnerId: string) =>
      fetch(`${API_BASE_URL}/tenders/${id}/allot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ winnerId })
      }).then(r => r.json())
  },

  // Bid endpoints
  bids: {
    create: (token: string, data: any) =>
      fetch(`${API_BASE_URL}/bids`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(data)
      }).then(r => r.json()),

    getByTender: (token: string, tenderId: string) =>
      fetch(`${API_BASE_URL}/bids?tenderId=${tenderId}`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(r => r.json())
  },

  // Bounty endpoints
  bounty: {
    register: (token: string, stakeAmount: number) =>
      fetch(`${API_BASE_URL}/bounty/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ stakeAmount })
      }).then(r => r.json()),

    getAssignments: (token: string) =>
      fetch(`${API_BASE_URL}/bounty/assignments`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(r => r.json()),

    commitReview: (token: string, id: string, commitHash: string) =>
      fetch(`${API_BASE_URL}/bounty/${id}/commit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ commitHash })
      }).then(r => r.json()),

    revealReview: (token: string, id: string, data: any) =>
      fetch(`${API_BASE_URL}/bounty/${id}/reveal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(data)
      }).then(r => r.json()),

    getLeaderboard: (params?: any) =>
      fetch(`${API_BASE_URL}/bounty/leaderboard${params ? '?' + new URLSearchParams(params) : ''}`)
        .then(r => r.json())
  }
};

// WebSocket connection
export const connectWebSocket = () => {
  const ws = new WebSocket(WS_URL);

  ws.onopen = () => {
    console.log('WebSocket connected');
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log('WebSocket message:', data);

    // Handle different event types
    switch (data.type) {
      case 'tender_created':
        // Dispatch tender created event
        window.dispatchEvent(new CustomEvent('tender_created', { detail: data.data }));
        break;
      case 'bidding_closed':
        window.dispatchEvent(new CustomEvent('bidding_closed', { detail: data.data }));
        break;
      case 'winner_allotted':
        window.dispatchEvent(new CustomEvent('winner_allotted', { detail: data.data }));
        break;
      case 'milestone_submitted':
        window.dispatchEvent(new CustomEvent('milestone_submitted', { detail: data.data }));
        break;
      case 'milestone_approved':
        window.dispatchEvent(new CustomEvent('milestone_approved', { detail: data.data }));
        break;
      case 'anomaly_flagged':
        window.dispatchEvent(new CustomEvent('anomaly_flagged', { detail: data.data }));
        break;
      case 'oracle_signed':
        window.dispatchEvent(new CustomEvent('oracle_signed', { detail: data.data }));
        break;
      default:
        console.log('Unknown WebSocket event type:', data.type);
    }
  };

  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
  };

  ws.onclose = () => {
    console.log('WebSocket disconnected');
    // Attempt to reconnect after 5 seconds
    setTimeout(connectWebSocket, 5000);
  };

  return ws;
};

export default api;
