#!/bin/bash

# Start script for Tennis Analytics Platform

echo "🎾 Starting Tennis Analytics Platform..."

SCRIPT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
# Check if virtual environment exists
if [ ! -d "$SCRIPT_DIR/apps/api/venv" ]; then
    echo "❌ Backend virtual environment not found. Please run setup first."
    exit 1
fi

# Start API server in background
echo "🚀 Starting API server on http://localhost:8000"
cd "$SCRIPT_DIR/apps/api"
source venv/bin/activate
uvicorn main:app --reload --port 8000 &
API_PID=$!

# Wait a moment for API to start
sleep 3

# Start web dashboard
echo "🌐 Starting web dashboard on http://localhost:3000"
cd "$SCRIPT_DIR/apps/web"
npm run dev &
WEB_PID=$!

echo ""
echo "✅ Services started!"
echo "   API: http://localhost:8000"
echo "   API Docs: http://localhost:8000/docs"
echo "   Web Dashboard: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Wait for user interrupt
trap "kill $API_PID $WEB_PID 2>/dev/null; exit" INT TERM
wait






