import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors } from '../../theme/tokens';

interface TournamentBottomMenuProps {
  activeTab?: 'schedule' | 'players' | 'officials';
  onTabChange?: (tab: 'schedule' | 'players' | 'officials') => void;
}

interface MenuItemConfig {
  key: string;
  iconName: keyof typeof Feather.glyphMap;
  route?: string;
}

export const TournamentBottomMenu: React.FC<TournamentBottomMenuProps> = ({
  activeTab,
  onTabChange
}) => {
  const router = useRouter();
  const pathname = usePathname();

  const menuItems: MenuItemConfig[] = [
    {
      key: 'schedule',
      iconName: 'calendar',
      route: '/tournament-detail'
    },
    {
      key: 'players',
      iconName: 'users',
      route: '/tournament-players'
    },
    {
      key: 'officials',
      iconName: 'shield',
      route: '/tournament-ref'
    }
  ];

  const isActive = (item: MenuItemConfig) => {
    if (activeTab) {
      return activeTab === item.key;
    }

    // Fallback to pathname checking if activeTab not provided
    if (item.key === 'schedule' && pathname === '/tournament-detail') {
      return true;
    }
    if (item.key === 'players' && pathname === '/tournament-players') {
      return true;
    }
    if (item.key === 'officials' && pathname === '/tournament-ref') {
      return true;
    }
    return false;
  };

  const handlePress = (item: MenuItemConfig) => {
    if (onTabChange) {
      // If we have a tab change handler, use it instead of navigation
      onTabChange(item.key as any);
    } else if (item.route) {
      // Otherwise, navigate normally
      router.push(item.route as any);
    }
  };

  return (
    <View style={styles.container}>
      {menuItems.map((item) => {
        const active = isActive(item);
        return (
          <TouchableOpacity
            key={item.key}
            style={[styles.menuItem, active && styles.activeMenuItem]}
            onPress={() => handlePress(item)}
            activeOpacity={0.7}
          >
            <Feather
              name={item.iconName}
              size={20}
              color={active ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)'}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#1B365D',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingBottom: 12,
    paddingTop: 8,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 8,
  },
  menuItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  activeMenuItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
});

export default TournamentBottomMenu;