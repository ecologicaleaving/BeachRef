-- Insert test matches for tournament 1552 and referee 151572
-- Run this in Supabase Dashboard > SQL Editor

-- First, insert a test event if it doesn't exist
INSERT INTO events (id, name, code, country, gender, start_date, end_date)
VALUES (1552, 'Test Tournament 1552', '1552', 'TEST', 'M', '2025-01-13', '2025-01-16')
ON CONFLICT (id) DO NOTHING;

-- Insert test matches
INSERT INTO matches (vis_match_no, event_id, tournament_code, utc_datetime, court, status, round_name, team_a_name, team_b_name) VALUES
(9001, 1552, '1552', '2025-01-14 10:00:00+00', 'Court 1', 'COMPLETED', 'Pool Play', 'Team USA', 'Team BRA'),
(9002, 1552, '1552', '2025-01-15 14:30:00+00', 'Court 2', 'COMPLETED', 'Pool Play', 'Team GER', 'Team ITA'),
(9003, 1552, '1552', '2025-01-16 09:15:00+00', 'Court 3', 'IN_PROGRESS', 'Quarter Final', 'Team CAN', 'Team AUS')
ON CONFLICT (vis_match_no) DO UPDATE SET
  tournament_code = EXCLUDED.tournament_code,
  utc_datetime = EXCLUDED.utc_datetime,
  court = EXCLUDED.court,
  status = EXCLUDED.status,
  round_name = EXCLUDED.round_name,
  team_a_name = EXCLUDED.team_a_name,
  team_b_name = EXCLUDED.team_b_name;

-- Insert referee assignments for referee 151572
INSERT INTO match_referees (match_id, referee_id, role)
SELECT m.id, 151572, CASE
  WHEN m.vis_match_no = 9001 THEN 'FIRST'
  WHEN m.vis_match_no = 9002 THEN 'SECOND'
  WHEN m.vis_match_no = 9003 THEN 'FIRST'
END
FROM matches m
WHERE m.vis_match_no IN (9001, 9002, 9003)
ON CONFLICT (match_id, role) DO UPDATE SET
  referee_id = EXCLUDED.referee_id;

-- Verify the data
SELECT
  m.vis_match_no,
  m.tournament_code,
  m.utc_datetime,
  m.team_a_name,
  m.team_b_name,
  mr.role
FROM matches m
JOIN match_referees mr ON m.id = mr.match_id
WHERE m.tournament_code = '1552' AND mr.referee_id = 151572
ORDER BY m.utc_datetime DESC;