# Database Schema

```sql
-- Supabase PostgreSQL Schema
CREATE TABLE tournaments (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    competition_level TEXT NOT NULL,
    tournament_type TEXT NOT NULL,
    status TEXT NOT NULL,
    teams JSONB,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE matches (
    id TEXT PRIMARY KEY,
    tournament_id TEXT REFERENCES tournaments(id),
    match_number INTEGER NOT NULL,
    scheduled_time TIMESTAMPTZ NOT NULL,
    actual_start_time TIMESTAMPTZ,
    duration INTERVAL,
    court TEXT NOT NULL,
    status TEXT NOT NULL,
    team1 JSONB NOT NULL,
    team2 JSONB NOT NULL,
    final_score JSONB,
    set_scores JSONB,
    statistics JSONB,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE referee_assignments (
    id TEXT PRIMARY KEY,
    referee_id TEXT NOT NULL,
    referee_name TEXT NOT NULL,
    referee_level TEXT NOT NULL,
    tournament_id TEXT REFERENCES tournaments(id),
    match_id TEXT REFERENCES matches(id),
    role TEXT NOT NULL,
    assignment_date TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_profiles (
    user_id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    display_name TEXT,
    preferred_location TEXT,
    preferred_competition_levels JSONB,
    timezone TEXT DEFAULT 'UTC',
    notification_preferences JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_bookmarks (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT REFERENCES user_profiles(user_id),
    tournament_id TEXT REFERENCES tournaments(id),
    bookmarked_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT,
    reminder_enabled BOOLEAN DEFAULT false,
    sync_priority INTEGER DEFAULT 3,
    UNIQUE(user_id, tournament_id)
);

-- Indexes for performance
CREATE INDEX idx_tournaments_dates ON tournaments(start_date, end_date);
CREATE INDEX idx_tournaments_location ON tournaments(location);
CREATE INDEX idx_matches_tournament ON matches(tournament_id);
CREATE INDEX idx_matches_schedule ON matches(scheduled_time);
CREATE INDEX idx_referee_assignments_tournament ON referee_assignments(tournament_id);
CREATE INDEX idx_user_bookmarks_user ON user_bookmarks(user_id);
```
