-- Migration 015: Allow anon clients to populate the shared match cache
--
-- Match data is public (from VIS API). Allowing any client to upsert
-- means User A's API fetch populates the DB for User B, reducing
-- overall VIS API traffic.
--
-- The UNIQUE constraint on `no` prevents duplicates.
-- Stale/wrong data is self-healing: the next VIS API fetch overwrites it.
-- DELETE remains restricted to service_role.

-- Allow any client to insert new matches
CREATE POLICY "Allow anon cache insert" ON matches
  FOR INSERT WITH CHECK (true);

-- Allow any client to update existing matches (score updates, status changes)
CREATE POLICY "Allow anon cache update" ON matches
  FOR UPDATE USING (true) WITH CHECK (true);
