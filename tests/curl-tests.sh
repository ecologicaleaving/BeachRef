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

# --- issue #38: the entry chunk must not put weight back on ---
#
# Over 95% of the residual LCP is parse+execute of `entry-<hash>.js`, so its
# size is a user-facing metric and a regression in it is a regression in the
# product. The ceiling below is the size measured on the deploy of #38 plus a
# 10% tolerance; it is deliberately a hard number and not a ratio, so that
# adding weight requires a conscious decision to raise it here.
#
# Measured with brotli, which is what browsers actually receive (Netlify
# negotiates `content-encoding: br`). Raw size is reported for context only.
ENTRY_MAX_BROTLI_BYTES=550000

check_entry_bundle_size() {
  local page="$1"
  local entry_path entry_url brotli_bytes raw_bytes

  entry_path=$(curl -s "$page" \
    | grep -oE '/_expo/static/js/web/entry-[A-Za-z0-9._-]+\.js' \
    | head -n 1)

  if [ -z "$entry_path" ]; then
    echo "❌ AC2 (#38) — could not find the entry chunk in the HTML of $page"
    ((FAIL++))
    return
  fi

  entry_url="${BASE_URL}${entry_path}"
  brotli_bytes=$(curl -s -H 'Accept-Encoding: br' -o /dev/null -w '%{size_download}' "$entry_url")
  raw_bytes=$(curl -s -H 'Accept-Encoding: identity' -o /dev/null -w '%{size_download}' "$entry_url")

  echo "   (entry chunk: $entry_path — ${brotli_bytes} B brotli / ${raw_bytes} B raw)"

  if [ -z "$brotli_bytes" ] || [ "$brotli_bytes" -eq 0 ]; then
    echo "❌ AC2 (#38) — could not measure the entry chunk"
    ((FAIL++))
  elif [ "$brotli_bytes" -le "$ENTRY_MAX_BROTLI_BYTES" ]; then
    echo "✅ AC2 (#38) — entry chunk within budget (${brotli_bytes} B br <= ${ENTRY_MAX_BROTLI_BYTES} B)"
    ((PASS++))
  else
    echo "❌ AC2 (#38) — entry chunk over budget: ${brotli_bytes} B br > ${ENTRY_MAX_BROTLI_BYTES} B"
    echo "     Something heavy was added to the boot path. Find it with:"
    echo "       npx expo export --platform web --source-maps --output-dir dist-map"
    echo "       node scripts/analyze-bundle.js dist-map --top 20"
    ((FAIL++))
  fi
}

check_entry_bundle_size "$BASE_URL/tournament-selection"

# issue #38 AC3: no __DEV__-only service may reach the production bundle.
check_no_dev_services_in_entry() {
  local page="$1"
  local entry_path body marker found

  entry_path=$(curl -s "$page" \
    | grep -oE '/_expo/static/js/web/entry-[A-Za-z0-9._-]+\.js' \
    | head -n 1)

  if [ -z "$entry_path" ]; then
    echo "❌ AC3 (#38) — could not find the entry chunk in the HTML of $page"
    ((FAIL++))
    return
  fi

  body=$(curl -s "${BASE_URL}${entry_path}")
  found=""
  for marker in ApiAuditService AuditReportGenerator AuditStorageService \
                FieldSelectionValidator react-native-network-logger; do
    if echo "$body" | grep -q "$marker"; then
      found="$found $marker"
    fi
  done

  if [ -z "$found" ]; then
    echo "✅ AC3 (#38) — no __DEV__-only audit/logger service in the entry chunk"
    ((PASS++))
  else
    echo "❌ AC3 (#38) — dev-only symbols present in the production entry chunk:$found"
    ((FAIL++))
  fi
}

check_no_dev_services_in_entry "$BASE_URL/tournament-selection"

echo ""
echo "=== Risultati: $PASS passed, $FAIL failed ==="
[ "$FAIL" -gt 0 ] && exit 1 || exit 0
