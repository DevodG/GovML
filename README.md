# GovML

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Python 3.11+](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://www.python.org/)
[![Node.js 20+](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![Solidity 0.8.20](https://img.shields.io/badge/Solidity-0.8.20-purple.svg)](https://soliditylang.org/)

> A hackathon-ready, production-grade blockchain-powered government procurement platform addressing India's ₹8.4 Lakh Crore corruption problem.

**🎯 Hackathon-Ready** • **🚀 Production-Grade** • **🔒 Mathematically Secure**

---

## 📋 Quick Navigation

| Section | Link |
|---------|------|
| Overview | [🎯 Problem & Solution](#-overview) |
| Key Features | [🏆 What Makes Us Different](#-key-features) |
| Tech Stack | [📊 Technologies Used](#-technology-stack) |
| Architecture | [🏗️ System Design](#-architecture) |
| Getting Started | [🚀 Quick Start](#-quick-start) |
| Components | [📦 What's Included](#-components) |
| Deployment | [🚀 Deploy](#-deployment) |

---

## 🎯 Overview

### The Problem
- **₹8.4 Lakh Crore** annual government procurement market
- **#1 corruption vector** in India
- Opaque tender allotment and fund release processes
- No accountability when contractors abandon projects

### Our Solution
**Mathematical security through cryptographic impossibility** — not legal frameworks.

We combine:
- 🔐 **Zero-Knowledge Proofs** for verified credentials
- 🤖 **AI-Powered Scoring** for fraud detection
- ⛓️ **Smart Escrow Contracts** for fund security
- 🏅 **Bounty Hunters** for crowd-sourced oversight

---

## 🏆 Key Features

| Feature | Description |
|---------|-------------|
| **🔐 ZKP Verification** | Prove credentials (Aadhaar, GST) without revealing them |
| **🤖 AI Audit Reports** | NVIDIA NIM generates human-readable audit narrations |
| **🎯 ML Bid Scoring** | Ensemble models for fair, fraud-resistant scoring |
| **💰 Fund Security** | Multi-sig escrow + dead man's switch |
| **🏅 Bounty System** | VRF-based random assignment + financial incentives |

---

## 📊 Technology Stack

### Frontend
- React 18+ | TypeScript | Tailwind CSS | Web3 Integration

### Backend
- Node.js 20+ | Express.js | MongoDB Atlas | JWT Auth | WebSocket

### Smart Contracts
- Solidity 0.8.20 | Foundry | OpenZeppelin | 9 Production Contracts

### ML Service
- Python 3.11+ | FastAPI | scikit-learn | NVIDIA NIM (Llama 3.1 8B)

### Zero-Knowledge Proofs
- Circom 2.1.0 | snarkjs | Groth16 & PLONK | Poseidon Hashing

### Infrastructure
- Ethereum Sepolia (Testnet) | IPFS (Pinata) | MongoDB Atlas | Prometheus

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                    FRONTEND (React)                  │
│         Portals for Gov / Contractors / Public       │
└────────────────────────┬────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────┐
│              BACKEND (Node.js/Express)              │
│    Auth • Tenders • Bids • Milestones • Audits      │
└──────────┬─────────────────────────┬────────────────┘
           │                         │
       ┌───▼────┐             ┌─────▼──────┐
       │ ML      │             │ Smart      │
       │ Service │             │ Contracts  │
       │         │             │            │
       │ • Score │             │ • Registry │
       │ • Fraud │             │ • Escrow   │
       │ • Audit │             │ • Oracle   │
       └─────────┘             └────────────┘
           │                         │
       ┌───┴─────────────┬───────────┘
       │                 │
       │ ┌──────────────▼───────────┐
       │ │   ZKP Circuits (Circom)   │
       │ ├─────────────────────────┤
       │ │ • KYC Verification      │
       │ │ • Score Integrity       │
       │ │ • Invoice Nullifier     │
       │ └─────────────────────────┘
       │
       └────────────────┬────────────────┐
                        │                │
       ┌────────────────▼──────┐   ┌────▼──────────┐
       │  Ethereum Sepolia     │   │  IPFS/Pinata  │
       │  (Blockchain)         │   │  (Storage)     │
       └───────────────────────┘   └────────────────┘
```

---

## 📁 Repository Structure

```
govchain/
├── 📄 README.md                    # This file
├── 📄 LICENSE                      # MIT License
├── 📄 QUICKSTART.md               # Setup guide
├── 📄 PROJECT_STATUS.md           # Current status
│
├── 🌐 backend/
│   ├── src/
│   │   ├── routes/                # API endpoints
│   │   ├── models/                # MongoDB schemas
│   │   ├── middleware/            # Auth & blockchain
│   │   ├── services/              # Business logic
│   │   └── utils/                 # Helpers
│   └── package.json
│
├── 🎨 frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   └── services/
│   └── package.json
│
├── ⛓️  contracts/
│   ├── src/
│   │   ├── TenderRegistry.sol      # Main contract
│   │   ├── BidEscrow.sol
│   │   ├── MilestoneEscrow.sol
│   │   ├── ScoringOracle.sol
│   │   ├── AnomalyOracle.sol
│   │   ├── BountyHunter.sol
│   │   └── RatingLedger.sol
│   ├── test/                       # 88 tests
│   ├── script/
│   └── foundry.toml
│
├── 🤖 ml-service/
│   ├── src/
│   │   ├── api/                    # FastAPI routes
│   │   ├── models/                 # ML models
│   │   ├── services/               # ML services
│   │   └── config/
│   ├── requirements.txt
│   └── start.sh
│
├── 🔐 circuits/
│   ├── kyc/
│   ├── scoring/
│   └── nullifier/
│
└── 📚 scripts/
    ├── deploy-all.sh
    └── create-demo-data.js
```

---

## 🚀 Quick Start

### Prerequisites
```bash
Node.js 20+    # npm --version
Python 3.11+   # python --version
Foundry        # forge --version
Git            # git --version
```

### 5-Minute Setup

1. **Clone & Install**
   ```bash
   git clone https://github.com/DevodG/GovML.git
   cd govchain
   ```

2. **Install All Dependencies**
   ```bash
   # Backend
   cd backend && npm install && cd ..
   
   # ML Service
   cd ml-service && pip install -r requirements.txt && cd ..
   
   # Smart Contracts
   cd contracts && forge install && cd ..
   ```

3. **Configure Environment**
   ```bash
   # Create .env files in backend/, ml-service/, and contracts/
   cp .env.example .env
   # Edit with your API keys and RPC URLs
   ```

4. **Start Services** (in separate terminals)
   ```bash
   # Terminal 1: Backend API
   cd backend && npm start       # http://localhost:4000
   
   # Terminal 2: ML Service
   cd ml-service && ./start.sh   # http://localhost:8000
   
   # Terminal 3: Frontend
   cd frontend && npm start      # http://localhost:3000
   ```

---

## 📦 Components

### Backend API
- **20+ endpoints** for tenders, bids, milestones, audits
- JWT authentication + role-based access control
- Real-time updates via WebSocket
- MongoDB integration for persistent storage

### ML Service  
- **Bid Scoring**: Ensemble of 4+ ML models
- **Fraud Detection**: Isolation Forest for anomalies
- **AI Auditing**: NVIDIA NIM integration (free)
- **ZKP Proof Generation**: snarkjs support

### Smart Contracts
- **9 Production Contracts** with 88 tests
- **Upgradeable** with storage gaps
- **OpenZeppelin**: AccessControl, ReentrancyGuard
- **Key Contracts**: TenderRegistry, BidEscrow, MilestoneEscrow, Oracles

### Zero-Knowledge Proofs
- **KYC Circuit**: Verify Aadhaar + GST privately
- **Score Circuit**: Verify ML computation
- **Nullifier Circuit**: Prevent invoice double-submission

---

## 🧪 Testing

```bash
# Smart Contracts (88 tests)
cd contracts && forge test -vv

# ML Service
cd ml-service && pytest tests/ -v

# Backend
cd backend && npm test
```

---

## 🚀 Deployment

### Smart Contracts → Ethereum Sepolia
```bash
cd contracts
forge script script/Deploy.s.sol \
  --rpc-url $SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast --verify
```

### Backend & ML Service
- **Docker**: `docker build -t govchain-backend . && docker run -p 4000:4000 govchain-backend`
- **Railway**: Connect GitHub repo → auto-deploy
- **Vercel**: Frontend only, API connects to backend

---

## 📈 Monitoring

- **Prometheus Metrics**: Requests, scoring, fraud detection
- **Structured Logging**: JSON format with timestamps
- **Health Checks**: `/api/health`, `/api/health/ready`
- **Real-time Alerts**: Anomaly triggers

---

## 📝 License

MIT License — See [LICENSE](LICENSE) for details.

---

## 👥 Contributing

1. Fork the repo
2. Create feature branch: `git checkout -b feature/amazing`
3. Commit: `git commit -m "Add amazing feature"`
4. Push: `git push origin feature/amazing`
5. Open Pull Request

---

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| [QUICKSTART.md](QUICKSTART.md) | Setup & getting started |
| [PROJECT_STATUS.md](PROJECT_STATUS.md) | Current progress & roadmap |
| [contracts/README.md](contracts/README.md) | Smart contract details |
| [ml-service/README.md](ml-service/README.md) | ML service guide |

---

## 🎉 Made for Hackathons

> **~13,000 lines** of production-ready code with comprehensive ZKP integration, AI-powered auditing, and mathematical security guarantees.

**Let's build it. Ship it. Win it. 🚀🏆**

---

⭐ **Star us on GitHub** • 🐛 **Report Issues** • 📖 **Read the Docs**
