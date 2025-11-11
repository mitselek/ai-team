#!/bin/bash
# Test HR Interview API with existing demo data

BASE_URL="http://localhost:3000"

echo "=== Testing HR Interview API ==="
echo

# Get first team and agent
echo "1. Getting team and agent info..."
TEAM=$(curl -s $BASE_URL/api/teams | jq -r '.[0].id' 2>/dev/null)
AGENT=$(curl -s $BASE_URL/api/agents | jq -r '.[0].id' 2>/dev/null)

echo "Team ID: $TEAM"
echo "Agent ID: $AGENT"
echo

# Start interview
echo "2. Starting interview..."
SESSION=$(curl -s -X POST $BASE_URL/api/interview/start \
  -H "Content-Type: application/json" \
  -d "{\"teamId\":\"$TEAM\",\"interviewerId\":\"$AGENT\"}" \
  | tee /tmp/start-response.json \
  | jq -r '.sessionId // .id // empty' 2>/dev/null)

if [ -z "$SESSION" ]; then
  echo "❌ Failed to start interview"
  cat /tmp/start-response.json | jq .
  exit 1
fi

echo "✅ Session ID: $SESSION"
echo "   Greeting: $(cat /tmp/start-response.json | jq -r '.greeting')"
echo "   First Question: $(cat /tmp/start-response.json | jq -r '.firstQuestion')"
echo

# Get session details
echo "3. Getting session details..."
curl -s $BASE_URL/api/interview/$SESSION | jq '{status, currentState, transcript: (.transcript | length)}'
echo

# Submit response
echo "4. Submitting candidate response..."
curl -s -X POST $BASE_URL/api/interview/$SESSION/respond \
  -H "Content-Type: application/json" \
  -d '{"response":"I am a senior backend engineer with 10 years of experience in Python and TypeScript"}' \
  | jq '{nextQuestion, complete}'
echo

# List interviews
echo "5. Listing all interviews for team..."
curl -s "$BASE_URL/api/interviews?teamId=$TEAM" | jq 'length'
echo " interviews found"
echo

# Cancel interview
echo "6. Cancelling interview..."
curl -s -X POST $BASE_URL/api/interview/$SESSION/cancel \
  -H "Content-Type: application/json" \
  -d '{"reason":"Testing complete"}' \
  | jq .
echo

echo "=== Test Complete ==="
