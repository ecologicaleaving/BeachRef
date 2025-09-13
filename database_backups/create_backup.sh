#!/bin/bash
# Database Backup Script for VisTest  
# Creates comprehensive backup of Supabase database after migrations 001 and 002
# Run this before applying additional migrations

set -e  # Exit on any error

echo "====================================================="
echo "VisTest Database Backup Script"
echo "====================================================="
echo

# Generate timestamp for backup filename
BACKUP_NAME="vistest_backup_$(date +%Y-%m-%d_%H-%M-%S)"
echo "Creating backup: $BACKUP_NAME"
echo

# Create backup directory for this specific backup
mkdir -p "$BACKUP_NAME"

echo "[1/4] Backing up database schema and data..."
npx supabase db dump --data-only -f "$BACKUP_NAME/data_dump.sql"
npx supabase db dump --schema-only -f "$BACKUP_NAME/schema_dump.sql"

echo "[2/4] Creating migration history snapshot..."
npx supabase migration list > "$BACKUP_NAME/migration_status.txt"

echo "[3/4] Exporting current database state..."
cat > "$BACKUP_NAME/db_state.sql" << EOF
-- Database State Snapshot - $(date)
-- Run this to inspect current tables and data

-- List all tables
SELECT tablename, schemaname FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

-- Count records in main tables
SELECT 'tournaments' as table_name, count(*) as record_count FROM tournaments
UNION ALL
SELECT 'matches' as table_name, count(*) as record_count FROM matches  
UNION ALL
SELECT 'sync_status' as table_name, count(*) as record_count FROM sync_status;

-- Check for any data in tables
SELECT * FROM tournaments LIMIT 5;
SELECT * FROM matches LIMIT 5;
SELECT * FROM sync_status LIMIT 5;
EOF

echo "[4/4] Creating backup summary..."
cat > "$BACKUP_NAME/README.txt" << EOF
VisTest Database Backup Summary
===================================

Backup Created: $(date)
Database State: After migrations 001 and 002

Files in this backup:
- schema_dump.sql: Complete database schema
- data_dump.sql: All table data
- db_state.sql: Inspection queries  
- migration_status.txt: Applied migrations list
- restore_backup.sh: Script to restore this backup

To restore this backup:
1. cd $BACKUP_NAME
2. chmod +x restore_backup.sh
3. ./restore_backup.sh
EOF

# Create restore script
cat > "$BACKUP_NAME/restore_backup.sh" << 'EOF'
#!/bin/bash
# Restore script for VisTest database backup
set -e

echo "====================================================="
echo "VisTest Database Restore Script"
echo "====================================================="
echo
echo "WARNING: This will completely reset your database!"
echo "Press Ctrl+C to cancel, or Enter to continue..."
read

echo "Resetting database..."
npx supabase db reset --linked

echo "Restoring schema..."  
npx supabase db push --include-all --dry-run
npx supabase db push --include-all

echo "Restoring data..."
if [ -f "data_dump.sql" ]; then
    # Load data dump using psql
    npx supabase db push -f data_dump.sql
    echo "Data restored successfully"
else
    echo "No data dump found - only schema restored"
fi

echo "Restore completed!"
echo "Run 'npx supabase db diff' to verify"
EOF

chmod +x "$BACKUP_NAME/restore_backup.sh"

echo
echo "====================================================="
echo "Backup completed successfully: $BACKUP_NAME"
echo "====================================================="
echo
echo "Next steps:"
echo "1. Verify backup contents in $BACKUP_NAME/ folder"
echo "2. Test restore script if needed"  
echo "3. Proceed with remaining migrations"
echo