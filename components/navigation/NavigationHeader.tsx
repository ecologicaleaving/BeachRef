import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { GlobalStatusBar } from './GlobalStatusBar';
import WhistleLogo from '../WhistleLogo';

interface NavigationHeaderProps {
  title: string;
  subtitle?: string;
  showBackButton?: boolean;
  onBackPress?: () => void;
  rightComponent?: React.ReactNode;
  backgroundColor?: string;
  titleColor?: string;
  showStatusBar?: boolean;
  onStatusPress?: () => void;
  showLogo?: boolean;
  onRefresh?: () => void;
  showRefreshButton?: boolean;
}

export const NavigationHeader: React.FC<NavigationHeaderProps> = ({
  title,
  subtitle,
  showBackButton = false,
  onBackPress,
  rightComponent,
  backgroundColor = '#1B365D',
  titleColor = '#FFFFFF',
  showStatusBar = true,
  onStatusPress,
  showLogo = true,
  onRefresh,
  showRefreshButton = true,
}) => {
  const router = useRouter();

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
      {/* Global Status Bar Integration */}
      {showStatusBar && (
        <GlobalStatusBar 
          onStatusPress={onStatusPress} 
          compact={false}
        />
      )}
      
      <View style={[styles.container, { backgroundColor }]}>
        <View style={styles.leftSection}>
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
              <Text style={[styles.backButtonText, { color: titleColor }]}>
                ← Back
              </Text>
            </TouchableOpacity>
          )}
        </View>
        
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
        
        <View style={styles.rightSection}>
          {showRefreshButton && (
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={handleRefresh}
              activeOpacity={0.7}
            >
              <Text style={[styles.refreshButtonText, { color: titleColor }]}>
                🔄
              </Text>
            </TouchableOpacity>
          )}
          {rightComponent}
        </View>
      </View>
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
  },
  backButtonText: {
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