#!/bin/bash
# Runs the SQL migration tests against a throwaway PostgreSQL in Docker.
# Never touches the project. Issue #89.
#
#   bash supabase/tests/run-migration-tests.sh
#
# Each test file gets its OWN database: they install conflicting fixtures on
# purpose (one with migration 017's default privileges in force, one without),
# and sharing a database between them would make the second one's result depend
# on the first one's leftovers.

set -u

# Git Bash / MSYS rewrites any argument that looks like a Unix absolute path
# into a Windows one before the process sees it, so `docker exec … -f /repo/x`
# arrives as `C:/Program Files/Git/repo/x` and the file is reported missing.
# These two switch that translation off for the docker invocations below; they
# are inert on Linux and macOS.
export MSYS_NO_PATHCONV=1
export MSYS2_ARG_CONV_EXCL="*"

CONTAINER="beachref-migration-test"
IMAGE="postgres:15"
PASS=0
FAIL=0

cleanup() { docker rm -f "$CONTAINER" >/dev/null 2>&1 || true; }
trap cleanup EXIT

echo "==> starting $IMAGE as $CONTAINER"
cleanup
docker run -d --name "$CONTAINER" -e POSTGRES_PASSWORD=postgres "$IMAGE" >/dev/null || {
  echo "could not start the container — is Docker running?"; exit 2; }

# Copy the repo's supabase/ in rather than bind-mounting it: on Windows hosts a
# bind mount of a path like C:\Users\... reaches the Linux container with
# permissions psql cannot always read, and the failure looks like a missing file.
#
# The source path has the mirror-image problem: with path conversion off, Git
# Bash hands docker a `/c/Users/...` path, which Docker Desktop reads as a
# relative path under `C:\`. `pwd -W` gives the native form; on Linux and macOS
# it is not a valid flag, so the plain `pwd` is used there.
SUPABASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && { pwd -W 2>/dev/null || pwd; })"
docker exec "$CONTAINER" mkdir -p /repo
docker cp "$SUPABASE_DIR" "$CONTAINER:/repo/supabase" >/dev/null

echo -n "==> waiting for postgres"
for _ in $(seq 1 30); do
  if docker exec "$CONTAINER" pg_isready -U postgres >/dev/null 2>&1; then break; fi
  echo -n "."; sleep 1
done
echo

run_test() {
  local name="$1" file="$2" db
  db="$(echo "$name" | tr -cd '[:alnum:]_')"
  echo
  echo "=============================================================="
  echo "  $name"
  echo "=============================================================="
  docker exec "$CONTAINER" psql -U postgres -q -c "DROP DATABASE IF EXISTS $db" >/dev/null 2>&1
  docker exec "$CONTAINER" psql -U postgres -q -c "CREATE DATABASE $db" >/dev/null 2>&1

  if docker exec "$CONTAINER" psql -U postgres -d "$db" -v ON_ERROR_STOP=1 -f "$file"; then
    PASS=$((PASS + 1))
  else
    echo "  ^^^ FAILED: $name"
    FAIL=$((FAIL + 1))
  fi
}

run_test "match_referees_restore"      /repo/supabase/tests/match_referees_restore.test.sql
run_test "match_referees_restore_leak" /repo/supabase/tests/match_referees_restore.leak.test.sql
run_test "sync_backlog"                /repo/supabase/tests/sync_backlog.test.sql
run_test "referees_name_not_identity"  /repo/supabase/tests/referees_name_not_identity.test.sql
run_test "referee_stats"               /repo/supabase/tests/referee_stats.test.sql

echo
echo "=== Risultati: $PASS passed, $FAIL failed ==="
[ "$FAIL" -gt 0 ] && exit 1 || exit 0
