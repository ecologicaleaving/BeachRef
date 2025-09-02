import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Text, H2Text, BodyText, CaptionText } from './Typography';
import { VisCompliantMatch } from '../types/match-vis-compliant';
import { BeachMatch } from '../types/match';
import { TournamentCore, GenderType as CoreGenderType } from '../types/tournament-v2';
import { BeachMatchCore } from '../types/match-v2';
import { adaptMatchesForComponent, isVisCompliantMatchData } from '../utils/MatchInterfaceAdapter';

/**
 * MIGRATION NOTE: This component supports both VIS-compliant and legacy match data.
 * Data transformation automatically handles VIS numeric types while maintaining UI compatibility.
 */
import { TournamentType, GenderType } from '../types/tournament-v2';
import { useRealtimeMatches } from '../hooks/useRealtimeData';
import { useTournamentDetailStatus } from '../hooks/useTournamentDetailStatus';
import { useTournamentRepository, useMatchRepository } from '../hooks/useRepositorySelection';
import { useRepositoryData } from '../hooks/useRepositoryData';
import { useDataTransformation } from '../hooks/useDataTransformation';
import { useCacheAwareData } from '../hooks/useCacheAwareData';
import { usePerformanceMonitoring } from '../hooks/usePerformanceMonitoring';
import ConnectionStatusIndicator, { CompactConnectionIndicator } from './ConnectionStatusIndicator';
import LiveMatchIndicator from './LiveMatchIndicator';
import ManualRefreshButton, { CompactRefreshButton } from './ManualRefreshButton';
import PerformanceDashboard, { PerformanceIndicator } from './PerformanceDashboard';
import TournamentStatusIndicator from './tournament/TournamentStatusIndicator';
import ScheduleChangeIndicator, { ScheduleChangesDetail } from './tournament/ScheduleChangeIndicator';
import CourtAssignmentIndicator, { CourtChangesDetail } from './tournament/CourtAssignmentIndicator';
import { StatusBadge, StatusCard } from './Status';
import { getStatusColorWithText, determineTournamentStatus, determineMatchStatus } from '../utils/statusColors';
import { NavigationIcons, UtilityIcons, DataIcons, CommunicationIcons } from './Icons/IconLibrary';
import { MatchResultsService } from '../services/MatchResultsService';

interface TournamentDetailProps {
  tournament: TournamentCore;
  onBack: () => void;
}

type TabType = 'playing' | 'schedule' | 'results' | 'ranking' | 'info';

interface DropdownItem {
  id: string;
  label: string;
  value: string;
}

interface DropdownModalProps {
  visible: boolean;
  onClose: () => void;
  data: DropdownItem[];
  selectedValue: string;
  onSelect: (value: string) => void;
  title: string;
}

const DropdownModal: React.FC<DropdownModalProps> = ({
  visible,
  onClose,
  data,
  selectedValue,
  onSelect,
  title,
}) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.modalContainer}>
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View style={styles.modalContent}>
              <H2Text style={styles.modalTitle}>{title}</H2Text>
              <FlatList
                data={data}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.modalItem,
                      selectedValue === item.value && styles.modalItemSelected,
                    ]}
                    onPress={() => {
                      onSelect(item.value);
                      onClose();
                    }}
                  >
                    <BodyText
                      style={[
                        styles.modalItemText,
                        selectedValue === item.value && styles.modalItemTextSelected,
                      ]}
                    >
                      {item.label}
                    </BodyText>
                  </TouchableOpacity>
                )}
                style={styles.modalList}
                showsVerticalScrollIndicator={true}
              />
              <TouchableOpacity style={styles.modalCloseButton} onPress={onClose}>
                <View style={styles.modalCloseContent}>
                  <NavigationIcons.Back size="small" theme="default" colorKey="primary" />
                  <BodyText style={styles.modalCloseText}>Close</BodyText>
                </View>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const TournamentDetail: React.FC<TournamentDetailProps> = ({ tournament, onBack }) => {
  const [activeTab, setActiveTab] = useState<TabType>('playing');
  const [allMatches, setAllMatches] = useState<BeachMatch[]>([]); // Matches from all related tournaments
  
  // Ranking data state
  const [rankingData, setRankingData] = useState<any[]>([]);
  const [hasRankingData, setHasRankingData] = useState<boolean>(false); // Will be true when ranking API is implemented
  
  // Gender switching states
  const [relatedTournaments, setRelatedTournaments] = useState<TournamentCore[]>([tournament]);
  const [currentTournament, setCurrentTournament] = useState<TournamentCore>(tournament);
  const [loadingRelated, setLoadingRelated] = useState<boolean>(false);
  
  // Repository selection with feature flags for A/B testing
  const tournamentRepository = useTournamentRepository({
    enableABTesting: true,
    enablePerformanceMonitoring: true,
    sessionId: `tournament-detail-${tournament.id}`
  });
  
  const matchRepository = useMatchRepository({
    enableABTesting: true,
    enablePerformanceMonitoring: true,
    sessionId: `tournament-detail-matches-${tournament.id}`
  });
  
  // Performance monitoring for UI migration
  const performanceMonitoring = usePerformanceMonitoring({
    componentName: 'TournamentDetail',
    enableABTesting: true,
    trackRenderTime: true,
    trackDataFetchTime: true,
    performanceTargets: {
      renderTime: 100,
      dataFetchTime: 500
    }
  });
  
  // Real-time matches data with WebSocket subscriptions
  const {
    matches,
    liveMatches,
    loading: matchesLoading,
    error: matchesError,
    lastUpdated,
    connectionState,
    isSubscribed,
    hasLiveMatches,
    refresh: refreshMatches,
  } = useRealtimeMatches(currentTournament.visNo, true);
  
  // Tournament detail status with real-time updates
  const {
    tournament: tournamentWithStatus,
    statusEvents,
    scheduleChanges,
    courtChanges,
    progress: tournamentProgress,
    recentScheduleChanges,
    recentCourtChanges,
    subscriptionActive: statusSubscriptionActive,
    error: statusError,
    lastUpdate: statusLastUpdate,
    clearRecentChanges
  } = useTournamentDetailStatus({
    tournament: currentTournament,
    matches,
    enableScheduleChangeTracking: true,
    enableCourtChangeTracking: true,
    enableProgressTracking: true
  });
  
  // Filter states
  const [selectedCourt, setSelectedCourt] = useState<string>('');
  const [selectedReferee, setSelectedReferee] = useState<string>('');
  const [selectedGender, setSelectedGender] = useState<string>('');
  
  // Debug filter states
  // console.log('Filter states:', { selectedCourt, selectedReferee, selectedGender });
  const [courtDropdownOpen, setCourtDropdownOpen] = useState<boolean>(false);
  const [refereeDropdownOpen, setRefereeDropdownOpen] = useState<boolean>(false);
  const [genderDropdownOpen, setGenderDropdownOpen] = useState<boolean>(false);
  const [performanceDashboardVisible, setPerformanceDashboardVisible] = useState<boolean>(false);
  const [scheduleChangesVisible, setScheduleChangesVisible] = useState<boolean>(false);
  const [courtChangesVisible, setCourtChangesVisible] = useState<boolean>(false);


  // Repository-based data fetching with fallback to legacy API
  const { data: repositoryMatches, loading: repositoryMatchesLoading, error: repositoryMatchesError } = useRepositoryData(
    async () => {
      if (!matchRepository.repository) return null;
      const allMatchPromises = relatedTournaments.map(tournament => 
        matchRepository.repository!.getMatchesByTournamentAsync(tournament.visNo)
      );
      const allMatchesArrays = await Promise.all(allMatchPromises);
      return allMatchesArrays.flat();
    },
    [relatedTournaments, matchRepository.repository],
    {
      enableCache: true,
      fallbackToLegacy: true,
      retryAttempts: 2
    }
  );
  
  // Transform repository data to legacy format for UI compatibility
  const transformedMatches = useDataTransformation(
    repositoryMatches,
    'coreToLegacy',
    {
      enableMemoization: true,
      enableBatchProcessing: true
    }
  );
  
  const loadAllMatches = useCallback(async () => {
    try {
      // Use repository data if available, otherwise fall back to legacy API
      if (matchRepository.implementation === 'new' && transformedMatches.data) {
        // Adapt matches to ensure component compatibility
        const adaptedMatches = adaptMatchesForComponent(transformedMatches.data);
        const combinedMatches = adaptedMatches.map((match: BeachMatch, index: number) => {
          const tournament = relatedTournaments[index % relatedTournaments.length];
          const gender = tournament.gender; // TournamentCore has structured gender field
          
          return {
            ...match,
            tournamentGender: gender,
            tournamentNo: tournament.visNo,
            tournamentCode: tournament.code
          };
        });
        
        setAllMatches(combinedMatches);
        return;
      }
      
      // VIS-compliant API fallback using MatchResultsService
      const allMatchPromises = relatedTournaments.map(tournament => 
        MatchResultsService.getMatchResults(tournament.visNo)
      );
      const allMatchResultsArrays = await Promise.all(allMatchPromises);
      // Performance optimization: Pre-allocate array capacity and use single pass
      const totalEstimatedMatches = allMatchResultsArrays.length * 50; // Estimate 50 matches per tournament
      const combinedMatches = [];
      combinedMatches.length = 0; // Ensure clean start
      
      // Single pass processing for better performance
      for (let i = 0; i < allMatchResultsArrays.length; i++) {
        const results = allMatchResultsArrays[i];
        const tournament = relatedTournaments[i];
        const allTournamentMatches = [
          ...results.live, 
          ...results.completed, 
          ...results.scheduled
        ];
        
        if (allTournamentMatches.length === 0) continue;
        
        try {
          // Adapt matches for VIS-compliant data support with error handling
          const adaptedMatches = adaptMatchesForComponent(allTournamentMatches);
          
          // Add tournament context to each match
          for (const match of adaptedMatches) {
            combinedMatches.push({
              ...match,
              tournamentGender: tournament.gender,
              tournamentNo: tournament.visNo,
              tournamentCode: tournament.code
            });
          }
        } catch (adaptationError) {
          // Continue with other tournaments rather than failing completely
        }
      }
      
      setAllMatches(combinedMatches);
    } catch (error) {
      // console.error('Failed to load all matches:', error);
      setAllMatches([]);
    }
  }, [relatedTournaments, matchRepository.implementation, transformedMatches.data]);

  // Repository-based related tournaments loading
  const { data: repositoryRelatedTournaments, loading: relatedTournamentsLoading } = useRepositoryData(
    async () => {
      if (!tournamentRepository.repository) return null;
      const relatedTournaments = await tournamentRepository.repository.findRelatedTournamentsAsync(tournament.visNo);
      return relatedTournaments;
    },
    [tournament.visNo, tournamentRepository.repository],
    {
      enableCache: true,
      fallbackToLegacy: true,
      retryAttempts: 2
    }
  );
  
  // Transform repository tournaments to legacy format
  const transformedRelatedTournaments = useDataTransformation(
    repositoryRelatedTournaments,
    'coreToLegacy',
    {
      enableMemoization: true,
      enableBatchProcessing: true
    }
  );
  
  const loadRelatedTournaments = useCallback(async () => {
    try {
      setLoadingRelated(true);
      
      // Use repository data if available, otherwise fall back to legacy API
      if (tournamentRepository.implementation === 'new' && transformedRelatedTournaments.data) {
        setRelatedTournaments(transformedRelatedTournaments.data);
        return;
      }
      
      // Legacy API fallback
      // TODO: Implement VIS-compliant related tournament finding
      // For now, use single tournament as fallback
      const related = [tournament];
      setRelatedTournaments(related);
    } catch (error) {
      // console.error('Failed to load related tournaments:', error);
      setRelatedTournaments([tournament]);
    } finally {
      setLoadingRelated(false);
    }
  }, [tournament, tournamentRepository.implementation, transformedRelatedTournaments.data]);


  // Cache-aware tournament data fetching for performance
  const { data: cachedTournamentData, cacheHit } = useCacheAwareData(
    `tournament-detail-${tournament.id}`,
    async () => {
      if (!tournamentRepository.repository) return tournament;
      const tournamentCore = await tournamentRepository.repository.getByIdAsync(tournament.id);
      return tournamentCore;
    },
    {
      ttl: 6 * 60 * 60 * 1000, // 6 hours cache TTL
      enableStaleWhileRevalidate: true,
      enablePerformanceTracking: true
    }
  );
  
  // Track cache performance for A/B testing
  useEffect(() => {
    if (performanceMonitoring.trackMetric) {
      performanceMonitoring.trackMetric('cache_hit_rate', cacheHit ? 1 : 0);
      performanceMonitoring.trackMetric('repository_implementation', tournamentRepository.implementation === 'new' ? 1 : 0);
    }
  }, [cacheHit, tournamentRepository.implementation, performanceMonitoring]);
  
  useEffect(() => {
    loadRelatedTournaments();
  }, [loadRelatedTournaments]);

  useEffect(() => {
    if (relatedTournaments.length > 1) {
      loadAllMatches();
    }
  }, [loadAllMatches, relatedTournaments.length]);

  // Handle gender filter selection by switching tournaments
  useEffect(() => {
    if (selectedGender && relatedTournaments.length > 1) {
      const targetTournament = relatedTournaments.find(t => 
        t.gender === selectedGender
      );
      
      if (targetTournament && targetTournament.visNo !== currentTournament.visNo) {
        setCurrentTournament(targetTournament);
      }
    }
  }, [selectedGender, relatedTournaments, currentTournament.visNo]);

  // Get the matches to use for filtering (all matches or current tournament matches)
  const matchesToFilter = useMemo(() => {
    return selectedGender === '' && allMatches.length > 0 ? allMatches : matches;
  }, [selectedGender, allMatches, matches]);

  // Extract unique courts and referees for filter options
  const availableCourts = useMemo(() => {
    const courts = matchesToFilter
      .map(match => match.Court)
      .filter((court): court is string => !!court)
      .filter((court, index, array) => array.indexOf(court) === index)
      .sort();
    return courts;
  }, [matchesToFilter]);

  const availableReferees = useMemo(() => {
    const referees = matchesToFilter
      .flatMap(match => [match.Referee1Name, match.Referee2Name])
      .filter((referee): referee is string => !!referee)
      .filter((referee, index, array) => array.indexOf(referee) === index)
      .sort();
    return referees;
  }, [matchesToFilter]);

  const availableGenders = useMemo(() => {
    // Get genders from related tournaments
    const genders = relatedTournaments
      .map(t => t.gender)
      .filter((gender): gender is CoreGenderType => gender !== 'Mixed') // Filter out Mixed for simplicity
      .filter((gender, index, array) => array.indexOf(gender) === index)
      .sort();
    return genders;
  }, [relatedTournaments]);

  // Move this function to be defined before it's used in useMemo
  const getMatchStatus = useCallback((match: BeachMatch): 'playing' | 'scheduled' | 'completed' => {
    const pointsA = parseInt(match.MatchPointsA || '0');
    const pointsB = parseInt(match.MatchPointsB || '0');
    const status = match.Status;
    
    // console.log(`Match ${match.NoInTournament}: PointsA=${pointsA}, PointsB=${pointsB}, Status=${status}, Court=${match.Court}`);
    
    // If we have a status code, use it to determine the match state
    if (status) {
      const statusNum = parseInt(status);
      // console.log(`Match ${match.NoInTournament} status code: ${statusNum}`);
      // Status codes: 1=Scheduled, 2=Playing, 3=Completed (these are typical FIVB status codes)
      if (statusNum === 2) return 'playing';
      if (statusNum === 3 || statusNum >= 3) return 'completed';
      if (statusNum === 1) return 'scheduled';
    }
    
    // If there are scores, it's completed
    if (pointsA > 0 || pointsB > 0) {
      return 'completed';
    }
    
    // If no scores and no valid status, use time-based detection
    if (match.LocalDate && match.LocalTime) {
      try {
        const matchDateTime = new Date(`${match.LocalDate}T${match.LocalTime}`);
        const now = new Date();
        const matchStart = matchDateTime.getTime();
        const currentTime = now.getTime();
        const oneHourBefore = matchStart - (60 * 60 * 1000); // 1 hour before
        const fourHoursAfter = matchStart + (4 * 60 * 60 * 1000); // 4 hours after
        
        // console.log(`Match ${match.NoInTournament} time analysis:`);
        // console.log(`  Match time: ${match.LocalDate}T${match.LocalTime} (${matchDateTime})`);
        // console.log(`  Current time: ${now}`);
        // console.log(`  Time window: ${new Date(oneHourBefore)} to ${new Date(fourHoursAfter)}`);
        // console.log(`  Current in window: ${currentTime >= oneHourBefore && currentTime <= fourHoursAfter}`);
        
        // If current time is within the match window and no score, consider it playing
        if (currentTime >= oneHourBefore && currentTime <= fourHoursAfter) {
          // console.log(`Match ${match.NoInTournament} considered playing based on time window`);
          return 'playing';
        }
        
        // If match time has passed significantly, it might be completed but without scores recorded
        if (currentTime > fourHoursAfter) {
          // console.log(`Match ${match.NoInTournament} considered completed (time passed)`);
          return 'completed';
        }
        
        // Otherwise it's scheduled for the future
        // console.log(`Match ${match.NoInTournament} considered scheduled (future)`);
        return 'scheduled';
      } catch {
        // If date parsing fails, default to scheduled
        return 'scheduled';
      }
    }
    
    // Default to scheduled if we can't determine otherwise
    return 'scheduled';
  }, []);

  // Filter matches based on selected filters and active tab
  const filteredMatches = useMemo(() => {
    // console.log(`=== Filtering matches for ${activeTab} tab ===`);
    // console.log(`Total matches to filter: ${matchesToFilter.length}`);
    // console.log(`Selected court: "${selectedCourt}", Selected referee: "${selectedReferee}", Selected gender: "${selectedGender}"`);
    
    const filtered = matchesToFilter.filter(match => {
      let keepMatch = true;
      let filterReason = '';
      
      // Tab filter - only apply for match tabs, not info or ranking tabs
      if (activeTab !== 'info' && activeTab !== 'ranking') {
        const matchStatus = getMatchStatus(match);
        if (activeTab === 'playing' && matchStatus !== 'playing') {
          keepMatch = false;
          filterReason = `Status is ${matchStatus}, not playing`;
        }
        if (activeTab === 'schedule' && matchStatus !== 'scheduled') {
          keepMatch = false;
          filterReason = `Status is ${matchStatus}, not scheduled`;
        }
        if (activeTab === 'results' && matchStatus !== 'completed') {
          keepMatch = false;
          filterReason = `Status is ${matchStatus}, not completed`;
        }
      }
      
      // Court filter
      if (keepMatch && selectedCourt && match.Court !== selectedCourt) {
        keepMatch = false;
        filterReason = `Court ${match.Court} doesn't match selected court ${selectedCourt}`;
      }
      
      // Referee filter
      if (keepMatch && selectedReferee) {
        const hasSelectedReferee = match.Referee1Name === selectedReferee || match.Referee2Name === selectedReferee;
        if (!hasSelectedReferee) {
          keepMatch = false;
          filterReason = `Referees (${match.Referee1Name}, ${match.Referee2Name}) don't match selected referee ${selectedReferee}`;
        }
      }
      
      // Gender filter - when using allMatches, filter by the selected gender
      if (keepMatch && selectedGender && matchesToFilter === allMatches) {
        if (match.tournamentGender !== selectedGender) {
          keepMatch = false;
          filterReason = `Tournament gender ${match.tournamentGender} doesn't match selected gender ${selectedGender}`;
        }
      }
      
      // Log detailed information for each match
      const statusForDisplay = activeTab !== 'info' ? getMatchStatus(match) : 'N/A';
      // console.log(`Match ${match.NoInTournament} (Court ${match.Court}): Status=${statusForDisplay}, Keep=${keepMatch}${filterReason ? `, Reason: ${filterReason}` : ''}`);
      
      return keepMatch;
    });

    // console.log(`=== Filter Results for ${activeTab} tab ===`);
    // console.log(`Kept ${filtered.length} matches out of ${matchesToFilter.length}`);
    // console.log('Courts in filtered matches:', [...new Set(filtered.map(m => m.Court))].sort());
    // console.log('Courts in all matches:', [...new Set(matchesToFilter.map(m => m.Court))].sort());
    
    // Sort matches based on active tab
    return filtered.sort((a, b) => {
      const getDateTime = (match: BeachMatch): number => {
        if (!match.LocalDate || !match.LocalTime) return 0;
        try {
          const dateTime = new Date(`${match.LocalDate}T${match.LocalTime}`);
          return dateTime.getTime();
        } catch (error) {
          return 0;
        }
      };

      const timeA = getDateTime(a);
      const timeB = getDateTime(b);

      // Results tab: descending order (most recent first)
      if (activeTab === 'results') {
        return timeB - timeA;
      }
      
      // Schedule tab: ascending order (earliest first)
      if (activeTab === 'schedule') {
        return timeA - timeB;
      }

      // Playing tab: sort by match number or time (ascending)
      if (activeTab === 'playing') {
        // First try to sort by time
        if (timeA && timeB && timeA !== timeB) {
          return timeA - timeB;
        }
        // Fallback to match number
        const matchNumA = parseInt(a.NoInTournament || '0');
        const matchNumB = parseInt(b.NoInTournament || '0');
        return matchNumA - matchNumB;
      }

      // Default sorting (info tab or fallback)
      return timeA - timeB;
    });
  }, [matchesToFilter, selectedCourt, selectedReferee, selectedGender, allMatches, activeTab, getMatchStatus]);

  // Calculate the total matches for the current tab
  const totalMatchesForTab = useMemo(() => {
    return matchesToFilter.filter(match => {
      if (activeTab === 'info' || activeTab === 'ranking') return true;
      const matchStatus = getMatchStatus(match);
      if (activeTab === 'playing') return matchStatus === 'playing';
      if (activeTab === 'schedule') return matchStatus === 'scheduled';
      if (activeTab === 'results') return matchStatus === 'completed';
      return true;
    }).length;
  }, [matchesToFilter, activeTab, getMatchStatus]);

  const clearFilters = () => {
    setSelectedCourt('');
    setSelectedReferee('');
    setSelectedGender('');
    setCourtDropdownOpen(false);
    setRefereeDropdownOpen(false);
    setGenderDropdownOpen(false);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const getLocation = () => {
    // TournamentCore doesn't have City/CountryName - these would be in location data if needed
    return 'Location TBA'; // Simplified for now - would need location service integration
  };

  const getTournamentType = (): string => {
    // TournamentCore has structured tournamentType field
    const typeLabels = {
      'FIVB': 'FIVB World Tour',
      'BPT': 'Beach Pro Tour',
      'CEV': 'CEV European Tour',
      'LOCAL': 'Local Tournament'
    };
    return typeLabels[currentTournament.tournamentType] || 'Tournament';
  };


  const getDateRange = () => {
    // TournamentCore has structured dates field
    if (currentTournament.dates.startDate && currentTournament.dates.endDate) {
      const start = formatDate(currentTournament.dates.startDate);
      const end = formatDate(currentTournament.dates.endDate);
      if (start === end) return start;
      return `${start} - ${end}`;
    }
    return formatDate(currentTournament.dates.startDate) || formatDate(currentTournament.dates.endDate) || 'Dates TBA';
  };

  const formatMatchTime = (timeStr?: string) => {
    if (!timeStr) return '';
    try {
      const [hours, minutes] = timeStr.split(':');
      return `${hours}:${minutes}`;
    } catch {
      return timeStr;
    }
  };

  const formatMatchDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };


  const getGenderColor = (match: BeachMatch): string => {
    // First try to get gender from tournament metadata if available
    if (match.tournamentGender) {
      return match.tournamentGender === 'M' ? '#4CAF50' : '#E91E63'; // Green for men, Pink for women
    }
    
    // If no tournament metadata, use current tournament's structured gender
    const gender = currentTournament.gender;
    return gender === 'M' ? '#4CAF50' : gender === 'W' ? '#E91E63' : '#9E9E9E'; // Gray for unknown/mixed
  };

  const renderMatchItem = ({ item: match }: { item: BeachMatch }) => {
    // Determine match status for color coding
    const matchStatus = determineMatchStatus(match);
    const statusColors = getStatusColorWithText(matchStatus);
    
    return (
    <View style={[styles.matchItem, { borderLeftWidth: 4, borderLeftColor: statusColors.backgroundColor }]}>
      <View style={[styles.genderBand, { backgroundColor: getGenderColor(match) }]} />
      
      <View style={styles.matchHeader}>
        <H2Text style={styles.matchNumber}>Match #{match.NoInTournament}</H2Text>
        <View style={styles.matchDateTime}>
          <BodyText style={styles.matchDate}>{formatMatchDate(match.LocalDate)}</BodyText>
          <CaptionText style={styles.matchTime}>{formatMatchTime(match.LocalTime)}</CaptionText>
        </View>
      </View>
      
      <View style={styles.matchTeams}>
        <View style={styles.teamContainer}>
          <BodyText style={styles.teamName}>{match.TeamAName || 'TBD'}</BodyText>
          <H2Text style={styles.teamScore}>{match.MatchPointsA || '0'}</H2Text>
        </View>
        
        <BodyText style={styles.vsText}>VS</BodyText>
        
        <View style={styles.teamContainer}>
          <BodyText style={styles.teamName}>{match.TeamBName || 'TBD'}</BodyText>
          <H2Text style={styles.teamScore}>{match.MatchPointsB || '0'}</H2Text>
        </View>
      </View>
      
      <View style={styles.matchDetails}>
        {match.Court && (
          <CaptionText style={styles.matchDetail}>🏐 Court {match.Court}</CaptionText>
        )}
        <View style={styles.matchStatusContainer}>
          <StatusBadge 
            status={matchStatus}
            variant="outlined"
            size="small"
            showIcon={true}
            style={styles.matchStatusBadge}
          />
          <LiveMatchIndicator
            match={match}
            isLive={liveMatches.some(liveMatch => liveMatch.No === match.No)}
            showScore={true}
          />
        </View>
        
        <View style={styles.changeIndicators}>
          <ScheduleChangeIndicator
            scheduleChanges={scheduleChanges}
            match={match}
            isRecentlyChanged={recentScheduleChanges.has(match.NoInTournament)}
            compact={true}
          />
          <CourtAssignmentIndicator
            courtChanges={courtChanges}
            match={match}
            isRecentlyChanged={recentCourtChanges.has(match.NoInTournament)}
            compact={true}
          />
        </View>
      </View>
      
      {(match.Referee1Name || match.Referee2Name) && (
        <View style={styles.refereesContainer}>
          <Text style={styles.refereesTitle}>Officials:</Text>
          <View style={styles.referees}>
            {match.Referee1Name && (
              <Text style={styles.refereeInfo}>
                🏁 R1: {match.Referee1Name}
                {match.Referee1FederationCode && ` (${match.Referee1FederationCode})`}
              </Text>
            )}
            {match.Referee2Name && (
              <Text style={styles.refereeInfo}>
                🏁 R2: {match.Referee2Name}
                {match.Referee2FederationCode && ` (${match.Referee2FederationCode})`}
              </Text>
            )}
          </View>
        </View>
      )}
      
      {(match.PointsTeamASet1 && match.PointsTeamBSet1) && (
        <View style={styles.setsContainer}>
          <Text style={styles.setsTitle}>Set Scores:</Text>
          <View style={styles.sets}>
            <Text style={styles.setScore}>
              Set 1: {match.PointsTeamASet1}-{match.PointsTeamBSet1}
            </Text>
            {match.PointsTeamASet2 && match.PointsTeamBSet2 && (
              <Text style={styles.setScore}>
                Set 2: {match.PointsTeamASet2}-{match.PointsTeamBSet2}
              </Text>
            )}
            {match.PointsTeamASet3 && match.PointsTeamBSet3 && (
              <Text style={styles.setScore}>
                Set 3: {match.PointsTeamASet3}-{match.PointsTeamBSet3}
              </Text>
            )}
          </View>
        </View>
      )}
    </View>
  );
};


  const renderTabBar = () => (
    <View style={styles.tabBar}>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'playing' && styles.activeTab]}
        onPress={() => setActiveTab('playing')}
      >
        <Text style={[styles.tabText, activeTab === 'playing' && styles.activeTabText]}>
          Playing
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.tab, activeTab === 'schedule' && styles.activeTab]}
        onPress={() => setActiveTab('schedule')}
      >
        <Text style={[styles.tabText, activeTab === 'schedule' && styles.activeTabText]}>
          Schedule
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.tab, activeTab === 'results' && styles.activeTab]}
        onPress={() => setActiveTab('results')}
      >
        <Text style={[styles.tabText, activeTab === 'results' && styles.activeTabText]}>
          Results
        </Text>
      </TouchableOpacity>
      
      {/* Only show ranking tab if ranking data is available */}
      {hasRankingData && (
        <TouchableOpacity
          style={[styles.tab, activeTab === 'ranking' && styles.activeTab]}
          onPress={() => setActiveTab('ranking')}
        >
          <Text style={[styles.tabText, activeTab === 'ranking' && styles.activeTabText]}>
            Ranking
          </Text>
        </TouchableOpacity>
      )}
      
      <TouchableOpacity
        style={[styles.tab, activeTab === 'info' && styles.activeTab]}
        onPress={() => setActiveTab('info')}
      >
        <Text style={[styles.tabText, activeTab === 'info' && styles.activeTabText]}>
          Info
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderFiltersSection = () => (
    <View style={styles.filterContainer}>
      <View style={styles.filterHeader}>
        <Text style={styles.filterTitle}>Filter Matches</Text>
        <Text style={styles.resultCount}>
          {filteredMatches.length} of {totalMatchesForTab} matches
        </Text>
      </View>
      
      <View style={styles.filtersRow}>
        <View style={styles.dropdownContainer}>
          <TouchableOpacity
            style={styles.dropdownButton}
            onPress={() => setCourtDropdownOpen(true)}
          >
            <Text style={styles.dropdownButtonText}>
              {selectedCourt ? `Court ${selectedCourt}` : 'All Courts'}
            </Text>
            <Text style={styles.dropdownArrow}>▼</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.dropdownContainer}>
          <TouchableOpacity
            style={styles.dropdownButton}
            onPress={() => setRefereeDropdownOpen(true)}
          >
            <Text style={styles.dropdownButtonText}>
              {selectedReferee || 'All Referees'}
            </Text>
            <Text style={styles.dropdownArrow}>▼</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.dropdownContainer}>
          <TouchableOpacity
            style={styles.dropdownButton}
            onPress={() => setGenderDropdownOpen(true)}
          >
            <Text style={styles.dropdownButtonText}>
              {selectedGender ? (selectedGender === 'M' ? 'Men' : selectedGender === 'W' ? 'Women' : selectedGender) : 'All Genders'}
            </Text>
            <Text style={styles.dropdownArrow}>▼</Text>
          </TouchableOpacity>
        </View>

        {(selectedCourt || selectedReferee || selectedGender) && (
          <TouchableOpacity style={styles.clearFiltersButton} onPress={clearFilters}>
            <Text style={styles.clearFiltersText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderMatchesTab = () => {
    if (matchesLoading) {
      return (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#0066cc" />
          <Text style={styles.loadingText}>Loading matches...</Text>
        </View>
      );
    }

    if (matchesError) {
      return (
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>Error loading matches</Text>
          <Text style={styles.errorSubText}>{matchesError}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={refreshMatches}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (matches.length === 0) {
      return (
        <View style={styles.centerContent}>
          <Text style={styles.emptyText}>No matches found</Text>
          <Text style={styles.emptySubText}>Match schedule may not be available yet</Text>
        </View>
      );
    }

    return (
      <View style={styles.matchesContainer}>
        <ConnectionStatusIndicator
          connectionState={connectionState}
          isSubscribed={isSubscribed}
          hasLiveMatches={hasLiveMatches}
          lastUpdated={lastUpdated}
          showDetails={true}
        />
        <ManualRefreshButton
          onRefresh={refreshMatches}
          connectionState={connectionState}
          lastUpdated={lastUpdated}
          showLastUpdated={true}
        />
        {filteredMatches.length === 0 ? (
          <View style={styles.centerContent}>
            <Text style={styles.emptyText}>No matches match your filters</Text>
            <Text style={styles.emptySubText}>Try adjusting your filter criteria</Text>
          </View>
        ) : (
          <View style={styles.matchesListContainer}>
            {filteredMatches.map((match) => (
              <View key={match.No}>
                {renderMatchItem({ item: match })}
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderRankingTab = () => (
    <View style={styles.rankingTabContainer}>
      {rankingData.length === 0 ? (
        <View style={styles.placeholderSection}>
          <Text style={styles.placeholderTitle}>No Rankings Available</Text>
          <Text style={styles.placeholderText}>
            Rankings are not available for this tournament yet.
          </Text>
        </View>
      ) : (
        <View style={styles.rankingList}>
          {rankingData.map((entry, index) => (
            <View key={index} style={styles.rankingItem}>
              <View style={styles.rankingPosition}>
                <Text style={styles.rankingPositionText}>{entry.position || index + 1}</Text>
              </View>
              <View style={styles.rankingTeamInfo}>
                <Text style={styles.rankingTeamName}>{entry.teamName || 'Unknown Team'}</Text>
                <Text style={styles.rankingPoints}>
                  {entry.points ? `${entry.points} pts` : 'N/A'}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  const renderInfoTab = () => (
    <View style={styles.infoTabContainer}>
      <View style={styles.infoCards}>
        <View style={styles.infoCard}>
          <View style={styles.cardIconContainer}>
            <DataIcons.Details size="medium" theme="default" colorKey="secondary" />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardLabel}>Location</Text>
            <Text style={styles.cardValue}>{getLocation()}</Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.cardIconContainer}>
            <UtilityIcons.Info size="medium" theme="default" colorKey="secondary" />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardLabel}>Tournament Dates</Text>
            <Text style={styles.cardValue}>{getDateRange()}</Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.cardIconContainer}>
            <DataIcons.Details size="medium" theme="default" colorKey="secondary" />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardLabel}>Tournament Code</Text>
            <Text style={styles.cardValueMono}>{currentTournament.code}</Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.cardIconContainer}>
            <DataIcons.Stats size="medium" theme="default" colorKey="secondary" />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardLabel}>Tournament Number</Text>
            <Text style={styles.cardValueMono}>#{currentTournament.visNo}</Text>
          </View>
        </View>
      </View>

      <View style={styles.detailsSection}>
        <Text style={styles.sectionTitle}>Additional Information</Text>
        
        {currentTournament.status && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Status:</Text>
            <View style={styles.detailValueWithIndicator}>
              <StatusCard
                status={determineTournamentStatus({ Status: currentTournament.status })}
                title={currentTournament.status}
                variant="compact"
                showIcon={true}
                style={styles.tournamentStatusCard}
              />
              <TournamentStatusIndicator
                tournament={{ Status: currentTournament.status }}
                isRecentlyChanged={statusEvents.length > 0}
                subscriptionActive={statusSubscriptionActive}
              />
            </View>
          </View>
        )}
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Version:</Text>
          <Text style={styles.detailValue}>{currentTournament.version}</Text>
        </View>

        {currentTournament.dates.startDate && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Start Date:</Text>
            <Text style={styles.detailValue}>{formatDate(currentTournament.dates.startDate)}</Text>
          </View>
        )}

        {currentTournament.dates.endDate && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>End Date:</Text>
            <Text style={styles.detailValue}>{formatDate(currentTournament.dates.endDate)}</Text>
          </View>
        )}
      </View>

      {(statusSubscriptionActive || scheduleChanges || courtChanges.length > 0 || tournamentProgress) && (
        <View style={styles.realtimeStatusSection}>
          <Text style={styles.sectionTitle}>Real-time Status</Text>
          
          {statusSubscriptionActive && (
            <View style={styles.realtimeIndicator}>
              <Text style={styles.realtimeIndicatorText}>
                📡 Real-time updates active
              </Text>
              {statusLastUpdate && (
                <Text style={styles.realtimeLastUpdate}>
                  Last update: {statusLastUpdate.toLocaleTimeString()}
                </Text>
              )}
            </View>
          )}
          
          {scheduleChanges && scheduleChanges.changeCount > 0 && (
            <View style={styles.realtimeCard}>
              <ScheduleChangeIndicator
                scheduleChanges={scheduleChanges}
                onIndicatorPress={() => setScheduleChangesVisible(true)}
              />
            </View>
          )}
          
          {courtChanges.length > 0 && (
            <View style={styles.realtimeCard}>
              <CourtAssignmentIndicator
                courtChanges={courtChanges}
                onIndicatorPress={() => setCourtChangesVisible(true)}
              />
            </View>
          )}
          
          {tournamentProgress && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Progress:</Text>
              <Text style={styles.detailValue}>
                {tournamentProgress.completionPercentage}% 
                ({tournamentProgress.completedMatches}/{tournamentProgress.totalMatches} matches)
              </Text>
            </View>
          )}
          
          {(recentScheduleChanges.size > 0 || recentCourtChanges.size > 0) && (
            <TouchableOpacity 
              style={styles.clearChangesButton}
              onPress={clearRecentChanges}
            >
              <Text style={styles.clearChangesButtonText}>
                Clear Recent Change Indicators
              </Text>
            </TouchableOpacity>
          )}
          
          {statusError && (
            <View style={styles.statusErrorRow}>
              <CommunicationIcons.Alert size="small" theme="highContrast" colorKey="accent" />
              <Text style={styles.statusErrorText}>
                {statusError}
              </Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.placeholderSection}>
        <Text style={styles.placeholderTitle}>Coming Soon</Text>
        <Text style={styles.placeholderText}>
          • Player Rankings{'\n'}
          • Live Scores{'\n'}
          • Tournament Brackets{'\n'}
          • Team Statistics
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Tournament Details</Text>
          <View style={styles.headerActions}>
            <CompactConnectionIndicator 
              connectionState={connectionState}
              hasLiveMatches={hasLiveMatches}
            />
            <CompactRefreshButton
              onRefresh={refreshMatches}
              connectionState={connectionState}
            />
            <PerformanceIndicator
              onPress={() => setPerformanceDashboardVisible(true)}
            />
            {tournamentRepository.implementation === 'new' && (
              <View style={styles.repositoryIndicator}>
                <Text style={styles.repositoryIndicatorText}>v2</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <ScrollView 
        style={styles.mainScrollView}
        stickyHeaderIndices={[1]}
        showsVerticalScrollIndicator={true}
        onScrollBeginDrag={() => {
          setCourtDropdownOpen(false);
          setRefereeDropdownOpen(false);
          setGenderDropdownOpen(false);
        }}
      >
        <View style={styles.titleSection}>
          <Text style={styles.tournamentTitle}>
            {currentTournament.name || `Tournament ${currentTournament.visNo}`}
          </Text>
          <View style={styles.typeContainer}>
            <Text style={styles.tournamentType}>{getTournamentType()}</Text>
          </View>
        </View>


        <View style={styles.stickyHeaderSection}>
          {renderTabBar()}
          {/* Show filters for match-related tabs only */}
          {(activeTab !== 'info' && activeTab !== 'ranking') && (
            <View style={styles.filtersContainer}>
              {renderFiltersSection()}
            </View>
          )}
        </View>

        <View style={styles.tabContentScrollable}>
          {activeTab === 'info' ? renderInfoTab() : 
           activeTab === 'ranking' ? renderRankingTab() : 
           renderMatchesTab()}
        </View>
      </ScrollView>

      <PerformanceDashboard
        visible={performanceDashboardVisible}
        onClose={() => setPerformanceDashboardVisible(false)}
      />

      <DropdownModal
        visible={courtDropdownOpen}
        onClose={() => setCourtDropdownOpen(false)}
        data={[{ id: 'all', label: 'All Courts', value: '' }, ...availableCourts.map(court => ({ id: court, label: `Court ${court}`, value: court }))]}
        selectedValue={selectedCourt}
        onSelect={setSelectedCourt}
        title="Select Court"
      />

      <DropdownModal
        visible={refereeDropdownOpen}
        onClose={() => setRefereeDropdownOpen(false)}
        data={[{ id: 'all', label: 'All Referees', value: '' }, ...availableReferees.map(referee => ({ id: referee, label: referee, value: referee }))]}
        selectedValue={selectedReferee}
        onSelect={setSelectedReferee}
        title="Select Referee"
      />

      <DropdownModal
        visible={genderDropdownOpen}
        onClose={() => setGenderDropdownOpen(false)}
        data={[{ id: 'all', label: 'All Genders', value: '' }, ...availableGenders.map(gender => ({ id: gender, label: gender === 'M' ? 'Men' : gender === 'W' ? 'Women' : gender, value: gender }))]}
        selectedValue={selectedGender}
        onSelect={setSelectedGender}
        title="Select Gender"
      />

      <Modal
        visible={scheduleChangesVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setScheduleChangesVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setScheduleChangesVisible(false)}
        >
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            {scheduleChanges && (
              <ScheduleChangesDetail
                scheduleChanges={scheduleChanges}
                onClose={() => setScheduleChangesVisible(false)}
              />
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={courtChangesVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCourtChangesVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setCourtChangesVisible(false)}
        >
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <CourtChangesDetail
              courtChanges={courtChanges}
              onClose={() => setCourtChangesVisible(false)}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    paddingRight: 16,
  },
  backButtonText: {
    fontSize: 16,
    color: '#0066cc',
    fontWeight: '500',
  },
  headerTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  infoTabContainer: {
    padding: 16,
  },
  titleSection: {
    backgroundColor: '#fff',
    padding: 20,
    alignItems: 'center',
  },
  tournamentTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 30,
  },
  typeContainer: {
    backgroundColor: '#0066cc',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  tournamentType: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  infoCards: {
    marginBottom: 20,
  },
  infoCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardIconContainer: {
    width: 40,
    height: 40,
    marginRight: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    flex: 1,
  },
  cardLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontWeight: '500',
  },
  cardValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  cardValueMono: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  detailsSection: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
    flex: 2,
    textAlign: 'right',
  },
  placeholderSection: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  placeholderTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  placeholderText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  // Tab styles
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    zIndex: 101,
    elevation: 101,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#0066cc',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#0066cc',
    fontWeight: 'bold',
  },
  mainScrollView: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  stickyHeaderSection: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingTop: 0,
    paddingBottom: 0,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 8,
    zIndex: 1000,
  },
  filtersContainer: {
    backgroundColor: '#ffffff',
    paddingTop: 0,
  },
  scrollableContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  tabContent: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  tabContentScrollable: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  // Match styles
  matchesContainer: {
    flex: 1,
  },
  matchesList: {
    flex: 1,
  },
  matchesListContainer: {
    padding: 16,
  },
  matchesListContent: {
    padding: 16,
  },
  matchItem: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    position: 'relative',
  },
  genderBand: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  matchNumber: {
    fontSize: 12,
    color: '#0066cc',
    fontWeight: 'bold',
  },
  matchDateTime: {
    alignItems: 'flex-end',
  },
  matchDate: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  matchTime: {
    fontSize: 12,
    color: '#999',
  },
  matchTeams: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  teamContainer: {
    flex: 1,
    alignItems: 'center',
  },
  teamName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  teamScore: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0066cc',
  },
  vsText: {
    fontSize: 12,
    color: '#999',
    fontWeight: 'bold',
    marginHorizontal: 16,
  },
  matchDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  matchDetail: {
    fontSize: 12,
    color: '#666',
  },
  matchResult: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
  },
  matchStatusContainer: {
    alignItems: 'flex-end',
  },
  matchStatusPlaying: {
    fontSize: 12,
    color: '#d32f2f',
    fontWeight: 'bold',
    textAlign: 'right',
  },
  matchStatusScheduled: {
    fontSize: 12,
    color: '#ff9800',
    fontWeight: '500',
    textAlign: 'right',
  },
  matchStatusCompleted: {
    fontSize: 12,
    color: '#388e3c',
    fontWeight: '500',
    textAlign: 'right',
  },
  setsContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  setsTitle: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    marginBottom: 4,
  },
  sets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  setScore: {
    fontSize: 11,
    color: '#333',
    marginRight: 12,
    fontFamily: 'monospace',
  },
  // Referee styles
  refereesContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  refereesTitle: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    marginBottom: 4,
  },
  referees: {
    flexDirection: 'column',
  },
  refereeInfo: {
    fontSize: 11,
    color: '#333',
    marginBottom: 2,
  },
  // Center content styles
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 18,
    color: '#d32f2f',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorSubText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#0066cc',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 18,
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  // Filter styles
  filterContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    zIndex: 50,
    elevation: 50,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  resultCount: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  filtersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  dropdownContainer: {
    flex: 1,
    position: 'relative',
    zIndex: 60,
    minWidth: 100,
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dropdownButtonText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
  dropdownList: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    marginTop: 2,
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1001,
  },
  dropdownFlatList: {
    maxHeight: 200,
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownItemSelected: {
    backgroundColor: '#e6f3ff',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#333',
  },
  dropdownItemTextSelected: {
    color: '#0066cc',
    fontWeight: '600',
  },
  clearFiltersButton: {
    backgroundColor: '#ff6b6b',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearFiltersText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    elevation: 1000,
  },
  modalContainer: {
    width: '80%',
    maxHeight: '70%',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 1001,
    zIndex: 1001,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  modalList: {
    maxHeight: 300,
  },
  modalItem: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalItemSelected: {
    backgroundColor: '#e6f3ff',
  },
  modalItemText: {
    fontSize: 16,
    color: '#333',
  },
  modalItemTextSelected: {
    color: '#0066cc',
    fontWeight: '600',
  },
  modalCloseButton: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#f8f9fa',
    marginHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCloseContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalCloseText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  // Real-time status styles
  changeIndicators: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  detailValueWithIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  realtimeStatusSection: {
    marginTop: 20,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },
  realtimeIndicator: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#e8f5e8',
    borderRadius: 6,
    marginBottom: 12,
  },
  realtimeIndicatorText: {
    fontSize: 12,
    color: '#4caf50',
    fontWeight: '600',
  },
  realtimeLastUpdate: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
  },
  realtimeCard: {
    marginBottom: 8,
  },
  clearChangesButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#ff9800',
    borderRadius: 6,
    marginTop: 12,
  },
  clearChangesButtonText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '600',
    textAlign: 'center',
  },
  statusErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
  },
  statusErrorText: {
    fontSize: 12,
    color: '#f44336',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 0,
  },
  // Status component styles
  matchStatusBadge: {
    marginBottom: 4,
  },
  tournamentStatusCard: {
    flex: 1,
    marginRight: 8,
  },
  // Repository implementation indicator styles
  repositoryIndicator: {
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 4,
  },
  repositoryIndicatorText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  
  // Ranking styles
  rankingTabContainer: {
    flex: 1,
    padding: 16,
  },
  rankingList: {
    flex: 1,
  },
  rankingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  rankingPosition: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0066cc',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  rankingPositionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  rankingTeamInfo: {
    flex: 1,
  },
  rankingTeamName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  rankingPoints: {
    fontSize: 14,
    color: '#666',
  },
});

export default TournamentDetail;