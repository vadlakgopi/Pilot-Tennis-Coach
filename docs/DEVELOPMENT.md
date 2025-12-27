# Development Guide

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.10+
- Docker & Docker Compose
- PostgreSQL 14+ (or use Docker)
- Redis (or use Docker)

### Initial Setup

1. **Clone the repository**
```bash
git clone <repository-url>
cd Pilot-Tennis-Coach
```

2. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Start infrastructure services**
```bash
docker-compose up -d postgres redis
```

4. **Set up backend**
```bash
cd apps/api
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Run database migrations
alembic upgrade head
```

5. **Set up frontend**
```bash
cd apps/web
npm install
```

6. **Set up mobile app**
```bash
cd apps/mobile
npm install
```

7. **Set up ML pipeline**
```bash
cd services/ml-pipeline
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## Running the Application

### Development Mode

1. **Start backend API**
```bash
cd apps/api
uvicorn main:app --reload
```

2. **Start ML pipeline**
```bash
cd services/ml-pipeline
python -m uvicorn main:app --reload --port 8001
```

3. **Start Celery worker**
```bash
cd apps/api
celery -A app.core.celery_app worker --loglevel=info
```

4. **Start web dashboard**
```bash
cd apps/web
npm run dev
```

5. **Start mobile app**
```bash
cd apps/mobile
npm start
```

### Using Docker Compose

```bash
docker-compose up
```

This starts all services:
- PostgreSQL on port 5432
- Redis on port 6379
- API on port 8000
- ML Pipeline on port 8001
- Celery worker
- Celery beat

## Project Structure

```
Pilot-Tennis-Coach/
├── apps/
│   ├── api/              # FastAPI backend
│   │   ├── app/
│   │   │   ├── api/       # API routes
│   │   │   ├── core/     # Configuration
│   │   │   ├── models/   # Database models
│   │   │   ├── schemas/   # Pydantic schemas
│   │   │   ├── services/ # Business logic
│   │   │   └── tasks/    # Celery tasks
│   │   └── main.py
│   ├── web/              # Next.js frontend
│   │   └── src/
│   │       ├── app/      # Next.js app router
│   │       ├── components/
│   │       └── lib/
│   └── mobile/           # React Native app
│       └── src/
│           ├── screens/
│           └── lib/
├── services/
│   └── ml-pipeline/      # ML processing service
│       └── app/
│           └── processors/
└── docs/                 # Documentation
```

## Database Migrations

### Create a new migration
```bash
cd apps/api
alembic revision --autogenerate -m "description"
```

### Apply migrations
```bash
alembic upgrade head
```

### Rollback
```bash
alembic downgrade -1
```

## Testing

### Backend Tests
```bash
cd apps/api
pytest
```

### Frontend Tests
```bash
cd apps/web
npm test
```

## Code Style

### Python
- Use Black for formatting
- Follow PEP 8
- Type hints required

```bash
cd apps/api
black .
flake8 .
```

### TypeScript/JavaScript
- Use ESLint
- Follow Next.js conventions

```bash
cd apps/web
npm run lint
```

## Adding New Features

### Adding a New API Endpoint

1. Create schema in `apps/api/app/schemas/`
2. Add route in `apps/api/app/api/v1/endpoints/`
3. Implement service logic in `apps/api/app/services/`
4. Update router in `apps/api/app/api/v1/router.py`

### Adding a New ML Processor

1. Create processor class in `services/ml-pipeline/app/processors/`
2. Integrate into `VideoProcessor`
3. Add tests

### Adding a New Frontend Page

1. Create page in `apps/web/src/app/`
2. Add API calls in `apps/web/src/lib/api.ts`
3. Create components in `apps/web/src/components/`

## Troubleshooting

### Database Connection Issues
- Check PostgreSQL is running: `docker ps`
- Verify DATABASE_URL in .env
- Check network connectivity

### ML Pipeline Not Processing
- Verify ML service is running on port 8001
- Check Celery worker logs
- Verify Redis connection

### Video Upload Fails
- Check file size limits
- Verify S3 credentials (if using S3)
- Check disk space (if using local storage)

## Common Commands

```bash
# Start all services
docker-compose up

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Reset database
docker-compose down -v
docker-compose up -d postgres
cd apps/api && alembic upgrade head
```






