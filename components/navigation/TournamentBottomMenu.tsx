import { usePathname, useRouter } from 'expo-router';
import { Calendar, Users } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { shadowPresets } from '../../theme/shadows';
import { colors } from '../../theme/tokens';

interface TournamentBottomMenuProps {
  activeTab?: 'schedule' | 'officials';
  onTabChange?: (tab: 'schedule' | 'officials') => void;
}

interface MenuItemConfig {
  key: string;
  IconComponent: React.ComponentType<any>;
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
      IconComponent: Calendar,
      route: '/tournament-detail'
    },
    {
      key: 'officials',
      IconComponent: Users,
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
        const { IconComponent } = item;
        return (
          <TouchableOpacity
            key={item.key}
            style={[styles.menuItem, active && styles.activeMenuItem]}
            onPress={() => handlePress(item)}
            activeOpacity={0.7}
          >
            <IconComponent
              size={20}
              color={active ? '#FFFFFF' : 'rgba(255, 255, 255, 0.5)'}
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
    backgroundColor: colors.primary,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingBottom: 12,
    paddingTop: 8,
    paddingHorizontal: 16,
    ...shadowPresets.large,
    elevation: 8,
  },
  menuItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  activeMenuItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
});

export default TournamentBottomMenu;