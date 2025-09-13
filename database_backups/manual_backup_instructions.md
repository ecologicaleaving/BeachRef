# VisTest Database Backup Instructions

Since the automated backup encountered authentication issues, here's a manual backup approach:

## Option 1: Simple File System Backup (Recommended)

### 1. Locate Supabase Data Directory
The local Supabase database files are stored in:
```
C:\Users\{Username}\.docker\desktop\vm-data\data\
```
Or search for `supabase_db_*` folders on your system.

### 2. Create Backup
1. Stop Supabase: `npx supabase stop`
2. Copy the entire Supabase data directory
3. Store it in `database_backups/supabase_data_backup/`
4. Restart Supabase: `npx supabase start`

## Option 2: Migration-Based Backup

### 1. Export Your Current Schema
Copy your migration files 001 and 002 to backup folder:
```bash
cp supabase/migrations/001_*.sql database_backups/
cp supabase/migrations/002_*.sql database_backups/
```

### 2. Document Current State
Run this SQL to check your current database state:

```sql
-- Check what tables exist
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- Check table structures  
\d tournaments
\d matches
\d sync_status

-- Check any data
SELECT count(*) FROM tournaments;
SELECT count(*) FROM matches;
SELECT count(*) FROM sync_status;
```

## Option 3: Supabase Dashboard Backup

1. Open Supabase Dashboard: `npx supabase dashboard`
2. Go to Table Editor
3. Export each table as CSV/SQL
4. Save exports to backup folder

## Restore Process

If you need to restore:

### Using File System Backup:
1. `npx supabase stop`
2. Replace Supabase data directory with backup
3. `npx supabase start`

### Using Migration Backup:
1. `npx supabase db reset --linked`
2. Re-run migrations 001 and 002
3. Import any data exports

## Quick Backup Check

Run this command to verify your current database state:
```bash
npx supabase db diff --schema public
```

This will show you all the changes that have been applied since the last migration.

## Next Steps After Backup

Once you have a backup (choose any of the above methods):

1. **Test the backup** by trying a restore in a separate environment
2. **Document what you backed up** (schema state, data, etc.)
3. **Proceed with remaining migrations** (003, 004, 005, 006)
4. **Create new backups** after major migration groups

## Emergency Recovery

If migrations fail:
1. Stop Supabase
2. Restore from backup
3. Restart Supabase  
4. Fix the problematic migration
5. Try again

---

**Current Status**: Ready to backup before migrations 003-009
**Last Known Good State**: After migrations 001 and 002
**Next Migration**: 003_tournament_sync_cron_trigger.sql