// Fix referee triggers and functions that are causing the bigint error
require('dotenv').config({ path: '.env.local' });

console.log('🔧 Fix Referee Triggers and Functions');
console.log('====================================');
console.log('There is a trigger function that needs to be updated.');
console.log('Run this SQL in your Supabase SQL Editor:');
console.log('');

const sql = `
-- Step 1: Temporarily disable the trigger that's causing the error
DROP TRIGGER IF EXISTS trigger_update_referee_analytics ON match_referees;

-- Step 2: Drop the function so we can recreate it with varchar support
DROP FUNCTION IF EXISTS update_referee_analytics_on_assignment();

-- Step 3: Now run the data updates without the trigger interfering
-- Drop the foreign key constraint that's blocking the change
ALTER TABLE match_referees DROP CONSTRAINT IF EXISTS match_referees_referee_id_fkey;

-- Drop the foreign key constraint on referee_analytics if it exists
ALTER TABLE referee_analytics DROP CONSTRAINT IF EXISTS referee_analytics_referee_id_fkey;

-- Change match_referees.referee_id from bigint to varchar
ALTER TABLE match_referees ALTER COLUMN referee_id TYPE varchar(100) USING referee_id::varchar;

-- Change referee_analytics.referee_id from bigint to varchar  
ALTER TABLE referee_analytics ALTER COLUMN referee_id TYPE varchar(100) USING referee_id::varchar;

-- Update referees table with proper referee_id values
UPDATE referees SET referee_id = 'Myszkowska Agnieszka', first_name = 'Myszkowska', last_name = 'Agnieszka' WHERE id = 1;
UPDATE referees SET referee_id = 'Carvalho Rui Jorge', first_name = 'Carvalho', last_name = 'Rui Jorge' WHERE id = 2;
UPDATE referees SET referee_id = 'Silva Maria', first_name = 'Silva', last_name = 'Maria' WHERE id = 3;

-- Update match_referees to use referee names
UPDATE match_referees SET referee_id = 'Myszkowska Agnieszka' WHERE referee_id = '1';
UPDATE match_referees SET referee_id = 'Carvalho Rui Jorge' WHERE referee_id = '2'; 
UPDATE match_referees SET referee_id = 'Silva Maria' WHERE referee_id = '3';

-- Update referee_analytics to use referee names
UPDATE referee_analytics SET referee_id = 'Myszkowska Agnieszka' WHERE referee_id = '1';
UPDATE referee_analytics SET referee_id = 'Carvalho Rui Jorge' WHERE referee_id = '2';
UPDATE referee_analytics SET referee_id = 'Silva Maria' WHERE referee_id = '3';

-- Make sure referee_id is unique in referees table (required for foreign key)
ALTER TABLE referees ADD CONSTRAINT referees_referee_id_unique UNIQUE (referee_id);

-- Create new foreign key constraint based on referee_id field instead of id
ALTER TABLE match_referees 
ADD CONSTRAINT match_referees_referee_id_fkey 
FOREIGN KEY (referee_id) REFERENCES referees(referee_id);

-- Create foreign key for referee_analytics if needed
ALTER TABLE referee_analytics 
ADD CONSTRAINT referee_analytics_referee_id_fkey 
FOREIGN KEY (referee_id) REFERENCES referees(referee_id);

-- Step 4: Recreate the trigger function with varchar support (optional)
-- You can skip this if you don't need automatic analytics updates
CREATE OR REPLACE FUNCTION update_referee_analytics_on_assignment()
RETURNS TRIGGER AS $$
BEGIN
  -- This function now works with varchar referee_id values
  IF TG_OP = 'INSERT' THEN
    INSERT INTO referee_analytics (referee_id, date, total_assignments, first_referee_count, second_referee_count)
    VALUES (NEW.referee_id, CURRENT_DATE, 1, 
            CASE WHEN NEW.role = 'FIRST' THEN 1 ELSE 0 END,
            CASE WHEN NEW.role = 'SECOND' THEN 1 ELSE 0 END)
    ON CONFLICT (referee_id, date) 
    DO UPDATE SET 
      total_assignments = referee_analytics.total_assignments + 1,
      first_referee_count = referee_analytics.first_referee_count + CASE WHEN NEW.role = 'FIRST' THEN 1 ELSE 0 END,
      second_referee_count = referee_analytics.second_referee_count + CASE WHEN NEW.role = 'SECOND' THEN 1 ELSE 0 END,
      updated_at = NOW();
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Recreate the trigger (optional)
CREATE TRIGGER trigger_update_referee_analytics
  AFTER INSERT ON match_referees
  FOR EACH ROW
  EXECUTE FUNCTION update_referee_analytics_on_assignment();
`;

console.log(sql);
console.log('');
console.log('This fix:');
console.log('1. Disables the problematic trigger temporarily');
console.log('2. Updates all the data without trigger interference');
console.log('3. Recreates the trigger function to work with varchar referee_id');
console.log('4. Re-enables the trigger for future automatic updates');