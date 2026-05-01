# GovChain - Blockchain-Powered Government Procurement & Fund Tracking

**Track 3 — Cybersecurity & Blockchain | Hackathon Project**

## 🚀 Overview

GovChain is a full-lifecycle government procurement platform covering the entire ₹8.4L Cr government procurement lifecycle - from tender posting to milestone completion with cryptographic accountability.

### Key Features

- **Mathematically Impossible Corruption**: ZKP-verified bid scoring + 3-of-5 multi-sig fund release
- **Dead Man's Switch**: Funds auto-redistribute if contractors ghost
- **AI Audit Narrator**: LLM converts blockchain events to plain-English reports
- **Citizen Bounty Market**: Crowd-sourced fraud detection
- **ML Fraud Detection**: Isolation Forest anomaly detection

## 🏗️ Architecture

```
Frontend (React) → Backend API (Node.js) → ML Service (Python) → Blockchain (Ethereum Sepolia)
```

## 🛠️ Tech Stack

| Component | Technology |
|-----------|------------|
| Blockchain | Ethereum Sepolia Testnet, Solidity 0.8.20, Foundry |
| Backend | Node.js 20, Express, MongoDB Atlas |
| Frontend | React 18, Vite, Tailwind CSS, wagmi |
| ML/AI | Python, FastAPI, scikit-learn, NVIDIA NIM |
| Storage | IPFS (Pinata), MongoDB Atlas Free |
| Oracles | Chainlink VRF v2 |

## 📦 Installation

```bash
# Install all dependencies
npm run install:all

# Or install individually
npm run install:contracts
npm run install:backend  
npm run install:frontend
npm run install:ml
```

## 🚀 Quick Start

```bash
# Start all services (in separate terminals)
npm run start:backend    # Terminal 1 - Backend API
npm run start:frontend   # Terminal 2 - Frontend
npm run start:ml         # Terminal 3 - ML Service

# Deploy smart contracts
cd contracts
forge script script/Deploy.ssol --rpc-url $SEPOLIA_RPC_URL --private-key $PRIVATE_KEY --broadcast
```

## 📁 Project Structure

```
govchain/
├── contracts/          # Smart contracts (Solidity + Foundry)
│   ├── src/           # Contract source files
│   ├── test/          # Contract tests
│   └── script/        # Deployment scripts
├── backend/           # REST API (Node.js/Express)
│   └── src/
│       ├── routes/    # API endpoints
│       ├── models/    # MongoDB models
│       ├── middleware/# Express middleware
│       └── services/  # Business logic
├── frontend/          # React dashboards
├── ml-service/        # ML scoring & fraud detection
├── scripts/           # Utility scripts
└── docs/             # Documentation
```

## 🔑 Environment Variables

Create `.env` file in root directory:

```bash
# Blockchain Configuration (Ethereum Sepolia Testnet)
ETHEREUM_RPC_URL=https://rpc.sepolia.org
PRIVATE_KEY=your_private_key_here
CONTRACT_ADDRESS_TENDER_REGISTRY=
CONTRACT_ADDRESS_BID_ESCROW=
CONTRACT_ADDRESS_MILESTONE_ESCROW=

# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/govchain

# APIs
NVIDIA_API_KEY=your_nvidia_api_key
PINATA_API_KEY=your_pinata_key
PINATA_SECRET_KEY=your_pinata_secret_key

# IPFS Configuration
IPFS_GATEWAY=https://gateway.pinata.cloud

# Application Settings
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173
ML_SERVICE_URL=http://localhost:8000

# Demo Settings
DEMO_MODE=true
DEMO_TIMER_MINUTES=2

# Security
JWT_SECRET=your_jwt_secret_key_here
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## 🎯 Demo Strategy

**5-Minute Demo Flow:**
1. Government posts tender (REAL - on-chain)
2. Contractor submits bid with ETH stake (REAL)
3. ML scoring with fraud detection (REAL)
4. Winner allotment + milestone submission (REAL)
5. Dead man's switch trigger (Mock timer)
6. Public fund tracker map (Seeded data)
7. Auditor anomaly review (REAL)

## 🏆 Winning Factors

- **Real Problem**: ₹8.4L Cr market, India's #1 corruption vector
- **Full Lifecycle**: Pre-award AND post-award in one system
- **Oracle Problem Solved**: 3-of-5 multi-sig with VRF bounty hunters
- **ZKP Specific**: Groth16 for KYC, PLONK for score integrity
- **Dead Man's Switch**: Silence has automatic consequences
- **AI Audit Narrator**: Plain-English reports anchored on-chain

## 🧪 Smart Contracts

### Core Contracts

1. **TenderRegistry.sol** - Tender lifecycle management
2. **BidEscrow.sol** - Bid staking and escrow
3. **MilestoneEscrow.sol** - Milestone tracking and fund release
4. **ScoringOracle.sol** - ML score verification with ZKP
5. **BountyHunter.sol** - Random bounty hunter assignment
6. **RatingLedger.sol** - Contractor reputation system
7. **AnomalyOracle.sol** - Fraud detection and fund freezing

### Testing

```bash
cd contracts
forge test
forge build
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/connect-wallet` - Connect wallet
- `GET /api/auth/me` - Get current user

### Tenders (Government)
- `POST /api/tenders` - Create tender
- `GET /api/tenders` - List tenders
- `GET /api/tenders/:id` - Get tender details
- `POST /api/tenders/:id/close-bids` - Close bidding
- `POST /api/tenders/:id/allot` - Allot winner

### Bids (Contractor)
- `POST /api/bids` - Submit bid
- `GET /api/bids/my` - My bids
- `GET /api/bids/:id/score` - Get bid score

### Milestones
- `POST /api/milestones/:tenderId` - Submit milestone
- `GET /api/milestones/:tenderId` - Get milestones
- `POST /api/milestones/:id/sign` - Sign milestone

### Public (No Auth)
- `GET /api/public/tenders` - Public tender feed
- `GET /api/public/funds/dashboard` - Fund statistics
- `GET /api/public/contractors/:id` - Contractor profile

## 📄 License

MIT License - Hackathon Project

---

**GovChain - Build it. Ship it. Win it.**
