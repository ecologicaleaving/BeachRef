# Database Setup Guide

The recent matches feature requires the proper database schema. Here's how to fix it:

## Problem
The `matches` table in Supabase has the wrong structure. The current table uses:
- `tournament_code` (should be `tournament_no`)
- `vis_match_no` (should be `no`)
- Complex normalized structure with separate `match_referees` table

But our code expects the simplified schema from the documentation.

## Solution Options

### Option 1: Run Migration Script (Recommended)
1. Go to your Supabase Dashboard > SQL Editor
2. Copy and paste the content from `supabase/migrations/013_fix_matches_schema_alignment.sql`
3. Run the migration

### Option 2: Manual Table Creation
If you prefer to create the table manually, here's the essential SQL:

```sql
-- Drop existing matches table (WARNING: This will delete existing data)
DROP TABLE IF EXISTS match_referees CASCADE;
DROP TABLE IF EXISTS matches CASCADE;

-- Create simplified matches table
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  no VARCHAR NOT NULL UNIQUE,
  tournament_no VARCHAR NOT NULL,
  team_a_name VARCHAR,
  team_b_name VARCHAR,
  local_date DATE,
  local_time TIME,
  court VARCHAR,
  status VARCHAR,
  round VARCHAR,
  no_referee1 VARCHAR,
  no_referee2 VARCHAR,
  referee1_name VARCHAR,
  referee2_name VARCHAR,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_matches_tournament_no ON matches(tournament_no);
CREATE INDEX idx_matches_local_date ON matches(local_date);
CREATE INDEX idx_matches_status ON matches(status);

-- Enable RLS
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow public read" ON matches FOR SELECT USING (true);
CREATE POLICY "Allow service full access" ON matches FOR ALL USING (auth.role() = 'service_role');
```

### Option 3: Update Code to Match Existing Schema
Alternatively, we could update our code to work with the existing normalized schema, but this is more complex.

## Verification
After running the migration, the error should change from:
- `400 (Bad Request)`
To:
- `✅ Table 'matches' exists with N rows` (in console logs)

## Next Steps
Once the table structure is fixed:
1. The unified approach will work correctly
2. Recent matches will populate in the referee stats panel
3. Database caching will function as expected

## Test the Fix
After updating the database:
1. Refresh the web application
2. Open a referee stats panel
3. Check the console for: `🔍 Table check error:` vs `✅ Table 'matches' exists`