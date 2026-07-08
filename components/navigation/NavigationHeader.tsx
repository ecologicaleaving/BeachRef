import { useRouter } from 'expo-router';
// Deep subpath imports avoid pulling in the full lucide-react-native icon
// barrel (~3200 named exports) into the web bundle — see issue #32.
import Filter from 'lucide-react-native/dist/esm/icons/funnel';
import Home from 'lucide-react-native/dist/esm/icons/house';
import RefreshCw from 'lucide-react-native/dist/esm/icons/refresh-cw';
import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { DefaultTournamentService } from '../../services/DefaultTournamentService';
import { colors } from '../../theme/tokens';
import { WhistleLogo } from '../WhistleLogo';
import { BurgerButton } from './BurgerButton';
import { GlobalStatusBar } from './GlobalStatusBar';
import { GmailStyleSideMenu } from './GmailStyleSideMenu';

interface NavigationHeaderProps {
  title: string;
  subtitle?: string;
  showHomeButton?: boolean;
  onHomePress?: () => void;
  showRefreshButton?: boolean;
  onRefreshPress?: () => void;
  showFilterButton?: boolean;
  onFilterPress?: () => void;
  rightComponent?: React.ReactNode;
  backgroundColor?: string;
  titleColor?: string;
  showStatusBar?: boolean;
  onStatusPress?: () => void;
  showLogo?: boolean;
  showBurgerMenu?: boolean;
}

export const NavigationHeader: React.FC<NavigationHeaderProps> = ({
  title,
  subtitle,
  showHomeButton = true,
  onHomePress,
  showRefreshButton = false,
  onRefreshPress,
  showFilterButton = false,
  onFilterPress,
  rightComponent,
  backgroundColor = colors.primary,
  titleColor = '#FFFFFF',
  showStatusBar = true,
  onStatusPress,
  showLogo = false,
  showBurgerMenu = true,
}) => {
  const router = useRouter();
  const [sideMenuVisible, setSideMenuVisible] = useState(false);
  const [defaultTournament, setDefaultTournament] = useState<any>(null);

  // Check if there's a default tournament set
  useEffect(() => {
    const checkDefaultTournament = async () => {
      try {
        const tournament = await DefaultTournamentService.getDefaultTournament();
        setDefaultTournament(tournament);
      } catch (error) {
        console.warn('Error checking default tournament:', error);
        setDefaultTournament(null);
      }
    };

    checkDefaultTournament();
  }, []);

  // Show contextual menu only when a default tournament is set

  const handleLogoPress = () => {
    router.push('/tournament-selection');
  };

  const handleHomePress = () => {
    if (onHomePress) {
      onHomePress();
    } else {
      router.push('/tournament-selection');
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
          {showHomeButton && (
            <TouchableOpacity
              style={styles.homeButton}
              onPress={handleHomePress}
              activeOpacity={0.7}
            >
              <Home size={20} color={titleColor} />
            </TouchableOpacity>
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
          {showFilterButton && onFilterPress && (
            <TouchableOpacity
              style={styles.iconButton}
              onPress={onFilterPress}
              activeOpacity={0.7}
            >
              <Filter size={20} color={titleColor} />
            </TouchableOpacity>
          )}
          {showRefreshButton && onRefreshPress && (
            <TouchableOpacity
              style={styles.iconButton}
              onPress={onRefreshPress}
              activeOpacity={0.7}
            >
              <RefreshCw size={20} color={titleColor} />
            </TouchableOpacity>
          )}
          {rightComponent}
          {showBurgerMenu && (
            <BurgerButton
              onPress={() => setSideMenuVisible(true)}
              color={titleColor}
            />
          )}
        </View>
      </View>

      <GmailStyleSideMenu
        isVisible={sideMenuVisible}
        onClose={() => setSideMenuVisible(false)}
        currentTournament={defaultTournament}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.primary,
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
  homeButton: {
    padding: 8,
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  homeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  iconButton: {
    padding: 8,
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
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
});

export default NavigationHeader;
