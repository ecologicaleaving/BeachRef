/**
 * All Referees Screen
 * Displays all beach volleyball referees with real data using the same system as tournament-ref page
 * Sorted by matches officiated in descending order, with real statistics from VIS API
 */

import React, { useState, useEffect } from 'react';
import { View, TextInput, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { NavigationHeader } from '../components/navigation/NavigationHeader';
import { Container } from '../components/Foundation/Container';
import { Text } from '../components/Typography/Text';
import { FlagImage } from '../components/FlagImage';
import { colors } from '../theme/tokens';
import { RefereeStatsService, SeasonStats, CareerStats } from '../services/RefereeStatsService';
// import { AssignmentStatusProvider } from '../hooks/useAssignmentStatus'; // Not needed for All Referees

interface Referee {
  RefereeId: string; // 6-digit NoReferee from VIS API
  firstName: string;
  lastName: string;
  federationCode: string;
  gender: string;
  level?: string;
  totalMatches?: number; // For sorting
}

type StatsTab = 'Current' | 'Season' | 'Career';

interface TournamentInfo {
  visNo: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
}

// Exact RefereeCard component from tournament-ref screen
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
  const [activeTab, setActiveTab] = useState<StatsTab>('Current');
  const [currentStats, setCurrentStats] = useState<SeasonStats | null>(null);
  const [seasonStats, setSeasonStats] = useState<SeasonStats | null>(null);
  const [careerStats, setCareerStats] = useState<CareerStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Load current stats immediately on mount for R1/R2 totals display
  useEffect(() => {
    if (referee?.RefereeId && !currentStats) {
      loadCurrentStats();
    }
  }, [referee?.RefereeId]);

  // Load stats when card is expanded or tab changes
  useEffect(() => {
    if (expanded && referee?.RefereeId) {
      loadRefereeStats();
    }
  }, [expanded, referee?.RefereeId, activeTab]);

  const loadCurrentStats = async () => {
    if (!referee?.RefereeId) return;
    
    try {
      // Use current calendar year for season stats (2025)
      const currentYear = new Date().getFullYear();
      console.log(`Loading season stats for current year: ${currentYear}`);
      const seasonYear = currentYear.toString();
      const seasonStats = await RefereeStatsService.getSeasonStats(referee.RefereeId, seasonYear);
      setCurrentStats(seasonStats);
    } catch (error) {
      console.error('Error loading season stats for collapsed card:', error);
    }
  };

  const loadRefereeStats = async () => {
    if (!referee?.RefereeId || !tournamentNo) {
      console.log('Missing referee ID or tournament number:', { refereeId: referee?.RefereeId, tournamentNo });
      return;
    }
    
    console.log(`Loading ${activeTab} stats for referee ${referee.RefereeId}`);
    setStatsLoading(true);
    
    try {
      const timeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 30000)
      );

      switch (activeTab) {
        case 'Current':
          // Use season stats for Current tab as well (current year season)
          const currentYear = new Date().getFullYear();
          console.log(`Loading Current tab season stats for year: ${currentYear}`);
          const currentSeasonYear = currentYear.toString();
          const currentPromise = RefereeStatsService.getSeasonStats(referee.RefereeId, currentSeasonYear);
          const current = await Promise.race([currentPromise, timeout]);
          console.log('Current season stats loaded:', current);
          setCurrentStats(current);
          break;
        case 'Season':
          // Use current calendar year for season stats, not tournament year
          const seasonCurrentYear = new Date().getFullYear();
          const seasonYear = seasonCurrentYear.toString();
          console.log('Loading season stats for year:', seasonYear, '(current year)');
          const seasonPromise = RefereeStatsService.getSeasonStats(referee.RefereeId, seasonYear);
          const season = await Promise.race([seasonPromise, timeout]);
          console.log('Season stats loaded:', season);
          setSeasonStats(season);
          break;
        case 'Career':
          console.log('Loading career stats');
          const careerPromise = RefereeStatsService.getCareerStats(referee.RefereeId);
          const career = await Promise.race([careerPromise, timeout]);
          console.log('Career stats loaded:', career);
          setCareerStats(career);
          break;
      }
    } catch (error) {
      console.error(`Error loading ${activeTab} stats for referee ${referee.RefereeId}:`, error);
      // Set empty stats on error to prevent indefinite loading
      switch (activeTab) {
        case 'Season':
          setSeasonStats(null);
          break;
        case 'Career':
          setCareerStats(null);
          break;
      }
    } finally {
      setStatsLoading(false);
    }
  };

  const renderStatsContent = () => {
    if (statsLoading) {
      return (
        <View style={styles.statsLoading}>
          <Text style={styles.loadingText}>Loading stats...</Text>
        </View>
      );
    }

    const stats = activeTab === 'Current' ? currentStats : 
                 activeTab === 'Season' ? seasonStats : careerStats;

    if (!stats) {
      return (
        <View style={styles.statsEmpty}>
          <Text style={styles.emptyText}>No {activeTab.toLowerCase()} data available</Text>
        </View>
      );
    }

    return (
      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.totalMatches}</Text>
          <Text style={styles.statLabel}>TOT</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.matchesAsFirst}</Text>
          <Text style={styles.statLabel}>R1</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.matchesAsSecond}</Text>
          <Text style={styles.statLabel}>R2</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.menMatches}</Text>
          <Text style={styles.statLabel}>M</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.womenMatches}</Text>
          <Text style={styles.statLabel}>W</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.card}>
      <TouchableOpacity style={styles.cardHeader} onPress={onToggle} activeOpacity={0.7}>
        {referee?.federationCode && (
          <View style={styles.flagSection}>
            <FlagImage federationCode={referee.federationCode} size="medium" style={styles.flagLeft} />
            <Text style={styles.countryCode}>{referee.federationCode}</Text>
          </View>
        )}
        <View style={styles.refereeMainInfo}>
          <Text style={styles.refereeName}>
            {referee?.firstName || 'Unknown'}
          </Text>
          <Text style={styles.refereeLastName}>
            {referee?.lastName || 'Referee'}
          </Text>
        </View>
        <View style={styles.cardHeaderRight}>
          {/* Always show basic R1/R2 totals */}
          <View style={styles.roleTotals}>
            <View style={styles.roleTotal}>
              <Text style={styles.roleTotalCount}>{currentStats?.matchesAsFirst || 0}</Text>
              <Text style={styles.roleTotalLabel}>R1</Text>
            </View>
            <Text style={styles.roleTotalSeparator}>•</Text>
            <View style={styles.roleTotal}>
              <Text style={styles.roleTotalCount}>{currentStats?.matchesAsSecond || 0}</Text>
              <Text style={styles.roleTotalLabel}>R2</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.profileButton}
            activeOpacity={0.8}
            onPress={() => {
              try {
                const payload: any = {
                  id: (referee?.RefereeId || '').toString(),
                  firstName: referee?.firstName || '',
                  lastName: referee?.lastName || '',
                  federationCode: referee?.federationCode || '',
                  gender: referee?.gender || '',
                  status: 'Active',
                  role: 'Referee',
                  type: 'International'
                };
                router.push({ pathname: '/referee-profile', params: { refereeData: JSON.stringify(payload) } });
              } catch (e) {
                console.error('Failed to navigate to referee profile', e);
              }
            }}
          >
            <Text style={styles.profileButtonText}>Profile</Text>
          </TouchableOpacity>
          <Text style={styles.expandIcon}>
            {expanded ? '▼' : '▶'}
          </Text>
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.statsPanel}>
          <View style={styles.tabBar}>
            {(['Current', 'Season', 'Career'] as StatsTab[]).map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, activeTab === tab && styles.activeTab]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {renderStatsContent()}
        </View>
      )}
    </View>
  );
};

function AllRefereesScreenContent() {
  const [searchQuery, setSearchQuery] = useState('');
  const [referees, setReferees] = useState<Referee[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRefereeId, setExpandedRefereeId] = useState<string | null>(null);
  
  // Use a default tournament for all referees (latest active tournament)
  const defaultTournamentNo = '1053'; // Can be made dynamic later

  const loadAllReferees = async () => {
    setLoading(true);
    try {
      console.log('Loading active referees for current season first...');
      
      // Phase 1: Load only active referees for current season
      const activeRefereesLoaded = await loadActiveSeasonReferees();
      if (!activeRefereesLoaded) {
        console.log('No active referees found for current season');
        setReferees([]);
      }
      
      // Phase 2: Load remaining referees from other seasons incrementally in background
      setTimeout(() => {
        loadInactiveRefereesIncrementally();
      }, 1000);
      
    } catch (error) {
      console.error('Error loading referees:', error);
      setReferees([]);
    } finally {
      setLoading(false);
    }
  };

  const loadActiveSeasonReferees = async (): Promise<boolean> => {
    try {
      console.log('Getting active referees from current season matches...');
      const currentYear = new Date().getFullYear();
      
      // Get matches from current year to extract active referee IDs
      const activeRefereeIds = await getActiveRefereeIdsFromMatches(currentYear);
      
      if (activeRefereeIds.size > 0) {
        console.log(`Found ${activeRefereeIds.size} unique active referee IDs from current season matches`);
        
        // Get referee details for active IDs only
        const activeReferees = await getRefereeDetailsByIds(Array.from(activeRefereeIds));
        
        if (activeReferees.length > 0) {
          console.log(`Loaded details for ${activeReferees.length} active referees`);
          
          // Load stats for active referees to get match counts for sorting
          const refereesWithStats = await Promise.all(
            activeReferees.map(async (referee) => {
              try {
                const seasonStats = await RefereeStatsService.getSeasonStats(referee.RefereeId, currentYear.toString());
                return {
                  ...referee,
                  totalMatches: seasonStats?.totalMatches || 0
                };
              } catch (error) {
                return {
                  ...referee,
                  totalMatches: 0
                };
              }
            })
          );
          
          // Sort by matches officiated (descending)
          const sortedActiveReferees = refereesWithStats.sort((a, b) => b.totalMatches - a.totalMatches);
          
          console.log(`Setting ${sortedActiveReferees.length} active referees sorted by matches`);
          setReferees(sortedActiveReferees);
          
          // Load inactive referees in background
          setTimeout(() => {
            loadInactiveReferees(activeRefereeIds);
          }, 2000);
          
          return true;
        }
      }
      
      console.log('No active referees found in current season matches');
      return false;
    } catch (error) {
      console.error('Error loading active season referees:', error);
      return false;
    }
  };

  const getActiveRefereeIdsFromMatches = async (year: number): Promise<Set<string>> => {
    try {
      console.log(`Getting active referee IDs from current season tournaments...`);
      
      // First get recent tournaments from current year
      const recentTournaments = await getRecentTournaments(year);
      
      if (recentTournaments.length === 0) {
        console.log('No recent tournaments found, falling back to simple approach');
        return new Set();
      }
      
      console.log(`Found ${recentTournaments.length} recent tournaments, getting matches...`);
      
      const refereeIds = new Set<string>();
      
      // Get matches from a few recent tournaments to find active referees
      const tournamentsToCheck = recentTournaments.slice(0, 10); // Check up to 10 recent tournaments
      
      for (const tournament of tournamentsToCheck) {
        try {
          const tournamentReferees = await getRefereeIdsFromTournament(tournament.visNo);
          tournamentReferees.forEach(id => refereeIds.add(id));
        } catch (error) {
          console.log(`Error getting referees from tournament ${tournament.visNo}:`, error);
          continue;
        }
      }
      
      console.log(`Extracted ${refereeIds.size} unique referee IDs from recent tournaments`);
      return refereeIds;
    } catch (error) {
      console.error('Error getting active referee IDs from matches:', error);
      return new Set();
    }
  };

  const getRecentTournaments = async (year: number): Promise<Array<{visNo: string, name: string}>> => {
    try {
      // Get tournaments from current year
      const xml = `<Requests>
  <Request Type="GetEventList"
           Fields="No Name StartDate">
    <Filter Sport="BV"/>
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
        const tournaments: Array<{visNo: string, name: string, startDate: string}> = [];
        
        // Parse tournaments from XML
        const eventRegex = /<Event[^>]*>/g;
        const matches = [...xmlResponse.matchAll(eventRegex)];
        
        matches.forEach((match) => {
          const fullMatch = match[0];
          const no = fullMatch.match(/No="([^"]*)"/)?.[1];
          const name = fullMatch.match(/Name="([^"]*)"/)?.[1];
          const startDate = fullMatch.match(/StartDate="([^"]*)"/)?.[1];
          
          if (no && name && startDate) {
            const tournamentYear = new Date(startDate).getFullYear();
            if (tournamentYear === year) {
              tournaments.push({
                visNo: no,
                name: name,
                startDate: startDate
              });
            }
          }
        });

        // Sort by start date (most recent first)
        tournaments.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
        
        console.log(`Found ${tournaments.length} tournaments from ${year}`);
        return tournaments;
      }
      
      return [];
    } catch (error) {
      console.error('Error getting recent tournaments:', error);
      return [];
    }
  };

  const getRefereeIdsFromTournament = async (tournamentNo: string): Promise<Set<string>> => {
    try {
      // Use GetEventRefereeList to get referees for specific tournament
      const xml = `<Requests>
  <Request Type="GetEventRefereeList"
           Fields="NoReferee">
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
        const refereeIds = new Set<string>();
        
        // Extract referee IDs from tournament
        const refereeMatches = xmlResponse.match(/<EventReferee[^>]*>/g);
        if (refereeMatches) {
          refereeMatches.forEach(match => {
            const noReferee = match.match(/NoReferee="([^"]*)"/)?.[1] || '';
            if (noReferee && /^\d{6}$/.test(noReferee)) {
              refereeIds.add(noReferee);
            }
          });
        }
        
        return refereeIds;
      }
      
      return new Set();
    } catch (error) {
      console.error(`Error getting referee IDs from tournament ${tournamentNo}:`, error);
      return new Set();
    }
  };

  const getRefereeDetailsByIds = async (refereeIds: string[]): Promise<Referee[]> => {
    try {
      // Get all beach volleyball referees 
      const allReferees = await getAllReferees();
      
      // Filter to only those with IDs found in matches
      const activeReferees = allReferees.filter(referee => 
        refereeIds.includes(referee.RefereeId)
      );
      
      console.log(`Filtered ${activeReferees.length} referees from ${allReferees.length} total referees`);
      return activeReferees;
    } catch (error) {
      console.error('Error getting referee details by IDs:', error);
      return [];
    }
  };

  const loadInactiveReferees = async (activeIds: Set<string>) => {
    try {
      console.log('Loading inactive referees in background...');
      
      // Get all referees and filter out the active ones
      const allReferees = await getAllReferees();
      const inactiveReferees = allReferees.filter(referee => 
        !activeIds.has(referee.RefereeId)
      );
      
      console.log(`Found ${inactiveReferees.length} inactive referees to add incrementally`);
      
      // Add them in batches
      await loadInactiveRefereesBatch(
        inactiveReferees.map(ref => ({ ...ref, totalMatches: 0, isActive: false })), 
        []
      );
      
    } catch (error) {
      console.error('Error loading inactive referees:', error);
    }
  };

  const getAllReferees = async (): Promise<Referee[]> => {
    const xml = `<Requests>
  <Request Type="GetRefereeList"
           Fields="NoReferee FirstName LastName FederationCode Gender Level Status Sport">
    <Filter Sport="BV"/>
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
      
      const normalized = parsedReferees.map(r => ({
        ...r,
        RefereeId: /^\d{6}$/.test(r.RefereeId || '') ? (r.RefereeId as string) : ''
      })).filter(r => r.firstName?.trim() || r.lastName?.trim());
      
      return normalized;
    }
    
    return [];
  };

  const loadInactiveRefereesBatch = async (inactiveReferees: (Referee & { totalMatches: number; isActive: boolean })[], currentActive: (Referee & { totalMatches: number; isActive?: boolean })[]) => {
    if (inactiveReferees.length === 0) return;
    
    console.log('Adding inactive referees to the list incrementally...');
    
    // Add inactive referees in small batches to avoid UI blocking
    const batchSize = 10;
    const totalBatches = Math.ceil(inactiveReferees.length / batchSize);
    
    for (let i = 0; i < totalBatches; i++) {
      const batch = inactiveReferees.slice(i * batchSize, (i + 1) * batchSize);
      
      // Add batch to current referees list
      setReferees(prev => {
        const combined = [...prev, ...batch];
        // Re-sort the entire list by total matches
        return combined.sort((a, b) => (b.totalMatches || 0) - (a.totalMatches || 0));
      });
      
      console.log(`Added batch ${i + 1}/${totalBatches} of inactive referees`);
      
      // Wait between batches to avoid blocking UI
      if (i < totalBatches - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    console.log('Finished loading all referees incrementally');
  };

  const loadInactiveRefereesIncrementally = () => {
    // This function is a placeholder - actual loading happens in loadActiveSeasonReferees
    console.log('Incremental loading initiated...');
  };


  // Exact same parsing function as tournament-ref screen
  const parseRefereeXML = (xmlString: string): Referee[] => {
    const referees: Referee[] = [];
    // For GetRefereeList, use <Referee> elements, not <EventReferee>
    const refereeMatches = xmlString.match(/<Referee[^>]*>/g);
    
    if (refereeMatches) {
      refereeMatches.forEach(match => {
        const noReferee = match.match(/NoReferee="([^"]*)"/)?.[1] || match.match(/No="([^"]*)"/)?.[1] || '';
        const firstName = match.match(/FirstName="([^"]*)"/)?.[1] || '';
        const lastName = match.match(/LastName="([^"]*)"/)?.[1] || '';
        const federationCode = match.match(/FederationCode="([^"]*)"/)?.[1] || '';
        const gender = match.match(/Gender="([^"]*)"/)?.[1] || '';
        const level = match.match(/Level="([^"]*)"/)?.[1] || '';
        
        // Only add referee if they have at least a name (same logic as tournament-ref)
        if (firstName.trim() || lastName.trim()) {
          referees.push({
            RefereeId: noReferee,
            firstName,
            lastName,
            federationCode,
            gender,
            level
          });
        }
      });
    }
    
    return referees;
  };

  // Filter referees based on search query
  const filteredReferees = React.useMemo(() => {
    if (!searchQuery) return referees;
    
    const query = searchQuery.toLowerCase().trim();
    return referees.filter(referee => 
      referee.firstName.toLowerCase().includes(query) ||
      referee.lastName.toLowerCase().includes(query) ||
      referee.federationCode.toLowerCase().includes(query) ||
      referee.RefereeId.includes(query)
    );
  }, [referees, searchQuery]);

  const handleCardToggle = (refereeId: string) => {
    setExpandedRefereeId(expandedRefereeId === refereeId ? null : refereeId);
  };

  const handleBack = () => {
    router.back();
  };

  useEffect(() => {
    loadAllReferees();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <NavigationHeader 
        title=""
        showBackButton={true}
        onBackPress={handleBack}
      />
      
      <Container style={styles.content}>
        {/* Page Title */}
        <View style={styles.titleContainer}>
          <Text style={styles.pageTitle}>Referees</Text>
        </View>
        
        {/* Search Field */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search referees by name, country, or ID..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
            placeholderTextColor="#9CA3AF"
          />
          <Text style={styles.sortInfo}>Active referees first, sorted by season matches (descending)</Text>
        </View>

        {/* Referee Cards - Same as Tournament Screen */}
        <ScrollView 
          style={styles.scrollContainer}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={loadAllReferees}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        >
          {loading && referees.length === 0 && (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading all referees...</Text>
            </View>
          )}
          
          {filteredReferees.length === 0 && !loading && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {searchQuery ? 'No referees found matching your search.' : 'No referees available.'}
              </Text>
            </View>
          )}

          {filteredReferees.map((referee, index) => (
            <RefereeCard
              key={referee.RefereeId || index}
              referee={referee}
              tournamentNo={defaultTournamentNo}
              expanded={expandedRefereeId === referee.RefereeId}
              onToggle={() => handleCardToggle(referee.RefereeId)}
              tournamentInfo={null}
            />
          ))}
        </ScrollView>
      </Container>
    </SafeAreaView>
  );
}

// Export the screen directly without AssignmentStatusProvider
export default function AllRefereesScreen() {
  return <AllRefereesScreenContent />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
  titleContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: colors.background,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.secondary,
    backgroundColor: colors.background,
  },
  searchInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: colors.secondary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.textPrimary,
  },
  sortInfo: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    fontStyle: 'italic',
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  // Card styles from tournament-ref screen
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
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  cardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  refereeMainInfo: {
    flex: 1,
  },
  refereeName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  refereeLastName: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    marginTop: 2,
  },
  flagSection: {
    alignItems: 'center',
    marginRight: 12,
  },
  flagLeft: {
    width: 32,
    height: 24,
    borderRadius: 4,
    marginBottom: 4,
  },
  countryCode: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  roleTotals: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleTotal: {
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  roleTotalCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    lineHeight: 14,
  },
  roleTotalLabel: {
    fontSize: 8,
    color: '#9CA3AF',
    fontWeight: '500',
    lineHeight: 10,
  },
  roleTotalSeparator: {
    fontSize: 10,
    color: '#D1D5DB',
    paddingHorizontal: 2,
  },
  profileButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.primary,
    borderRadius: 6,
  },
  profileButtonText: {
    color: colors.background,
    fontSize: 12,
    fontWeight: '600',
  },
  expandIcon: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  statsPanel: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  tabBar: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  activeTab: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    color: colors.text,
  },
  activeTabText: {
    color: colors.background,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
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
  statsLoading: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  statsEmpty: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});