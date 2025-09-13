// Proper fix for referee schema - handle foreign key constraints
require('dotenv').config({ path: '.env.local' });

console.log('🔧 Proper Referee Schema Fix');
console.log('============================');
console.log('You need to run this SQL in your Supabase SQL Editor:');
console.log('');

const sql = `
-- Step 1: Drop the foreign key constraint that's blocking the change
ALTER TABLE match_referees DROP CONSTRAINT IF EXISTS match_referees_referee_id_fkey;

-- Step 2: Drop the foreign key constraint on referee_analytics if it exists
ALTER TABLE referee_analytics DROP CONSTRAINT IF EXISTS referee_analytics_referee_id_fkey;

-- Step 3: Change match_referees.referee_id from bigint to varchar
ALTER TABLE match_referees ALTER COLUMN referee_id TYPE varchar(100) USING referee_id::varchar;

-- Step 4: Change referee_analytics.referee_id from bigint to varchar  
ALTER TABLE referee_analytics ALTER COLUMN referee_id TYPE varchar(100) USING referee_id::varchar;

-- Step 5: Update referees table with proper referee_id values
UPDATE referees SET referee_id = 'Myszkowska Agnieszka', first_name = 'Myszkowska', last_name = 'Agnieszka' WHERE id = 1;
UPDATE referees SET referee_id = 'Carvalho Rui Jorge', first_name = 'Carvalho', last_name = 'Rui Jorge' WHERE id = 2;
UPDATE referees SET referee_id = 'Silva Maria', first_name = 'Silva', last_name = 'Maria' WHERE id = 3;

-- Step 6: Update match_referees to use referee names
UPDATE match_referees SET referee_id = 'Myszkowska Agnieszka' WHERE referee_id = '1';
UPDATE match_referees SET referee_id = 'Carvalho Rui Jorge' WHERE referee_id = '2'; 
UPDATE match_referees SET referee_id = 'Silva Maria' WHERE referee_id = '3';

-- Step 7: Update referee_analytics to use referee names
UPDATE referee_analytics SET referee_id = 'Myszkowska Agnieszka' WHERE referee_id = '1';
UPDATE referee_analytics SET referee_id = 'Carvalho Rui Jorge' WHERE referee_id = '2';
UPDATE referee_analytics SET referee_id = 'Silva Maria' WHERE referee_id = '3';

-- Step 8: Create new foreign key constraint based on referee_id field instead of id
-- This links match_referees.referee_id to referees.referee_id (both varchar now)
ALTER TABLE match_referees 
ADD CONSTRAINT match_referees_referee_id_fkey 
FOREIGN KEY (referee_id) REFERENCES referees(referee_id);

-- Step 9: Create foreign key for referee_analytics if needed
ALTER TABLE referee_analytics 
ADD CONSTRAINT referee_analytics_referee_id_fkey 
FOREIGN KEY (referee_id) REFERENCES referees(referee_id);

-- Step 10: Make sure referee_id is unique in referees table (required for foreign key)
ALTER TABLE referees ADD CONSTRAINT referees_referee_id_unique UNIQUE (referee_id);
`;

console.log(sql);
console.log('');
console.log('After running this SQL, the app should find the referee data!');
console.log('This fixes the foreign key constraint issue by:');
console.log('1. Dropping the old constraints that used referees.id (bigint)');
console.log('2. Changing referee_id columns to varchar');
console.log('3. Creating new constraints that use referees.referee_id (varchar)');