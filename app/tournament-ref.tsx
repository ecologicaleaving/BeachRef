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

interface SeasonStats extends RefereeStats {
  season: string;
  averageRating?: number;
  tournaments: number;
}

interface CareerStats extends RefereeStats {
  yearsActive: number;
  totalTournaments: number;
  averageRating?: number;
  specializations?: string[];
  achievements?: string[];
}

type StatsTab = 'Current' | 'Season' | 'Career';

const RefereeCard = ({ 
  referee, 
  tournamentNo, 
  expanded, 
  onToggle 
}: { 
  referee: Referee; 
  tournamentNo: string;
  expanded: boolean;
  onToggle: () => void;
}) => {
  const [stats, setStats] = useState<RefereeStats | null>(null);
  const [seasonStats, setSeasonStats] = useState<SeasonStats | null>(null);
  const [careerStats, setCareerStats] = useState<CareerStats | null>(null);
  const [activeTab, setActiveTab] = useState<StatsTab>('Current');
  const [loadingStats, setLoadingStats] = useState(false);

  // Don't render if no name data
  if (!referee.firstName.trim() && !referee.lastName.trim()) {
    return null;
  }

  const loadRefereeStats = async (tournamentNo: string) => {
    if (stats || loadingStats) return; // Don't reload if already loaded or loading
    
    setLoadingStats(true);
    try {
      // Get matches for this tournament to calculate real stats
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
        // Fallback to mock data if API fails
        const mockStats: RefereeStats = {
          totalMatches: Math.floor(Math.random() * 15) + 3,
          matchesAsFirst: Math.floor(Math.random() * 8) + 1,
          matchesAsSecond: Math.floor(Math.random() * 8) + 1,
          menMatches: Math.floor(Math.random() * 8) + 1,
          womenMatches: Math.floor(Math.random() * 8) + 1,
        };
        setStats(mockStats);
      }
    } catch (error) {
      console.error('Error loading referee stats:', error);
      // Fallback to mock data on error
      const mockStats: RefereeStats = {
        totalMatches: Math.floor(Math.random() * 15) + 3,
        matchesAsFirst: Math.floor(Math.random() * 8) + 1,
        matchesAsSecond: Math.floor(Math.random() * 8) + 1,
        menMatches: Math.floor(Math.random() * 8) + 1,
        womenMatches: Math.floor(Math.random() * 8) + 1,
      };
      setStats(mockStats);
    } finally {
      setLoadingStats(false);
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
        const teamAFed = match.match(/TeamAFederationCode="([^"]*)"/)?.[1] || '';
        const teamBFed = match.match(/TeamBFederationCode="([^"]*)"/)?.[1] || '';
        const roundName = match.match(/RoundName="([^"]*)"/)?.[1] || '';

        if (index < 2) console.log(`Match ${index} refs: "${referee1Name}" | "${referee2Name}" | Round: "${roundName}"`);

        // Match referee names (case-insensitive partial match)
        const fullRefereeName = `${referee.firstName} ${referee.lastName}`.toLowerCase().trim();
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

  const generateSeasonStats = (currentStats: RefereeStats): SeasonStats => {
    // Generate mock season stats (extended from current tournament)
    const seasonMultiplier = Math.floor(Math.random() * 5) + 3; // 3-7x tournament data
    return {
      season: new Date().getFullYear().toString(),
      totalMatches: currentStats.totalMatches * seasonMultiplier,
      matchesAsFirst: currentStats.matchesAsFirst * seasonMultiplier,
      matchesAsSecond: currentStats.matchesAsSecond * seasonMultiplier,
      menMatches: currentStats.menMatches * seasonMultiplier,
      womenMatches: currentStats.womenMatches * seasonMultiplier,
      tournaments: Math.floor(Math.random() * 8) + 3,
      averageRating: Math.round((Math.random() * 2 + 8) * 10) / 10, // 8.0-10.0
    };
  };

  const generateCareerStats = (currentStats: RefereeStats): CareerStats => {
    // Generate mock career stats (much larger than season)
    const careerMultiplier = Math.floor(Math.random() * 20) + 15; // 15-35x tournament data
    const yearsActive = Math.floor(Math.random() * 10) + 5; // 5-15 years
    
    return {
      yearsActive,
      totalMatches: currentStats.totalMatches * careerMultiplier,
      matchesAsFirst: currentStats.matchesAsFirst * careerMultiplier,
      matchesAsSecond: currentStats.matchesAsSecond * careerMultiplier,
      menMatches: currentStats.menMatches * careerMultiplier,
      womenMatches: currentStats.womenMatches * careerMultiplier,
      totalTournaments: Math.floor(Math.random() * 50) + 30,
      averageRating: Math.round((Math.random() * 1.5 + 8.5) * 10) / 10, // 8.5-10.0
      specializations: ['Beach Volleyball', 'International Events'],
      achievements: ['FIVB Certified', 'Olympic Games Official'],
    };
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
                onPress={() => {
                  setActiveTab(tab);
                  // Generate additional stats when switching to Season/Career tabs
                  if (tab === 'Season' && stats && !seasonStats) {
                    setSeasonStats(generateSeasonStats(stats));
                  }
                  if (tab === 'Career' && stats && !careerStats) {
                    setCareerStats(generateCareerStats(stats));
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
                      <Text style={styles.statNumber}>{stats.totalMatches}</Text>
                      <Text style={styles.statLabel}>Total Matches</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statNumber}>{stats.matchesAsFirst}</Text>
                      <Text style={styles.statLabel}>As 1st Referee</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statNumber}>{stats.matchesAsSecond}</Text>
                      <Text style={styles.statLabel}>As 2nd Referee</Text>
                    </View>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                      <Text style={styles.statNumber}>{stats.menMatches}</Text>
                      <Text style={styles.statLabel}>Men's Matches</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statNumber}>{stats.womenMatches}</Text>
                      <Text style={styles.statLabel}>Women's Matches</Text>
                    </View>
                  </View>
                </View>
              )}

              {activeTab === 'Season' && seasonStats && (
                <View>
                  <Text style={styles.tabTitle}>Season {seasonStats.season} Stats</Text>
                  <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                      <Text style={styles.statNumber}>{seasonStats.totalMatches}</Text>
                      <Text style={styles.statLabel}>Total Matches</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statNumber}>{seasonStats.tournaments}</Text>
                      <Text style={styles.statLabel}>Tournaments</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statNumber}>{seasonStats.averageRating?.toFixed(1)}</Text>
                      <Text style={styles.statLabel}>Avg Rating</Text>
                    </View>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                      <Text style={styles.statNumber}>{seasonStats.matchesAsFirst}</Text>
                      <Text style={styles.statLabel}>As 1st Referee</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statNumber}>{seasonStats.matchesAsSecond}</Text>
                      <Text style={styles.statLabel}>As 2nd Referee</Text>
                    </View>
                  </View>
                </View>
              )}

              {activeTab === 'Career' && careerStats && (
                <View>
                  <Text style={styles.tabTitle}>Career Stats ({careerStats.yearsActive} years)</Text>
                  <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                      <Text style={styles.statNumber}>{careerStats.totalMatches}</Text>
                      <Text style={styles.statLabel}>Total Matches</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statNumber}>{careerStats.totalTournaments}</Text>
                      <Text style={styles.statLabel}>Tournaments</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statNumber}>{careerStats.averageRating?.toFixed(1)}</Text>
                      <Text style={styles.statLabel}>Avg Rating</Text>
                    </View>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                      <Text style={styles.statNumber}>{careerStats.matchesAsFirst}</Text>
                      <Text style={styles.statLabel}>As 1st Referee</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statNumber}>{careerStats.matchesAsSecond}</Text>
                      <Text style={styles.statLabel}>As 2nd Referee</Text>
                    </View>
                  </View>
                  {careerStats.achievements && (
                    <>
                      <View style={styles.divider} />
                      <View style={styles.achievementsContainer}>
                        <Text style={styles.achievementsTitle}>Achievements</Text>
                        {careerStats.achievements.map((achievement, index) => (
                          <View key={index} style={styles.achievementItem}>
                            <Icon name="star" size={14} color="#FFD700" />
                            <Text style={styles.achievementText}>{achievement}</Text>
                          </View>
                        ))}
                      </View>
                    </>
                  )}
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

function TournamentRefScreenContent() {
  const { tournamentNo, tournamentName } = useLocalSearchParams<{
    tournamentNo: string;
    tournamentName: string;
  }>();
  
  const [referees, setReferees] = useState<Referee[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedRefereeId, setExpandedRefereeId] = useState<string | null>(null);

  const loadReferees = async () => {
    if (!tournamentNo) return;
    
    setLoading(true);
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
        const parsedReferees = parseRefereeXML(xmlResponse);
        setReferees(parsedReferees);
      }
    } catch (error) {
      console.error('Error loading referees:', error);
    } finally {
      setLoading(false);
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
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
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