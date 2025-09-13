-- Migration 011: Add Row Level Security policies for analytics tables
-- This migration adds RLS policies to allow public access to analytics data

-- =============================================================================
-- ENABLE RLS ON ANALYTICS TABLES
-- =============================================================================

-- Enable RLS on analytics_events table
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Enable RLS on referee_analytics table
ALTER TABLE referee_analytics ENABLE ROW LEVEL SECURITY;

-- Enable RLS on referees table
ALTER TABLE referees ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- CREATE PERMISSIVE POLICIES FOR PUBLIC ACCESS
-- =============================================================================

-- Allow public read access to analytics_events
CREATE POLICY "Allow public read access to analytics_events" 
  ON analytics_events FOR SELECT 
  USING (true);

-- Allow public insert access to analytics_events (for client-side analytics)
CREATE POLICY "Allow public insert access to analytics_events" 
  ON analytics_events FOR INSERT 
  WITH CHECK (true);

-- Allow public read access to referee_analytics
CREATE POLICY "Allow public read access to referee_analytics" 
  ON referee_analytics FOR SELECT 
  USING (true);

-- Allow public read access to referees
CREATE POLICY "Allow public read access to referees" 
  ON referees FOR SELECT 
  USING (true);

-- =============================================================================
-- ADD RLS POLICIES FOR OTHER MAIN TABLES
-- =============================================================================

-- Enable RLS on tournaments table
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;

-- Allow public read access to tournaments
CREATE POLICY "Allow public read access to tournaments" 
  ON tournaments FOR SELECT 
  USING (true);

-- Enable RLS on events table (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'events') THEN
    ALTER TABLE events ENABLE ROW LEVEL SECURITY;
    
    -- Allow public read access to events
    CREATE POLICY "Allow public read access to events" 
      ON events FOR SELECT 
      USING (true);
  END IF;
END $$;

-- Enable RLS on matches table (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'matches') THEN
    ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
    
    -- Allow public read access to matches
    CREATE POLICY "Allow public read access to matches" 
      ON matches FOR SELECT 
      USING (true);
  END IF;
END $$;

-- Enable RLS on match_referees table (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'match_referees') THEN
    ALTER TABLE match_referees ENABLE ROW LEVEL SECURITY;
    
    -- Allow public read access to match_referees
    CREATE POLICY "Allow public read access to match_referees" 
      ON match_referees FOR SELECT 
      USING (true);
  END IF;
END $$;

-- =============================================================================
-- VALIDATION
-- =============================================================================

DO $$
BEGIN
  -- Validate that RLS is enabled on key tables
  ASSERT (SELECT COUNT(*) FROM pg_tables 
          WHERE schemaname = 'public' 
          AND tablename = 'analytics_events' 
          AND rowsecurity = true) = 1,
          'RLS not enabled on analytics_events table';
          
  ASSERT (SELECT COUNT(*) FROM pg_tables 
          WHERE schemaname = 'public' 
          AND tablename = 'referee_analytics' 
          AND rowsecurity = true) = 1,
          'RLS not enabled on referee_analytics table';

  -- Validate policies were created
  ASSERT (SELECT COUNT(*) FROM pg_policies 
          WHERE tablename = 'analytics_events') >= 2,
          'Analytics_events policies were not created';
          
  ASSERT (SELECT COUNT(*) FROM pg_policies 
          WHERE tablename = 'referee_analytics') >= 1,
          'Referee_analytics policies were not created';

  RAISE NOTICE 'RLS policies migration completed successfully';
END $$;