#!/bin/bash

echo "🧪 Testing Tennis Analytics API"
echo ""

# Test 1: Health Check
echo "1. Testing health endpoint..."
HEALTH=$(curl -s http://localhost:8000/health)
echo "   Response: $HEALTH"
echo ""

# Test 2: API Root
echo "2. Testing API root..."
ROOT=$(curl -s http://localhost:8000/)
echo "   Response: $ROOT"
echo ""

# Test 3: User Registration
echo "3. Testing user registration..."
REGISTER_RESPONSE=$(curl -s -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "testpass123"
  }')

if echo "$REGISTER_RESPONSE" | grep -q "email"; then
  echo "   ✅ Registration successful!"
  echo "   Response: $REGISTER_RESPONSE"
else
  echo "   ⚠️  Registration response: $REGISTER_RESPONSE"
fi
echo ""

# Test 4: User Login
echo "4. Testing user login..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=testuser&password=testpass123")

if echo "$LOGIN_RESPONSE" | grep -q "access_token"; then
  echo "   ✅ Login successful!"
  TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
  echo "   Token received: ${TOKEN:0:20}..."
else
  echo "   ⚠️  Login response: $LOGIN_RESPONSE"
fi
echo ""

echo "✅ API tests complete!"
echo ""
echo "Next: Visit http://localhost:8000/docs for interactive API testing"
