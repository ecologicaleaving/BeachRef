/**
 * Test if sync_error_log table is working
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

console.log('🧪 Testing sync_error_log table...');

const supabase = createClient(supabaseUrl, anonKey);

async function testTable() {
  try {
    // Test inserting a record
    const { data, error } = await supabase
      .from('sync_error_log')
      .insert([{
        entity_type: 'test',
        error_type: 'SYSTEM',
        error_severity: 'LOW',
        error_message: '404 fix test - table is working',
        recovery_suggestion: 'Table created successfully'
      }])
      .select();

    if (error) {
      console.log('❌ Insert failed:', error.message);
      console.log('   Code:', error.code);
      return false;
    } else {
      console.log('✅ Insert successful!');
      console.log('   Record ID:', data[0]?.id);
      
      // Try to read it back
      const { data: readData, error: readError } = await supabase
        .from('sync_error_log')
        .select('*')
        .eq('entity_type', 'test')
        .limit(1);
        
      if (readError) {
        console.log('⚠️  Read test failed:', readError.message);
      } else {
        console.log('✅ Read test successful!');
        console.log('🎉 sync_error_log table is fully functional!');
        console.log('🎯 404 errors should now be resolved!');
      }
      
      return true;
    }
  } catch (error) {
    console.log('❌ Error testing table:', error.message);
    return false;
  }
}

testTable();