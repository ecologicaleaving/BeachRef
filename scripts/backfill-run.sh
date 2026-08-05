#!/bin/bash
# Un giro di backfill su UNA stagione, dall'inizio alla fine (issue #90/#91).
#
#   export SUPABASE_URL='https://<progetto>.supabase.co'
#   export SUPABASE_SERVICE_ROLE_KEY='<service_role>'
#   export WORKER_URL='http://localhost:8000'      # o l'Edge Function
#
#   bash scripts/backfill-run.sh 2026            # lavora cio' che manca
#   bash scripts/backfill-run.sh 2026 --requeue  # rimette in coda TUTTO il 2026
#
# `--requeue` serve quando cambia CIO' CHE CHIEDIAMO al VIS, non quando qualcosa
# e' fallito: le partite gia' scaricate non hanno i campi che allora non
# chiedevamo. E' il caso di `RoundName` (la fase), assente su tutte le partite
# scaricate prima del 2026-08-05.
#
# =============================================================================
# PERCHE' ACCENDE E SPEGNE LA CODA
# =============================================================================
#
# `sync_backlog_config.enabled` e' l'interruttore che ferma il prelievo lato
# database. Resta SPENTO per difetto perche' il VIS e' un servizio fragile e
# durante un torneo in corso ha di meglio da fare che rispondere a noi. Questo
# script lo accende all'inizio e lo rispegne alla fine — anche se interrotto
# (trap EXIT), perche' una coda lasciata accesa per errore e' esattamente il
# modo in cui parte un giro che nessuno ha deciso.

set -u

STAGIONE="${1:-}"
RIACCODA="${2:-}"
WORKER="${WORKER_URL:-http://localhost:8000}"

if [ -z "$STAGIONE" ]; then
  echo "uso: bash scripts/backfill-run.sh <stagione> [--requeue]" >&2
  exit 2
fi
if [ -z "${SUPABASE_URL:-}" ] || [ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]; then
  echo "mancano SUPABASE_URL e/o SUPABASE_SERVICE_ROLE_KEY" >&2
  exit 2
fi

H1="apikey: $SUPABASE_SERVICE_ROLE_KEY"
H2="Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
H3="Content-Type: application/json"

interruttore() {
  curl -s -X PATCH "$SUPABASE_URL/rest/v1/sync_backlog_config?id=eq.true" \
    -H "$H1" -H "$H2" -H "$H3" -H "Prefer: return=minimal" \
    -d "{\"enabled\":$1}" >/dev/null
}

rimasti() {
  curl -s -I "$SUPABASE_URL/rest/v1/sync_backlog?select=event_no&season=eq.$STAGIONE&status=in.(pending,running)&limit=0" \
    -H "$H1" -H "$H2" -H "Prefer: count=exact" \
    | tr -d '\r' | sed -n 's/.*content-range: \*\///Ip'
}

spegni() { echo "== spengo la coda"; interruttore false; }
trap spegni EXIT

if [ "$RIACCODA" = "--requeue" ]; then
  echo "== rimetto in coda tutta la stagione $STAGIONE"
  curl -s -X PATCH "$SUPABASE_URL/rest/v1/sync_backlog?season=eq.$STAGIONE" \
    -H "$H1" -H "$H2" -H "$H3" -H "Prefer: return=minimal" \
    -d '{"status":"pending","attempts":0,"claimed_at":null,"last_error":null}' >/dev/null
fi

n=$(rimasti)
if [ -z "$n" ]; then echo "!! conteggio non leggibile"; exit 2; fi
echo "== stagione $STAGIONE: $n eventi da lavorare"
if [ "$n" -eq 0 ]; then exit 0; fi

echo "== accendo la coda"
interruttore true

giro=0
while :; do
  n=$(rimasti)
  if [ -z "$n" ]; then echo "!! conteggio non leggibile, mi fermo"; exit 2; fi
  if [ "$n" -eq 0 ]; then echo "== stagione $STAGIONE esaurita dopo $giro cicli"; break; fi

  giro=$((giro + 1))
  printf '%s  ciclo %d | rimasti %s  ' "$(date +%H:%M:%S)" "$giro" "$n"
  curl -s -X POST "$WORKER/" -H "$H2" -H "$H3" \
    | tr -d '\n' | sed 's/  */ /g'
  echo
  # Il ritmo verso il VIS lo impone `vis_min_interval_ms` dentro il worker.
  # Questa pausa serve solo a non tempestare di richieste il worker stesso.
  sleep 2
done

echo "== riepilogo"
curl -s "$SUPABASE_URL/rest/v1/sync_backlog_progress?select=*" -H "$H1" -H "$H2"
echo
