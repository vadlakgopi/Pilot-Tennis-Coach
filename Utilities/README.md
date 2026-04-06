# Utilities

This folder contains all startup scripts and utility scripts organized to mirror the codebase structure.

## Structure

```
Utilities/
├── apps/
│   ├── api/              # API startup and utility scripts
│   └── web/              # Web app startup scripts
├── services/
│   └── ml-pipeline/     # ML Pipeline startup and utility scripts
│       └── training/     # Training utility scripts
└── scripts/              # General utility scripts
```

## Scripts

### API Scripts (`apps/api/`)
- `START_API.sh` - Start the API server
- `START_CELERY_WORKER.sh` - Start Celery worker for async tasks
- `TEST_API.sh` - Test API endpoints

### Web Scripts (`apps/web/`)
- `START_SERVERS.sh` - Start both API and web servers

### ML Pipeline Scripts (`services/ml-pipeline/`)
- `START_ML_PIPELINE.sh` - Start ML Pipeline service
- `VIEW_LIVE_LOG.sh` - View live analytics processing log
- `process_match_9.py` - Process specific match
- `process_matches_analytics.py` - Process matches for analytics
- `process_matches.py` - Process matches

### Training Scripts (`services/ml-pipeline/training/`)
- `check_and_train.sh` - Check and train models
- `monitor_and_train_stroke.sh` - Monitor and train stroke detector
- `setup_shot_dataset.sh` - Setup shot classification dataset
- `download_datasets.py` - Download datasets
- `download_roboflow_simple.py` - Download Roboflow datasets
- `extract_shot_sequences.py` - Extract shot sequences
- `fix_stroke_dataset.py` - Fix stroke detection dataset
- `train_ball_detector.py` - Train ball detector model
- `train_shot_classifier.py` - Train shot classifier model

### General Scripts (`scripts/`)
- `START_ALL_SERVICES.sh` - Start all services (API, Web, ML Pipeline, Celery)
- `create_highlight_video.py` - Create highlight videos from matches
- `create_mock_analytics.py` - Create mock analytics for testing
- `delete_all_matches.py` - Delete all matches from database
- `generate_analytics_for_all_matches.sh` - Generate analytics for all matches
- `get_match_analytics.py` - Get analytics for a specific match
- `process_latest_match.py` - Process the latest match
- `trigger_ml_for_match.py` - Trigger ML pipeline for a specific match
- `trigger_ml_pipeline.py` - Trigger ML pipeline processing
- `trigger_ml_simple.py` - Simple ML pipeline trigger

## Usage

All scripts are designed to be run from the project root directory. They automatically resolve paths relative to the project root.

Example:
```bash
# From project root
./Utilities/apps/api/START_API.sh
./Utilities/scripts/START_ALL_SERVICES.sh
```



