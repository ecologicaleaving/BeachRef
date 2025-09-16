import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { WhistleLogo } from '../components/WhistleLogo';
import { DefaultTournamentService } from '../services/DefaultTournamentService';
import { createShadow } from '../theme/shadows';

// Window dimensions available but not currently used
// const { width } = Dimensions.get('window');

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    const checkDefaultTournamentAndRedirect = async () => {
      try {
        const defaultTournament = await DefaultTournamentService.getDefaultTournament();

        if (defaultTournament) {
          console.log('Default tournament found:', defaultTournament.name);
          // Redirect to tournament detail with complete tournament data
          const tournamentDataString = encodeURIComponent(JSON.stringify(defaultTournament));
          router.replace(`/tournament-detail?tournamentData=${tournamentDataString}`);
        } else {
          console.log('No default tournament found, redirecting to tournament selection...');
          router.replace('/tournament-selection');
        }
      } catch (error) {
        console.error('Error checking default tournament:', error);
        router.replace('/tournament-selection');
      }
    };

    // Small delay to show loading screen briefly
    const timer = setTimeout(checkDefaultTournamentAndRedirect, 800);

    return () => clearTimeout(timer);
  }, [router]);

  // handleStartPress removed - no longer needed as we auto-redirect

  // Show loading screen while checking for default tournament
  return (
    <View style={styles.loadingContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#1B365D" />
      <WhistleLogo width={120} height={80} style={styles.loadingLogo} />
      <Text style={styles.loadingText}>Loading...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: '#1B365D', // Professional navy blue
    justifyContent: 'center',
    alignItems: 'center',
  },
  backgroundPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.1,
  },
  sand: {
    position: 'absolute',
    borderRadius: 50,
    backgroundColor: '#FFE4B3',
  },
  sand1: {
    width: 200,
    height: 200,
    top: '20%',
    left: '-10%',
    transform: [{ rotate: '45deg' }],
  },
  sand2: {
    width: 150,
    height: 150,
    top: '60%',
    right: '-5%',
    transform: [{ rotate: '-30deg' }],
  },
  sand3: {
    width: 100,
    height: 100,
    top: '80%',
    left: '20%',
    transform: [{ rotate: '60deg' }],
  },
  contentContainer: {
    alignItems: 'center',
    paddingHorizontal: 40,
    marginTop: -40, // Ridotto per centrare meglio
    justifyContent: 'center',
    flex: 0.8,
  },
  appName: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
    textAlign: 'center',
    letterSpacing: 2,
  },
  appTagline: {
    fontSize: 16,
    color: '#B8D4E3',
    textAlign: 'center',
    marginBottom: 24,
    fontWeight: '500',
  },
  topSection: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    marginBottom: 12,
    borderRadius: 15,
    ...createShadow({
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.25,
      shadowRadius: 5,
      elevation: 6,
    }),
  },
  featuresContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 20,
    paddingHorizontal: 20,
  },
  featureItem: {
    alignItems: 'center',
    opacity: 0.9,
    minHeight: 80,
    justifyContent: 'center',
  },
  featureIcon: {
    marginBottom: 8,
  },
  featureText: {
    color: '#B8D4E3',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
  },
  startButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    minWidth: 160,
    ...createShadow({
      shadowColor: '#FF6B35',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
      elevation: 8,
    }),
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 10,
  },
  startButtonIcon: {
    marginLeft: 4,
  },
  bottomBadge: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  professionalText: {
    color: '#B8D4E3',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#1B365D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingLogo: {
    marginBottom: 20,
    opacity: 0.8,
  },
  loadingText: {
    color: '#B8D4E3',
    fontSize: 16,
    fontWeight: '500',
  },
});