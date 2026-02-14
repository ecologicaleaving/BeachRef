#!/bin/bash
# BeachRef Flutter - Run Development

# Load .env.dev
export $(cat .env.dev | xargs)

echo "🏐 Starting BeachRef Flutter (Development)"
echo "📡 Supabase: $SUPABASE_URL"
echo ""

flutter run \
  --dart-define=SUPABASE_URL=$SUPABASE_URL \
  --dart-define=SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
