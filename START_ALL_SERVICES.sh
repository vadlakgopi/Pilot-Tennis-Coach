#!/bin/bash

# Start script for ALL Tennis Analytics Platform Services
# This includes: API, Web, ML Pipeline, Celery Worker, and Redis check

echo "🎾 Starting ALL Tennis Analytics Platform Services..."
echo ""

# Function to check if a port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Check Redis
echo "🔍 Checking Redis..."
if command -v redis-cli &> /dev/null; then
    if redis-cli ping &> /dev/null; then
        echo "✅ Redis is running"
    else
        echo "⚠️  Redis is not running. Starting Redis server..."
        redis-server --daemonize yes 2>/dev/null
        sleep 1
        if redis-cli ping &> /dev/null; then
            echo "✅ Redis started successfully"
        else
            echo "❌ Failed to start Redis. Please start manually: redis-server"
            echo "   Or install Redis: brew install redis (macOS)"
        fi
    fi
else
    echo "⚠️  Warning: redis-cli not found. Redis may not be installed."
    echo "   Install Redis: brew install redis (macOS) or apt-get install redis (Linux)"
fi
echo ""

# Check if virtual environments exist
if [ ! -d "apps/api/venv" ]; then
    echo "❌ Backend virtual environment not found. Please run setup first."
    exit 1
fi

# Start API server in background
echo "🚀 Starting API server on http://localhost:8000"
if check_port 8000; then
    echo "⚠️  Port 8000 is already in use. Skipping API server."
    API_PID=""
else
    cd apps/api
    source venv/bin/activate
    uvicorn main:app --reload --port 8000 > /tmp/api.log 2>&1 &
    API_PID=$!
    cd ../..
    sleep 3
    echo "✅ API server started (PID: $API_PID)"
fi
echo ""

# Start ML Pipeline service in background (optional)
echo "🤖 Starting ML Pipeline Service on http://localhost:8001"
if check_port 8001; then
    echo "⚠️  Port 8001 is already in use. Skipping ML Pipeline service."
    ML_PID=""
else
    if [ ! -d "services/ml-pipeline/venv" ]; then
        echo "📦 Creating virtual environment for ML Pipeline..."
        cd services/ml-pipeline
        python3 -m venv venv
        cd ../..
    fi
    
    cd services/ml-pipeline
    source venv/bin/activate
    
    # Install dependencies if needed (check for fastapi)
    if ! python -c "import fastapi" 2>/dev/null; then
        echo "📦 Installing ML Pipeline dependencies (this may take a while)..."
        pip install -q -r requirements.txt
    fi
    
    python main.py > /tmp/ml-pipeline.log 2>&1 &
    ML_PID=$!
    cd ../..
    sleep 2
    echo "✅ ML Pipeline service started (PID: $ML_PID)"
fi
echo ""

# Start Celery worker in background
echo "⚙️  Starting Celery Worker..."
cd apps/api
source venv/bin/activate
celery -A app.core.celery_app worker --loglevel=info > /tmp/celery.log 2>&1 &
CELERY_PID=$!
cd ../..
sleep 2
echo "✅ Celery worker started (PID: $CELERY_PID)"
echo ""

# Wait a moment for services to start
sleep 2

# Start web dashboard in background
echo "🌐 Starting web dashboard on http://localhost:3000"
if check_port 3000; then
    echo "⚠️  Port 3000 is already in use. Skipping web dashboard."
    WEB_PID=""
else
    cd apps/web
    npm run dev > /tmp/web.log 2>&1 &
    WEB_PID=$!
    cd ../..
    sleep 3
    echo "✅ Web dashboard started (PID: $WEB_PID)"
fi
echo ""

echo "═══════════════════════════════════════════════════════════"
echo "✅ ALL SERVICES STARTED!"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "📊 Services Status:"
[ ! -z "$API_PID" ] && echo "   ✅ API Server: http://localhost:8000 (PID: $API_PID)"
[ ! -z "$API_PID" ] && echo "   📚 API Docs: http://localhost:8000/docs"
[ ! -z "$ML_PID" ] && echo "   ✅ ML Pipeline: http://localhost:8001 (PID: $ML_PID)"
[ ! -z "$ML_PID" ] && echo "   🏥 ML Health: http://localhost:8001/health"
[ ! -z "$CELERY_PID" ] && echo "   ✅ Celery Worker: Running (PID: $CELERY_PID)"
[ ! -z "$WEB_PID" ] && echo "   ✅ Web Dashboard: http://localhost:3000 (PID: $WEB_PID)"
echo ""
echo "📋 Log Files:"
echo "   API: tail -f /tmp/api.log"
echo "   ML Pipeline: tail -f /tmp/ml-pipeline.log"
echo "   Celery: tail -f /tmp/celery.log"
echo "   Web: tail -f /tmp/web.log"
echo ""
echo "🛑 Press Ctrl+C to stop all services"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping all services..."
    [ ! -z "$API_PID" ] && kill $API_PID 2>/dev/null
    [ ! -z "$ML_PID" ] && kill $ML_PID 2>/dev/null
    [ ! -z "$CELERY_PID" ] && kill $CELERY_PID 2>/dev/null
    [ ! -z "$WEB_PID" ] && kill $WEB_PID 2>/dev/null
    echo "✅ All services stopped"
    exit 0
}

# Set trap to cleanup on exit
trap cleanup INT TERM

# Wait for user interrupt
wait





