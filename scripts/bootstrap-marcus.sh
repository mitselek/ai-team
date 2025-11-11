#!/bin/bash

# Bootstrap Marcus - Creates Marcus agent and starts an interview session
# Usage: ./scripts/bootstrap-marcus.sh

set -e

BASE_URL="${BASE_URL:-http://localhost:3000}"

echo "🚀 Bootstrapping Marcus..."
echo ""

# Get HR Team
echo "📋 Finding HR Team..."
TEAM_ID=$(curl -s "$BASE_URL/api/teams" | jq -r '.[] | select(.name=="HR Team") | .id')

if [ -z "$TEAM_ID" ] || [ "$TEAM_ID" = "null" ]; then
  echo "❌ Error: HR Team not found"
  echo "   Make sure the server is running and demo seed has created the team"
  exit 1
fi

echo "✅ HR Team found: $TEAM_ID"
echo ""

# Check if Marcus already exists
echo "🔍 Checking for existing Marcus..."
EXISTING_MARCUS=$(curl -s "$BASE_URL/api/agents" | jq -r ".[] | select(.teamId==\"$TEAM_ID\" and .name==\"Marcus\") | .id")

if [ -n "$EXISTING_MARCUS" ] && [ "$EXISTING_MARCUS" != "null" ]; then
  echo "✅ Marcus already exists: $EXISTING_MARCUS"
  MARCUS_ID="$EXISTING_MARCUS"
else
  # Create Marcus
  echo "👤 Creating Marcus..."
  MARCUS_ID=$(curl -s -X POST "$BASE_URL/api/agents" \
    -H "Content-Type: application/json" \
    -d "{
      \"organizationId\": null,
      \"teamId\": \"$TEAM_ID\",
      \"name\": \"Marcus\",
      \"role\": \"HR Specialist\",
      \"systemPrompt\": \"You are Marcus, an HR specialist who helps recruit new AI agents.\",
      \"expertise\": [\"recruitment\", \"interviewing\"],
      \"tokenAllocation\": 500000
    }" | jq -r '.id')

  if [ -z "$MARCUS_ID" ] || [ "$MARCUS_ID" = "null" ]; then
    echo "❌ Error: Failed to create Marcus"
    exit 1
  fi

  echo "✅ Marcus created: $MARCUS_ID"
fi

echo ""

# Start interview
echo "💬 Starting interview session..."
RESPONSE=$(curl -s -X POST "$BASE_URL/api/interview/start" \
  -H "Content-Type: application/json" \
  -d "{
    \"teamId\": \"$TEAM_ID\",
    \"interviewerId\": \"$MARCUS_ID\"
  }")

SESSION_ID=$(echo "$RESPONSE" | jq -r '.sessionId')
GREETING=$(echo "$RESPONSE" | jq -r '.greeting' | head -c 80)

if [ -z "$SESSION_ID" ] || [ "$SESSION_ID" = "null" ]; then
  echo "❌ Error: Failed to start interview"
  echo "$RESPONSE" | jq '.'
  exit 1
fi

echo "✅ Interview started: $SESSION_ID"
echo ""
echo "📝 Marcus says:"
echo "   \"$GREETING...\""
echo ""
echo "🌐 Open in browser:"
echo "   $BASE_URL/interviews/$SESSION_ID"
echo ""
echo "✨ Done!"
