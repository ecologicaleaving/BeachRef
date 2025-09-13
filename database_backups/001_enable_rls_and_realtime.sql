-- Enable Row Level Security and Real-time features
-- This migration sets up the security policies and real-time configuration

-- Note: Tables will be created in future stories
-- This migration prepares the RLS policies and real-time configuration

-- Create a function to enable RLS on tables when they're created
CREATE OR REPLACE FUNCTION enable_rls_on_table(table_name TEXT)
RETURNS VOID AS $$
BEGIN
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create RLS policies for tournaments table (will be applied when table exists)
-- Public read access for client applications
CREATE OR REPLACE FUNCTION create_tournaments_policies()
RETURNS VOID AS $$
BEGIN
    -- Check if table exists before creating policies
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tournaments') THEN
        -- Enable RLS
        PERFORM enable_rls_on_table('tournaments');
        
        -- Drop existing policies if they exist
        DROP POLICY IF EXISTS "tournaments_public_read" ON tournaments;
        DROP POLICY IF EXISTS "tournaments_service_full_access" ON tournaments;
        
        -- Public read access
        CREATE POLICY "tournaments_public_read" ON tournaments
        FOR SELECT USING (true);
        
        -- Service role full access
        CREATE POLICY "tournaments_service_full_access" ON tournaments
        FOR ALL USING (auth.role() = 'service_role');
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create RLS policies for matches table (will be applied when table exists)
CREATE OR REPLACE FUNCTION create_matches_policies()
RETURNS VOID AS $$
BEGIN
    -- Check if table exists before creating policies
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'matches') THEN
        -- Enable RLS
        PERFORM enable_rls_on_table('matches');
        
        -- Drop existing policies if they exist
        DROP POLICY IF EXISTS "matches_public_read" ON matches;
        DROP POLICY IF EXISTS "matches_service_full_access" ON matches;
        
        -- Public read access for live match updates
        CREATE POLICY "matches_public_read" ON matches
        FOR SELECT USING (true);
        
        -- Service role full access
        CREATE POLICY "matches_service_full_access" ON matches
        FOR ALL USING (auth.role() = 'service_role');
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create RLS policies for sync_status table (will be applied when table exists)
CREATE OR REPLACE FUNCTION create_sync_status_policies()
RETURNS VOID AS $$
BEGIN
    -- Check if table exists before creating policies
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sync_status') THEN
        -- Enable RLS
        PERFORM enable_rls_on_table('sync_status');
        
        -- Drop existing policies if they exist
        DROP POLICY IF EXISTS "sync_status_monitoring_read" ON sync_status;
        DROP POLICY IF EXISTS "sync_status_service_full_access" ON sync_status;
        
        -- Monitoring read access
        CREATE POLICY "sync_status_monitoring_read" ON sync_status
        FOR SELECT USING (true);
        
        -- Service role full access
        CREATE POLICY "sync_status_service_full_access" ON sync_status
        FOR ALL USING (auth.role() = 'service_role');
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable real-time for tables (will be applied when tables exist)
CREATE OR REPLACE FUNCTION enable_realtime_on_table(table_name TEXT)
RETURNS VOID AS $$
BEGIN
    -- Check if table exists before enabling real-time
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = table_name) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', table_name);
    END IF;
EXCEPTION
    WHEN duplicate_object THEN
        -- Table already added to real-time publication, ignore error
        NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to setup all tables when they're created
CREATE OR REPLACE FUNCTION setup_table_security_and_realtime(table_name TEXT)
RETURNS VOID AS $$
BEGIN
    -- Enable RLS and create policies based on table name
    CASE table_name
        WHEN 'tournaments' THEN
            PERFORM create_tournaments_policies();
            PERFORM enable_realtime_on_table('tournaments');
        WHEN 'matches' THEN
            PERFORM create_matches_policies();
            PERFORM enable_realtime_on_table('matches');
        WHEN 'sync_status' THEN
            PERFORM create_sync_status_policies();
            -- sync_status doesn't need real-time
        ELSE
            -- Default: just enable RLS
            PERFORM enable_rls_on_table(table_name);
    END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to service role
GRANT EXECUTE ON FUNCTION enable_rls_on_table(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION create_tournaments_policies() TO service_role;
GRANT EXECUTE ON FUNCTION create_matches_policies() TO service_role;
GRANT EXECUTE ON FUNCTION create_sync_status_policies() TO service_role;
GRANT EXECUTE ON FUNCTION enable_realtime_on_table(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION setup_table_security_and_realtime(TEXT) TO service_role;