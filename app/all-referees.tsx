/**
 * All Referees Screen
 * Displays all active beach volleyball referees for the current season
 */

import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, ActivityIndicator, TextInput } from 'react-native';
import { Text } from '../components/Typography/Text';
import { NavigationHeader } from '../components/navigation/NavigationHeader';
import { colors } from '../theme/tokens';
import { RefereeStatsService, SeasonStats } from '../services/RefereeStatsService';
import { FlagImage } from '../components/FlagImage';
import { Icon } from '../components/Icons/MaterialCommunityIcons';

interface Referee {
  RefereeId: string;
  firstName: string;
  lastName: string;
  federationCode: string;
  gender: string;
  level?: string;
  stats?: SeasonStats;
}

interface RefereeCardProps {
  referee: Referee;
  expanded: boolean;
  onToggle: () => void;
}

const RefereeCard: React.FC<RefereeCardProps> = ({ referee, expanded, onToggle }) => {
  const fullName = `${referee.firstName} ${referee.lastName}`;
  const stats = referee.stats;

  return (
    <View style={styles.refereeCard}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.refereeInfo}>
          <View style={styles.refereeNameRow}>
            <Text style={styles.refereeName}>{fullName}</Text>
            <FlagImage
              federationCode={referee.federationCode}
              teamName={fullName}
              size="medium"
              style={styles.flag}
            />
          </View>
          {referee.federationCode && (
            <Text style={styles.federation}>{referee.federationCode}</Text>
          )}
        </View>

        {/* Stats Badge */}
        {stats && (
          <View style={styles.statsBadge}>
            <Text style={styles.totalMatches}>{stats.totalMatches}</Text>
            <Text style={styles.statsLabel}>matches</Text>
          </View>
        )}
      </View>

      {/* Quick Stats */}
      {stats && (
        <View style={styles.quickStats}>
          <View style={styles.statItem}>
            <Icon name="whistle" size={16} color={colors.textSecondary} />
            <Text style={styles.statText}>R1: {stats.matchesAsFirst}</Text>
          </View>
          <View style={styles.statItem}>
            <Icon name="whistle-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.statText}>R2: {stats.matchesAsSecond}</Text>
          </View>
          <View style={styles.statItem}>
            <Icon name="gender-male" size={16} color="#3B82F6" />
            <Text style={styles.statText}>{stats.menMatches}</Text>
          </View>
          <View style={styles.statItem}>
            <Icon name="gender-female" size={16} color="#EC4899" />
            <Text style={styles.statText}>{stats.womenMatches}</Text>
          </View>
        </View>
      )}

      {/* Expand Toggle */}
      <View style={styles.expandToggle}>
        <Icon
          name={expanded ? "chevron-up" : "chevron-down"}
          size={24}
          color={colors.textSecondary}
        />
      </View>
    </View>
  );
};

export default function AllRefereesScreen() {
  const [referees, setReferees] = useState<Referee[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadReferees();
  }, []);

  const loadReferees = async () => {
    try {
      setLoading(true);

      // Get current season year
      const currentYear = new Date().getFullYear();

      console.log(`Fetching events for season ${currentYear}`);

      // Step 1: Get all events for the current season using GetEventList
      // Use proper filters including IsVisManaged, NoParentEvent, and HasBeachTournament
      const eventListXml = `<Requests>
  <Request Type="GetEventList"
           Fields="No Code Name StartDate EndDate">
    <Filter IsVisManaged="True" NoParentEvent="0" HasBeachTournament="True" StartDate="${currentYear}-01-01" EndDate="${currentYear}-12-31"/>
  </Request>
</Requests>`;

      const eventListResponse = await fetch('https://www.fivb.org/Vis2009/XmlRequest.asmx', {
        method: 'POST',
        headers: {
          'Accept': 'application/xml',
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-FIVB-App-ID': '2a9523517c52420da73d927c6d6bab23'
        },
        body: new URLSearchParams({ Request: eventListXml })
      });

      if (!eventListResponse.ok) {
        console.error('Failed to fetch event list');
        setReferees([]);
        return;
      }

      const eventListXmlText = await eventListResponse.text();
      const eventMatches = eventListXmlText.match(/<Event[^>]*\/>/g) || [];

      console.log(`Found ${eventMatches.length} events for ${currentYear}`);

      // Collect all unique referees from all events
      const refereeMap = new Map<string, Referee>();
      let successfulQueries = 0;

      // Step 2: For each event, get the referee list
      for (const eventMatch of eventMatches.slice(0, 5)) { // Limit to first 5 events for performance
        try {
          const eventNo = eventMatch.match(/No="([^"]*)"/)?.[1];
          const eventName = eventMatch.match(/Name="([^"]*)"/)?.[1] || 'Unknown';

          if (!eventNo) {
            console.log(`Event has no No, skipping`);
            continue;
          }

          console.log(`Fetching referees for event: ${eventName} (${eventNo})`);

          const xml = `<Requests>
  <Request Type="GetEventRefereeList"
           Fields="NoReferee FirstName LastName FederationCode Gender Level">
    <Filter NoEvent="${eventNo}"/>
  </Request>
</Requests>`;

          const response = await fetch('https://www.fivb.org/Vis2009/XmlRequest.asmx', {
            method: 'POST',
            headers: {
              'Accept': 'application/xml',
              'Content-Type': 'application/x-www-form-urlencoded',
              'X-FIVB-App-ID': '2a9523517c52420da73d927c6d6bab23'
            },
            body: new URLSearchParams({ Request: xml })
          });

          if (response.ok) {
            const xmlResponse = await response.text();
            const refereeMatches = xmlResponse.match(/<EventReferee[^>]*\/>/g) || [];

            console.log(`Found ${refereeMatches.length} referees in ${eventName}`);

            for (const refMatch of refereeMatches) {
              const refereeId = refMatch.match(/NoReferee="([^"]*)"/)?.[1];
              const firstName = refMatch.match(/FirstName="([^"]*)"/)?.[1] || '';
              const lastName = refMatch.match(/LastName="([^"]*)"/)?.[1] || '';
              const federationCode = refMatch.match(/FederationCode="([^"]*)"/)?.[1] || '';
              const gender = refMatch.match(/Gender="([^"]*)"/)?.[1] || '';
              const level = refMatch.match(/Level="([^"]*)"/)?.[1];

              console.log(`Parsing referee: ${firstName} ${lastName} (ID: ${refereeId})`);

              if (refereeId && !refereeMap.has(refereeId)) {
                console.log(`Adding referee ${refereeId} to map`);
                refereeMap.set(refereeId, {
                  RefereeId: refereeId,
                  firstName,
                  lastName,
                  federationCode,
                  gender,
                  level,
                });
              } else if (!refereeId) {
                console.warn(`Referee has no ID, skipping:`, refMatch);
              } else {
                console.log(`Referee ${refereeId} already in map`);
              }
            }
            successfulQueries++;
          } else {
            console.error(`Failed to fetch referees for ${eventName}: ${response.status}`);
          }
        } catch (error) {
          console.error(`Error loading referees from event:`, error);
        }
      }

      console.log(`Successfully queried ${successfulQueries} events`);

      // Convert map to array
      const uniqueReferees = Array.from(refereeMap.values());
      console.log(`Found ${uniqueReferees.length} unique referees`);

      // Load stats for each referee (limit to avoid too many requests)
      const refereesWithStats = await Promise.all(
        uniqueReferees.slice(0, 20).map(async (referee) => {
          try {
            const stats = await RefereeStatsService.getSeasonStats(referee.RefereeId, currentYear.toString());
            return { ...referee, stats };
          } catch (error) {
            return { ...referee, stats: undefined };
          }
        })
      );

      // Sort by total matches descending
      const sortedReferees = refereesWithStats.sort((a, b) => {
        const matchesA = a.stats?.totalMatches || 0;
        const matchesB = b.stats?.totalMatches || 0;
        return matchesB - matchesA;
      });

      setReferees(sortedReferees);
    } catch (error) {
      console.error('Error loading referees:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReferees();
    setRefreshing(false);
  };

  const filteredReferees = referees.filter(referee => {
    const fullName = `${referee.firstName} ${referee.lastName}`.toLowerCase();
    const query = searchQuery.toLowerCase();
    return fullName.includes(query) || referee.federationCode?.toLowerCase().includes(query);
  });

  if (loading) {
    return (
      <View style={styles.container}>
        <NavigationHeader
          title="All Referees"
          showBackButton={true}
          showStatusBar={false}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading referees...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <NavigationHeader
        title="All Referees"
        showBackButton={true}
        showStatusBar={false}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Season {new Date().getFullYear()} Referees</Text>
          <Text style={styles.subtitle}>{referees.length} active referees</Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Icon name="magnify" size={20} color={colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or country..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={colors.textSecondary}
          />
          {searchQuery.length > 0 && (
            <Icon
              name="close-circle"
              size={20}
              color={colors.textSecondary}
              style={styles.clearIcon}
              onPress={() => setSearchQuery('')}
            />
          )}
        </View>

        {/* Referees List */}
        <View style={styles.refereesList}>
          {filteredReferees.map((referee) => (
            <RefereeCard
              key={referee.RefereeId}
              referee={referee}
              expanded={expandedId === referee.RefereeId}
              onToggle={() => setExpandedId(expandedId === referee.RefereeId ? null : referee.RefereeId)}
            />
          ))}
        </View>

        {filteredReferees.length === 0 && (
          <View style={styles.emptyState}>
            <Icon name="account-search" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyText}>No referees found</Text>
            <Text style={styles.emptySubtext}>Try adjusting your search</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
  },
  header: {
    padding: 24,
    paddingBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 24,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.textPrimary,
  },
  clearIcon: {
    marginLeft: 8,
  },
  refereesList: {
    paddingHorizontal: 24,
    gap: 12,
  },
  refereeCard: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  refereeInfo: {
    flex: 1,
  },
  refereeNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  refereeName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginRight: 8,
  },
  flag: {
    marginLeft: 4,
  },
  federation: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  statsBadge: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  totalMatches: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.background,
  },
  statsLabel: {
    fontSize: 10,
    color: colors.background,
    opacity: 0.9,
  },
  quickStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  expandToggle: {
    alignItems: 'center',
    paddingTop: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
});
