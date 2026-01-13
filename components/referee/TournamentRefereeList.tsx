import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { Text } from '../Typography/Text';
import { colors, designTokens } from '../../theme/tokens';
import { RefereeStatsService, RefereeStats, RefereeMatch } from '../../services/RefereeStatsService';
import { FlagImage } from '../FlagImage';
import { MatchRefereeCard } from './MatchRefereeCard';

interface Referee {
  RefereeId: string; // 6-digit NoReferee from VIS API
  firstName: string;
  lastName: string;
  federationCode: string;
  gender: string;
  level?: string;
  role?: string; // "Referee" or "Challenge Referee"
}

interface TournamentInfo {
  visNo: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
}

type StatsTab = 'Tournament Stats';

interface TournamentRefereeListProps {
  tournamentNo: string;
  tournamentName?: string;
  tournamentData?: string;
  matchData?: string;
  showHeader?: boolean;
  headerTitle?: string;
  onRefresh?: () => void;
}

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
  const handleRefereePress = () => {
    // Open stats panel instead of navigating to profile
    onToggle();
  };

  const [currentStats, setCurrentStats] = useState<RefereeStats | null>(null);
  const [recentMatches, setRecentMatches] = useState<RefereeMatch[] | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Load current stats immediately on mount for R1/R2 totals display
  useEffect(() => {
    if (referee?.RefereeId && !currentStats) {
      loadCurrentStats();
    }
  }, [referee?.RefereeId]);

  // Load stats when card is expanded
  useEffect(() => {
    if (expanded && referee?.RefereeId) {
      loadRefereeStats();
    }
  }, [expanded, referee?.RefereeId]);

  const loadCurrentStats = async () => {
    if (!referee?.RefereeId || !tournamentNo) return;

    try {
      const current = await RefereeStatsService.getCurrentTournamentStats(referee.RefereeId, tournamentNo);
      setCurrentStats(current);
    } catch (error) {
      console.error('Error loading current stats for collapsed card:', error);
    }
  };

  const loadRefereeStats = async () => {
    if (!referee?.RefereeId || !tournamentNo) {
      return;
    }

    setStatsLoading(true);

    try {
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), 30000)
      );

      // Use the unified enhanced stats method (single API call)
      try {
        const enhancedStats = await Promise.race([RefereeStatsService.getEnhancedTournamentStats(referee.RefereeId, tournamentNo), timeout]);

        if (enhancedStats) {
          setCurrentStats(enhancedStats.stats);
          setRecentMatches(enhancedStats.recentMatches);
        } else {
          setCurrentStats(null);
          setRecentMatches(null);
        }
      } catch (enhancedError) {
        console.error('Error loading enhanced stats:', enhancedError);
        setCurrentStats(null);
        setRecentMatches(null);
      }
    } catch (error) {
      console.error(`Error loading tournament stats for referee ${referee.RefereeId}:`, error);
      // Set empty stats on error to prevent indefinite loading
      setCurrentStats(null);
      setRecentMatches(null);
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

    const stats = currentStats;

    if (!stats) {
      return (
        <View style={styles.statsEmpty}>
          <Text style={styles.emptyText}>No tournament data available</Text>
        </View>
      );
    }

    return (
      <View style={styles.statsContent}>
        {/* Stats Grid */}
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

        {/* Recent Matches Section - Compact Design */}
        <View style={styles.recentMatchesSection}>
          <Text style={styles.sectionTitle}>Last 3 Matches</Text>
          {recentMatches && recentMatches.length > 0 ? (
            <View style={styles.compactMatchesList}>
              {recentMatches.map((match, index) => (
                <MatchRefereeCard
                  key={match.matchId || index}
                  match={match}
                />
              ))}
            </View>
          ) : (
            <View style={styles.noMatchesContainer}>
              <Text style={styles.noMatchesText}>No recent matches found</Text>
            </View>
          )}

          {/* Profile Button positioned under recent matches - TEMPORARILY DISABLED */}
          {/* <TouchableOpacity style={styles.profileButtonBottom} onPress={handleProfilePress}>
            <Text style={styles.profileButtonBottomText}>Profile</Text>
          </TouchableOpacity> */}
        </View>
      </View>
    );
  };

  return (
    <TouchableOpacity style={styles.card} onPress={handleRefereePress} activeOpacity={0.7}>
      <View style={styles.cardHeader}>
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
          {/* Show CR badge for Challenge Referee, R1/R2 stats for regular Referee */}
          {referee?.role === 'Challenge Referee' ? (
            <View style={styles.challengeRefereeBadge}>
              <Text style={styles.challengeRefereeBadgeText}>CR</Text>
            </View>
          ) : (
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
          )}
          <View style={styles.cardActions}>
            <View style={styles.expandToggle}>
              <Text
                style={styles.expandIcon}
                onPress={onToggle}
              >
                {expanded ? '▼' : '▶'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {expanded && (
        <View style={styles.statsPanel}>
          <View style={styles.statsHeader}>
            <View style={styles.tabBar}>
              <View style={[styles.tab, styles.activeTab]}>
                <Text style={[styles.tabText, styles.activeTabText]}>
                  Tournament Stats
                </Text>
              </View>
            </View>
          </View>
          {renderStatsContent()}
        </View>
      )}
    </TouchableOpacity>
  );
};

export const TournamentRefereeList: React.FC<TournamentRefereeListProps> = ({
  tournamentNo,
  tournamentName,
  tournamentData,
  showHeader = true,
  headerTitle,
  onRefresh
}) => {
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

  const [referees, setReferees] = useState<Referee[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedRefereeId, setExpandedRefereeId] = useState<string | null>(null);

  const loadReferees = async () => {
    if (!tournamentNo) return;

    setLoading(true);
    try {
      // Roster-first approach for all statuses
      const rosterOk = await loadRefereesFromAPI();
      if (!rosterOk) {
        await loadRefereesFromMatchList();
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
           Fields="NoReferee FirstName LastName FederationCode Gender Role Level Status">
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
        if (parsedReferees.length > 0) {
          const normalized = parsedReferees.map(r => ({
            ...r,
            RefereeId: /^\d{6}$/.test(r.RefereeId || '') ? (r.RefereeId as string) : ''
          })).filter(r => r.firstName?.trim() || r.lastName?.trim());
          setReferees(normalized);
          return normalized.length > 0;
        }
      }
      return false;
    } catch (error) {
      console.error('Error in loadRefereesFromAPI:', error);
      return false;
    }
  };

  const loadRefereesFromMatchList = async (): Promise<void> => {
    // Simplified version - can be expanded later if needed
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
        const level = match.match(/Level="([^"]*)"/)?.[1] || '';
        const role = match.match(/Role="([^"]*)"/)?.[1] || ''; // Parse Role field

        // Only add referee if they have at least a name
        if (firstName.trim() || lastName.trim()) {
          referees.push({
            RefereeId: noReferee,
            firstName,
            lastName,
            federationCode,
            gender,
            level,
            role
          });
        }
      });
    }

    return referees;
  };

  useEffect(() => {
    loadReferees();
  }, [tournamentNo]);

  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    }
    loadReferees();
  };

  return (
    <View style={styles.container}>
      {showHeader && (
        <View style={styles.panelHeader}>
          <Text style={styles.panelHeaderText}>
            {headerTitle || `Referees - ${tournamentName || 'Tournament'}`}
          </Text>
        </View>
      )}

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={handleRefresh} />
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
                key={referee.RefereeId || index}
                referee={referee}
                tournamentNo={tournamentNo || ''}
                expanded={expandedRefereeId === referee.RefereeId}
                onToggle={() => setExpandedRefereeId(
                  expandedRefereeId === referee.RefereeId ? null : referee.RefereeId
                )}
                tournamentInfo={tournament}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  panelHeader: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  panelHeaderText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    letterSpacing: 0.5,
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
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
    elevation: 3,
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
    color: designTokens.neutrals.textPrimary,
    lineHeight: 14,
  },
  roleTotalLabel: {
    fontSize: 8,
    color: designTokens.neutrals.textSecondary,
    fontWeight: '500',
    lineHeight: 10,
  },
  roleTotalSeparator: {
    fontSize: 10,
    color: '#D1D5DB',
    paddingHorizontal: 2,
  },
  challengeRefereeBadge: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 8,
  },
  challengeRefereeBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  expandToggle: {
    paddingHorizontal: 4,
  },
  expandIcon: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  // Stats panel styles
  statsPanel: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  tabBar: {
    flexDirection: 'row',
    flex: 1,
    marginRight: 12,
  },
  profileButtonExpanded: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.primary,
    borderRadius: 6,
  },
  profileButtonExpandedText: {
    color: colors.background,
    fontSize: 12,
    fontWeight: '600',
  },
  profileButtonBottom: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.primary,
    borderRadius: 8,
    marginTop: 16,
    alignItems: 'center',
  },
  profileButtonBottomText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: '600',
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
  loadingText: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontStyle: 'italic',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  // New styles for enhanced tournament stats
  statsContent: {
    paddingTop: 8,
  },
  recentMatchesSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: designTokens.neutrals.textPrimary,
    marginBottom: 12,
  },
  matchesList: {
    gap: 12,
  },
  compactMatchesList: {
    gap: 6,
  },
  // Compact Match Card Styles
  compactMatchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  matchTimeInfo: {
    flex: 1,
  },
  matchTime: {
    fontSize: 11,
    color: designTokens.neutrals.textSecondary,
    marginTop: 2,
  },
  teamsSection: {
    marginBottom: 10,
    paddingVertical: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 6,
    paddingHorizontal: 10,
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 3,
  },
  teamFlag: {
    width: 20,
    height: 15,
    borderRadius: 2,
    marginRight: 8,
  },
  teamName: {
    fontSize: 12,
    fontWeight: '500',
    color: designTokens.neutrals.textPrimary,
    flex: 1,
  },
  vsText: {
    fontSize: 10,
    color: designTokens.neutrals.textSecondary,
    textAlign: 'center',
    marginVertical: 2,
    fontWeight: '500',
  },
  refereeSection: {
    marginBottom: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
  },
  refereeSectionTitle: {
    fontSize: 10,
    fontWeight: '600',
    color: designTokens.neutrals.textSecondary,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  refereeInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  refereeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  refereeRole: {
    fontSize: 10,
    fontWeight: '600',
    color: designTokens.neutrals.textSecondary,
    marginRight: 4,
    minWidth: 20,
  },
  refereeName: {
    fontSize: 11,
    color: designTokens.neutrals.textPrimary,
    fontWeight: '500',
    flex: 1,
  },
  currentReferee: {
    color: '#1E40AF',
    fontWeight: '600',
  },
  matchFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  matchInfo: {
    flex: 1,
    alignItems: 'flex-start',
  },
  matchCourt: {
    fontSize: 12,
    fontWeight: '600',
    color: designTokens.neutrals.textPrimary,
    marginBottom: 2,
  },
  matchRound: {
    fontSize: 11,
    color: designTokens.neutrals.textSecondary,
  },
  matchDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 12,
  },
  matchRole: {
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    minWidth: 24,
    textAlign: 'center',
  },
  roleR1: {
    backgroundColor: '#DBEAFE',
    color: '#1E40AF',
  },
  roleR2: {
    backgroundColor: '#FCE7F3',
    color: '#BE185D',
  },
  matchGender: {
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#F3F4F6',
    color: designTokens.neutrals.textPrimary,
    minWidth: 20,
    textAlign: 'center',
  },
  matchStatus: {
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    textAlign: 'center',
    minWidth: 60,
  },
  statusFinished: {
    backgroundColor: '#D1FAE5',
    color: '#065F46',
  },
  statusLive: {
    backgroundColor: '#FEE2E2',
    color: '#991B1B',
  },
  statusScheduled: {
    backgroundColor: '#E0E7FF',
    color: '#3730A3',
  },
  noMatchesContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  noMatchesText: {
    fontSize: 12,
    color: designTokens.neutrals.textSecondary,
    fontStyle: 'italic',
  },
});

export default TournamentRefereeList;