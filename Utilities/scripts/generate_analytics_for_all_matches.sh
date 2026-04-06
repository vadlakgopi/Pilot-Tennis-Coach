#!/bin/bash

# Generate mock analytics for all matches that don't have analytics yet
# This is a helper script for development

echo "🎾 Generating Analytics for All Matches"
echo "========================================"
echo ""

# Get auth token
TOKEN=$(curl -s -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=testuser&password=testpass123" 2>&1 | \
  python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('access_token', ''))" 2>/dev/null)

if [ -z "$TOKEN" ] || [ "$TOKEN" = "None" ]; then
  echo "❌ Failed to get authentication token"
  echo "   Make sure the API is running and credentials are correct"
  exit 1
fi

echo "✅ Authentication successful"
echo ""

# Get all match IDs from database
MATCH_IDS=$(psql -d tennis_analytics -t -c "SELECT id FROM matches ORDER BY id;" 2>&1 | grep -E '^[[:space:]]*[0-9]+' | tr -d ' ')

if [ -z "$MATCH_IDS" ]; then
  echo "⚠️  No matches found in database"
  exit 0
fi

# Check which matches already have analytics
MATCHES_WITH_ANALYTICS=$(psql -d tennis_analytics -t -c "SELECT match_id FROM match_stats;" 2>&1 | grep -E '^[[:space:]]*[0-9]+' | tr -d ' ')

echo "Found matches: $(echo $MATCH_IDS | wc -w | tr -d ' ')"
echo "Matches with analytics: $(echo $MATCHES_WITH_ANALYTICS | wc -w | tr -d ' ')"
echo ""

SUCCESS_COUNT=0
SKIP_COUNT=0
FAIL_COUNT=0

for MATCH_ID in $MATCH_IDS; do
  # Check if analytics already exist
  if echo "$MATCHES_WITH_ANALYTICS" | grep -q "^${MATCH_ID}$"; then
    echo "⏭️  Match $MATCH_ID already has analytics - skipping"
    SKIP_COUNT=$((SKIP_COUNT + 1))
    continue
  fi

  echo "📊 Generating analytics for Match $MATCH_ID..."
  
  RESPONSE=$(curl -s -X POST "http://localhost:8000/api/v1/analytics/matches/$MATCH_ID/mock" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" 2>&1)
  
  if echo "$RESPONSE" | python3 -c "import sys, json; json.load(sys.stdin)" 2>/dev/null; then
    RALLIES=$(echo "$RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('total_rallies', 'N/A'))" 2>/dev/null)
    echo "   ✅ Success! Generated analytics with $RALLIES rallies"
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
  else
    echo "   ❌ Failed to generate analytics"
    echo "   Response: $RESPONSE" | head -3
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi
  echo ""
done

echo "=========================================="
echo "Summary:"
echo "  ✅ Generated: $SUCCESS_COUNT"
echo "  ⏭️  Skipped: $SKIP_COUNT"
echo "  ❌ Failed: $FAIL_COUNT"
echo ""
echo "🎉 Done! All matches now have analytics."





