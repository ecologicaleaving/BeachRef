import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useAssignmentStatus } from '../../hooks/useAssignmentStatus';
import { designTokens } from '../../theme/tokens';

export type TabRoute = 'details' | 'monitor';

interface Tab {
  key: TabRoute;
  label: string;
  icon: string;
  route: string;
}

interface BottomTabNavigationProps {
  currentTab?: TabRoute;
  onTabPress?: (tab: TabRoute) => void;
}

const tabs: Tab[] = [
  {
    key: 'details',
    label: 'Details',
    icon: '📋',
    route: '/tournament-detail',
  },
  {
    key: 'monitor',
    label: 'Ref Mode',
    icon: 'REF',
    route: '/ref-mode',
  },
];

export const BottomTabNavigation: React.FC<BottomTabNavigationProps> = ({
  currentTab,
  onTabPress,
}) => {
  const router = useRouter();
  const pathname = usePathname();

  // Assignment status context for tab badges
  const { 
    currentAssignmentStatus,
    statusCounts,
    isOnline,
    syncStatus,
  } = useAssignmentStatus();

  const determineActiveTab = (): TabRoute => {
    if (currentTab) return currentTab;
    
    // Auto-detect based on current pathname
    if (pathname.includes('tournament-detail')) return 'details';
    if (pathname.includes('referee-settings')) return 'monitor';
    return 'details'; // Default
  };

  const activeTab = determineActiveTab();

  // Get badge count for each tab based on assignment status
  const getBadgeCount = (tabKey: TabRoute): number => {
    switch (tabKey) {
      case 'details':
        // Show if tournament has updates or notifications
        return 0; // No badge for details for now
      case 'monitor':
        // Show sync issues or offline status
        return (!isOnline || syncStatus !== 'synced') ? 1 : 0;
      default:
        return 0;
    }
  };

  // Get badge color for each tab
  const getBadgeColor = (tabKey: TabRoute): string => {
    switch (tabKey) {
      case 'details':
        return designTokens.colors.secondary;
      case 'monitor':
        return !isOnline ? designTokens.colors.error : designTokens.colors.warning;
      default:
        return designTokens.colors.secondary;
    }
  };

  const handleTabPress = (tab: Tab) => {
    if (onTabPress) {
      onTabPress(tab.key);
    } else {
      // Don't navigate if clicking on the currently active tab
      if (tab.key === activeTab) {
        return; // Stay on the same page
      }
      router.push(tab.route);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.tabBar}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          const badgeCount = getBadgeCount(tab.key);
          const badgeColor = getBadgeColor(tab.key);
          
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabButton, isActive && styles.activeTabButton]}
              onPress={() => handleTabPress(tab)}
              activeOpacity={0.7}
            >
              <View style={styles.tabIconContainer}>
                <Text style={[styles.tabIcon, isActive && styles.activeTabIcon]}>
                  {tab.icon}
                </Text>
                {badgeCount > 0 && (
                  <View style={[styles.badge, { backgroundColor: badgeColor }]}>
                    <Text style={styles.badgeText}>
                      {badgeCount > 99 ? '99+' : badgeCount.toString()}
                    </Text>
                  </View>
                )}
                
                {tab.key === 'monitor' && !isOnline && (
                  <View style={[styles.offlineDot, { backgroundColor: designTokens.colors.error }]} />
                )}
              </View>
              <Text
                style={[styles.tabLabel, isActive && styles.activeTabLabel]}
                numberOfLines={1}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingBottom: 8,
    paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 10,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  activeTabButton: {
    backgroundColor: designTokens.brandColors.primaryLight, // Use design token for consistency
    borderRadius: 12,
    marginHorizontal: 8,
    shadowColor: designTokens.colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabIcon: {
    fontSize: 20,
    marginBottom: 4,
    color: designTokens.colors.textSecondary, // Use design token
  },
  activeTabIcon: {
    color: designTokens.colors.accent, // Use accent color for active icon
    fontSize: 22, // Slightly larger for active state
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: designTokens.colors.textSecondary,
    textAlign: 'center',
  },
  activeTabLabel: {
    color: designTokens.colors.accent, // Use accent color for active label
    fontWeight: '600',
  },
  
  // Status Integration Styles
  tabIconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  
  badge: {
    position: 'absolute',
    top: -6,
    right: -12,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  
  badgeText: {
    color: designTokens.colors.background,
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  
  pulseBadge: {
    position: 'absolute',
    top: -8,
    right: -14,
    width: 12,
    height: 12,
    borderRadius: 6,
    opacity: 0.8,
    // Note: For production, add animation using Animated API
  },
  
  offlineDot: {
    position: 'absolute',
    top: -4,
    right: -8,
    width: 8,
    height: 8,
    borderRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 1,
    elevation: 2,
  },
});

export default BottomTabNavigation;