#!/bin/bash
# Start the API server
# Uses SQLite by default (apps/api/.env). For PostgreSQL, update DATABASE_URL in apps/api/.env
# PostgreSQL: docker compose up -d postgres, then alembic upgrade head

cd "$(dirname "$0")/apps/api"

# apps/api/.env uses SQLite by default for local dev without Docker
pip install -q -r requirements.txt 2>/dev/null

python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
