#!/bin/bash
# Smoke tests — curl-based route verification (issue #34: per-route SSG serving)
# Uso: ./tests/curl-tests.sh [BASE_URL]
# Default: https://beachrefs.netlify.app

BASE_URL="${1:-https://beachrefs.netlify.app}"
PASS=0
FAIL=0

check() {
  local desc="$1" url="$2" expected="$3"
  local status
  status=$(curl -s -o /dev/null -w "%{http_code}" "$url")
  if [ "$status" = "$expected" ]; then
    echo "✅ $desc (HTTP $status)"
    ((PASS++))
  else
    echo "❌ $desc — expected $expected, got $status"
    ((FAIL++))
  fi
}

# check that a URL serves per-route prerendered HTML containing a marker string
check_content() {
  local desc="$1" url="$2" marker="$3"
  if curl -s "$url" | grep -q "$marker"; then
    echo "✅ $desc (contains \"$marker\")"
    ((PASS++))
  else
    echo "❌ $desc — marker \"$marker\" not found in response"
    ((FAIL++))
  fi
}

# --- Test ---
check "Homepage loads" "$BASE_URL/" "200"
check "Tournament selection route" "$BASE_URL/tournament-selection" "200"
check "Referee dashboard route" "$BASE_URL/referee-dashboard" "200"
check "Match detail route" "$BASE_URL/match-detail" "200"

# issue #34: each route must serve its OWN prerendered HTML (not the index splash)
check_content "Per-route prerender: tournament-selection header" \
  "$BASE_URL/tournament-selection" "Tournament Selection"

echo ""
echo "=== Risultati: $PASS passed, $FAIL failed ==="
[ "$FAIL" -gt 0 ] && exit 1 || exit 0
