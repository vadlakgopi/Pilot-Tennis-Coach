# 🎾 Pilot Tennis Coach - Match Analytics Platform

A comprehensive tennis match analytics platform that uses AI/ML to analyze video recordings and provide detailed performance insights for players and coaches.

## 📁 Project Structure

```
Pilot-Tennis-Coach/
├── apps/
│   ├── web/              # Next.js web dashboard
│   ├── mobile/           # React Native mobile app
│   └── api/              # FastAPI backend
├── services/
│   ├── ml-pipeline/      # ML/Computer Vision processing
│   ├── video-service/    # Video upload, transcoding, storage
│   └── analytics-service/ # Stats aggregation & reporting
├── packages/
│   ├── shared/           # Shared TypeScript types & utilities
│   └── ui/               # Shared UI components
├── infrastructure/        # Docker, deployment configs
└── docs/                 # Documentation

```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.10+
- Docker & Docker Compose
- PostgreSQL 14+
- Redis

### Development Setup

1. **Install dependencies:**
```bash
# Root dependencies
npm install

# Backend
cd apps/api && pip install -r requirements.txt

# Frontend
cd apps/web && npm install

# Mobile
cd apps/mobile && npm install
```

2. **Set up environment variables:**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Start services with Docker:**
```bash
docker-compose up -d
```

4. **Run development servers:**
```bash
# Backend API
cd apps/api && uvicorn main:app --reload

# Web Dashboard
cd apps/web && npm run dev

# Mobile (iOS)
cd apps/mobile && npm run ios

# Mobile (Android)
cd apps/mobile && npm run android
```

## 🏗️ Architecture

- **Frontend**: Next.js 14 (App Router) + TypeScript + TailwindCSS
- **Backend**: FastAPI + PostgreSQL + Redis
- **ML Pipeline**: Python + PyTorch + OpenCV + MediaPipe
- **Mobile**: React Native + Expo
- **Storage**: S3-compatible storage for videos
- **Queue**: Redis + Celery for async processing

## 📊 Features

- 🎥 Video upload & live recording
- 🤖 AI-powered shot classification
- 📈 Comprehensive match analytics
- 🎯 Serve analysis & placement heatmaps
- 🏃 Movement & footwork tracking
- 🎬 Automated highlight reel generation
- 📊 Player comparison dashboards
- 👨‍🏫 Coaching tools & annotations

## 📝 License

MIT








