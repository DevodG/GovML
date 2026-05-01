#!/bin/bash

# GovChain Complete Deployment Script
# Deploys smart contracts, backend, and ML service

set -e

echo "🚀 GovChain Complete Deployment"
echo "================================"

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please create it from .env.example"
    exit 1
fi

# Load environment variables
source .env

echo "📋 Deployment Configuration:"
echo "  - Ethereum RPC: ${ETHEREUM_RPC_URL:0:20}..."
echo "  - MongoDB: ${MONGODB_URI:0:20}..."
echo "  - ML Service: ${ML_SERVICE_URL:-http://localhost:8000}"
echo ""

# Step 1: Deploy Smart Contracts
echo "📜 Step 1: Deploying Smart Contracts..."
cd contracts

if [ -z "$PRIVATE_KEY" ]; then
    echo "⚠️  PRIVATE_KEY not set, skipping contract deployment"
    echo "   Set PRIVATE_KEY in .env to deploy contracts"
else
    echo "   Deploying to Ethereum Sepolia..."
    forge script script/Deploy.ssol \
        --rpc-url $ETHEREUM_RPC_URL \
        --private-key $PRIVATE_KEY \
        --broadcast \
        --verify
    
    echo "   ✅ Smart contracts deployed"
    
    # Save contract addresses
    if [ -f deployment-11155111.txt ]; then
        echo "   📝 Contract addresses saved to deployment-11155111.txt"
    fi
fi

cd ..

# Step 2: Install Backend Dependencies
echo ""
echo "🔧 Step 2: Installing Backend Dependencies..."
cd backend
npm install
echo "   ✅ Backend dependencies installed"

# Step 3: Install ML Service Dependencies
echo ""
echo "🤖 Step 3: Installing ML Service Dependencies..."
cd ../ml-service

# Check if Python 3 is available
if command -v python3 &> /dev/null; then
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    echo "   ✅ ML Service dependencies installed"
else
    echo "   ⚠️  Python 3 not found, skipping ML Service setup"
fi

cd ..

# Step 4: Create Demo Data
echo ""
echo "📊 Step 4: Creating Demo Data..."
node scripts/create-demo-data.js
echo "   ✅ Demo data created"

# Step 5: Start Services
echo ""
echo "🎯 Step 5: Starting Services..."
echo ""
echo "To start all services, run:"
echo ""
echo "  # Terminal 1 - Backend"
echo "  cd backend && npm start"
echo ""
echo "  # Terminal 2 - ML Service"
echo "  cd ml-service && ./start.sh"
echo ""
echo "  # Terminal 3 - Frontend (when ready)"
echo "  cd frontend && npm run dev"
echo ""

echo "✅ Deployment Complete!"
echo ""
echo "📝 Next Steps:"
echo "  1. Update .env with deployed contract addresses"
echo "  2. Start the services in separate terminals"
echo "  3. Test the API endpoints"
echo "  4. Build the frontend"
echo ""
echo "🔗 Useful Links:"
echo "  - Backend API: http://localhost:3000"
echo "  - ML Service: http://localhost:8000"
echo "  - API Docs: http://localhost:3000/api/docs"
echo "  - ML Docs: http://localhost:8000/api/docs"
