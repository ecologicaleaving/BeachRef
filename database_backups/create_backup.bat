@echo off
REM Database Backup Script for VisTest
REM Creates comprehensive backup of Supabase database after migrations 001 and 002
REM Run this before applying additional migrations

echo =====================================================
echo VisTest Database Backup Script
echo =====================================================
echo.

REM Generate timestamp for backup filename
for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (set mydate=%%c-%%a-%%b)
for /f "tokens=1-2 delims=/:" %%a in ("%TIME%") do (set mytime=%%a%%b)
set mytime=%mytime: =0%

set BACKUP_NAME=vistest_backup_%mydate%_%mytime%
echo Creating backup: %BACKUP_NAME%
echo.

REM Create backup directory for this specific backup
mkdir %BACKUP_NAME% 2>nul

echo [1/4] Backing up database schema and data...
npx supabase db dump --data-only -f %BACKUP_NAME%/data_dump.sql
if errorlevel 1 (
    echo ERROR: Failed to dump data
    exit /b 1
)

npx supabase db dump --schema-only -f %BACKUP_NAME%/schema_dump.sql
if errorlevel 1 (
    echo ERROR: Failed to dump schema  
    exit /b 1
)

echo [2/4] Creating migration history snapshot...
npx supabase migration list > %BACKUP_NAME%/migration_status.txt

echo [3/4] Exporting current database state...
echo -- Database State Snapshot - %date% %time% > %BACKUP_NAME%/db_state.sql
echo -- Run this to inspect current tables and data >> %BACKUP_NAME%/db_state.sql
echo. >> %BACKUP_NAME%/db_state.sql

REM Add inspection queries to the state file
echo -- List all tables >> %BACKUP_NAME%/db_state.sql
echo SELECT tablename, schemaname FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename; >> %BACKUP_NAME%/db_state.sql
echo. >> %BACKUP_NAME%/db_state.sql

echo -- Count records in main tables >> %BACKUP_NAME%/db_state.sql  
echo SELECT 'tournaments' as table_name, count(*) as record_count FROM tournaments >> %BACKUP_NAME%/db_state.sql
echo UNION ALL >> %BACKUP_NAME%/db_state.sql
echo SELECT 'matches' as table_name, count(*) as record_count FROM matches >> %BACKUP_NAME%/db_state.sql
echo UNION ALL >> %BACKUP_NAME%/db_state.sql
echo SELECT 'sync_status' as table_name, count(*) as record_count FROM sync_status; >> %BACKUP_NAME%/db_state.sql
echo. >> %BACKUP_NAME%/db_state.sql

echo -- Check for any data in tables >> %BACKUP_NAME%/db_state.sql
echo SELECT * FROM tournaments LIMIT 5; >> %BACKUP_NAME%/db_state.sql
echo SELECT * FROM matches LIMIT 5; >> %BACKUP_NAME%/db_state.sql
echo SELECT * FROM sync_status LIMIT 5; >> %BACKUP_NAME%/db_state.sql

echo [4/4] Creating backup summary...
echo VisTest Database Backup Summary > %BACKUP_NAME%/README.txt
echo =================================== >> %BACKUP_NAME%/README.txt
echo. >> %BACKUP_NAME%/README.txt
echo Backup Created: %date% %time% >> %BACKUP_NAME%/README.txt
echo Database State: After migrations 001 and 002 >> %BACKUP_NAME%/README.txt
echo. >> %BACKUP_NAME%/README.txt
echo Files in this backup: >> %BACKUP_NAME%/README.txt
echo - schema_dump.sql: Complete database schema >> %BACKUP_NAME%/README.txt
echo - data_dump.sql: All table data >> %BACKUP_NAME%/README.txt
echo - db_state.sql: Inspection queries >> %BACKUP_NAME%/README.txt
echo - migration_status.txt: Applied migrations list >> %BACKUP_NAME%/README.txt
echo - restore_backup.bat: Script to restore this backup >> %BACKUP_NAME%/README.txt
echo. >> %BACKUP_NAME%/README.txt
echo To restore this backup: >> %BACKUP_NAME%/README.txt
echo 1. cd %BACKUP_NAME% >> %BACKUP_NAME%/README.txt
echo 2. run restore_backup.bat >> %BACKUP_NAME%/README.txt

echo.
echo =====================================================
echo Backup completed successfully: %BACKUP_NAME%
echo =====================================================
echo.
echo Next steps:
echo 1. Verify backup contents in %BACKUP_NAME%/ folder
echo 2. Test restore script if needed
echo 3. Proceed with remaining migrations
echo.
pause