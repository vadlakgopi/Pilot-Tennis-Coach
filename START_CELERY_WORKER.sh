#!/bin/bash

# Start script for Celery Worker

echo "⚙️  Starting Celery Worker..."

# Check if virtual environment exists
if [ ! -d "apps/api/venv" ]; then
    echo "❌ Backend virtual environment not found. Please run setup first."
    exit 1
fi

# Activate virtual environment
cd apps/api
source venv/bin/activate

# Check if Redis is running
if ! command -v redis-cli &> /dev/null; then
    echo "⚠️  Warning: redis-cli not found. Make sure Redis is installed and running."
    echo "   Install Redis: brew install redis (macOS) or apt-get install redis (Linux)"
    echo ""
fi

# Check Redis connection
if command -v redis-cli &> /dev/null; then
    if ! redis-cli ping &> /dev/null; then
        echo "⚠️  Warning: Redis is not responding. Starting Celery anyway..."
        echo "   Start Redis with: redis-server"
        echo ""
    else
        echo "✅ Redis is running"
    fi
fi

# Start Celery worker
echo "🚀 Starting Celery Worker..."
echo "   This will process video analysis tasks asynchronously"
echo ""

celery -A app.core.celery_app worker --loglevel=info

cd ../..





