#!/bin/bash
# BeachRef Flutter - Run Production

# Load .env.prod
export $(cat .env.prod | xargs)

echo "🏐 Starting BeachRef Flutter (Production)"
echo "📡 Supabase: $SUPABASE_URL"
echo ""

flutter run \
  --dart-define=SUPABASE_URL=$SUPABASE_URL \
  --dart-define=SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY \
  --release
