#!/bin/bash

# Start script for ML Pipeline Service

echo "🤖 Starting ML Pipeline Service..."

# Check if virtual environment exists
if [ ! -d "services/ml-pipeline/venv" ]; then
    echo "📦 Creating virtual environment for ML Pipeline..."
    cd services/ml-pipeline
    python3 -m venv venv
    cd ../..
fi

# Activate virtual environment and install dependencies if needed
cd services/ml-pipeline
source venv/bin/activate

# Check if requirements are installed
if ! python -c "import fastapi" 2>/dev/null; then
    echo "📦 Installing ML Pipeline dependencies (this may take a while)..."
    pip install -r requirements.txt
fi

# Start ML Pipeline service
echo "🚀 Starting ML Pipeline Service on http://localhost:8001"
echo "   Health check: http://localhost:8001/health"
echo ""

python main.py

cd ../..





