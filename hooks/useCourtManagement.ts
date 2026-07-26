import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { VisApiClient, DEFAULT_RETRY_CONFIG } from '../services/api/VisApiClient';
import { BeachMatch } from '../types/match';
import { TournamentStorageService } from '../services/TournamentStorageService';

interface UseCourtManagementState {
  availableCourts: string[];
  selectedCourt: string;
  courtMatches: BeachMatch[];
  loadingCourts: boolean;
  loadingCourtMatches: boolean;
  showCourtSelection: boolean;
}

interface UseCourtManagementActions {
  loadAvailableCourts: (tournamentNo: string) => Promise<void>;
  loadCourtMatches: (tournamentNo: string) => Promise<void>;
  setSelectedCourt: (court: string) => void;
  setShowCourtSelection: (show: boolean) => void;
}

export interface UseCourtManagement extends UseCourtManagementState, UseCourtManagementActions {}

const extractGenderFromCode = (code: string): string => {
  if (code.toUpperCase().startsWith('W')) return 'Women';
  if (code.toUpperCase().startsWith('M')) return 'Men';
  return 'Mixed';
};

export const useCourtManagement = (): UseCourtManagement => {
  const [availableCourts, setAvailableCourts] = useState<string[]>([]);
  const [selectedCourt, setSelectedCourt] = useState<string>('All Courts');
  const [courtMatches, setCourtMatches] = useState<BeachMatch[]>([]);
  const [loadingCourts, setLoadingCourts] = useState(false);
  const [loadingCourtMatches, setLoadingCourtMatches] = useState(false);
  const [showCourtSelection, setShowCourtSelection] = useState(false);
  
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

  const inferCountryFromName = useCallback((name?: string): string | undefined => {
    if (!name) return undefined;
    const nameLower = name.toLowerCase();
    
    const countryMap: Record<string, string> = {
      'dusseldorf': 'Germany',
      'düsseldorf': 'Germany',
      'hamburg': 'Germany',
      'berlin': 'Germany',
      'munich': 'Germany',
      'rome': 'Italy',
      'roma': 'Italy',
      'italy': 'Italy',
      'paris': 'France',
      'france': 'France',
      'madrid': 'Spain',
      'spain': 'Spain',
      'vienna': 'Austria',
      'austria': 'Austria',
      'doha': 'Qatar',
      'qatar': 'Qatar',
      'tokyo': 'Japan',
      'japan': 'Japan',
      'sydney': 'Australia',
      'australia': 'Australia',
      'toronto': 'Canada',
      'vancouver': 'Canada',
      'canada': 'Canada',
      'montreal': 'Canada',
      'brazil': 'Brazil',
      'rio': 'Brazil',
      'sao paulo': 'Brazil',
      'usa': 'USA',
      'america': 'USA',
      'miami': 'USA',
      'los angeles': 'USA',
      'new york': 'USA',
      'poland': 'Poland',
      'warsaw': 'Poland',
      'krakow': 'Poland',
      'netherlands': 'Netherlands',
      'amsterdam': 'Netherlands',
      'den haag': 'Netherlands',
      'norway': 'Norway',
      'oslo': 'Norway',
      'sweden': 'Sweden',
      'stockholm': 'Sweden',
      'denmark': 'Denmark',
      'copenhagen': 'Denmark',
      'finland': 'Finland',
      'helsinki': 'Finland',
      'turkey': 'Turkey',
      'istanbul': 'Turkey',
      'ankara': 'Turkey',
      'mexico': 'Mexico',
      'cancun': 'Mexico',
      'acapulco': 'Mexico',
      'argentina': 'Argentina',
      'buenos aires': 'Argentina',
      'chile': 'Chile',
      'santiago': 'Chile',
      'viña del mar': 'Chile',
    };

    for (const [key, country] of Object.entries(countryMap)) {
      if (nameLower.includes(key)) {
        return country;
      }
    }
    
    return undefined;
  }, []);

  const loadAvailableCourts = useCallback(async (tournamentNo: string) => {
    if (!tournamentNo) return;
    
    setLoadingCourts(true);
    try {
      
      const matches = await visApiClient.fetchMatchesForTournament(tournamentNo);
      
      // Extract unique courts from matches
      const courts = [...new Set(
        matches
          .map(match => match.Court)
          .filter(Boolean)
          .filter(court => court.trim() !== '')
      )].sort();
      
      
      if (courts.length === 0) {
        Alert.alert('No Courts Found', 'No court information is available for this tournament yet.');
        return;
      }
      
      // Add "All Courts" option at the beginning
      const courtsWithAll = ['All Courts', ...courts];
      setAvailableCourts(courtsWithAll);
      
      // Load saved court preference if available
      try {
        const savedCourt = await TournamentStorageService.getCourtPreference(tournamentNo);
        if (savedCourt && courtsWithAll.includes(savedCourt)) {
          setSelectedCourt(savedCourt);
        } else {
          setSelectedCourt('All Courts');
        }
      } catch (error) {
        // console.error('Failed to load court preference:', error);
        setSelectedCourt('All Courts');
      }
      
    } catch (error) {
      // console.error('Failed to load courts:', error);
      Alert.alert('Error', 'Failed to load court information. Please check your connection.');
    } finally {
      setLoadingCourts(false);
    }
  }, []);

  const loadCourtMatches = useCallback(async (tournamentNo: string) => {
    if (!tournamentNo) return;
    
    setLoadingCourtMatches(true);
    try {
      let allTournamentMatches: BeachMatch[] = [];
      
      // Load matches from current tournament
      const currentMatches = await visApiClient.fetchMatchesForTournament(tournamentNo);
      const currentTournamentData = await TournamentStorageService.getSelectedTournament();
      const currentGender = currentTournamentData?.Code ? extractGenderFromCode(currentTournamentData.Code) : 'Unknown';
      
      // Add metadata to current tournament matches
      const inferredCountry = inferCountryFromName(currentTournamentData?.Name);
      
      const currentMatchesWithMeta = currentMatches.map(match => ({
        ...match,
        tournamentGender: currentGender,
        tournamentNo: tournamentNo,
        tournamentCode: currentTournamentData?.Code,
        tournamentCountry: currentTournamentData?.Country || currentTournamentData?.CountryName || inferredCountry
      }));
      
      allTournamentMatches = [...currentMatchesWithMeta];
      
      // Try to load opposite gender tournament
      try {
        const tournaments = await visApiClient.fetchBeachTournamentsThisYear();
        const currentTournament = tournaments.find(t => t.No === tournamentNo);
        
        if (currentTournament?.Code) {
          let oppositeCode: string | null = null;
          if (currentTournament.Code.startsWith('M')) {
            oppositeCode = 'W' + currentTournament.Code.substring(1);
          } else if (currentTournament.Code.startsWith('W')) {
            oppositeCode = 'M' + currentTournament.Code.substring(1);
          }
          
          if (oppositeCode) {
            const oppositeTournament = tournaments.find(t => t.Code === oppositeCode);
            if (oppositeTournament) {
              const oppositeMatches = await visApiClient.fetchMatchesForTournament(oppositeTournament.No);
              const oppositeGender = extractGenderFromCode(oppositeTournament.Code);
              
              const oppositeMatchesWithMeta = oppositeMatches.map(match => ({
                ...match,
                tournamentGender: oppositeGender,
                tournamentNo: oppositeTournament.No,
                tournamentCode: oppositeTournament.Code,
                tournamentCountry: oppositeTournament.Country || oppositeTournament.CountryName || inferredCountry
              }));
              
              allTournamentMatches = [...allTournamentMatches, ...oppositeMatchesWithMeta];
            }
          }
        }
      } catch (error) {
        // console.error('Failed to load opposite gender tournament:', error);
      }
      
      // Filter by selected court if not "All Courts"
      let filteredMatches = allTournamentMatches;
      if (selectedCourt !== 'All Courts') {
        filteredMatches = allTournamentMatches.filter(match => match.Court === selectedCourt);
      }
      
      // Sort matches ONLY by time (ascending - earliest first)
      const sortedMatches = filteredMatches.sort((a, b) => {
        const timeA = a.LocalTime || '00:00';
        const timeB = b.LocalTime || '00:00';
        
        // Convert time strings (HH:MM) to comparable numbers
        const getTimeNumber = (timeStr: string) => {
          const parts = timeStr.split(':');
          const hours = parseInt(parts[0] || '0', 10);
          const minutes = parseInt(parts[1] || '0', 10);
          return hours * 60 + minutes; // Total minutes from midnight
        };
        
        return getTimeNumber(timeA) - getTimeNumber(timeB); // Ascending order
      });
      
      setCourtMatches(sortedMatches);
      
    } catch (error) {
      // console.error('Failed to load court matches:', error);
      Alert.alert('Error', 'Failed to load matches for selected court.');
    } finally {
      setLoadingCourtMatches(false);
    }
  }, [selectedCourt, inferCountryFromName]);

  return {
    // State
    availableCourts,
    selectedCourt,
    courtMatches,
    loadingCourts,
    loadingCourtMatches,
    showCourtSelection,
    // Actions
    loadAvailableCourts,
    loadCourtMatches,
    setSelectedCourt,
    setShowCourtSelection,
  };
};
