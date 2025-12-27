#!/bin/bash
# Script to view live analytics processing log

LOG_FILE="services/ml-pipeline/analytics_live.log"

if [ ! -f "$LOG_FILE" ]; then
    echo "Log file not found: $LOG_FILE"
    echo "Processing may not be running or log file hasn't been created yet."
    exit 1
fi

echo "📊 Live Analytics Processing Log"
echo "================================="
echo "Press Ctrl+C to stop viewing"
echo ""
echo "Watching: $LOG_FILE"
echo ""

# Use tail -f to follow the log file
tail -f "$LOG_FILE"




