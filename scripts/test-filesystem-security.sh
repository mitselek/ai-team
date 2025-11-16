#!/bin/bash

# Filesystem Security Test Suite
# Tests Alex agent's access to various workspace paths

ALEX_ID="31dbe1a3-959d-4299-b5e9-4b555d8823ae"
NEXUS_ID="d3035ecd-92c1-4ea2-9061-281294986fc6"
MARCUS_ID="72e10c47-68e4-46ee-a941-c35a3d541c0a"
HR_TEAM_ID="0af61814-2416-45a1-b3e9-2315e9a1bc5d"

API_URL="http://localhost:3000/api/agents/$ALEX_ID/chat"

PASSED=0
FAILED=0

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

test_operation() {
    local test_name="$1"
    local message="$2"
    local expected_result="$3"  # "ALLOW" or "DENY"
    
    echo -e "${YELLOW}[TEST]${NC} $test_name"
    
    response=$(curl -s -X POST "$API_URL" \
        -H "Content-Type: application/json" \
        -d "{\"message\": \"$message\"}" | jq -r '.response')
    
    if [ "$expected_result" = "ALLOW" ]; then
        if echo "$response" | grep -qi "permission denied\|access denied\|do not have"; then
            echo -e "${RED}[FAIL]${NC} Expected ALLOW but got DENY"
            echo "       Response: ${response:0:100}..."
            FAILED=$((FAILED + 1))
            return 1
        else
            echo -e "${GREEN}[PASS]${NC} Access granted as expected"
            PASSED=$((PASSED + 1))
            return 0
        fi
    else  # DENY expected
        if echo "$response" | grep -qi "permission denied\|access denied\|do not have"; then
            echo -e "${GREEN}[PASS]${NC} Access denied as expected"
            PASSED=$((PASSED + 1))
            return 0
        else
            echo -e "${RED}[FAIL]${NC} Expected DENY but got ALLOW"
            echo "       Response: ${response:0:100}..."
            FAILED=$((FAILED + 1))
            return 1
        fi
    fi
}

echo "=============================================="
echo "   Filesystem Security Test Suite"
echo "   Testing Agent: Alex ($ALEX_ID)"
echo "=============================================="
echo ""

echo "=== 1. OWN PRIVATE DIRECTORY (SHOULD ALLOW) ==="
test_operation \
    "Read own private file" \
    "Please read /agents/$ALEX_ID/private/my-docs.txt" \
    "ALLOW"

test_operation \
    "Write to own private directory" \
    "Please write 'Test content' to /agents/$ALEX_ID/private/new-file.txt" \
    "ALLOW"

test_operation \
    "List own private directory" \
    "Please list files in /agents/$ALEX_ID/private/" \
    "ALLOW"

echo ""
echo "=== 2. OWN SHARED DIRECTORY (SHOULD ALLOW) ==="
test_operation \
    "Read own shared file" \
    "Please read /agents/$ALEX_ID/shared/public-info.txt" \
    "ALLOW"

test_operation \
    "Write to own shared directory" \
    "Please write 'Shared content' to /agents/$ALEX_ID/shared/new-shared.txt" \
    "ALLOW"

echo ""
echo "=== 3. OTHER AGENT PRIVATE (SHOULD DENY) ==="
test_operation \
    "Read Nexus private file" \
    "Please read /agents/$NEXUS_ID/private/project-notes.txt" \
    "DENY"

test_operation \
    "List Nexus private directory" \
    "Please list files in /agents/$NEXUS_ID/private/" \
    "DENY"

test_operation \
    "Write to Nexus private directory" \
    "Please write 'Hack attempt' to /agents/$NEXUS_ID/private/hacked.txt" \
    "DENY"

echo ""
echo "=== 4. OTHER AGENT SHARED (READ ALLOW, WRITE DENY) ==="
test_operation \
    "Read Nexus shared file" \
    "Please read /agents/$NEXUS_ID/shared/api-docs.txt" \
    "ALLOW"

test_operation \
    "Write to Nexus shared directory" \
    "Please write 'Unauthorized' to /agents/$NEXUS_ID/shared/unauthorized.txt" \
    "DENY"

echo ""
echo "=== 5. SAME TEAM MEMBER (Marcus on HR Team) ==="
test_operation \
    "Read Marcus private file" \
    "Please read /agents/$MARCUS_ID/private/interviews.txt" \
    "DENY"

test_operation \
    "Read Marcus shared file" \
    "Please read /agents/$MARCUS_ID/shared/templates.txt" \
    "ALLOW"

echo ""
echo "=== 6. TEAM PRIVATE DIRECTORY (SHOULD ALLOW - same team) ==="
test_operation \
    "Read team private file" \
    "Please read /teams/$HR_TEAM_ID/private/policies.txt" \
    "ALLOW"

test_operation \
    "Write to team private directory" \
    "Please write 'Team note' to /teams/$HR_TEAM_ID/private/new-policy.txt" \
    "ALLOW"

echo ""
echo "=== 7. TEAM SHARED DIRECTORY (SHOULD ALLOW) ==="
test_operation \
    "Read team shared file" \
    "Please read /teams/$HR_TEAM_ID/shared/job-postings.txt" \
    "ALLOW"

test_operation \
    "Write to team shared directory" \
    "Please write 'New posting' to /teams/$HR_TEAM_ID/shared/new-job.txt" \
    "ALLOW"

echo ""
echo "=== 8. ORGANIZATION PUBLIC (SHOULD ALLOW) ==="
test_operation \
    "Read org public file" \
    "Please read /organization/public/announcements.txt" \
    "ALLOW"

test_operation \
    "Write to org public directory" \
    "Please write 'Company news' to /organization/public/news.txt" \
    "ALLOW"

echo ""
echo "=============================================="
echo "   Test Results Summary"
echo "=============================================="
echo -e "${GREEN}PASSED:${NC} $PASSED tests"
echo -e "${RED}FAILED:${NC} $FAILED tests"
echo "TOTAL:  $((PASSED + FAILED)) tests"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed${NC}"
    exit 1
fi
