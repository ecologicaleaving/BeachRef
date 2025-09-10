import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { designTokens } from '../../theme/tokens';
import { RefereePerformanceMetrics } from '../../hooks/useRefereeAnalytics';

/**
 * Props interface for GeographicDistributionMap
 */
export interface GeographicDistributionMapProps {
  data: RefereePerformanceMetrics[];
  onRefereePress?: (referee: RefereePerformanceMetrics) => void;
  onTournamentPress?: (tournamentCode: string) => void;
  showCoverage?: boolean;
  compact?: boolean;
}

/**
 * Tournament location data interface
 */
interface TournamentLocation {
  code: string;
  refereeCount: number;
  referees: RefereePerformanceMetrics[];
  totalAssignments: number;
}

/**
 * GeographicDistributionMap Component
 * Specialized component for geographic distribution analysis
 * Provides visual representation of referee assignments across tournaments/locations
 */
export const GeographicDistributionMap: React.FC<GeographicDistributionMapProps> = ({
  data,
  onRefereePress,
  onTournamentPress,
  showCoverage = true,
  compact = false,
}) => {
  
  // Calculate geographic statistics
  const geoStats = useMemo(() => {
    if (data.length === 0) return null;

    // Collect all tournaments and their referee assignments
    const tournamentMap = new Map<string, TournamentLocation>();
    const refereeCountByTournament = new Map<string, number>();
    
    data.forEach(referee => {
      referee.tournaments_worked.forEach(tournament => {
        if (!tournamentMap.has(tournament)) {
          tournamentMap.set(tournament, {
            code: tournament,
            refereeCount: 0,
            referees: [],
            totalAssignments: 0,
          });
        }
        
        const location = tournamentMap.get(tournament)!;
        location.refereeCount++;
        location.referees.push(referee);
        location.totalAssignments += referee.total_assignments;
        
        refereeCountByTournament.set(tournament, (refereeCountByTournament.get(tournament) || 0) + 1);
      });
    });

    const tournaments = Array.from(tournamentMap.values())
      .sort((a, b) => b.refereeCount - a.refereeCount);

    // Calculate coverage metrics
    const totalTournaments = tournaments.length;
    const avgRefereesPerTournament = totalTournaments > 0 
      ? tournaments.reduce((sum, t) => sum + t.refereeCount, 0) / totalTournaments
      : 0;
    const maxCoverage = Math.max(...tournaments.map(t => t.refereeCount));
    const minCoverage = Math.min(...tournaments.map(t => t.refereeCount));

    // Calculate referee mobility (average tournaments per referee)
    const avgTournamentsPerReferee = data.length > 0
      ? data.reduce((sum, r) => sum + r.tournaments_worked.length, 0) / data.length
      : 0;

    // Find high/low coverage tournaments
    const highCoverage = tournaments.filter(t => t.refereeCount > avgRefereesPerTournament * 1.5);
    const lowCoverage = tournaments.filter(t => t.refereeCount < avgRefereesPerTournament * 0.5);

    return {
      tournaments,
      totalTournaments,
      avgRefereesPerTournament: Math.round(avgRefereesPerTournament * 10) / 10,
      avgTournamentsPerReferee: Math.round(avgTournamentsPerReferee * 10) / 10,
      maxCoverage,
      minCoverage,
      highCoverage,
      lowCoverage,
    };
  }, [data]);

  // Get coverage level color
  const getCoverageColor = (refereeCount: number) => {
    if (!geoStats) return designTokens.colors.textSecondary;
    
    if (refereeCount > geoStats.avgRefereesPerTournament * 1.5) return designTokens.colors.success;
    if (refereeCount > geoStats.avgRefereesPerTournament) return designTokens.colors.primary;
    if (refereeCount > geoStats.avgRefereesPerTournament * 0.5) return designTokens.colors.warning;
    return designTokens.colors.error;
  };

  // Handle tournament press
  const handleTournamentPress = (tournamentCode: string) => {
    if (onTournamentPress) {
      onTournamentPress(tournamentCode);
    }
  };

  // Handle referee press
  const handleRefereePress = (referee: RefereePerformanceMetrics) => {
    if (onRefereePress) {
      onRefereePress(referee);
    }
  };

  if (!geoStats) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No geographic data available</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Geographic Distribution</Text>
        <View style={styles.headerStats}>
          <Text style={styles.headerStat}>{geoStats.totalTournaments} tournaments</Text>
          <Text style={styles.headerStat}>{data.length} referees</Text>
        </View>
      </View>

      {/* Summary statistics */}
      <View style={styles.summaryStats}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{geoStats.avgRefereesPerTournament}</Text>
          <Text style={styles.statLabel}>Avg Referees/Tournament</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{geoStats.avgTournamentsPerReferee}</Text>
          <Text style={styles.statLabel}>Avg Tournaments/Referee</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{geoStats.maxCoverage}</Text>
          <Text style={styles.statLabel}>Max Coverage</Text>
        </View>
      </View>

      {/* Coverage visualization */}
      <ScrollView style={styles.mapContainer} contentContainerStyle={styles.mapContent}>
        <Text style={styles.sectionTitle}>Tournament Coverage</Text>
        
        {/* Visual coverage map (simplified grid representation) */}
        <View style={styles.coverageGrid}>
          {geoStats.tournaments.slice(0, compact ? 12 : 20).map((tournament) => (
            <TouchableOpacity
              key={tournament.code}
              style={[
                styles.tournamentNode,
                { 
                  backgroundColor: getCoverageColor(tournament.refereeCount),
                  transform: [{ 
                    scale: 0.8 + (tournament.refereeCount / geoStats.maxCoverage) * 0.4 
                  }]
                }
              ]}
              onPress={() => handleTournamentPress(tournament.code)}
            >
              <Text style={styles.tournamentCode}>
                {tournament.code.substring(0, 3).toUpperCase()}
              </Text>
              <Text style={styles.tournamentCount}>
                {tournament.refereeCount}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Coverage legend */}
        <View style={styles.legend}>
          <Text style={styles.legendTitle}>Coverage Level</Text>
          <View style={styles.legendItems}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: designTokens.colors.success }]} />
              <Text style={styles.legendText}>High ({geoStats.highCoverage.length})</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: designTokens.colors.primary }]} />
              <Text style={styles.legendText}>Good</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: designTokens.colors.warning }]} />
              <Text style={styles.legendText}>Fair</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: designTokens.colors.error }]} />
              <Text style={styles.legendText}>Low ({geoStats.lowCoverage.length})</Text>
            </View>
          </View>
        </View>

        {/* Tournament details list */}
        <Text style={styles.sectionTitle}>Tournament Details</Text>
        <View style={styles.tournamentList}>
          {geoStats.tournaments.slice(0, compact ? 5 : 10).map((tournament, index) => (
            <TouchableOpacity
              key={tournament.code}
              style={styles.tournamentItem}
              onPress={() => handleTournamentPress(tournament.code)}
            >
              <View style={styles.tournamentInfo}>
                <View style={styles.tournamentHeader}>
                  <Text style={styles.tournamentName}>
                    {index === 0 && '🏆 '}{tournament.code}
                  </Text>
                  <View 
                    style={[
                      styles.coverageIndicator,
                      { backgroundColor: getCoverageColor(tournament.refereeCount) }
                    ]}
                  >
                    <Text style={styles.coverageText}>
                      {tournament.refereeCount} referees
                    </Text>
                  </View>
                </View>
                <Text style={styles.tournamentStats}>
                  {tournament.totalAssignments} total assignments
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Referee mobility analysis */}
        {showCoverage && (
          <>
            <Text style={styles.sectionTitle}>Referee Mobility</Text>
            <View style={styles.mobilityList}>
              {data.slice(0, compact ? 5 : 8)
                .sort((a, b) => b.tournaments_worked.length - a.tournaments_worked.length)
                .map((referee) => (
                  <TouchableOpacity
                    key={referee.referee_id}
                    style={styles.mobilityItem}
                    onPress={() => handleRefereePress(referee)}
                  >
                    <View style={styles.mobilityInfo}>
                      <Text style={styles.refereeName}>{referee.referee_name}</Text>
                      <Text style={styles.mobilityStats}>
                        {referee.tournaments_worked.length} tournaments • {referee.federation_code}
                      </Text>
                    </View>
                    <View style={styles.tournamentBadges}>
                      {referee.tournaments_worked.slice(0, 3).map((tournament, index) => (
                        <View key={index} style={styles.tournamentBadge}>
                          <Text style={styles.tournamentBadgeText}>
                            {tournament.substring(0, 2).toUpperCase()}
                          </Text>
                        </View>
                      ))}
                      {referee.tournaments_worked.length > 3 && (
                        <View style={[styles.tournamentBadge, { backgroundColor: designTokens.colors.textSecondary }]}>
                          <Text style={styles.tournamentBadgeText}>
                            +{referee.tournaments_worked.length - 3}
                          </Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: designTokens.colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: designTokens.brandColors.primaryLight,
    margin: designTokens.spacing.md,
    shadowColor: designTokens.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  containerCompact: {
    margin: designTokens.spacing.sm,
  },

  // Empty state
  emptyContainer: {
    backgroundColor: designTokens.colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: designTokens.brandColors.primaryLight,
    borderStyle: 'dashed',
    margin: designTokens.spacing.md,
    padding: designTokens.spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: designTokens.colors.textSecondary,
    textAlign: 'center',
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: designTokens.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.brandColors.primaryLight,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: designTokens.colors.textPrimary,
  },
  headerStats: {
    alignItems: 'flex-end',
  },
  headerStat: {
    fontSize: 12,
    color: designTokens.colors.textSecondary,
  },

  // Summary stats
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: designTokens.spacing.md,
    backgroundColor: designTokens.brandColors.primaryLight,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: designTokens.colors.primary,
  },
  statLabel: {
    fontSize: 9,
    color: designTokens.colors.textSecondary,
    textTransform: 'uppercase',
    marginTop: 2,
    textAlign: 'center',
    lineHeight: 12,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: designTokens.colors.textSecondary + '30',
  },

  // Map container
  mapContainer: {
    maxHeight: 400,
  },
  mapContent: {
    paddingBottom: designTokens.spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: designTokens.colors.textPrimary,
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.sm,
    backgroundColor: designTokens.brandColors.primaryLight,
  },

  // Coverage grid (visual map)
  coverageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: designTokens.spacing.md,
    justifyContent: 'space-around',
    gap: designTokens.spacing.sm,
  },
  tournamentNode: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: designTokens.spacing.xs,
    borderWidth: 2,
    borderColor: designTokens.colors.background,
  },
  tournamentCode: {
    fontSize: 10,
    fontWeight: 'bold',
    color: designTokens.colors.background,
  },
  tournamentCount: {
    fontSize: 8,
    color: designTokens.colors.background,
    fontWeight: '600',
  },

  // Legend
  legend: {
    padding: designTokens.spacing.md,
    borderTopWidth: 1,
    borderTopColor: designTokens.brandColors.primaryLight,
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: designTokens.colors.textPrimary,
    marginBottom: designTokens.spacing.sm,
  },
  legendItems: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: designTokens.spacing.xs,
  },
  legendText: {
    fontSize: 10,
    color: designTokens.colors.textSecondary,
  },

  // Tournament list
  tournamentList: {
    paddingHorizontal: designTokens.spacing.md,
  },
  tournamentItem: {
    backgroundColor: designTokens.brandColors.primaryLight,
    borderRadius: 8,
    padding: designTokens.spacing.sm,
    marginBottom: designTokens.spacing.xs,
    minHeight: designTokens.iconTokens.accessibility.minimumTouchTarget,
    justifyContent: 'center',
  },
  tournamentInfo: {
    flex: 1,
  },
  tournamentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  tournamentName: {
    fontSize: 16,
    fontWeight: '600',
    color: designTokens.colors.textPrimary,
    flex: 1,
  },
  coverageIndicator: {
    paddingHorizontal: designTokens.spacing.xs,
    paddingVertical: 2,
    borderRadius: 12,
  },
  coverageText: {
    fontSize: 10,
    fontWeight: '600',
    color: designTokens.colors.background,
  },
  tournamentStats: {
    fontSize: 12,
    color: designTokens.colors.textSecondary,
  },

  // Mobility list
  mobilityList: {
    paddingHorizontal: designTokens.spacing.md,
  },
  mobilityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: designTokens.brandColors.primaryLight,
    borderRadius: 8,
    padding: designTokens.spacing.sm,
    marginBottom: designTokens.spacing.xs,
    minHeight: designTokens.iconTokens.accessibility.minimumTouchTarget,
  },
  mobilityInfo: {
    flex: 1,
  },
  refereeName: {
    fontSize: 16,
    fontWeight: '600',
    color: designTokens.colors.textPrimary,
  },
  mobilityStats: {
    fontSize: 12,
    color: designTokens.colors.textSecondary,
    marginTop: 2,
  },
  tournamentBadges: {
    flexDirection: 'row',
    gap: 4,
  },
  tournamentBadge: {
    backgroundColor: designTokens.colors.primary,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  tournamentBadgeText: {
    fontSize: 8,
    fontWeight: '600',
    color: designTokens.colors.background,
  },
});

export default GeographicDistributionMap;