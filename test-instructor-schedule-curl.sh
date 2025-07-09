#!/bin/bash

# Test Instructor Schedule Endpoint with curl
# This script provides a quick way to test the instructor schedule endpoint

echo "🧪 Testing Instructor Schedule Endpoint with curl"
echo "=================================================="

# Base URL
BASE_URL="http://localhost:3001/api/v1"

# Step 1: Login to get token
echo -e "\n1. 🔐 Logging in as instructor..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "instructor",
    "password": "test123"
  }')

# Extract token from response
TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo "❌ Failed to get access token"
    echo "Login response: $LOGIN_RESPONSE"
    exit 1
fi

echo "✅ Login successful"
echo "Token: ${TOKEN:0:20}..."

# Step 2: Test schedule endpoint
echo -e "\n2. 📋 Testing GET /instructor/schedule..."

SCHEDULE_RESPONSE=$(curl -s -X GET "$BASE_URL/instructor/schedule" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

echo "Response:"
echo "$SCHEDULE_RESPONSE" | jq '.' 2>/dev/null || echo "$SCHEDULE_RESPONSE"

# Step 3: Test without authentication (should fail)
echo -e "\n3. 🚨 Testing without authentication (should fail)..."
UNAUTH_RESPONSE=$(curl -s -w "%{http_code}" -X GET "$BASE_URL/instructor/schedule" \
  -H "Content-Type: application/json")

HTTP_CODE="${UNAUTH_RESPONSE: -3}"
RESPONSE_BODY="${UNAUTH_RESPONSE%???}"

if [ "$HTTP_CODE" = "401" ]; then
    echo "✅ Properly rejects unauthenticated requests (401)"
else
    echo "❌ Expected 401, got $HTTP_CODE"
    echo "Response: $RESPONSE_BODY"
fi

# Step 4: Test with invalid token (should fail)
echo -e "\n4. 🚨 Testing with invalid token (should fail)..."
INVALID_RESPONSE=$(curl -s -w "%{http_code}" -X GET "$BASE_URL/instructor/schedule" \
  -H "Authorization: Bearer invalid-token" \
  -H "Content-Type: application/json")

HTTP_CODE="${INVALID_RESPONSE: -3}"
RESPONSE_BODY="${INVALID_RESPONSE%???}"

if [ "$HTTP_CODE" = "401" ]; then
    echo "✅ Properly rejects invalid token (401)"
else
    echo "❌ Expected 401, got $HTTP_CODE"
    echo "Response: $RESPONSE_BODY"
fi

echo -e "\n🎉 curl testing completed!"
echo "==================================================" 