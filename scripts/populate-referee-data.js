#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const https = require('https');
require('dotenv').config({ path: '.env.local' });

// Supabase setup
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('🏐 Populating Referee Data for New Schema');
console.log('==========================================');

async function main() {
  try {
    // Step 1: Check if we have tournaments
    console.log('📋 Step 1: Checking tournaments...');
    const { data: tournaments, error: tourError } = await supabase
      .from('tournaments')
      .select('*')
      .limit(5);
    
    if (tourError) {
      console.error('❌ Tournament query error:', tourError.message);
      return;
    }
    
    console.log(`✅ Found ${tournaments?.length || 0} tournaments`);
    
    // Step 2: Check if we have events
    console.log('📋 Step 2: Checking events...');
    const { data: events, error: eventError } = await supabase
      .from('events')
      .select('*')
      .limit(5);
    
    if (eventError) {
      console.error('❌ Events query error:', eventError.message);
      return;
    }
    
    console.log(`✅ Found ${events?.length || 0} events`);
    
    // Step 3: Check if we have matches
    console.log('📋 Step 3: Checking matches...');
    const { data: matches, error: matchError } = await supabase
      .from('matches')
      .select('*')
      .limit(5);
    
    if (matchError) {
      console.error('❌ Matches query error:', matchError.message);
      return;
    }
    
    console.log(`✅ Found ${matches?.length || 0} matches`);
    
    // Step 4: Check referees
    console.log('📋 Step 4: Checking referees...');
    const { data: referees, error: refError } = await supabase
      .from('referees')
      .select('*')
      .limit(5);
    
    if (refError) {
      console.error('❌ Referees query error:', refError.message);
      return;
    }
    
    console.log(`✅ Found ${referees?.length || 0} referees`);
    
    // Step 5: Check match_referees
    console.log('📋 Step 5: Checking match_referees...');
    const { data: matchReferees, error: mrError } = await supabase
      .from('match_referees')
      .select('*')
      .limit(5);
    
    if (mrError) {
      console.error('❌ Match_referees query error:', mrError.message);
      return;
    }
    
    console.log(`✅ Found ${matchReferees?.length || 0} match_referees assignments`);
    
    // Step 6: Create sample data if empty
    if (!referees?.length) {
      console.log('📝 Step 6: Creating sample referee data...');
      
      // Insert sample referees
      const sampleReferees = [
        {
          vis_referee_no: 'REF001',
          first_name: 'John',
          last_name: 'Smith',
          federation_code: 'USA',
          level: 'International',
          gender: 'M',
          status: 'ACTIVE',
          experience_years: 10
        },
        {
          vis_referee_no: 'REF002',
          first_name: 'Maria',
          last_name: 'Garcia',
          federation_code: 'ESP',
          level: 'National',
          gender: 'F',
          status: 'ACTIVE',
          experience_years: 8
        },
        {
          vis_referee_no: 'REF003',
          first_name: 'Hans',
          last_name: 'Mueller',
          federation_code: 'GER',
          level: 'International',
          gender: 'M',
          status: 'ACTIVE',
          experience_years: 15
        }
      ];
      
      const { data: insertedRefs, error: insertError } = await supabase
        .from('referees')
        .insert(sampleReferees)
        .select();
      
      if (insertError) {
        console.error('❌ Failed to insert sample referees:', insertError.message);
      } else {
        console.log(`✅ Inserted ${insertedRefs.length} sample referees`);
        
        // Step 7: Create sample analytics data
        console.log('📊 Step 7: Creating sample analytics data...');
        
        const analyticsData = insertedRefs.map(referee => ({
          referee_id: referee.id,
          date: new Date().toISOString().split('T')[0], // Today's date
          total_assignments: Math.floor(Math.random() * 10) + 1,
          first_referee_count: Math.floor(Math.random() * 5),
          second_referee_count: Math.floor(Math.random() * 5),
          challenge_referee_count: 0,
          tournaments_worked: ['BVISTEST', 'TOURNAMENT2'],
          performance_score: (80 + Math.random() * 20).toFixed(2)
        }));
        
        const { error: analyticsError } = await supabase
          .from('referee_analytics')
          .insert(analyticsData);
        
        if (analyticsError) {
          console.error('❌ Failed to insert analytics:', analyticsError.message);
        } else {
          console.log(`✅ Inserted analytics for ${analyticsData.length} referees`);
        }
      }
    }
    
    // Final status check
    console.log('\n🎯 Final Status Check:');
    console.log('====================');
    
    const finalChecks = await Promise.all([
      supabase.from('tournaments').select('count', { count: 'exact', head: true }),
      supabase.from('events').select('count', { count: 'exact', head: true }),
      supabase.from('matches').select('count', { count: 'exact', head: true }),
      supabase.from('referees').select('count', { count: 'exact', head: true }),
      supabase.from('match_referees').select('count', { count: 'exact', head: true }),
      supabase.from('referee_analytics').select('count', { count: 'exact', head: true })
    ]);
    
    console.log(`📊 Tournaments: ${finalChecks[0].count || 0}`);
    console.log(`📊 Events: ${finalChecks[1].count || 0}`);
    console.log(`📊 Matches: ${finalChecks[2].count || 0}`);
    console.log(`👨‍💼 Referees: ${finalChecks[3].count || 0}`);
    console.log(`🤝 Match Assignments: ${finalChecks[4].count || 0}`);
    console.log(`📈 Analytics Records: ${finalChecks[5].count || 0}`);
    
    if (finalChecks[3].count > 0) {
      console.log('\n🎉 SUCCESS: Referee data is now available!');
      console.log('💡 Your referee stats should now show data instead of "no data"');
    } else {
      console.log('\n⚠️  No referee data found. You may need to trigger VIS API sync.');
    }
    
  } catch (error) {
    console.error('❌ Script error:', error.message);
  }
}

main();