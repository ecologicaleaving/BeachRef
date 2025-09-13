import { useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TournamentCore } from '../types/tournament-v2';

const FAVORITES_STORAGE_KEY = '@beachref:favorite_tournaments';

interface UseFavoriteTournamentsReturn {
  favoriteTournaments: TournamentCore[];
  isLoading: boolean;
  toggleFavorite: (tournament: TournamentCore) => Promise<void>;
  isFavorite: (tournamentId: string) => boolean;
  addFavorite: (tournament: TournamentCore) => Promise<void>;
  removeFavorite: (tournamentId: string) => Promise<void>;
}

export const useFavoriteTournaments = (): UseFavoriteTournamentsReturn => {
  const [favoriteTournaments, setFavoriteTournaments] = useState<TournamentCore[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load favorites from AsyncStorage on mount
  useEffect(() => {
    const loadFavorites = async () => {
      try {
        const stored = await AsyncStorage.getItem(FAVORITES_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as TournamentCore[];
          setFavoriteTournaments(parsed);
        }
      } catch (error) {
        console.warn('Failed to load favorite tournaments:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadFavorites();
  }, []);

  // Save favorites to AsyncStorage
  const saveFavorites = useCallback(async (tournaments: TournamentCore[]) => {
    try {
      await AsyncStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(tournaments));
    } catch (error) {
      console.warn('Failed to save favorite tournaments:', error);
    }
  }, []);

  // Check if a tournament is favorited
  const isFavorite = useCallback((tournamentId: string): boolean => {
    return favoriteTournaments.some(tournament => tournament.id === tournamentId);
  }, [favoriteTournaments]);

  // Add a tournament to favorites
  const addFavorite = useCallback(async (tournament: TournamentCore) => {
    if (isFavorite(tournament.id)) return;

    const updated = [...favoriteTournaments, tournament];
    setFavoriteTournaments(updated);
    await saveFavorites(updated);
  }, [favoriteTournaments, isFavorite, saveFavorites]);

  // Remove a tournament from favorites
  const removeFavorite = useCallback(async (tournamentId: string) => {
    const updated = favoriteTournaments.filter(tournament => tournament.id !== tournamentId);
    setFavoriteTournaments(updated);
    await saveFavorites(updated);
  }, [favoriteTournaments, saveFavorites]);

  // Toggle favorite status
  const toggleFavorite = useCallback(async (tournament: TournamentCore) => {
    if (isFavorite(tournament.id)) {
      await removeFavorite(tournament.id);
    } else {
      await addFavorite(tournament);
    }
  }, [isFavorite, addFavorite, removeFavorite]);

  return {
    favoriteTournaments,
    isLoading,
    toggleFavorite,
    isFavorite,
    addFavorite,
    removeFavorite,
  };
};