-- BeachRef Supabase Schema Setup
-- Matches TournamentCore interface from Epic 007 Data Architecture

-- Enable Row Level Security
ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- Create tournaments table matching TournamentCore interface
CREATE TABLE IF NOT EXISTS tournaments (
  -- Primary identifiers (VisEntity)
  id TEXT PRIMARY KEY,
  vis_no TEXT UNIQUE NOT NULL,
  event_no TEXT,
  version INTEGER DEFAULT 1,
  last_synced TIMESTAMPTZ DEFAULT NOW(),
  
  -- Core tournament data (TournamentCore)
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  title TEXT,
  
  -- Classification (auto-derived)
  gender TEXT CHECK (gender IN ('M', 'W', 'Mixed', 'Unknown')),
  tournament_type TEXT CHECK (tournament_type IN ('FIVB', 'BPT', 'CEV', 'LOCAL')),
  
  -- Status lifecycle
  status TEXT CHECK (status IN ('upcoming', 'qualification', 'main_draw', 'completed', 'cancelled')),
  
  -- Dates (stored as JSONB for flexibility)
  dates JSONB NOT NULL DEFAULT '{}',
  
  -- Location data (optional)
  location JSONB,
  
  -- VIS flags
  has_beach_tournament BOOLEAN DEFAULT true,
  has_volley_tournament BOOLEAN DEFAULT false,
  has_men_tournament BOOLEAN DEFAULT false,
  has_women_tournament BOOLEAN DEFAULT false,
  is_vis_managed BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create matches table for BeachMatchCore
CREATE TABLE IF NOT EXISTS matches (
  -- Primary identifiers
  id TEXT PRIMARY KEY,
  vis_no TEXT NOT NULL,
  tournament_id TEXT REFERENCES tournaments(id) ON DELETE CASCADE,
  version INTEGER DEFAULT 1,
  last_synced TIMESTAMPTZ DEFAULT NOW(),
  
  -- Match identification
  no_in_tournament TEXT,
  
  -- Scheduling
  local_date DATE,
  local_time TIME,
  court TEXT,
  round TEXT,
  phase TEXT,
  
  -- Teams and scores (stored as JSONB)
  team_a JSONB DEFAULT '{}',
  team_b JSONB DEFAULT '{}',
  score JSONB DEFAULT '{}',
  
  -- Match status
  status TEXT CHECK (status IN ('scheduled', 'ready', 'live', 'set_break', 'finished', 'official', 'corrected', 'closed')),
  
  -- Officials (stored as JSONB array)
  referees JSONB DEFAULT '[]',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tournaments_status ON tournaments(status);
CREATE INDEX IF NOT EXISTS idx_tournaments_type ON tournaments(tournament_type);
CREATE INDEX IF NOT EXISTS idx_tournaments_gender ON tournaments(gender);
CREATE INDEX IF NOT EXISTS idx_tournaments_dates ON tournaments USING GIN(dates);
CREATE INDEX IF NOT EXISTS idx_tournaments_synced ON tournaments(last_synced);

CREATE INDEX IF NOT EXISTS idx_matches_tournament ON matches(tournament_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_date ON matches(local_date);
CREATE INDEX IF NOT EXISTS idx_matches_synced ON matches(last_synced);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_tournaments_updated_at BEFORE UPDATE ON tournaments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_matches_updated_at BEFORE UPDATE ON matches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some test data to verify connection
INSERT INTO tournaments (
  id, vis_no, code, name, gender, tournament_type, status, dates
) VALUES (
  'test_tournament_1',
  'TEST001',
  'TESTBVB2025',
  'Test Beach Volleyball Tournament',
  'Mixed',
  'LOCAL',
  'upcoming',
  '{"start": "2025-08-25", "end": "2025-08-27"}'
) ON CONFLICT (id) DO NOTHING;

-- Enable RLS (optional - for future auth)
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for now (adjust when auth is implemented)
CREATE POLICY "Allow all access to tournaments" ON tournaments FOR ALL USING (true);
CREATE POLICY "Allow all access to matches" ON matches FOR ALL USING (true);