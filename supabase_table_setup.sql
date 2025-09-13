-- Create sync_error_log table
CREATE TABLE sync_error_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR NOT NULL,
  tournament_no VARCHAR,
  error_type VARCHAR NOT NULL,
  error_severity VARCHAR NOT NULL,
  error_message TEXT NOT NULL,
  error_context JSONB,
  recovery_suggestion TEXT,
  occurred_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP,
  resolution_notes TEXT
);

-- Enable Row Level Security
ALTER TABLE sync_error_log ENABLE ROW LEVEL SECURITY;

-- Create policy for all access
CREATE POLICY "sync_error_log_policy" ON sync_error_log
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- Grant permissions
GRANT ALL ON sync_error_log TO anon;
GRANT ALL ON sync_error_log TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;