#!/bin/bash

# Start API server with correct environment variables

cd "$(dirname "$0")/apps/api"

# Load environment variables
export DATABASE_URL="postgresql://sireeshanaroju@localhost:5432/tennis_analytics"
export JWT_SECRET_KEY="dev-secret-key-change-in-production-please"
export REDIS_URL="redis://localhost:6379/0"

# Activate virtual environment
source venv/bin/activate

echo "🚀 Starting API server..."
echo "   Database: $DATABASE_URL"
echo "   API Docs: http://localhost:8000/docs"
echo ""

# Start server
uvicorn main:app --reload --port 8000






