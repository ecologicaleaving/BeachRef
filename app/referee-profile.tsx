import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { EventReferee, RefereeOfficial, getOfficialDisplayName } from '../types/referee-v2';
import { FlagImage } from '../components/FlagImage';
import { StatusBadge } from '../components/Status';
import NavigationHeader from '../components/navigation/NavigationHeader';
import { RefereeAnalyticsDashboard } from '../components/RefereeAnalytics/RefereeAnalyticsDashboard';
import { useRefereeAnalytics } from '../hooks/useRefereeAnalytics';
import { colors, designTokens } from '../theme/tokens';
import { ActionIcons } from '../components/Icons/IconLibrary';

/**
 * Individual Referee Profile Dashboard Screen
 * Displays comprehensive referee information, statistics, and analytics
 */
const RefereeProfileScreen: React.FC = () => {
  const { refereeData } = useLocalSearchParams<{ refereeData: string }>();
  const router = useRouter();
  const [referee, setReferee] = useState<EventReferee | RefereeOfficial | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'assignments'>('overview');
  const [portraitUrl, setPortraitUrl] = useState<string | null>(null);

  // Load referee from params
  useEffect(() => {
    if (refereeData) {
      try {
        const parsedReferee = JSON.parse(refereeData) as EventReferee | RefereeOfficial;
        setReferee(parsedReferee);
        setLoading(false);
      } catch (error) {
        console.error('Error parsing referee data:', error);
        router.back();
      }
    } else {
      router.back();
    }
  }, [refereeData, router]);

  // Try to fetch portrait image URL via VIS Images API
  useEffect(() => {
    const fetchPortrait = async () => {
      try {
        if (!referee) return;
        const id = (referee as any).id || (referee as any).RefereeId || (referee as any).noOfficial;
        if (!id) return;
        const appId = '2a9523517c52420da73d927c6d6bab23';
        const xml = `<Requests><Request Type="GetImageList" Fields="No"><Filter DataType="61" DataNo="${id}" ImageType="15"/></Request></Requests>`;
        const resp = await fetch('https://www.fivb.org/Vis2009/XmlRequest.asmx', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-FIVB-App-ID': appId,
            'Accept': 'application/xml'
          },
          body: new URLSearchParams({ Request: xml }) as any
        });
        if (!resp.ok) return;
        const txt = await resp.text();
        const m = txt.match(/<Image[^>]*\sNo="(\d+)"/);
        if (m && m[1]) {
          const url = `https://www.fivb.org/Vis2009/Images/GetImage.asmx?No=${m[1]}&MaxSize=300`;
          setPortraitUrl(url);
        }
      } catch {
        // Swallow errors; portrait is optional
      }
    };
    fetchPortrait();
  }, [referee]);

  // Get referee analytics
  const {
    data: analyticsData,
    refetch: refetchAnalytics
  } = useRefereeAnalytics(
    referee ? { refereeIds: [referee.id] } : undefined,
    { 
      enabled: !!referee,
      cacheStrategy: 'historical',
      enablePerformanceMonitoring: true 
    }
  );

  const refereeStats = useMemo(() => {
    if (!analyticsData?.data || analyticsData.data.length === 0) return null;
    return analyticsData.data[0];
  }, [analyticsData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetchAnalytics();
    } catch (error) {
      console.error('Error refreshing referee data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  if (loading || !referee) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading referee profile...</Text>
      </View>
    );
  }

  // Get referee status for badge
  const statusForBadge = (() => {
    switch (referee.status) {
      case 'Active': return 'current';
      case 'Inactive': return 'completed';
      case 'Suspended': return 'cancelled';
      case 'Restricted': return 'emergency';
      default: return 'completed';
    }
  })();

  // Get gender display
  const getGenderSymbol = () => {
    const gender = referee.gender;
    return gender === 'M' ? '♂' : gender === 'W' ? '♀' : '⚭';
  };

  return (
    <View style={styles.container}>
      <NavigationHeader
        title="Referee Profile"
        onBackPress={handleBack}
        showBackButton={true}
        showStatusBar={false}
      />
      
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
          />
        }
      >
        {/* Referee Header Card */}
        <View style={styles.headerCard}>
          <View style={styles.refereeHeader}>
            <View style={styles.refereeBasicInfo}>
              <FlagImage 
                countryCode={referee.federationCode} 
                size="large"
                style={styles.headerFlag}
              />
              <View style={styles.refereeNameSection}>
                <Text style={styles.refereeName}>
                  {getOfficialDisplayName(referee)}
                </Text>
                <Text style={styles.refereeId}>
                  {'RefereeId' in referee ? `#${referee.RefereeId}` : `#${referee.noOfficial}`}
                </Text>
                <View style={styles.refereeMetadata}>
                  <Text style={styles.federationText}>{referee.federationCode}</Text>
                  <Text style={styles.genderText}>{getGenderSymbol()}</Text>
                  <Text style={styles.typeText}>{referee.type}</Text>
                </View>
              </View>
            </View>
            
            <View style={styles.headerRight}>
              <StatusBadge
                status={statusForBadge}
                size="medium"
                variant="solid"
                style={styles.statusBadge}
              />
            </View>
          </View>

          {/* Portrait / ID Card actions */}
          {portraitUrl ? (
            <View style={styles.portraitWrapper}>
              <Image source={{ uri: portraitUrl }} style={styles.portrait} resizeMode="cover" />
            </View>
          ) : (
            <TouchableOpacity
              style={styles.idCardButton}
              onPress={async () => {
                try {
                  const id = (referee as any).id || (referee as any).RefereeId || (referee as any).noOfficial;
                  if (!id) return;
                  const appId = '2a9523517c52420da73d927c6d6bab23';
                  // Try Volley first, then Beach
                  const tryTypes = ['Volley', 'Beach'];
                  for (const vt of tryTypes) {
                    const xml = `<Requests><Request Type="GetRefereeIdCard" No="${id}" VolleyType="${vt}"/></Requests>`;
                    const resp = await fetch('https://www.fivb.org/Vis2009/XmlRequest.asmx', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-FIVB-App-ID': appId, 'Accept': 'application/xml' },
                      body: new URLSearchParams({ Request: xml }) as any
                    });
                    if (!resp.ok) continue;
                    const txt = await resp.text();
                    const m = txt.match(/Token="([^"]+)"/);
                    if (m && m[1]) {
                      const url = `https://www.fivb.org/Vis2009/Documents/GetDocument.asmx?Token=${m[1]}`;
                      await Linking.openURL(url);
                      break;
                    }
                  }
                } catch {}
              }}
            >
              <Text style={styles.idCardButtonText}>View ID Card</Text>
            </TouchableOpacity>
          )}

          {/* Quick Stats Row */}
          {refereeStats && (
            <View style={styles.quickStatsRow}>
              <View style={styles.quickStat}>
                <Text style={styles.quickStatValue}>{refereeStats.total_assignments}</Text>
                <Text style={styles.quickStatLabel}>Matches</Text>
              </View>
              <View style={styles.quickStat}>
                <Text style={styles.quickStatValue}>{refereeStats.tournaments_worked.length}</Text>
                <Text style={styles.quickStatLabel}>Tournaments</Text>
              </View>
              <View style={styles.quickStat}>
                <Text style={styles.quickStatValue}>{Math.round(refereeStats.completion_rate * 100)}%</Text>
                <Text style={styles.quickStatLabel}>Complete</Text>
              </View>
              {refereeStats.performance_score && (
                <View style={styles.quickStat}>
                  <Text style={[
                    styles.quickStatValue,
                    refereeStats.performance_score >= 80 ? styles.statGood : 
                    refereeStats.performance_score >= 60 ? styles.statOkay : styles.statPoor
                  ]}>
                    {Math.round(refereeStats.performance_score)}
                  </Text>
                  <Text style={styles.quickStatLabel}>Score</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
            onPress={() => setActiveTab('overview')}
          >
            <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>
              Overview
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'analytics' && styles.activeTab]}
            onPress={() => setActiveTab('analytics')}
          >
            <Text style={[styles.tabText, activeTab === 'analytics' && styles.activeTabText]}>
              Analytics
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'assignments' && styles.activeTab]}
            onPress={() => setActiveTab('assignments')}
          >
            <Text style={[styles.tabText, activeTab === 'assignments' && styles.activeTabText]}>
              History
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        {activeTab === 'overview' && referee && (
          <View style={styles.tabContent}>
            {/* Experience Section */}
            {'theoryTest' in referee && (referee.theoryTest || referee.strongPoints) && (
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Experience</Text>
                {referee.theoryTest && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Theory Test:</Text>
                    <Text style={styles.detailValue}>{referee.theoryTest}</Text>
                  </View>
                )}
                {referee.strongPoints && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Strong Points:</Text>
                    <Text style={styles.detailValue}>{referee.strongPoints}</Text>
                  </View>
                )}
                {'weakPoints' in referee && referee.weakPoints && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Areas for Improvement:</Text>
                    <Text style={styles.detailValue}>{referee.weakPoints}</Text>
                  </View>
                )}
              </View>
            )}

            {/* Role Breakdown */}
            {refereeStats && (
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Role Distribution</Text>
                <View style={styles.roleGrid}>
                  <View style={styles.roleItem}>
                    <Text style={styles.roleCount}>{refereeStats.first_referee_count}</Text>
                    <Text style={styles.roleLabel}>First Referee</Text>
                  </View>
                  <View style={styles.roleItem}>
                    <Text style={styles.roleCount}>{refereeStats.second_referee_count}</Text>
                    <Text style={styles.roleLabel}>Second Referee</Text>
                  </View>
                  {refereeStats.challenge_referee_count > 0 && (
                    <View style={styles.roleItem}>
                      <Text style={styles.roleCount}>{refereeStats.challenge_referee_count}</Text>
                      <Text style={styles.roleLabel}>Challenge Referee</Text>
                    </View>
                  )}
                </View>
              </View>
            )}
          </View>
        )}

        {activeTab === 'analytics' && referee && (
          <View style={styles.tabContent}>
            <RefereeAnalyticsDashboard
              refereeId={referee.id}
              enableComparisons={false}
              enableExport={true}
            />
          </View>
        )}

        {activeTab === 'assignments' && referee && (
          <View style={styles.tabContent}>
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Assignment History</Text>
              {refereeStats?.tournaments_worked && refereeStats.tournaments_worked.length > 0 ? (
                <View style={styles.tournamentsList}>
                  {refereeStats.tournaments_worked.map((tournament, index) => (
                    <View key={index} style={styles.tournamentItem}>
                      <ActionIcons.Tournament style={styles.tournamentIcon} />
                      <Text style={styles.tournamentName}>{tournament}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.emptyText}>No tournament history available</Text>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: designTokens.neutrals.textSecondary,
  },
  content: {
    flex: 1,
  },
  headerCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  refereeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  refereeBasicInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  headerFlag: {
    marginRight: 12,
    marginTop: 4,
  },
  refereeNameSection: {
    flex: 1,
  },
  refereeName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: designTokens.neutrals.textPrimary,
    marginBottom: 4,
  },
  refereeId: {
    fontSize: 14,
    color: designTokens.neutrals.textSecondary,
    marginBottom: 8,
  },
  refereeMetadata: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  federationText: {
    fontSize: 14,
    fontWeight: '600',
    color: designTokens.neutrals.textPrimary,
  },
  genderText: {
    fontSize: 16,
    color: designTokens.neutrals.textSecondary,
  },
  typeText: {
    fontSize: 14,
    color: designTokens.neutrals.textSecondary,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    marginBottom: 8,
  },
  portraitWrapper: {
    marginTop: 12,
    alignItems: 'center',
  },
  portrait: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#E5E7EB',
  },
  idCardButton: {
    marginTop: 12,
    alignSelf: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  idCardButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  quickStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  quickStat: {
    alignItems: 'center',
  },
  quickStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: designTokens.neutrals.textPrimary,
    marginBottom: 4,
  },
  quickStatLabel: {
    fontSize: 12,
    color: designTokens.neutrals.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statGood: {
    color: colors.success,
  },
  statOkay: {
    color: '#F59E0B',
  },
  statPoor: {
    color: '#EF4444',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
    padding: 4,
    boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.05)',
    elevation: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: designTokens.neutrals.textSecondary,
  },
  activeTabText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  tabContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.05)',
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: designTokens.neutrals.textPrimary,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: designTokens.neutrals.textSecondary,
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: designTokens.neutrals.textPrimary,
    flex: 2,
    textAlign: 'right',
  },
  roleGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  roleItem: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  roleCount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: designTokens.neutrals.textPrimary,
    marginBottom: 4,
  },
  roleLabel: {
    fontSize: 12,
    color: designTokens.neutrals.textSecondary,
    textAlign: 'center',
  },
  tournamentsList: {
    gap: 12,
  },
  tournamentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  tournamentIcon: {
    fontSize: 16,
    color: designTokens.neutrals.textSecondary,
    marginRight: 12,
  },
  tournamentName: {
    fontSize: 14,
    color: designTokens.neutrals.textPrimary,
  },
  emptyText: {
    fontSize: 14,
    color: designTokens.neutrals.textSecondary,
    textAlign: 'center',
    paddingVertical: 20,
    fontStyle: 'italic',
  },
});

export default RefereeProfileScreen;
