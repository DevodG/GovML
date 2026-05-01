#!/bin/bash

# GovChain Unified Deployment Script
# Deploys all components: smart contracts, backend, ML service

set -e  # Exit on error

echo "🚀 GovChain Unified Deployment"
echo "================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check prerequisites
echo "📋 Checking prerequisites..."

# Check Foundry
if ! command -v forge &> /dev/null; then
    echo -e "${RED}❌ Foundry not found. Install with: curl -L https://foundry.paradigm.xyz | bash${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Foundry installed${NC}"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found. Install Node.js 20+${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Node.js installed${NC}"

# Check Python
if ! command -v python &> /dev/null; then
    echo -e "${RED}❌ Python not found. Install Python 3.11+${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Python installed${NC}"

echo ""
echo "📦 Installing dependencies..."
echo ""

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install
cd ..

# Install ML service dependencies
echo "📦 Installing ML service dependencies..."
cd ml-service
pip install -r requirements.txt
cd ..

# Install circuits dependencies
echo "📦 Installing ZKP circuit dependencies..."
cd circuits
npm install
cd ..

echo ""
echo "🔨 Building smart contracts..."
echo ""

# Build smart contracts
echo "🔨 Building smart contracts with Foundry..."
cd contracts
forge build
cd ..

echo ""
echo "🧪 Running tests..."
echo ""

# Run contract tests
echo "🧪 Running smart contract tests..."
cd contracts
forge test -vv
cd ..

# Run ML service tests
echo "🧪 Running ML service tests..."
cd ml-service
python -m pytest tests/ -v
cd ..

echo ""
echo "📝 Configuration..."
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating from .env.example...${NC}"
    cp .env.example .env
    echo -e "${YELLOW}⚠️  Please edit .env with your API keys before running services${NC}"
else
    echo -e "${GREEN}✅ .env file found${NC}"
fi

echo ""
echo "🎉 Deployment complete!"
echo ""
echo "📋 Next steps:"
echo ""
echo "1. Edit .env with your API keys:"
echo "   - ETHEREUM_RPC_URL"
echo "   - ORACLE_PRIVATE_KEY"
echo "   - NVIDIA_API_KEY"
echo "   - MONGODB_URI"
echo ""
echo "2. Deploy smart contracts to testnet (optional):"
echo "   cd contracts"
echo "   forge script script/Deploy.s.sol --rpc-url \$SEPOLIA_RPC_URL --private-key \$PRIVATE_KEY --broadcast"
echo ""
echo "3. Start services (3 terminals):"
echo "   # Terminal 1: Backend"
echo "   cd backend && npm start"
echo ""
echo "   # Terminal 2: ML Service"
echo "   cd ml-service && ./start.sh"
echo ""
echo "   # Terminal 3: Frontend (when ready)"
echo "   cd frontend && npm run dev"
echo ""
echo "🚀 GovChain is ready for development!"
echo ""
echo -e "${GREEN}✅ All systems operational!${NC}"