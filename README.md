# GovML

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Python 3.11+](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://www.python.org/)
[![Node.js 20+](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![Solidity 0.8.20](https://img.shields.io/badge/Solidity-0.8.20-purple.svg)](https://soliditylang.org/)

**A hackathon-ready, production-grade blockchain-powered government procurement platform.**

🎯 **Hackathon-Ready** • 🚀 **Production-Grade** • 🔒 **Mathematically Secure**

---

## 📋 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
- [Repository Structure](#repository-structure)
- [Quick Start](#quick-start)
- [Components](#components)
- [Smart Contracts](#smart-contracts)
- [ML Service](#ml-service)
- [Backend API](#backend-api)
- [Development](#development)
- [Testing](#testing)
- [Deployment](#deployment)
- [Monitoring](#monitoring)
- [Contributing](#contributing)
- [License](#license)

---

## 🎯 Overview

GovML addresses India's ₹8.4 Lakh Crore corruption problem in government procurement through:

- **Pre-Award Phase**: ML-scored, ZKP-verified tender allotment
- **Post-Award Phase**: Cryptographically enforced milestone escrow with dead man's switch
- **Citizen Oversight**: Financially incentivized bounty hunter system
- **AI Auditing**: Human-readable audit reports powered by NVIDIA NIM

### The Problem
- **Scale**: ₹8.4 Lakh Crore annual government procurement market
- **Corruption**: #1 source of corruption in India
- **Opacity**: Opaque tender allotment and fund release processes
- **No Accountability**: Contractors can abandon projects without consequences

### Our Solution
Mathematical security through cryptographic impossibility, not legal frameworks.

---

## � Key Features

### 🔐 Zero-Knowledge Proof Verification
- **KYC Verification**: Prove Aadhaar + GST without revealing them
- **Score Integrity**: Verify ML scores were computed correctly
- **Invoice Nullifier**: Prevent double-submission of invoices

### 🤖 AI-Powered Audit Narration
- **NVIDIA NIM Integration**: Free cloud LLM (Llama 3.1 8B)
- **Human-Readable Reports**: Convert blockchain events to plain English
- **Template Fallback**: Reliable operation even when AI unavailable

### 🎯 ML-Driven Bid Scoring
- **Ensemble Models**: Multiple ML algorithms for robust scoring
- **Fraud Detection**: Isolation Forest anomaly detection
- **Explainable AI**: Human-readable feature importance

### 💰 Cryptographic Fund Security
- **Multi-Sig Approval**: 3-of-5 required for fund release
- **Dead Man's Switch**: Auto-redistribute if contractor ghosts
- **Escrow System**: Funds locked until milestone completion

### 🏅 Citizen Bounty System
- **Random Assignment**: VRF-based hunter selection
- **Commit-Reveal**: Prevent collusion between hunters
- **Financial Incentives**: Earn rewards for catching fraud

---

## 📊 Technology Stack

### 🔗 Blockchain Layer
- **Platform**: Ethereum Sepolia (Testnet)
- **Language**: Solidity 0.8.20
- **Framework**: Foundry
- **Security**: OpenZeppelin contracts (AccessControl, ReentrancyGuard, Pausable)

### 🔐 ZKP Layer
- **Circuits**: Circom 2.1.0
- **Proof System**: Groth16 (KYC, Nullifier), PLONK (Scoring)
- **Prover**: snarkjs
- **Hash Function**: Poseidon (SNARK-friendly)

### 🤖 ML/AI Layer
- **Framework**: Python 3.11+, FastAPI
- **LLM**: NVIDIA NIM (Llama 3.1 8B - Free)
- **ML Models**: scikit-learn (Ensemble, Isolation Forest)
- **Monitoring**: Prometheus metrics

### 🌐 Backend Layer
- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **Database**: MongoDB Atlas (M0 Free Tier)
- **Authentication**: JWT + Role-based Access
- **Blockchain**: ethers.js v6

### 💾 Storage Layer
- **Documents**: IPFS (Pinata - 1GB Free)
- **Database**: MongoDB Atlas (512MB Free)
- **Blockchain**: Ethereum Sepolia (Free Testnet)

---

## 🏗️ Architecture
│           Frontend (React)                   │
└────────────────────┬────────────────────────┘
                     │
┌────────────────────▼────────────────────────┐
│      Backend (Node.js/Express)              │
│  • Authentication & Authorization           │
│  • Tender Management                        │
│  • Bid Processing                           │
│  • Audit Logging                            │
└────────┬──────────────────┬─────────────────┘
         │                  │
    ┌────▼────┐      ┌──────▼──────┐
    │ ML Service   │  Smart Contracts
    │ • Scoring   │  • TenderRegistry
    │ • Anomaly   │  • BidEscrow
    │   Detection │  • Milestones
    └─────────┘  └──────────────┘
```

---

## 📁 Repository Structure

```
govchain/
├── README.md                 # Main documentation
├── package.json             # Root dependencies
├── QUICKSTART.md            # Setup guide
├── PROJECT_STATUS.md        # Current status
├── COMPLETION_SUMMARY.md    # Milestones
│
├── backend/                 # Node.js REST API
│   ├── src/
│   │   ├── index.js
│   │   ├── controllers/     # Business logic
│   │   ├── routes/          # API endpoints
│   │   ├── middleware/      # Auth, blockchain, error handling
│   │   ├── models/          # Database schemas
│   │   ├── services/        # Service layer
│   │   └── utils/           # Utilities
│   └── package.json
│
├── frontend/                # React UI
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── utils/
│   └── package.json
│
├── contracts/               # Foundry Solidity Contracts
│   ├── src/                 # Smart contracts
│   │   ├── TenderRegistry.sol
│   │   ├── BidEscrow.sol
│   │   ├── MilestoneEscrow.sol
│   │   ├── AnomalyOracle.sol
│   │   ├── ScoringOracle.sol
│   │   ├── BountyHunter.sol
│   │   └── RatingLedger.sol
│   ├── script/              # Deployment scripts
│   ├── test/                # Contract tests
│   ├── foundry.toml
│   └── README.md            # Foundry setup
│
├── ml-service/              # Python ML Service
│   ├── src/
│   │   ├── main.py
│   │   ├── api/             # FastAPI routes
│   │   ├── models/          # ML models
│   │   ├── services/        # ML services
│   │   ├── config/          # Configuration
│   │   └── utils/
│   ├── tests/
│   ├── requirements.txt
│   ├── start.sh
│   └── README.md            # ML setup guide
│
├── scripts/                 # Utility scripts
│   ├── deploy-all.sh
│   └── create-demo-data.js
│
└── docs/                    # Documentation
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- Python 3.9+
- Foundry (for smart contracts)
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/DevodG/GovML.git
   cd govchain
   ```

2. **Install dependencies**
   ```bash
   # Backend
   cd backend && npm install && cd ..
   
   # Frontend
   cd frontend && npm install && cd ..
   
   # ML Service
   cd ml-service && pip install -r requirements.txt && cd ..
   
   # Smart Contracts
   cd contracts && forge install && cd ..
   ```

3. **Configure environment**
   - Copy `.env.example` files to `.env` in each component
   - Update with your configuration (API keys, RPC URLs, etc.)

4. **Start services**
   ```bash
   # Terminal 1: Backend
   cd backend && npm start
   
   # Terminal 2: Frontend
   cd frontend && npm start
   
   # Terminal 3: ML Service
   cd ml-service && bash start.sh
   ```

---

## 📦 Components

### Backend
- RESTful API for tender and bid management
- User authentication and authorization
- Blockchain integration for smart contracts
- Audit logging system

**[See Backend README →](./backend/README.md)**

### Frontend
- React-based user interface
- Real-time updates
- Responsive design
- Wallet integration

**[See Frontend README →](./frontend/README.md)**

### Smart Contracts
- TenderRegistry: Core tender management on-chain
- BidEscrow: Secure escrow for bid deposits
- MilestoneEscrow: Payment escrow for milestones
- Oracles: Anomaly detection and scoring

**[See Contracts README →](./contracts/README.md)**

### ML Service
- Bid scoring engine
- Anomaly detection
- Data analysis and reporting
- RESTful API endpoints

**[See ML Service README →](./ml-service/README.md)**

---

## 🛠️ Development

### Running Tests

```bash
# Backend tests
cd backend && npm test

# Contract tests
cd contracts && forge test

# ML Service tests
cd ml-service && pytest tests/
```

### Building for Production

```bash
# Build all components
bash scripts/deploy-all.sh
```

### Code Formatting

```bash
# Contracts
cd contracts && forge fmt

# Backend & Frontend
cd backend && npm run format
cd frontend && npm run format
```

---

## � Smart Contracts

**9 Production-Ready Contracts** with ~3,500 lines of Solidity

- **TenderRegistry**: Tender lifecycle management
- **BidEscrow**: Bid staking and fund management
- **MilestoneEscrow**: Multi-sig milestone tracking
- **ScoringOracle**: ML score verification with ZKP
- **AnomalyOracle**: AI fraud detection with 72-hour freeze
- **BountyHunter**: VRF-based bounty hunter assignment
- **RatingLedger**: Immutable reputation system
- **ZKPController**: Zero-knowledge proof verification
- **Groth16Verifier**: Proof verification contract

📊 **Test Coverage**: 88 tests passing | Upgradeable patterns with storage gaps

---

## 🤖 ML Service

**FastAPI-based Intelligent Scoring & Fraud Detection**

### Capabilities
- **Ensemble Bid Scoring**: Random Forest, XGBoost, Neural Networks
- **Anomaly Detection**: Isolation Forest for real-time fraud detection
- **AI Audit Reports**: NVIDIA NIM (Llama 3.1 8B) for human-readable narration
- **ZKP Proof Generation**: snarkjs integration for circuit proofs

### API Routes
- `/api/v1/scoring` - Bid scoring
- `/api/v1/fraud` - Anomaly detection
- `/api/v1/audit` - AI audit generation
- `/api/v1/zkp` - Proof generation
- `/api/v1/health` - Health checks

---

## 🌐 Backend API

**Express.js RESTful API** with MongoDB Atlas integration

### Core Features
- **Authentication**: JWT-based access control
- **Real-time Updates**: WebSocket integration
- **Blockchain Integration**: ethers.js for contract interactions
- **Audit Logging**: Complete transaction trail
- **Multi-role Support**: Government, Contractors, Auditors, Bounty Hunters

### API Endpoints
- **Tenders**: CRUD + status tracking
- **Bids**: Submission, scoring, refunds
- **Milestones**: Tracking, verification, fund release
- **Bounty**: Hunter assignment, ratings
- **Auditor**: Review + anomaly management
- **Public**: Data access for citizens

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

### Smart Contracts
```bash
cd contracts
forge script script/Deploy.s.sol \
  --rpc-url $SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast --verify
```

### Backend & ML Service
- **Option 1**: Docker containers
- **Option 2**: Railway/Vercel deployment
- **Option 3**: Traditional VPS hosting

---

## 📈 Monitoring

- **Prometheus Metrics**: ml_service_requests, bids_scored, fraud_detected
- **Structured Logging**: JSON format with timestamps
- **Health Checks**: `/api/health`, `/api/health/ready`, `/api/health/live`
- **Real-time Alerts**: Anomaly detection triggers

---

## �📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👥 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

For more details, see [PROJECT_STATUS.md](PROJECT_STATUS.md) and [QUICKSTART.md](QUICKSTART.md).
