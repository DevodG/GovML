# GovML

**A comprehensive platform combining machine learning, blockchain smart contracts, and modern backend services for governance and procurement.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Repository Structure](#repository-structure)
- [Quick Start](#quick-start)
- [Components](#components)
- [Development](#development)
- [License](#license)

---

## 🎯 Overview

GovML is a full-stack application that combines:
- **ML Service**: Intelligent scoring and anomaly detection for procurement
- **Backend**: RESTful API for tender management, bidding, and auditing
- **Smart Contracts**: Blockchain-based escrow and tender registry on Ethereum
- **Frontend**: React-based user interface for government procurement

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
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

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👥 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

For more details, see [PROJECT_STATUS.md](PROJECT_STATUS.md) and [QUICKSTART.md](QUICKSTART.md).
