#!/bin/bash
# Smoke tests — curl-based API/route/header verification
# Uso: ./tests/curl-tests.sh [BASE_URL]
# Default: https://beachrefs.netlify.app
#
# Punta lo script al deploy preview per validare una PR, es.
#   ./tests/curl-tests.sh https://deploy-preview-37--beachrefs.netlify.app

BASE_URL="${1:-https://beachrefs.netlify.app}"
BASE_URL="${BASE_URL%/}"
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

# check that a response header matches a regex (case-insensitive)
check_header() {
  local desc="$1" url="$2" pattern="$3"
  local headers
  headers=$(curl -sI -L "$url")
  if echo "$headers" | grep -qiE "$pattern"; then
    echo "✅ $desc"
    ((PASS++))
  else
    echo "❌ $desc — no header matching /$pattern/"
    echo "$headers" | sed 's/^/     | /'
    ((FAIL++))
  fi
}

# check that a response header is ABSENT
check_header_absent() {
  local desc="$1" url="$2" pattern="$3"
  local headers
  headers=$(curl -sI -L "$url")
  if echo "$headers" | grep -qiE "$pattern"; then
    echo "❌ $desc — header matching /$pattern/ is present but must not be"
    echo "$headers" | grep -iE "$pattern" | sed 's/^/     | /'
    ((FAIL++))
  else
    echo "✅ $desc"
    ((PASS++))
  fi
}

# Resolve the URL of a hashed Expo chunk from the prerendered HTML of a route.
# Echoes an absolute URL, or nothing if no chunk could be found.
resolve_expo_chunk() {
  local page="$1"
  local path
  path=$(curl -s "$page" \
    | grep -oE '/_expo/static/js/web/[A-Za-z0-9._-]+\.js' \
    | head -n 1)
  [ -n "$path" ] && echo "${BASE_URL}${path}"
}

echo "Base URL: $BASE_URL"
echo ""

# --- Routing (issue #34: per-route SSG serving) ---
check "Homepage loads" "$BASE_URL/" "200"
check "Tournament selection route" "$BASE_URL/tournament-selection" "200"
check "Referee dashboard route" "$BASE_URL/referee-dashboard" "200"
check "Match detail route" "$BASE_URL/match-detail" "200"

# issue #34/#36 AC5: each route must serve its OWN prerendered HTML (not the
# index splash). A `/* -> /index.html 200` catch-all would break this.
check_content "AC5 — per-route prerender: tournament-selection header" \
  "$BASE_URL/tournament-selection" "Tournament Selection"
check_content "AC5 — per-route prerender: route-specific chunk is referenced" \
  "$BASE_URL/tournament-selection" "tournament-selection-"

# --- issue #36 AC1: Clear-Site-Data must be gone everywhere ---
check_header_absent "AC1 — no Clear-Site-Data on the document" \
  "$BASE_URL/" "^clear-site-data:"
check_header_absent "AC1 — no Clear-Site-Data on /tournament-selection" \
  "$BASE_URL/tournament-selection" "^clear-site-data:"

# --- issue #36 AC3: HTML documents must never be cached ---
check_header "AC3 — HTML / is no-store" \
  "$BASE_URL/" "^cache-control:.*no-store"
check_header "AC3 — HTML /tournament-selection is no-store" \
  "$BASE_URL/tournament-selection" "^cache-control:.*no-store"

# --- issue #36 AC1+AC2: hashed Expo chunks are immutable, no Clear-Site-Data ---
CHUNK_URL=$(resolve_expo_chunk "$BASE_URL/tournament-selection")
if [ -z "$CHUNK_URL" ]; then
  echo "❌ AC2 — could not find any /_expo/static/js/web/*.js chunk in the HTML"
  ((FAIL++))
else
  echo "   (chunk under test: $CHUNK_URL)"
  check_header "AC2 — Expo chunk is immutable" \
    "$CHUNK_URL" "^cache-control:.*immutable"
  check_header "AC2 — Expo chunk has a 1 year max-age" \
    "$CHUNK_URL" "^cache-control:.*max-age=31536000"
  check_header_absent "AC2 — Expo chunk is NOT max-age=0 (generic /*.js rule must not win)" \
    "$CHUNK_URL" "^cache-control:.*max-age=0"
  check_header_absent "AC1 — no Clear-Site-Data on the Expo chunk" \
    "$CHUNK_URL" "^clear-site-data:"
fi

# --- issue #36: the service worker itself must never be cached ---
check_header "SW — service-worker.js is not cached" \
  "$BASE_URL/service-worker.js" "^cache-control:.*(no-store|no-cache)"

echo ""
echo "=== Risultati: $PASS passed, $FAIL failed ==="
[ "$FAIL" -gt 0 ] && exit 1 || exit 0
