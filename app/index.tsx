import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { WhistleLogo } from '../components/WhistleLogo';
import { DefaultTournamentService } from '../services/DefaultTournamentService';
import { colors } from '../theme/tokens';

export default function Index() {
  const router = useRouter();
  const [showStartButton, setShowStartButton] = useState(false);

  useEffect(() => {
    const checkDefaultTournamentAndRedirect = async () => {
      console.log('Checking default tournament...');
      try {
        const defaultTournament = await DefaultTournamentService.getDefaultTournament();
        console.log('Default tournament:', defaultTournament);

        if (defaultTournament) {
          console.log('Redirecting to tournament detail...');
          // Redirect to tournament detail with complete tournament data
          const tournamentDataString = encodeURIComponent(JSON.stringify(defaultTournament));
          router.replace(`/tournament-detail?tournamentData=${tournamentDataString}`);
        } else {
          console.log('Redirecting to tournament selection...');
          router.replace('/tournament-selection');
        }
      } catch (error) {
        console.error('Error checking default tournament:', error);
        router.replace('/tournament-selection');
      }
    };

    // Immediate check
    checkDefaultTournamentAndRedirect();

    // Fallback: Show start button if redirection takes too long (e.g. 1.5 seconds)
    const fallbackTimer = setTimeout(() => {
      setShowStartButton(true);
    }, 1500);

    return () => {
      clearTimeout(fallbackTimer);
    };
  }, [router]);

  const handleStartPress = () => {
  };

  // Show loading screen while checking for default tournament
  return (
    <View style={styles.loadingContainer}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <WhistleLogo width={120} height={80} style={styles.loadingLogo} />
      <Text style={styles.loadingText}>Loading BeachRef...</Text>

      {showStartButton && (
        <Text
          style={[styles.loadingText, { marginTop: 20, textDecorationLine: 'underline' }]}
          onPress={handleStartPress}
        >
          Tap to Start
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingLogo: {
    marginBottom: 20,
    opacity: 0.8,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '500',
  },
});