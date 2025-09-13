-- Create match_referees table
CREATE TABLE IF NOT EXISTS match_referees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL,
  referee_id VARCHAR NOT NULL,
  role VARCHAR NOT NULL, -- 'first', 'second', etc.
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create matches table (referenced by match_referees)
CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_code VARCHAR NOT NULL,
  match_no VARCHAR,
  utc_datetime TIMESTAMP,
  court VARCHAR,
  status VARCHAR,
  team1_name VARCHAR,
  team2_name VARCHAR,
  score VARCHAR,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create sync_status table
CREATE TABLE IF NOT EXISTS sync_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR NOT NULL UNIQUE,
  last_sync_at TIMESTAMP,
  sync_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  status VARCHAR DEFAULT 'idle', -- 'idle', 'syncing', 'error'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add foreign key relationship
ALTER TABLE match_referees 
ADD CONSTRAINT fk_match_referees_match 
FOREIGN KEY (match_id) REFERENCES matches(id);

-- Enable RLS for all tables
ALTER TABLE match_referees ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_status ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for match_referees
CREATE POLICY "match_referees_policy" ON match_referees
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- Create permissive policies for matches
CREATE POLICY "matches_policy" ON matches
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- Create permissive policies for sync_status
CREATE POLICY "sync_status_policy" ON sync_status
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- Grant permissions
GRANT ALL ON match_referees TO anon, authenticated;
GRANT ALL ON matches TO anon, authenticated;
GRANT ALL ON sync_status TO anon, authenticated;
GRANT USAGE ON SCHEMA public TO anon, authenticated;