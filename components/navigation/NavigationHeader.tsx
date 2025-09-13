import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Icon } from '../Icons/MaterialCommunityIcons';
import { GlobalStatusBar } from './GlobalStatusBar';
import WhistleLogo from '../WhistleLogo';
import { BurgerButton } from './BurgerButton';
import { SideMenu } from './SideMenu';
import { DefaultTournamentService } from '../../services/DefaultTournamentService';

interface NavigationHeaderProps {
  title: string;
  subtitle?: string;
  showBackButton?: boolean;
  showHomeButton?: boolean;
  onBackPress?: () => void;
  onHomePress?: () => void;
  rightComponent?: React.ReactNode;
  backgroundColor?: string;
  titleColor?: string;
  showStatusBar?: boolean;
  onStatusPress?: () => void;
  showLogo?: boolean;
  onRefresh?: () => void;
  showRefreshButton?: boolean;
  showBurgerMenu?: boolean;
}

export const NavigationHeader: React.FC<NavigationHeaderProps> = ({
  title,
  subtitle,
  showBackButton = false,
  showHomeButton = false,
  onBackPress,
  onHomePress,
  rightComponent,
  backgroundColor = '#1B365D',
  titleColor = '#FFFFFF',
  showStatusBar = true,
  onStatusPress,
  showLogo = false,
  onRefresh,
  showRefreshButton = true,
  showBurgerMenu = true,
}) => {
  const router = useRouter();
  const [sideMenuVisible, setSideMenuVisible] = useState(false);
  const [defaultTournament, setDefaultTournament] = useState<any>(null);
  const [isLoadingDefaultTournament, setIsLoadingDefaultTournament] = useState(true);

  // Check if there's a default tournament set
  useEffect(() => {
    const checkDefaultTournament = async () => {
      try {
        const tournament = await DefaultTournamentService.getDefaultTournament();
        setDefaultTournament(tournament);
      } catch (error) {
        console.warn('Error checking default tournament:', error);
        setDefaultTournament(null);
      } finally {
        setIsLoadingDefaultTournament(false);
      }
    };

    checkDefaultTournament();
  }, []);

  // Show contextual menu only when a default tournament is set
  const isTournamentContext = defaultTournament !== null;
  const tournamentName = defaultTournament?.name || defaultTournament?.title;

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      // Check if we can go back before calling router.back()
      if (router.canGoBack()) {
        router.back();
      } else {
        // No previous screen - could navigate to home or show a message
      }
    }
  };

  const handleLogoPress = () => {
    router.push('/tournament-selection');
  };

  const handleHomePress = () => {
    if (onHomePress) {
      onHomePress();
    } else {
      router.push('/');
    }
  };

  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    } else {
      // Default refresh action - force reload current route
      if (router.canGoBack()) {
        const currentRoute = router.segments;
        router.replace(router.pathname as any);
      }
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor }]}>
      {showStatusBar && (
        <GlobalStatusBar 
          onStatusPress={onStatusPress} 
          compact={false}
        />
      )}
      
      <View style={[styles.container, { backgroundColor }]}>
        <View style={styles.leftSection}>
          {showBurgerMenu && (
            <BurgerButton 
              onPress={() => setSideMenuVisible(true)}
              color={titleColor}
            />
          )}
          {showLogo && (
            <TouchableOpacity 
              onPress={handleLogoPress}
              activeOpacity={0.8}
              style={styles.logoButton}
            >
              <WhistleLogo size={32} style={styles.logoImage} />
            </TouchableOpacity>
          )}
          {showBackButton && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBackPress}
              activeOpacity={0.7}
            >
              <Icon name="arrow-left" size={20} color={titleColor} style={{ marginRight: 4 }} />
              <Text style={[styles.backButtonText, { color: titleColor }]}>
                Back
              </Text>
            </TouchableOpacity>
          )}
          {showHomeButton && (
            <TouchableOpacity
              style={styles.homeButton}
              onPress={handleHomePress}
              activeOpacity={0.7}
            >
              <Icon name="home-outline" size={20} color={titleColor} style={{ marginRight: 4 }} />
              <Text style={[styles.homeButtonText, { color: titleColor }]}>
                Home
              </Text>
            </TouchableOpacity>
          )}
        </View>
        
        {title && (
          <View style={styles.centerSection}>
            <Text style={[styles.title, { color: titleColor }]} numberOfLines={1}>
              {title}
            </Text>
            {subtitle && (
              <Text style={[styles.subtitle, { color: titleColor }]} numberOfLines={1}>
                {subtitle}
              </Text>
            )}
          </View>
        )}
        
        <View style={styles.rightSection}>
          {showRefreshButton && (
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={handleRefresh}
              activeOpacity={0.7}
            >
              <Icon name="refresh" size={20} color={titleColor} />
            </TouchableOpacity>
          )}
          {rightComponent}
        </View>
      </View>
      
      <SideMenu 
        isVisible={sideMenuVisible} 
        onClose={() => setSideMenuVisible(false)}
        currentContext={isTournamentContext ? 'tournament' : 'default'}
        tournamentName={tournamentName}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#1B365D',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 56,
  },
  leftSection: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  centerSection: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightSection: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
    minHeight: 44,
    justifyContent: 'center',
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  homeButton: {
    padding: 8,
    minHeight: 44,
    justifyContent: 'center',
    flexDirection: 'row',
    alignItems: 'center',
  },
  homeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  logoButton: {
    padding: 4,
    borderRadius: 6,
    marginRight: 12,
  },
  logoImage: {
    borderRadius: 6,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '400',
    color: '#FFFFFF',
    textAlign: 'center',
    opacity: 0.8,
    marginTop: 2,
  },
  refreshButton: {
    padding: 8,
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginLeft: 8,
  },
  refreshButtonText: {
    fontSize: 18,
    color: '#FFFFFF',
  },
});

export default NavigationHeader;
