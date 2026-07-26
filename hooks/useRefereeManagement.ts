import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { VisApiClient, DEFAULT_RETRY_CONFIG } from '../services/api/VisApiClient';
import { BeachMatch } from '../types/match';

interface RefereeFromDB {
  No: string;
  Name: string;
  FederationCode?: string;
  Level?: string;
  isSelected?: boolean;
}

interface UseRefereeManagementState {
  refereeList: RefereeFromDB[];
  loadingReferees: boolean;
  showRefereeList: boolean;
  selectedReferee: RefereeFromDB | null;
  refereeMatches: BeachMatch[];
  loadingRefereeMatches: boolean;
  showRefereeMatches: boolean;
  refereeCacheKey: string | null;
}

interface UseRefereeManagementActions {
  loadRefereeList: (tournamentNo: string) => Promise<void>;
  selectReferee: (referee: RefereeFromDB) => Promise<void>;
  setShowRefereeList: (show: boolean) => void;
  setShowRefereeMatches: (show: boolean) => void;
  clearRefereeData: () => void;
}

export interface UseRefereeManagement extends UseRefereeManagementState, UseRefereeManagementActions {}

export const useRefereeManagement = (): UseRefereeManagement => {
  const [refereeList, setRefereeList] = useState<RefereeFromDB[]>([]);
  const [loadingReferees, setLoadingReferees] = useState(false);
  const [showRefereeList, setShowRefereeList] = useState(false);
  const [selectedReferee, setSelectedReferee] = useState<RefereeFromDB | null>(null);
  const [refereeMatches, setRefereeMatches] = useState<BeachMatch[]>([]);
  const [loadingRefereeMatches, setLoadingRefereeMatches] = useState(false);
  const [showRefereeMatches, setShowRefereeMatches] = useState(false);
  const [refereeCacheKey, setRefereeCacheKey] = useState<string | null>(null);
  
  const visApiClient = new VisApiClient({
    baseUrl: 'https://www.fivb.org/Vis2009/XmlRequest.asmx',
    timeoutMs: 10000,
    maxRetries: 3,
    retryDelayMs: 1000,
    exponentialBackoff: true,
    // No custom headers on purpose: any header outside the CORS safelist makes
    // the POST non-simple, and the VIS preflight is not cacheable — every
    // request would cost two round trips. See VisApiClientConfig.headers (#67).
    enableLogging: true
  }, DEFAULT_RETRY_CONFIG);

  const findOppositeGenderTournament = useCallback(async (tournamentNo: string): Promise<string | null> => {
    try {
      
      const tournaments = await visApiClient.fetchBeachTournamentsThisYear();
      
      const currentTournament = tournaments.find(t => t.No === tournamentNo);
      
      if (!currentTournament || !currentTournament.Code) {
        return null;
      }
      
      const currentCode = currentTournament.Code;
      
      let oppositeCode: string | null = null;
      
      if (currentCode.startsWith('M')) {
        oppositeCode = 'W' + currentCode.substring(1);
      } else if (currentCode.startsWith('W')) {
        oppositeCode = 'M' + currentCode.substring(1);
      }
      
      if (oppositeCode) {
        const oppositeTournament = tournaments.find(t => t.Code === oppositeCode);
        if (oppositeTournament) {
          return oppositeTournament.No;
        }
      }
      
      return null;
    } catch (error) {
      // console.error('Failed to find opposite gender tournament:', error);
      return null;
    }
  }, []);

  const loadRefereeList = useCallback(async (tournamentNo: string) => {
    if (!tournamentNo) {
      Alert.alert('Error', 'No tournament selected');
      return;
    }

    // Check cache first for faster loading
    if (refereeCacheKey === tournamentNo && refereeList.length > 0) {
      setShowRefereeList(true);
      return;
    }

    setLoadingReferees(true);
    try {
      
      // Skip tournament details call for faster loading - get matches directly
      const matches = await visApiClient.fetchMatchesForTournament(tournamentNo);
      
      if (matches.length === 0) {
        Alert.alert('No Referees Found', 'This tournament has no matches scheduled yet, so referee assignments are not available. Referees are typically assigned closer to the tournament start date.');
        return;
      }
      
      // Quick sample check for referee data availability
      const sampleMatch = matches[0];
      
      // Extract unique referees from matches
      const refereeMap = new Map<string, RefereeFromDB>();
      
      matches.forEach(match => {
        // Add Referee 1 if present
        if (match.NoReferee1 && match.Referee1Name) {
          refereeMap.set(match.NoReferee1, {
            No: match.NoReferee1,
            Name: match.Referee1Name,
            FederationCode: match.Referee1FederationCode,
          });
        }
        
        // Add Referee 2 if present
        if (match.NoReferee2 && match.Referee2Name) {
          refereeMap.set(match.NoReferee2, {
            No: match.NoReferee2,
            Name: match.Referee2Name,
            FederationCode: match.Referee2FederationCode,
          });
        }
      });
      
      const referees = Array.from(refereeMap.values()).sort((a, b) => a.Name.localeCompare(b.Name));
      
      if (referees.length === 0) {
        Alert.alert('No Referees Found', 'The matches for this tournament do not have referee assignments yet. Referees are typically assigned closer to the tournament start date.');
        return;
      }
      
      setRefereeList(referees);
      setRefereeCacheKey(tournamentNo); // Cache the result
      setShowRefereeList(true);
    } catch (error) {
      // console.error('Failed to load referee list:', error);
      Alert.alert('Error', 'Failed to load referee list. Please check your connection and try again.');
    } finally {
      setLoadingReferees(false);
    }
  }, [refereeCacheKey, refereeList.length]);

  const loadRefereeMatches = useCallback(async (referee: RefereeFromDB, tournamentNo: string) => {
    setLoadingRefereeMatches(true);
    try {
      
      // Get all matches for the tournament (including both male and female if applicable)
      let allMatches = await visApiClient.fetchMatchesForTournament(tournamentNo);
      
      // Try to load opposite gender tournament matches
      try {
        const oppositeGenderTournamentNo = await findOppositeGenderTournament(tournamentNo);
        if (oppositeGenderTournamentNo) {
          const oppositeMatches = await visApiClient.fetchMatchesForTournament(oppositeGenderTournamentNo);
          
          // Add source metadata to distinguish tournaments
          const oppositeMatchesWithMeta = oppositeMatches.map(match => ({
            ...match,
            sourceType: 'opposite_gender',
            sourceTournament: oppositeGenderTournamentNo,
          }));
          
          allMatches = [...allMatches, ...oppositeMatchesWithMeta];
        }
      } catch (error) {
        // console.error('Failed to load opposite gender tournament matches:', error);
      }
      
      // TEMPORARY: Show all matches for debugging
      setRefereeMatches(allMatches);
      
      setShowRefereeMatches(true);
    } catch (error) {
      // console.error(`Error loading referee matches for ${referee.Name}:`, error);
      Alert.alert('Error', 'Failed to load referee matches');
    } finally {
      setLoadingRefereeMatches(false);
    }
  }, [findOppositeGenderTournament]);

  const selectReferee = useCallback(async (referee: RefereeFromDB, tournamentNo: string) => {
    try {
      setSelectedReferee(referee);
      setShowRefereeList(false);
      await loadRefereeMatches(referee, tournamentNo);
    } catch (error) {
      // console.error('Failed to select referee:', error);
      Alert.alert('Error', 'Failed to load referee matches');
    }
  }, [loadRefereeMatches]);

  const clearRefereeData = useCallback(() => {
    setRefereeList([]);
    setSelectedReferee(null);
    setRefereeMatches([]);
    setShowRefereeList(false);
    setShowRefereeMatches(false);
    setRefereeCacheKey(null);
  }, []);

  return {
    // State
    refereeList,
    loadingReferees,
    showRefereeList,
    selectedReferee,
    refereeMatches,
    loadingRefereeMatches,
    showRefereeMatches,
    refereeCacheKey,
    // Actions
    loadRefereeList,
    selectReferee,
    setShowRefereeList,
    setShowRefereeMatches,
    clearRefereeData,
  };
};
