#!/bin/bash

# GovChain ML Service Startup Script

echo "🚀 Starting GovChain ML Service..."

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
echo "Installing dependencies..."
pip install -r requirements.txt

# Create necessary directories
mkdir -p models logs data

# Set environment variables
export PYTHONPATH="${PYTHONPATH}:$(pwd)"
export DEBUG=false
export WORKERS=4

# Start the service
echo "Starting ML service on http://localhost:8000"
uvicorn src.main:app --host 0.0.0.0 --port 8000 --workers $WORKERS
