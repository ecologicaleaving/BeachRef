-- Live scoring snapshots: every poll result is recorded for post-match stats.
CREATE TABLE match_live_snapshots (
  id              BIGSERIAL PRIMARY KEY,
  match_no        INTEGER NOT NULL,
  captured_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  version         INTEGER NOT NULL,
  status          SMALLINT,
  match_points_a  SMALLINT DEFAULT 0,
  match_points_b  SMALLINT DEFAULT 0,
  sets_json       JSONB,
  no_serving_team INTEGER,
  poll_delay      REAL,
  team_a_name     TEXT,
  team_b_name     TEXT,
  team_a_federation TEXT,
  team_b_federation TEXT,
  court           TEXT,
  round_name      TEXT,
  tournament_code TEXT,
  result_type     SMALLINT
);

CREATE INDEX idx_snapshots_match ON match_live_snapshots(match_no, captured_at);

ALTER TABLE match_live_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_insert" ON match_live_snapshots FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_select" ON match_live_snapshots FOR SELECT TO anon USING (true);
