import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Text } from '../components/Typography/Text';
import { Container } from '../components/Foundation/Container';
import { NavigationHeader } from '../components/navigation/NavigationHeader';
import { colors } from '../theme/tokens';
import { AssignmentStatusProvider } from '../hooks/useAssignmentStatus';
import { FlagImage } from '../components/FlagImage';
import { RefereeStatsService, SeasonStats, CareerStats } from '../services/RefereeStatsService';
import { DefaultTournamentService } from '../services/DefaultTournamentService';

interface Referee {
  noReferee: string;
  firstName: string;
  lastName: string;
  federationCode: string;
  gender: string;
}

interface RefereeStats {
  totalMatches: number;
  matchesAsFirst: number;
  matchesAsSecond: number;
  menMatches: number;
  womenMatches: number;
}

type StatsTab = 'Current' | 'Season' | 'Career';

const RefereeCard = ({ 
  referee, 
  tournamentNo, 
  expanded, 
  onToggle,
  tournamentInfo 
}: { 
  referee: Referee; 
  tournamentNo: string;
  expanded: boolean;
  onToggle: () => void;
  tournamentInfo: TournamentInfo | null;
}) => {
  const [stats, setStats] = useState<RefereeStats | null>(null);
  const [seasonStats, setSeasonStats] = useState<SeasonStats | null>(null);
  const [careerStats, setCareerStats] = useState<CareerStats | null>(null);
  const [activeTab, setActiveTab] = useState<StatsTab>('Current');
  const [loadingStats, setLoadingStats] = useState(false);

  // Helper function to display "N/D" for undefined values
  const displayValue = (value: number | undefined): string => {
    if (value === undefined || value === 0) return 'N/D';
    return value.toString();
  };

  // Don't render if no name data
  if (!referee.firstName.trim() && !referee.lastName.trim()) {
    return null;
  }

  const loadRefereeStats = async (tournamentNo: string) => {
    if (stats || loadingStats) return; // Don't reload if already loaded or loading
    
    setLoadingStats(true);
    try {
      // Determine tournament status and use appropriate data source
      let tournamentStatus = 'SCHEDULED'; // fallback
      
      if (tournamentInfo) {
        tournamentStatus = DefaultTournamentService.getTournamentStatus(tournamentInfo.startDate, tournamentInfo.endDate);
        console.log(`Tournament ${tournamentInfo.name} status: ${tournamentStatus}`);
      }

      // For LIVE and SCHEDULED tournaments, try VIS API first, fallback to match list
      // For COMPLETED tournaments, use match list approach only
      if (tournamentStatus === 'COMPLETED') {
        console.log('Using match list approach for COMPLETED tournament');
        await loadStatsFromMatchList(tournamentNo);
      } else {
        console.log('Using VIS API approach for LIVE/SCHEDULED tournament with fallback');
        // Try VIS API first for LIVE/future tournaments
        const refereeId = `${referee.firstName} ${referee.lastName}`.trim();
        try {
          // Try to get stats from RefereeStatsService (VIS API)
          const currentStats = await RefereeStatsService.getCurrentTournamentStats(refereeId, tournamentNo);
          if (currentStats && currentStats.totalMatches > 0) {
            console.log('Successfully got stats from VIS API:', currentStats);
            const mappedStats: RefereeStats = {
              totalMatches: currentStats.totalMatches,
              matchesAsFirst: currentStats.matchesAsFirst,
              matchesAsSecond: currentStats.matchesAsSecond,
              menMatches: currentStats.menMatches || 0,
              womenMatches: currentStats.womenMatches || 0,
            };
            setStats(mappedStats);
            return;
          } else {
            console.log('No data from VIS API, falling back to match list');
            await loadStatsFromMatchList(tournamentNo);
          }
        } catch (error) {
          console.error('VIS API failed, falling back to match list:', error);
          await loadStatsFromMatchList(tournamentNo);
        }
      }
    } catch (error) {
      console.error('Error loading referee stats:', error);
      // Final fallback - show N/D
      const emptyStats: RefereeStats = {
        totalMatches: 0,
        matchesAsFirst: 0,
        matchesAsSecond: 0,
        menMatches: 0,
        womenMatches: 0,
      };
      setStats(emptyStats);
    } finally {
      setLoadingStats(false);
    }
  };

  const loadStatsFromMatchList = async (tournamentNo: string) => {
    try {
      // Get matches for this tournament to calculate real stats (original approach)
      const xml = `<Requests>
  <Request Type="GetBeachMatchList"
           Fields="No Referee1Name Referee2Name TeamAFederationCode TeamBFederationCode RoundName">
    <Filter NoEvent="${tournamentNo}" IncludeReferees="true"/>
  </Request>
</Requests>`;

      const response = await fetch('https://www.fivb.org/Vis2009/XmlRequest.asmx', {
        method: "POST",
        headers: {
          "Accept": "application/xml",
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({ Request: xml })
      });
      
      if (response.ok) {
        const xmlResponse = await response.text();
        console.log('Match data XML response:', xmlResponse.substring(0, 1000));
        const realStats = calculateRefereeStats(xmlResponse, referee);
        console.log(`Final stats for ${referee.firstName} ${referee.lastName}:`, realStats);
        setStats(realStats);
      } else {
        console.log('API request failed:', response.status, response.statusText);
        const errorText = await response.text();
        console.log('Error response:', errorText);
        // Fallback to N/D if API fails
        const emptyStats: RefereeStats = {
          totalMatches: 0,
          matchesAsFirst: 0,
          matchesAsSecond: 0,
          menMatches: 0,
          womenMatches: 0,
        };
        setStats(emptyStats);
      }
    } catch (error) {
      console.error('Error in match list approach:', error);
      // Fallback to N/D on error
      const emptyStats: RefereeStats = {
        totalMatches: 0,
        matchesAsFirst: 0,
        matchesAsSecond: 0,
        menMatches: 0,
        womenMatches: 0,
      };
      setStats(emptyStats);
    }
  };

  const calculateRefereeStats = (xmlString: string, referee: Referee): RefereeStats => {
    // Look for individual BeachMatch elements, not the container
    const matchMatches = xmlString.match(/<BeachMatch\s[^>]*\/>/g);
    let totalMatches = 0;
    let matchesAsFirst = 0;
    let matchesAsSecond = 0;
    let menMatches = 0;
    let womenMatches = 0;

    const refereeName = `${referee.firstName} ${referee.lastName}`.trim();
    console.log(`Looking for referee: "${refereeName}" (firstName: "${referee.firstName}", lastName: "${referee.lastName}")`);
    console.log(`Found ${matchMatches?.length || 0} BeachMatch elements in XML`);
    
    // Also check if we have any content at all  
    const hasContent = xmlString.includes('BeachMatch');
    console.log(`XML contains BeachMatch: ${hasContent}`);
    
    // Check for any matches at all
    const allMatches = xmlString.match(/<BeachMatch[^>]*>/g);
    console.log(`Total BeachMatch tags found: ${allMatches?.length || 0}`);

    if (matchMatches && matchMatches.length > 0) {
      matchMatches.forEach((match, index) => {
        if (index < 2) console.log(`Sample match ${index}:`, match);
        const referee1Name = match.match(/Referee1Name="([^"]*)"/)?.[1] || '';
        const referee2Name = match.match(/Referee2Name="([^"]*)"/)?.[1] || '';
        // const teamAFed = match.match(/TeamAFederationCode="([^"]*)"/)?.[1] || '';
        // const teamBFed = match.match(/TeamBFederationCode="([^"]*)"/)?.[1] || '';
        const roundName = match.match(/RoundName="([^"]*)"/)?.[1] || '';

        if (index < 2) console.log(`Match ${index} refs: "${referee1Name}" | "${referee2Name}" | Round: "${roundName}"`);

        // Match referee names (case-insensitive partial match)
        // const fullRefereeName = `${referee.firstName} ${referee.lastName}`.toLowerCase().trim();
        const isFirstRef = referee1Name.toLowerCase().includes(referee.firstName.toLowerCase()) && 
                          referee1Name.toLowerCase().includes(referee.lastName.toLowerCase());
        const isSecondRef = referee2Name.toLowerCase().includes(referee.firstName.toLowerCase()) && 
                           referee2Name.toLowerCase().includes(referee.lastName.toLowerCase());

        // Debug name matching for first few matches
        if (index < 3) {
          console.log(`Name matching debug for match ${index}:`);
          console.log(`  Referee1Name: "${referee1Name}" vs "${referee.firstName} ${referee.lastName}"`);
          console.log(`  Referee2Name: "${referee2Name}" vs "${referee.firstName} ${referee.lastName}"`);
          console.log(`  Match 1st: ${isFirstRef}, Match 2nd: ${isSecondRef}`);
        }

        if (isFirstRef || isSecondRef) {
          console.log(`MATCH FOUND! Referee ${refereeName} in match ${index} - 1st: ${isFirstRef}, 2nd: ${isSecondRef}, Round: "${roundName}"`);
          
          totalMatches++;
          
          if (isFirstRef) matchesAsFirst++;
          if (isSecondRef) matchesAsSecond++;

          // Determine gender from round name (common pattern: "Men's/Women's")
          const roundNameLower = roundName.toLowerCase();
          if (roundNameLower.includes('women') || roundNameLower.includes("women's") || roundNameLower.includes('w ')) {
            womenMatches++;
            console.log(`Women's match found (${roundName}), total: ${womenMatches}`);
          } else {
            // Default to men's - most beach volleyball tournaments are men's
            menMatches++;
            console.log(`Men's match found (${roundName}), total: ${menMatches}`);
          }
        }
      });
    }

    return {
      totalMatches,
      matchesAsFirst,
      matchesAsSecond,
      menMatches,
      womenMatches,
    };
  };

  const loadSeasonStats = async (refereeId: string, season?: string, tournamentNo?: string): Promise<SeasonStats | null> => {
    try {
      // Determine tournament status to decide data approach
      let tournamentStatus = 'SCHEDULED'; // fallback
      
      if (tournamentInfo) {
        tournamentStatus = DefaultTournamentService.getTournamentStatus(tournamentInfo.startDate, tournamentInfo.endDate);
      }

      // For LIVE and SCHEDULED tournaments, use VIS API; for COMPLETED, use existing approach
      if (tournamentStatus === 'COMPLETED') {
        console.log('Season stats: Using standard approach for COMPLETED tournament');
      } else {
        console.log('Season stats: Using VIS API approach for LIVE/SCHEDULED tournament');
      }
      
      const seasonStats = await RefereeStatsService.getSeasonStats(refereeId, season, tournamentNo);
      return seasonStats;
    } catch (error) {
      console.error('Error loading season stats:', error);
      return null;
    }
  };

  const loadCareerStats = async (refereeId: string, tournamentNo?: string): Promise<CareerStats | null> => {
    try {
      // Determine tournament status to decide data approach
      let tournamentStatus = 'SCHEDULED'; // fallback
      
      if (tournamentInfo) {
        tournamentStatus = DefaultTournamentService.getTournamentStatus(tournamentInfo.startDate, tournamentInfo.endDate);
      }

      // For LIVE and SCHEDULED tournaments, use VIS API; for COMPLETED, use existing approach
      if (tournamentStatus === 'COMPLETED') {
        console.log('Career stats: Using standard approach for COMPLETED tournament');
      } else {
        console.log('Career stats: Using VIS API approach for LIVE/SCHEDULED tournament');
      }
      
      const careerStats = await RefereeStatsService.getCareerStats(refereeId, tournamentNo);
      return careerStats;
    } catch (error) {
      console.error('Error loading career stats:', error);
      return null;
    }
  };

  const handleCardPress = () => {
    onToggle();
    if (!expanded && !stats) {
      loadRefereeStats(tournamentNo);
    }
  };

  return (
    <TouchableOpacity style={styles.card} onPress={handleCardPress} activeOpacity={0.7}>
      <View style={styles.cardHeader}>
        <View style={styles.topRow}>
          <View style={styles.nameSection}>
            <FlagImage
              federationCode={referee.federationCode}
              teamName={referee.federationCode}
              size="small"
              style={styles.flag}
            />
            <Text style={styles.refereeName} numberOfLines={2}>
              {referee.firstName} {referee.lastName}
            </Text>
          </View>
          <Text style={styles.expandIcon}>
            {expanded ? '▼' : '▶'}
          </Text>
        </View>
        <Text style={styles.gender}>
          {referee.gender === '0' ? 'Male' : referee.gender === '1' ? 'Female' : 'Unknown'}
        </Text>
      </View>
      
      {expanded && (
        <View style={styles.expandedContent}>
          {/* Tab Navigation */}
          <View style={styles.tabContainer}>
            {(['Current', 'Season', 'Career'] as StatsTab[]).map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
                onPress={async () => {
                  setActiveTab(tab);
                  // Load additional stats when switching to Season/Career tabs
                  if (tab === 'Season' && !seasonStats) {
                    const refereeId = `${referee.firstName} ${referee.lastName}`.trim();
                    const seasonData = await loadSeasonStats(refereeId, undefined, tournamentNo);
                    if (seasonData) {
                      setSeasonStats(seasonData);
                    }
                  }
                  if (tab === 'Career' && !careerStats) {
                    const refereeId = `${referee.firstName} ${referee.lastName}`.trim();
                    const careerData = await loadCareerStats(refereeId, tournamentNo);
                    if (careerData) {
                      setCareerStats(careerData);
                    }
                  }
                }}
              >
                <Text style={[styles.tabButtonText, activeTab === tab && styles.tabButtonTextActive]}>
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Tab Content */}
          {loadingStats ? (
            <Text style={styles.loadingText}>Loading stats...</Text>
          ) : (
            <View style={styles.statsContainer}>
              {activeTab === 'Current' && stats && (
                <View>
                  <Text style={styles.tabTitle}>Tournament Stats</Text>
                  <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                      <Text style={styles.statNumber}>{displayValue(stats.totalMatches)}</Text>
                      <Text style={styles.statLabel}>Total Matches</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statNumber}>{displayValue(stats.matchesAsFirst)}</Text>
                      <Text style={styles.statLabel}>As 1st Referee</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statNumber}>{displayValue(stats.matchesAsSecond)}</Text>
                      <Text style={styles.statLabel}>As 2nd Referee</Text>
                    </View>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                      <Text style={styles.statNumber}>{displayValue(stats.menMatches)}</Text>
                      <Text style={styles.statLabel}>Men&apos;s Matches</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statNumber}>{displayValue(stats.womenMatches)}</Text>
                      <Text style={styles.statLabel}>Women&apos;s Matches</Text>
                    </View>
                  </View>
                </View>
              )}

              {activeTab === 'Season' && seasonStats && (
                <View>
                  <Text style={styles.tabTitle}>Season {seasonStats.season} Stats</Text>
                  <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                      <Text style={styles.statNumber}>{displayValue(seasonStats.totalMatches)}</Text>
                      <Text style={styles.statLabel}>Total Matches</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statNumber}>{displayValue(seasonStats.tournaments)}</Text>
                      <Text style={styles.statLabel}>Tournaments</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statNumber}>{seasonStats.averageRating ? seasonStats.averageRating.toFixed(1) : 'N/D'}</Text>
                      <Text style={styles.statLabel}>Avg Rating</Text>
                    </View>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                      <Text style={styles.statNumber}>{displayValue(seasonStats.matchesAsFirst)}</Text>
                      <Text style={styles.statLabel}>As 1st Referee</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statNumber}>{displayValue(seasonStats.matchesAsSecond)}</Text>
                      <Text style={styles.statLabel}>As 2nd Referee</Text>
                    </View>
                  </View>
                </View>
              )}

              {activeTab === 'Career' && careerStats && (
                <View>
                  <Text style={styles.tabTitle}>Career Stats ({displayValue(careerStats.yearsActive)} years)</Text>
                  <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                      <Text style={styles.statNumber}>{displayValue(careerStats.totalMatches)}</Text>
                      <Text style={styles.statLabel}>Total Matches</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statNumber}>{displayValue(careerStats.totalTournaments)}</Text>
                      <Text style={styles.statLabel}>Tournaments</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statNumber}>{careerStats.averageRating ? careerStats.averageRating.toFixed(1) : 'N/D'}</Text>
                      <Text style={styles.statLabel}>Avg Rating</Text>
                    </View>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                      <Text style={styles.statNumber}>{displayValue(careerStats.matchesAsFirst)}</Text>
                      <Text style={styles.statLabel}>As 1st Referee</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statNumber}>{displayValue(careerStats.matchesAsSecond)}</Text>
                      <Text style={styles.statLabel}>As 2nd Referee</Text>
                    </View>
                  </View>
                  <>
                    <View style={styles.divider} />
                    <View style={styles.achievementsContainer}>
                      <Text style={styles.achievementsTitle}>Achievements</Text>
                      {careerStats.achievements && careerStats.achievements.length > 0 ? (
                        careerStats.achievements.map((achievement, index) => (
                          <View key={index} style={styles.achievementItem}>
                            <Icon name="star" size={14} color="#FFD700" />
                            <Text style={styles.achievementText}>{achievement}</Text>
                          </View>
                        ))
                      ) : (
                        <Text style={styles.achievementText}>N/D</Text>
                      )}
                    </View>
                  </>
                </View>
              )}

              {!stats && !loadingStats && (
                <Text style={styles.errorText}>Failed to load stats</Text>
              )}
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

interface TournamentInfo {
  visNo: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
}

function TournamentRefScreenContent() {
  const { tournamentNo, tournamentName, tournamentData, matchData } = useLocalSearchParams<{
    tournamentNo: string;
    tournamentName: string;
    tournamentData?: string;
    matchData?: string;
  }>();

  // Parse tournament data to determine status-based logic
  const tournament: TournamentInfo | null = React.useMemo(() => {
    if (tournamentData) {
      try {
        return JSON.parse(tournamentData) as TournamentInfo;
      } catch (error) {
        console.error('Error parsing tournament data:', error);
      }
    }
    return null;
  }, [tournamentData]);
  
  console.log(`Tournament data loaded:`, tournament ? `${tournament.name} (${tournament.status})` : 'none');
  
  const [referees, setReferees] = useState<Referee[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedRefereeId, setExpandedRefereeId] = useState<string | null>(null);

  const loadReferees = async () => {
    if (!tournamentNo) return;
    
    setLoading(true);
    try {
      // Determine tournament status and use appropriate approach
      let tournamentStatus = 'SCHEDULED'; // fallback
      
      if (tournament) {
        tournamentStatus = DefaultTournamentService.getTournamentStatus(tournament.startDate, tournament.endDate);
        console.log(`Loading referees for tournament ${tournament.name} with status: ${tournamentStatus}`);
      }

      // For COMPLETED tournaments, extract referees from match list
      // For LIVE/SCHEDULED tournaments, try GetEventRefereeList first, fallback to match list
      if (tournamentStatus === 'COMPLETED') {
        console.log('Loading referees from match list for COMPLETED tournament');
        await loadRefereesFromMatchList();
      } else {
        console.log('Loading referees from GetEventRefereeList for LIVE/SCHEDULED tournament');
        const success = await loadRefereesFromAPI();
        if (!success) {
          console.log('GetEventRefereeList failed, falling back to match list approach');
          await loadRefereesFromMatchList();
        }
      }
    } catch (error) {
      console.error('Error loading referees:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRefereesFromAPI = async (): Promise<boolean> => {
    try {
      const xml = `<Requests>
  <Request Type="GetEventRefereeList"
           Fields="NoReferee FirstName LastName FederationCode Gender Role Status">
    <Filter NoEvent="${tournamentNo}"/>
  </Request>
</Requests>`;

      const response = await fetch('https://www.fivb.org/Vis2009/XmlRequest.asmx', {
        method: "POST",
        headers: {
          "Accept": "application/xml",
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({ Request: xml })
      });
      
      if (response.ok) {
        const xmlResponse = await response.text();
        console.log('GetEventRefereeList response:', xmlResponse.substring(0, 500));
        const parsedReferees = parseRefereeXML(xmlResponse);
        if (parsedReferees.length > 0) {
          setReferees(parsedReferees);
          return true;
        } else {
          console.log('No referees found in GetEventRefereeList response');
          return false;
        }
      } else {
        console.log('GetEventRefereeList API failed:', response.status, response.statusText);
        return false;
      }
    } catch (error) {
      console.error('Error in loadRefereesFromAPI:', error);
      return false;
    }
  };

  // Helper function to parse XML response into match objects
  const parseMatchesFromXML = (xmlText: string) => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
    const matches: any[] = [];
    
    const matchNodes = xmlDoc.querySelectorAll('Beachvolleyball > BeachMatch');
    matchNodes.forEach(matchNode => {
      const match: any = {};
      
      // Extract all attributes from the match node
      const attributes = matchNode.attributes;
      for (let i = 0; i < attributes.length; i++) {
        const attr = attributes[i];
        match[attr.name] = attr.value;
      }
      
      matches.push(match);
    });
    
    return matches;
  };

  const loadRefereesFromPassedMatchData = (): void => {
    try {
      console.log('🏐 TournamentRef: Using passed match data to extract referees');
      
      if (!matchData) {
        console.log('🏐 TournamentRef: No match data passed, falling back to API');
        return;
      }
      
      const matches = JSON.parse(matchData);
      console.log(`🏐 TournamentRef: Using ${matches.length} matches from passed data`);
      
      if (matches.length > 0) {
        console.log(`🏐 TournamentRef: Sample match data:`, {
          sampleMatch: {
            Referee1Name: matches[0]?.Referee1Name,
            Referee2Name: matches[0]?.Referee2Name,
            allFields: Object.keys(matches[0] || {})
          }
        });
      }
      
      // Extract referee names from passed match data
      const refereeNames = matches
        .flatMap(match => [match.Referee1Name, match.Referee2Name])
        .filter((referee): referee is string => !!referee?.trim())
        .filter((referee, index, array) => array.indexOf(referee) === index)
        .sort();
      
      console.log(`🏐 TournamentRef: Found ${refereeNames.length} unique referees:`, refereeNames.slice(0, 5));
      
      // Convert to Referee objects
      const extractedReferees: Referee[] = refereeNames.map(name => {
        const nameParts = name.trim().split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        return {
          noReferee: name.toLowerCase().replace(/\s+/g, '_'),
          firstName,
          lastName,
          federationCode: '', // Not available from match data
          gender: '' // Not available from match data
        };
      });
      
      console.log(`🏐 TournamentRef: Setting ${extractedReferees.length} referees in state`);
      setReferees(extractedReferees);
    } catch (error) {
      console.error('❌ TournamentRef: Error parsing passed match data:', error);
    }
  };

  const loadRefereesFromMatchList = async (): Promise<void> => {
    // First try to use passed match data
    if (matchData) {
      loadRefereesFromPassedMatchData();
      return;
    }
    
    // Fallback to API call if no match data passed
    try {
      console.log('🏐 TournamentRef: No passed match data, making API call for tournament', tournamentNo);
      
      // Use direct API call instead of dynamic import to avoid path issues
      const xml = `<Requests>
  <Request Type="GetBeachMatchList"
           Fields="No NoInTournament TeamAName TeamBName LocalDate LocalTime Court Status Round MatchPointsA MatchPointsB PointsTeamASet1 PointsTeamBSet1 PointsTeamASet2 PointsTeamBSet2 PointsTeamASet3 PointsTeamBSet3 NoReferee1 NoReferee2 Referee1Name Referee2Name Referee1FederationCode Referee2FederationCode">
    <Filter NoEvent="${tournamentNo}" IncludeReferees="true"/>
  </Request>
</Requests>`;

      console.log('🏐 TournamentRef: Making API request for match list...');
      
      // Add timeout to the fetch request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000); // 45 second timeout
      
      const response = await fetch('https://www.fivb.org/Vis2009/XmlRequest.asmx', {
        method: "POST",
        headers: {
          "Accept": "application/xml",
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({ Request: xml }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.error(`🏐 TournamentRef: API request failed with status ${response.status}`);
        throw new Error(`API request failed: ${response.status}`);
      }
      
      console.log('🏐 TournamentRef: API request successful, parsing response...');
      const xmlResponse = await response.text();
      console.log('🏐 TournamentRef: Raw XML response length:', xmlResponse.length);
      
      const matches = parseMatchesFromXML(xmlResponse);
      console.log(`🏐 TournamentRef: Loaded ${matches.length} matches to extract referees from`);
      
      if (matches.length > 0) {
        console.log(`🏐 TournamentRef: Sample match data:`, {
          sampleMatch: {
            Referee1Name: matches[0]?.Referee1Name,
            Referee2Name: matches[0]?.Referee2Name,
            allFields: Object.keys(matches[0] || {})
          }
        });
      }
      
      // Use the same approach as TournamentDetail.tsx
      const refereeNames = matches
        .flatMap(match => [match.Referee1Name, match.Referee2Name])
        .filter((referee): referee is string => !!referee)
        .filter((referee, index, array) => array.indexOf(referee) === index)
        .sort();
      
      console.log(`🏐 TournamentRef: Found ${refereeNames.length} unique referees:`, refereeNames.slice(0, 5));
      
      // Convert to Referee objects
      const extractedReferees: Referee[] = refereeNames.map(name => {
        const nameParts = name.trim().split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        return {
          noReferee: name.toLowerCase().replace(/\s+/g, '_'),
          firstName,
          lastName,
          federationCode: '', // Not available from match data
          gender: '' // Not available from match data
        };
      });
      
      console.log(`🏐 TournamentRef: Setting ${extractedReferees.length} referees in state`);
      setReferees(extractedReferees);
    } catch (error) {
      console.error('❌ TournamentRef: Error in loadRefereesFromMatchList:', error);
      if (error.name === 'AbortError') {
        console.error('❌ TournamentRef: Request timed out after 45 seconds');
      }
      setReferees([]);
    }
  };

  const parseRefereeXML = (xmlString: string): Referee[] => {
    const referees: Referee[] = [];
    const refereeMatches = xmlString.match(/<EventReferee[^>]*>/g);
    
    if (refereeMatches) {
      refereeMatches.forEach(match => {
        const noReferee = match.match(/NoReferee="([^"]*)"/)?.[1] || '';
        const firstName = match.match(/FirstName="([^"]*)"/)?.[1] || '';
        const lastName = match.match(/LastName="([^"]*)"/)?.[1] || '';
        const federationCode = match.match(/FederationCode="([^"]*)"/)?.[1] || '';
        const gender = match.match(/Gender="([^"]*)"/)?.[1] || '';
        
        // Only add referee if they have at least a name
        if (firstName.trim() || lastName.trim()) {
          referees.push({
            noReferee,
            firstName,
            lastName,
            federationCode,
            gender
          });
        }
      });
    }
    
    return referees;
  };


  useEffect(() => {
    loadReferees();
  }, [tournamentNo]);

  return (
    <Container style={styles.container}>
      <NavigationHeader 
        title={`Referees - ${tournamentName || 'Tournament'}`}
        showBackButton={true}
        showLogo={false}
        showStatusBar={false}
        showRefreshButton={false}
        onBackPress={() => router.back()}
      />
      
      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadReferees} />
        }
      >
        {referees.length === 0 && !loading ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No referees found for this tournament</Text>
          </View>
        ) : (
          <View style={styles.refereeList}>
            {referees.map((referee, index) => (
              <RefereeCard 
                key={referee.noReferee || index} 
                referee={referee} 
                tournamentNo={tournamentNo || ''} 
                expanded={expandedRefereeId === referee.noReferee}
                tournamentInfo={tournament}
                onToggle={() => {
                  setExpandedRefereeId(
                    expandedRefereeId === referee.noReferee ? null : referee.noReferee
                  );
                }}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </Container>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  refereeList: {
    gap: 12,
  },
  card: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    gap: 8,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nameSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  flag: {
    marginRight: 8,
  },
  refereeName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gender: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  expandIcon: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: 'bold',
  },
  expandedContent: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  statsContainer: {
    gap: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 8,
  },
  loadingText: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  errorText: {
    textAlign: 'center',
    color: colors.error || '#FF6B6B',
    fontStyle: 'italic',
  },
  // Tab system styles
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    marginBottom: 16,
    padding: 2,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonActive: {
    backgroundColor: colors.primary || '#FF6B35',
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
  },
  tabTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text || '#1F2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  // Achievements styles
  achievementsContainer: {
    marginTop: 8,
  },
  achievementsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text || '#1F2937',
    marginBottom: 8,
  },
  achievementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  achievementText: {
    fontSize: 12,
    color: colors.textSecondary || '#6B7280',
    marginLeft: 6,
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

// Wrapper component with AssignmentStatusProvider
export default function TournamentRefScreen() {
  return (
    <AssignmentStatusProvider>
      <TournamentRefScreenContent />
    </AssignmentStatusProvider>
  );
}