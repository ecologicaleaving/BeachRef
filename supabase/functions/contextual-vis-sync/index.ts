import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface ContextualSyncRequest {
  action: 'contextual_sync';
  context: 'user_focused';
  tournament_code?: string;
  referee_id?: string;
  match_id?: string;
  timestamp: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, context, tournament_code, referee_id, match_id, timestamp }: ContextualSyncRequest = await req.json();
    
    console.log('🎯 Contextual VIS sync requested:', { action, context, tournament_code, referee_id, match_id });

    if (action !== 'contextual_sync') {
      throw new Error('Invalid action. Expected: contextual_sync');
    }

    const results: any = {
      action,
      context,
      timestamp,
      synced: {},
      errors: []
    };

    // 1. Sync specific tournament data if tournament_code provided
    if (tournament_code) {
      console.log(`📊 Syncing tournament: ${tournament_code}`);
      
      try {
        // Get fresh tournament data from VIS API
        const VIS_BASE_URL = 'https://www.fivb.org/Vis2009/XmlRequest.asmx';
        const appId = '2a9523517c52420da73d927c6d6bab23';
        
        // Get tournament details
        const tournamentRequest = `<Request Type='GetBeachTournamentList' Fields='No Code Name StartDate EndDate Status Location'><Filter Code='${tournament_code}' /></Request>`;
        const tournamentUrl = `${VIS_BASE_URL}?Request=${encodeURIComponent(tournamentRequest)}`;
        
        const tournamentResponse = await fetch(tournamentUrl, {
          headers: { 'X-FIVB-App-ID': appId }
        });
        
        if (tournamentResponse.ok) {
          const xmlData = await tournamentResponse.text();
          console.log(`✅ Retrieved tournament data for ${tournament_code}: ${xmlData.length} chars`);
          
          // Parse and update tournament data
          const tournamentRegex = /<BeachTournament[^>]*>/g;
          const matches = xmlData.match(tournamentRegex);
          
          if (matches?.length) {
            const tournamentMatch = matches[0];
            const no = tournamentMatch.match(/No="([^"]*)"/)?.[1];
            const name = tournamentMatch.match(/Name="([^"]*)"/)?.[1];
            const status = tournamentMatch.match(/Status="([^"]*)"/)?.[1];
            
            if (no && name) {
              // Update tournament in database
              const { error: updateError } = await supabaseClient
                .from('tournaments')
                .update({
                  name,
                  status,
                  updated_at: new Date().toISOString()
                })
                .eq('tournament_code', tournament_code);
              
              if (updateError) {
                results.errors.push(`Tournament update failed: ${updateError.message}`);
              } else {
                results.synced.tournament = { code: tournament_code, name, status };
                console.log(`✅ Updated tournament ${tournament_code}`);
              }
            }
          }
          
          // Get fresh match data for this tournament
          console.log(`🏐 Syncing matches for tournament: ${tournament_code}`);
          
          const matchRequest = `<Request Type='GetBeachMatchList' Fields='No TeamAName TeamBName Status LocalDate LocalTime FirstReferee SecondReferee'><Filter TournamentNo='${no}' /></Request>`;
          const matchUrl = `${VIS_BASE_URL}?Request=${encodeURIComponent(matchRequest)}`;
          
          const matchResponse = await fetch(matchUrl, {
            headers: { 'X-FIVB-App-ID': appId }
          });
          
          if (matchResponse.ok) {
            const matchXmlData = await matchResponse.text();
            const matchRegex = /<BeachMatch[^>]*>/g;
            const matchMatches = matchXmlData.match(matchRegex);
            
            if (matchMatches?.length) {
              let updatedMatches = 0;
              
              // Process first 10 matches (to avoid overwhelming)
              for (const matchStr of matchMatches.slice(0, 10)) {
                const matchNo = matchStr.match(/No="([^"]*)"/)?.[1];
                const status = matchStr.match(/Status="([^"]*)"/)?.[1];
                const firstRef = matchStr.match(/FirstReferee="([^"]*)"/)?.[1];
                const secondRef = matchStr.match(/SecondReferee="([^"]*)"/)?.[1];
                
                if (matchNo && status) {
                  // Update match status
                  const { error: matchUpdateError } = await supabaseClient
                    .from('matches')
                    .update({
                      status,
                      updated_at: new Date().toISOString()
                    })
                    .eq('vis_match_no', parseInt(matchNo));
                  
                  if (!matchUpdateError) {
                    updatedMatches++;
                  }
                }
              }
              
              results.synced.matches = { 
                tournament_code, 
                updated_count: updatedMatches,
                total_found: matchMatches.length 
              };
              console.log(`✅ Updated ${updatedMatches} matches for ${tournament_code}`);
            }
          }
        }
      } catch (error) {
        results.errors.push(`Tournament sync failed: ${error.message}`);
        console.error('❌ Tournament sync error:', error);
      }
    }

    // 2. Sync referee-specific data if referee_id provided
    if (referee_id) {
      console.log(`👤 Syncing referee data: ${referee_id}`);
      
      try {
        // Get recent assignments for this referee
        const { data: recentAssignments, error: assignmentError } = await supabaseClient
          .from('match_referees')
          .select(`
            role,
            matches!inner(
              id,
              tournament_code,
              status,
              team_a_name,
              team_b_name,
              utc_datetime
            )
          `)
          .eq('referee_id', referee_id)
          .gte('matches.utc_datetime', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days
          .order('matches.utc_datetime', { ascending: false });
        
        if (!assignmentError && recentAssignments?.length) {
          results.synced.referee_assignments = {
            referee_id,
            recent_count: recentAssignments.length,
            latest_assignment: recentAssignments[0]
          };
          console.log(`✅ Found ${recentAssignments.length} recent assignments for referee ${referee_id}`);
        }
      } catch (error) {
        results.errors.push(`Referee sync failed: ${error.message}`);
        console.error('❌ Referee sync error:', error);
      }
    }

    // 3. Sync specific match data if match_id provided
    if (match_id) {
      console.log(`🏐 Syncing match data: ${match_id}`);
      
      try {
        // Get current match data
        const { data: matchData, error: matchError } = await supabaseClient
          .from('matches')
          .select(`
            *,
            match_referees(
              referee_id,
              role,
              referees(first_name, last_name)
            )
          `)
          .eq('id', match_id)
          .single();
        
        if (!matchError && matchData) {
          results.synced.match = {
            match_id,
            status: matchData.status,
            teams: `${matchData.team_a_name} vs ${matchData.team_b_name}`,
            referee_count: matchData.match_referees?.length || 0
          };
          console.log(`✅ Synced match ${match_id}: ${matchData.team_a_name} vs ${matchData.team_b_name}`);
        }
      } catch (error) {
        results.errors.push(`Match sync failed: ${error.message}`);
        console.error('❌ Match sync error:', error);
      }
    }

    // Log the sync operation (don't let logging failures break the sync)
    try {
      await supabaseClient.from('analytics_events').insert({
        event_type: 'contextual_sync',
        event_data: {
          context,
          tournament_code,
          referee_id,
          match_id,
          results: results.synced,
          errors: results.errors,
          timestamp
        }
      });
      console.log('✅ Analytics event logged successfully');
    } catch (analyticsError) {
      console.warn('⚠️ Analytics logging failed (non-critical):', analyticsError);
      // Don't propagate analytics logging errors
    }

    return new Response(
      JSON.stringify(results),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('❌ Contextual sync error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});