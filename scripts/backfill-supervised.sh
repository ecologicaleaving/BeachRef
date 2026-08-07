#!/bin/bash
# Un giro di backfill su una stagione, sorvegliato: rilancia se si interrompe.
#
#   export SUPABASE_URL='https://<progetto>.supabase.co'
#   export SUPABASE_SERVICE_ROLE_KEY='<service_role>'
#   bash scripts/backfill-supervised.sh 2024 [max_rilanci]
#
# =============================================================================
# PERCHE' ESISTE, OLTRE A `backfill-run.sh`
# =============================================================================
#
# Due guasti osservati, entrambi silenziosi:
#
# 1. Il worker Deno e' morto per primo, e `backfill-run.sh` ha continuato a
#    parlare con un indirizzo morto per quattro cicli senza accorgersene: il
#    contatore fermo e gli orari che si stringevano erano l'unico indizio.
#    Qui il worker viene VERIFICATO prima di ogni tentativo, e riavviato.
#
# 2. Il processo e' stato ucciso di netto, e la `trap EXIT` di `backfill-run.sh`
#    non ha spento la coda: l'ho trovata accesa, con tre unita' prelevate e mai
#    chiuse. Una protezione che presuppone una morte con garbo non e' una
#    protezione, ed e' il motivo per cui questo file spegne la coda a ogni
#    uscita — pur restando vulnerabile allo stesso kill duro.

set -u

STAGIONE="${1:-}"
MAX_RILANCI="${2:-3}"

if [ -z "$STAGIONE" ]; then
  echo "uso: bash scripts/backfill-supervised.sh <stagione> [max_rilanci]" >&2
  exit 2
fi
if [ -z "${SUPABASE_URL:-}" ] || [ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]; then
  echo "mancano SUPABASE_URL e/o SUPABASE_SERVICE_ROLE_KEY" >&2
  exit 2
fi

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORKER_DIR="$REPO/supabase/functions/backfill-worker"
WORKER="${WORKER_URL:-http://localhost:8000}"
H1="apikey: $SUPABASE_SERVICE_ROLE_KEY"
H2="Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"

rimasti() {
  curl -s -I "$SUPABASE_URL/rest/v1/sync_backlog?select=event_no&season=eq.$STAGIONE&status=in.(pending,running)&limit=0" \
    -H "$H1" -H "$H2" -H "Prefer: count=exact" \
    | tr -d '\r' | sed -n 's/.*content-range: \*\///Ip'
}

spegni_coda() {
  curl -s -X PATCH "$SUPABASE_URL/rest/v1/sync_backlog_config?id=eq.true" \
    -H "$H1" -H "$H2" -H "Content-Type: application/json" -H "Prefer: return=minimal" \
    -d '{"enabled":false}' >/dev/null
}
trap 'spegni_coda; echo "== coda spenta"' EXIT

worker_vivo() {
  curl -s -o /dev/null -m 3 -w '%{http_code}' -X POST "$WORKER/progress" -H "$H2" 2>/dev/null \
    | grep -q '^[24]'
}

avvia_worker() {
  if worker_vivo; then return 0; fi
  echo "-- avvio il worker"
  ( cd "$WORKER_DIR" && deno run --allow-env --allow-net index.ts >/dev/null 2>&1 & )
  for _ in $(seq 1 15); do
    sleep 1
    worker_vivo && { echo "-- worker su"; return 0; }
  done
  echo "!! il worker non risponde"
  return 1
}

for tentativo in $(seq 0 "$MAX_RILANCI"); do
  n=$(rimasti)
  [ -z "$n" ] && { echo "!! conteggio non leggibile"; exit 2; }
  [ "$n" -eq 0 ] && { echo "== stagione $STAGIONE COMPLETA (dopo $tentativo rilanci)"; exit 0; }

  [ "$tentativo" -gt 0 ] && echo "== rilancio $tentativo di $MAX_RILANCI — restano $n eventi"

  avvia_worker || exit 2
  bash "$REPO/scripts/backfill-run.sh" "$STAGIONE"
done

n=$(rimasti)
[ "$n" -eq 0 ] && { echo "== stagione $STAGIONE COMPLETA"; exit 0; }
echo "!! esauriti i $MAX_RILANCI rilanci, restano $n eventi"
exit 1
