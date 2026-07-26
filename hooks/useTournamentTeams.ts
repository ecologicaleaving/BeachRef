/**
 * useTournamentTeams Hook
 *
 * React hook for managing tournament team data with filtering and state management.
 * Feature: 003-players-entry-list
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  TournamentTeam,
  TeamListFilter,
  DEFAULT_TEAM_FILTER,
} from '../types/tournament-team';
import { TournamentTeamService } from '../services/TournamentTeamService';
import { VisApiClient } from '../services/api/VisApiClient';
import { TournamentCore } from '../types/tournament-v2';

/**
 * Hook state interface
 */
interface UseTournamentTeamsState {
  /** All teams (unfiltered) */
  teams: TournamentTeam[];
  /** Filtered teams based on current filter */
  filteredTeams: TournamentTeam[];
  /** Current filter state */
  filter: TeamListFilter;
  /** Loading state */
  loading: boolean;
  /** Refreshing state (pull-to-refresh) */
  refreshing: boolean;
  /** Error message if any */
  error: string | null;
  /** Whether data is from cache */
  isOffline: boolean;
  /** Selected team for modal */
  selectedTeam: TournamentTeam | null;
  /** Modal visibility */
  modalVisible: boolean;
}

/**
 * Hook return interface
 */
interface UseTournamentTeamsReturn extends UseTournamentTeamsState {
  /** Update filter state */
  setFilter: (filter: TeamListFilter) => void;
  /** Manually refresh data */
  refresh: () => Promise<void>;
  /** Open team detail modal */
  openTeamModal: (team: TournamentTeam) => void;
  /** Close team detail modal */
  closeTeamModal: () => void;
}

/**
 * Custom hook for tournament team data management
 *
 * @param tournamentNo - Tournament number
 * @param tournament - Optional tournament object for TTL calculation
 * @returns Team data and control functions
 */
export function useTournamentTeams(
  tournamentNo: number,
  tournament?: TournamentCore
): UseTournamentTeamsReturn {
  // State management
  const [teams, setTeams] = useState<TournamentTeam[]>([]);
  const [filter, setFilter] = useState<TeamListFilter>(DEFAULT_TEAM_FILTER);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<TournamentTeam | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Initialize service (singleton pattern)
  const teamService = useMemo(() => {
    const visApiClient = new VisApiClient(
      {
        baseUrl: 'https://www.fivb.org/Vis2009/XmlRequest.asmx',
        timeoutMs: 30000,
        maxRetries: 3,
        retryDelayMs: 1000,
        exponentialBackoff: true,
        enableLogging: __DEV__,
      },
      {
        maxAttempts: 3,
        baseDelayMs: 1000,
        maxDelayMs: 10000,
        exponentialBackoff: true,
        jitterFactor: 0.1,
        retryableStatusCodes: [408, 429, 500, 502, 503, 504],
      }
    );
    return new TournamentTeamService(visApiClient);
  }, []);

  /**
   * Load teams from service
   */
  const loadTeams = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      setIsOffline(false);

      const teamList = await teamService.getTeamList(tournamentNo, tournament);
      setTeams(teamList);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load teams';
      setError(errorMessage);
      setIsOffline(true); // Assume offline if error occurred
      console.error('[useTournamentTeams] Error loading teams:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tournamentNo, tournament, teamService]);

  /**
   * Refresh data (force API call)
   */
  const refresh = useCallback(async () => {
    try {
      setRefreshing(true);
      setError(null);
      setIsOffline(false);

      const teamList = await teamService.refreshTeamList(tournamentNo, tournament);
      setTeams(teamList);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh teams';
      setError(errorMessage);
      setIsOffline(true);
      console.error('[useTournamentTeams] Error refreshing teams:', err);
    } finally {
      setRefreshing(false);
    }
  }, [tournamentNo, tournament, teamService]);

  /**
   * Client-side filtering with useMemo
   */
  const filteredTeams = useMemo(() => {
    return teams.filter(team => {
      // Gender filter
      const matchesGender = filter.gender === 'All' || team.gender === filter.gender;

      // Phase filter
      const matchesPhase = filter.phase === 'All' || team.phaseCode === filter.phase;

      return matchesGender && matchesPhase;
    });
  }, [teams, filter]);

  /**
   * Open team detail modal
   */
  const openTeamModal = useCallback((team: TournamentTeam) => {
    setSelectedTeam(team);
    setModalVisible(true);
  }, []);

  /**
   * Close team detail modal
   */
  const closeTeamModal = useCallback(() => {
    setModalVisible(false);
    // Delay clearing selected team to allow modal close animation
    setTimeout(() => setSelectedTeam(null), 300);
  }, []);

  // Load teams on mount or when tournament changes
  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  return {
    teams,
    filteredTeams,
    filter,
    loading,
    refreshing,
    error,
    isOffline,
    selectedTeam,
    modalVisible,
    setFilter,
    refresh,
    openTeamModal,
    closeTeamModal,
  };
}
