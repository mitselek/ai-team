#!/bin/bash

# Bootstrap Marcus - Starts an interview session with Marcus
# Usage: ./scripts/bootstrap-marcus.sh
#
# NOTE: Marcus is automatically created by server-side bootstrap (F012)
# on first startup. This script just verifies Marcus exists and starts
# an interview. Organization/teams/agents persist in data/organizations/

set -e

BASE_URL="${BASE_URL:-http://localhost:3000}"

echo "Bootstrapping Marcus interview..."
echo "(Marcus created automatically by server-side bootstrap)"
echo ""

# Check if organization exists (verifies bootstrap ran)
echo "Verifying organization bootstrap..."
ORG_CHECK=$(curl -s "$BASE_URL/api/organizations" | jq -r 'length')

if [ "$ORG_CHECK" = "0" ]; then
  echo "ERROR: No organization found"
  echo "  Server bootstrap should have created organization on first startup"
  echo "  Check server logs and data/organizations/ directory"
  exit 1
fi

echo "OK: Organization data loaded from filesystem"
echo ""

# Get HR Team
echo "Finding HR Team..."
TEAM_ID=$(curl -s "$BASE_URL/api/teams" | jq -r '.[] | select(.name=="HR Team") | .id')

if [ -z "$TEAM_ID" ] || [ "$TEAM_ID" = "null" ]; then
  echo "ERROR: HR Team not found"
  echo "  Server bootstrap should have created HR Team on first startup"
  echo "  Check data/organizations/*/organization.json"
  exit 1
fi

echo "OK: HR Team found: $TEAM_ID"
echo ""

# Check if Marcus already exists (should exist from bootstrap)
echo "Checking for Marcus..."
EXISTING_MARCUS=$(curl -s "$BASE_URL/api/agents" | jq -r ".[] | select(.teamId==\"$TEAM_ID\" and .name==\"Marcus\") | .id")

if [ -n "$EXISTING_MARCUS" ] && [ "$EXISTING_MARCUS" != "null" ]; then
  echo "OK: Marcus loaded from filesystem: $EXISTING_MARCUS"
  MARCUS_ID="$EXISTING_MARCUS"
else
  echo "ERROR: Marcus not found"
  echo "  Server bootstrap should have created Marcus on first startup"
  echo "  Check data/organizations/*/organization.json agents section"
  exit 1
fi

echo ""

# Start interview
echo "Starting interview session..."
RESPONSE=$(curl -s -X POST "$BASE_URL/api/interview/start" \
  -H "Content-Type: application/json" \
  -d "{
    \"teamId\": \"$TEAM_ID\",
    \"interviewerId\": \"$MARCUS_ID\"
  }")

SESSION_ID=$(echo "$RESPONSE" | jq -r '.sessionId')
GREETING=$(echo "$RESPONSE" | jq -r '.greeting' | head -c 80)

if [ -z "$SESSION_ID" ] || [ "$SESSION_ID" = "null" ]; then
  echo "ERROR: Failed to start interview"
  echo "$RESPONSE" | jq '.'
  exit 1
fi

echo "OK: Interview started: $SESSION_ID"
echo ""
echo "Marcus says:"
echo "  \"$GREETING...\""
echo ""
echo "Open in browser:"
echo "  $BASE_URL/interviews/$SESSION_ID"
echo ""
echo "Done."
