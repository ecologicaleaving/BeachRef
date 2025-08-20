import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Tournament } from '../types/tournament';
import { TournamentStorageService } from '../services/TournamentStorageService';
import { VisApiService } from '../services/visApi';
import { AssignmentStatusProvider, useAssignmentStatus } from '../hooks/useAssignmentStatus';
import BottomTabNavigation from '../components/navigation/BottomTabNavigation';
import NavigationHeader from '../components/navigation/NavigationHeader';
import { designTokens } from '../theme/tokens';
import { TournamentDateExtractor } from '../services/TournamentDateExtractor';

const TournamentDetailScreenContent: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);

  const [detailedTournament, setDetailedTournament] = useState<Tournament | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const router = useRouter();
  const { tournamentData } = useLocalSearchParams<{ tournamentData: string }>();

  const tournament: Tournament = React.useMemo(() => {
    try {
      const parsed = JSON.parse(tournamentData || '{}') as Tournament;
      const merged = (parsed as any)._mergedTournaments;
      if (merged && merged.length > 1) {
        console.log(`🏐 DETAIL: "${parsed.Name}" has ${merged.length} merged tournaments`);
      }
      return parsed;
    } catch {
      return {} as Tournament;
    }
  }, [tournamentData]);

  // Assignment status management
  const { 
    currentAssignmentStatus,
    statusCounts,
    isOnline,
    syncStatus
  } = useAssignmentStatus();

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'short', // Changed from 'long' to 'short' for 3-letter month codes
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const getLocation = () => {
    // Try different combinations of available location data
    const city = tournament.City;
    const country = tournament.CountryName || tournament.Country;
    
    if (city && country) {
      return `${city}, ${country}`;
    }
    
    // Only return location if we have explicit location data, city, or country
    // Don't show "Location not specified" or try to infer from title
    return tournament.Location || city || country || null;
  };

  const getDateRange = () => {
    const dateInfo = TournamentDateExtractor.extractTournamentDates(tournament);
    
    if (dateInfo.dateRange) {
      // Add confidence indicator for low confidence dates
      if (dateInfo.confidence === 'low') {
        return `${dateInfo.dateRange} (estimated)`;
      }
      return dateInfo.dateRange;
    }
    
    return 'Dates TBD';
  };

  const getTournamentStatus = () => {
    const dateInfo = TournamentDateExtractor.extractTournamentDates(tournament);
    const status = TournamentDateExtractor.getTournamentStatus(dateInfo);
    
    switch (status) {
      case 'upcoming':
        return 'Upcoming';
      case 'live':
        return 'Live';
      case 'completed':
        return 'Completed';
      case 'unknown':
      default:
        return 'Scheduled';
    }
  };


  const getStatusColor = () => {
    const status = getTournamentStatus();
    switch (status) {
      case 'Live':
        return '#2E8B57';
      case 'Upcoming':
        return '#FF6B35';
      case 'Completed':
        return '#6B7280';
      default:
        return '#4A90A4';
    }
  };


  const handleGoBack = () => {
    router.back();
  };

  // Load detailed tournament information
  const loadTournamentDetails = async () => {
    if (!tournament.No) return;
    
    setDetailsLoading(true);
    try {
      console.log(`Loading detailed tournament info for ${tournament.No}...`);
      
      // Try to get additional tournament details from the API
      const details = await VisApiService.getBeachTournamentDetails(tournament.No);
      
      if (details) {
        console.log('Detailed tournament data:', details);
        // Merge the detailed data with the basic tournament data
        setDetailedTournament({
          ...tournament,
          ...details
        });
      } else {
        // If no additional details found, use the basic tournament data
        setDetailedTournament(tournament);
      }
    } catch (error) {
      console.error('Failed to load tournament details:', error);
      // Fallback to basic tournament data
      setDetailedTournament(tournament);
    } finally {
      setDetailsLoading(false);
    }
  };





  useEffect(() => {
    console.log('🏐 TournamentDetail: useEffect triggered', { 
      tournamentNo: tournament.No, 
      tournamentName: tournament.Name,
      hasTournamentData: !!tournamentData 
    });
    
    if (tournament.No) {
      loadTournamentDetails();
    }
  }, [tournament.No, tournamentData]); // Added tournamentData as dependency


  // Handle status bar press - navigate to assignments if available
  const handleStatusPress = () => {
    if (currentAssignmentStatus) {
      router.push('/my-assignments');
    }
  };


  if (!tournament.No) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Tournament data not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Navigation Header without Status Bar */}
      <NavigationHeader
        title="Tournament Details"
        showBackButton={false}
        showStatusBar={false}
        rightComponent={
          <TouchableOpacity 
            style={styles.tournamentSelectButton}
            onPress={() => router.push('/tournament-selection')}
          >
            <Text style={styles.tournamentSelectButtonText}>📋</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>

        {/* Tournament Card */}
        <View style={styles.tournamentCard}>
          <View style={styles.cardHeader}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
              <Text style={styles.statusText}>{getTournamentStatus().toUpperCase()}</Text>
            </View>
            {detailsLoading && (
              <ActivityIndicator size="small" color="#FF6B35" style={styles.loadingIndicator} />
            )}
          </View>

          <Text style={styles.tournamentName}>
            {tournament.Title || tournament.Name || `Tournament ${tournament.No}`}
          </Text>

          <View style={styles.detailsContainer}>
            {/* Date */}
            <View style={styles.detailItem}>
              <Text style={styles.detailIcon}>📅</Text>
              <View style={styles.detailTextContainer}>
                <Text style={styles.detailLabel}>Date</Text>
                <Text style={styles.detailValue}>{getDateRange()}</Text>
                {(() => {
                  const dateInfo = TournamentDateExtractor.extractTournamentDates(tournament);
                  if (dateInfo.confidence === 'low' || dateInfo.confidence === 'medium') {
                    return (
                      <Text style={styles.dateSourceInfo}>
                        {dateInfo.source}
                      </Text>
                    );
                  }
                  return null;
                })()}
              </View>
            </View>

            {/* Location - only show if available */}
            {getLocation() && (
              <View style={styles.detailItem}>
                <Text style={styles.detailIcon}>📍</Text>
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailLabel}>Location</Text>
                  <Text style={styles.detailValue}>{getLocation()}</Text>
                </View>
              </View>
            )}

            {/* Tournament Type/Category */}
            {(detailedTournament?.Type || detailedTournament?.Category || detailedTournament?.Series) && (
              <View style={styles.detailItem}>
                <Text style={styles.detailIcon}>🏆</Text>
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailLabel}>Category</Text>
                  <Text style={styles.detailValue}>
                    {detailedTournament?.Type || detailedTournament?.Category || detailedTournament?.Series}
                  </Text>
                </View>
              </View>
            )}


            {/* Prize Money */}
            {(detailedTournament?.PrizeMoney || detailedTournament?.Prize) && (
              <View style={styles.detailItem}>
                <Text style={styles.detailIcon}>💰</Text>
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailLabel}>Prize Money</Text>
                  <Text style={styles.detailValue}>
                    {detailedTournament?.PrizeMoney || detailedTournament?.Prize}
                    {detailedTournament?.Currency && ` ${detailedTournament.Currency}`}
                  </Text>
                </View>
              </View>
            )}

            {/* Venue Details */}
            {detailedTournament?.Venue && (
              <View style={styles.detailItem}>
                <Text style={styles.detailIcon}>🏟️</Text>
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailLabel}>Venue</Text>
                  <Text style={styles.detailValue}>{detailedTournament.Venue}</Text>
                </View>
              </View>
            )}

            {/* Number of Courts */}
            {detailedTournament?.Courts && (
              <View style={styles.detailItem}>
                <Text style={styles.detailIcon}>🏐</Text>
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailLabel}>Courts</Text>
                  <Text style={styles.detailValue}>{detailedTournament.Courts}</Text>
                </View>
              </View>
            )}

            {/* Surface Type */}
            {detailedTournament?.Surface && (
              <View style={styles.detailItem}>
                <Text style={styles.detailIcon}>🏖️</Text>
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailLabel}>Surface</Text>
                  <Text style={styles.detailValue}>{detailedTournament.Surface}</Text>
                </View>
              </View>
            )}

            {/* Entry Deadline */}
            {detailedTournament?.EntryDeadline && (
              <View style={styles.detailItem}>
                <Text style={styles.detailIcon}>⏰</Text>
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailLabel}>Entry Deadline</Text>
                  <Text style={styles.detailValue}>{formatDate(detailedTournament.EntryDeadline)}</Text>
                </View>
              </View>
            )}

            {/* Contact Information */}
            {detailedTournament?.ContactName && (
              <View style={styles.detailItem}>
                <Text style={styles.detailIcon}>👤</Text>
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailLabel}>Contact</Text>
                  <Text style={styles.detailValue}>{detailedTournament.ContactName}</Text>
                  {detailedTournament.ContactEmail && (
                    <Text style={styles.detailSubValue}>{detailedTournament.ContactEmail}</Text>
                  )}
                  {detailedTournament.ContactPhone && (
                    <Text style={styles.detailSubValue}>{detailedTournament.ContactPhone}</Text>
                  )}
                </View>
              </View>
            )}

            {/* Website */}
            {detailedTournament?.Website && (
              <View style={styles.detailItem}>
                <Text style={styles.detailIcon}>🌐</Text>
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailLabel}>Website</Text>
                  <Text style={styles.detailValue}>{detailedTournament.Website}</Text>
                </View>
              </View>
            )}
          </View>
        </View>


      </ScrollView>

      <BottomTabNavigation 
        currentTab="details" 
        onTabPress={(tab) => {
          if (tab === 'details' && tournament) {
            // Already on details page, do nothing
            return;
          } else if (tab === 'monitor' && tournament) {
            router.push({
              pathname: '/schedule-results',
              params: { tournamentData: JSON.stringify(tournament) }
            });
          }
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 20,
    color: '#1B365D',
    textAlign: 'center',
    marginBottom: 24,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // Space for fixed button
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    minHeight: 44,
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 16,
    color: '#1B365D',
    fontWeight: '600',
  },
  tournamentCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 8,
    marginVertical: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#1B365D',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  tournamentName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1B365D',
    marginBottom: 24,
    lineHeight: 36,
  },
  detailsContainer: {
    gap: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  detailIcon: {
    fontSize: 20,
    marginRight: 12,
    width: 24,
    textAlign: 'center',
  },
  detailTextContainer: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 16,
    color: '#1B365D',
    fontWeight: '600',
  },
  detailSubValue: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    marginTop: 2,
  },
  dateSourceInfo: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
    marginTop: 2,
  },
  loadingIndicator: {
    marginLeft: 8,
  },
  
  // Status Integration Styles
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designTokens.spacing.xs,
  },
  
  statusBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  
  statusBadgeText: {
    color: designTokens.colors.background,
    fontSize: 11,
    fontWeight: 'bold',
  },
  
  networkStatus: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  networkStatusText: {
    fontSize: 12,
  },
  
  tournamentSelectButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1B365D',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1B365D',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  
  tournamentSelectButtonText: {
    fontSize: 18,
    color: '#FFFFFF',
  },
});

// Wrapper component with AssignmentStatusProvider
const TournamentDetailScreen: React.FC = () => {
  return (
    <AssignmentStatusProvider>
      <TournamentDetailScreenContent />
    </AssignmentStatusProvider>
  );
};

export default TournamentDetailScreen;