import { Tournament } from './tournament';

export type RootStackParamList = {
  index: undefined;
  'tournament-selection': undefined;
  'tournament-detail': {
    tournamentData: string; // JSON stringified Tournament
  };
  'referee-dashboard': {
    tournamentData: string; // JSON stringified Tournament
  };
  'switch-tournament': undefined;
};

export type NavigationState = 'selection' | 'dashboard';

export interface RefereeNavigationContext {
  selectedTournament: Tournament | null;
  navigationState: NavigationState;
  isLoading: boolean;
}