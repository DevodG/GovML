# GovChain Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Prerequisites
- Node.js 20+
- Python 3.11+
- Foundry (automatically installed)
- Ethereum wallet with testnet ETH

### 1. Install Dependencies

```bash
# From project root
npm run install:all
```

### 2. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your values
# Required: ETHEREUM_RPC_URL, PRIVATE_KEY, MONGODB_URI
```

### 3. Deploy Smart Contracts

```bash
# Get testnet ETH from https://sepoliafaucet.com
cd contracts

# Deploy to Ethereum Sepolia
forge script script/Deploy.ssol \
  --rpc-url $SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast

# Save contract addresses from output
```

### 4. Start Backend

```bash
# Terminal 1
cd backend
npm install
npm start
```

### 5. Start ML Service

```bash
# Terminal 2
cd ml-service
pip install -r requirements.txt
uvicorn src.main:app --reload
```

### 6. Start Frontend

```bash
# Terminal 3
cd frontend
npm install
npm run dev
```

## 🧪 Test the System

### Test Smart Contracts
```bash
cd contracts
forge test
```

### Test Backend API
```bash
# Register a user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@govchain.com",
    "password": "password123",
    "role": "government",
    "name": "Test Government"
  }'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@govchain.com",
    "password": "password123"
  }'
```

## 🎯 Demo Mode

Enable demo mode for faster testing:

```bash
# In .env file
DEMO_MODE=true
DEMO_TIMER_MINUTES=2
```

## 📱 Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **ML Service**: http://localhost:8000
- **API Docs**: http://localhost:3000/api/docs (coming soon)

## 🔧 Troubleshooting

### Foundry not found
```bash
source ~/.zshenv
foundryup
```

### MongoDB connection failed
```bash
# Check MongoDB Atlas connection string
# Ensure IP whitelist includes your IP
```

### Smart contract deployment failed
```bash
# Check you have testnet ETH
# Verify RPC URL is correct
# Check private key format
```

## 🎓 Next Steps

1. Complete frontend implementation
2. Implement remaining API endpoints
3. Set up ML scoring service
4. Create demo data
5. Test end-to-end flows

## 📚 Documentation

- [README.md](./README.md) - Full documentation
- [PROJECT_STATUS.md](./PROJECT_STATUS.md) - Development progress
- [PRD_v2.txt](./GovChain_PRD_v2.txt) - Product requirements

---

**Need Help?** Check the documentation or open an issue.
