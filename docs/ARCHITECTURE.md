# Architecture Overview

## System Architecture

The Tennis Analytics platform is built as a monorepo with the following components:

### 1. Backend API (`apps/api`)
- **Framework**: FastAPI (Python)
- **Database**: PostgreSQL with SQLAlchemy ORM
- **Task Queue**: Celery with Redis
- **Storage**: AWS S3 or local filesystem
- **Authentication**: JWT tokens

### 2. ML Pipeline (`services/ml-pipeline`)
- **Framework**: FastAPI (Python)
- **Computer Vision**: OpenCV, YOLOv8, MediaPipe
- **Processing**: Async video analysis
- **Models**: Court detection, player tracking, ball tracking, shot classification

### 3. Web Dashboard (`apps/web`)
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **State Management**: React Query (TanStack Query)

### 4. Mobile App (`apps/mobile`)
- **Framework**: React Native with Expo
- **Language**: TypeScript
- **Features**: Video recording, match upload, analytics viewing

## Data Flow

```
User Uploads Video
    ↓
API receives video → Stores in S3/local
    ↓
Celery task triggered → Calls ML Pipeline
    ↓
ML Pipeline processes video:
    1. Court detection & calibration
    2. Player tracking
    3. Ball tracking
    4. Shot classification
    5. Rally identification
    6. Analytics generation
    ↓
Results saved to PostgreSQL
    ↓
User views analytics via Web/Mobile
```

## Key Components

### Court Detection
- Uses Hough line transform to detect court lines
- Calculates homography matrix for perspective transformation
- Maps pixel coordinates to real court coordinates

### Player Tracking
- YOLOv8 for person detection
- ByteTrack/DeepSORT for multi-object tracking
- Assigns player numbers based on court position

### Ball Tracking
- Color-based detection (yellow/white ball)
- Trajectory interpolation for occluded frames
- Bounce detection

### Shot Classification
- Analyzes player pose + ball trajectory
- Classifies shot type (forehand, backhand, volley, etc.)
- Determines direction and outcome

### Analytics Engine
- Aggregates shots into rallies
- Calculates match statistics
- Generates heatmaps and comparisons

## Database Schema

### Core Tables
- `users` - User accounts
- `matches` - Match metadata
- `match_videos` - Video file information
- `shots` - Individual shot data
- `rallies` - Rally information
- `points` - Point outcomes
- `serves` - Serve analysis
- `player_movements` - Movement tracking
- `match_stats` - Aggregated statistics
- `annotations` - Coaching annotations

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login
- `GET /api/v1/auth/me` - Get current user

### Matches
- `GET /api/v1/matches` - List matches
- `POST /api/v1/matches` - Create match
- `GET /api/v1/matches/{id}` - Get match details
- `POST /api/v1/matches/{id}/upload` - Upload video

### Analytics
- `GET /api/v1/analytics/matches/{id}/stats` - Match statistics
- `GET /api/v1/analytics/matches/{id}/heatmap` - Shot heatmap
- `GET /api/v1/analytics/matches/{id}/serves` - Serve analysis
- `GET /api/v1/analytics/matches/{id}/comparison` - Player comparison
- `GET /api/v1/analytics/matches/{id}/highlights` - Highlight reel

## Deployment

### Development
- Docker Compose for local development
- All services run in containers
- Hot reload enabled

### Production
- Kubernetes or Docker Swarm
- Separate services for scalability
- GPU instances for ML processing
- CDN for video delivery






