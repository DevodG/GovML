export const MOCK_TENDERS = [
  {
    id: "T-2024-00142",
    title: "NH-48 Road Repair — Pune to Mumbai Section 3",
    category: "Infrastructure",
    budget: 42000000,
    deadline: "2024-03-15T18:00:00Z",
    status: "open",
    ipfsHash: "QmXyz...",
    txHash: "0xabc123...",
    milestones: [
      { name: "Foundation work", pct: 30, days: 45 },
      { name: "Surface laying", pct: 50, days: 90 },
      { name: "Final inspection", pct: 20, days: 120 }
    ],
    state: "Maharashtra"
  },
  {
    id: "T-2024-00219",
    title: "Solar Grid Installation - Rural Karnataka",
    category: "Energy",
    budget: 85000000,
    deadline: "2024-04-10T12:00:00Z",
    status: "awarded",
    ipfsHash: "QmDef...",
    txHash: "0xdef456...",
    milestones: [
      { name: "Site Assessment", pct: 20, days: 30 },
      { name: "Panel Procurement", pct: 40, days: 60 },
      { name: "Installation & Grid Sync", pct: 40, days: 90 }
    ],
    state: "Karnataka"
  }
]

export const MOCK_BIDS = [
  {
    id: "B-2024-00891",
    tenderId: "T-2024-00142",
    contractor: "BuildRight Infra Pvt Ltd",
    amount: 41000000,
    score: 0.785,
    fraudFlag: "clean", // clean, medium, high
    zkpVerified: true,
    rank: 1,
    status: "pending"
  },
  {
    id: "B-2024-00892",
    tenderId: "T-2024-00142",
    contractor: "ShadyConstructions Corp",
    amount: 25000000,
    score: 0.320,
    fraudFlag: "high",
    zkpVerified: false,
    rank: 4,
    status: "pending"
  }
]

export const MOCK_MILESTONES = [
  {
    id: "M-2024-101",
    tenderId: "T-2024-00219",
    name: "Site Assessment",
    status: "pending_approval",
    ipfsPhoto: "QmPhoto...",
    gps: "15.3173° N, 75.7139° E",
    signatures: 2,
    requiredSignatures: 3,
    timeRemaining: "14h 22m" // Dead man switch countdown
  }
]

export const MOCK_ANOMALIES = [
  {
    id: "A-2024-551",
    tenderId: "T-2024-00142",
    bidId: "B-2024-00892",
    type: "Low Bid Outlier",
    description: "Bid is 40% below market average and contractor rating is bottom 5th percentile.",
    risk: "high",
    timestamp: "2024-03-10T09:45:00Z"
  }
]
