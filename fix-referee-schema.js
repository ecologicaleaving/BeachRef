// Fix referee schema - change referee_id to varchar to support name-based IDs
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function fixRefereeSchema() {
  console.log('🔧 Fixing Referee Schema');
  console.log('=======================');
  
  console.log('You need to run this SQL in your Supabase SQL Editor:');
  console.log('');
  
  const sql = `
-- Step 1: Change match_referees.referee_id from bigint to varchar
ALTER TABLE match_referees ALTER COLUMN referee_id TYPE varchar(100) USING referee_id::varchar;

-- Step 2: Change referee_analytics.referee_id from bigint to varchar  
ALTER TABLE referee_analytics ALTER COLUMN referee_id TYPE varchar(100) USING referee_id::varchar;

-- Step 3: Update referees table with proper referee_id values
UPDATE referees SET referee_id = 'Myszkowska Agnieszka', first_name = 'Myszkowska', last_name = 'Agnieszka' WHERE id = 1;
UPDATE referees SET referee_id = 'Carvalho Rui Jorge', first_name = 'Carvalho', last_name = 'Rui Jorge' WHERE id = 2;
UPDATE referees SET referee_id = 'Silva Maria', first_name = 'Silva', last_name = 'Maria' WHERE id = 3;

-- Step 4: Update match_referees to use referee names
UPDATE match_referees SET referee_id = 'Myszkowska Agnieszka' WHERE referee_id = '1';
UPDATE match_referees SET referee_id = 'Carvalho Rui Jorge' WHERE referee_id = '2'; 
UPDATE match_referees SET referee_id = 'Silva Maria' WHERE referee_id = '3';

-- Step 5: Update referee_analytics to use referee names
UPDATE referee_analytics SET referee_id = 'Myszkowska Agnieszka' WHERE referee_id = '1';
UPDATE referee_analytics SET referee_id = 'Carvalho Rui Jorge' WHERE referee_id = '2';
UPDATE referee_analytics SET referee_id = 'Silva Maria' WHERE referee_id = '3';
`;

  console.log(sql);
  
  console.log('');
  console.log('After running this SQL, the app should find the referee data!');
}

fixRefereeSchema().catch(console.error);