import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Modal,
  Pressable,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Icon } from '../Icons/MaterialCommunityIcons';
import { colors } from '../../theme/tokens';

interface SideMenuProps {
  isVisible: boolean;
  onClose: () => void;
  currentContext?: 'default' | 'tournament';
  tournamentName?: string;
}

interface MenuItemProps {
  icon: string;
  title: string;
  onPress: () => void;
  disabled?: boolean;
}

const MenuItem: React.FC<MenuItemProps> = ({ icon, title, onPress, disabled = false }) => (
  <TouchableOpacity 
    style={[styles.menuItem, disabled && styles.menuItemDisabled]} 
    onPress={disabled ? undefined : onPress} 
    activeOpacity={disabled ? 1 : 0.7}
    disabled={disabled}
  >
    <Text style={[styles.menuText, disabled && styles.menuTextDisabled]}>{title}</Text>
  </TouchableOpacity>
);

export const SideMenu: React.FC<SideMenuProps> = ({ isVisible, onClose, currentContext = 'default', tournamentName }) => {
  const router = useRouter();
  const slideAnim = React.useRef(new Animated.Value(-280)).current;

  useEffect(() => {
    if (isVisible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -280,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  }, [isVisible, slideAnim]);

  const handleMenuItemPress = (route: string) => {
    onClose();
    router.push(route as any);
  };

  // Default menu items (shown when not in tournament context)
  const defaultMenuItems = [
    {
      icon: 'home',
      title: 'Home',
      route: '/',
      disabled: false,
    },
    {
      icon: 'tournament',
      title: 'All Tournaments',
      route: '/tournament-selection',
      disabled: false,
    },
    {
      icon: 'account-group',
      title: 'All Players',
      route: '/tournament-detail',
      disabled: true, // No dedicated players page exists yet
    },
    {
      icon: 'whistle',
      title: 'All Referees',
      route: '/all-referees',
      disabled: true, // DISABLED
    },
    {
      icon: 'cog',
      title: 'Settings',
      route: '/referee-settings',
      disabled: true,
    },
  ];

  // Tournament-specific menu items
  const tournamentMenuItems = [
    {
      icon: 'information-outline',
      title: 'Tournament Details',
      route: '/tournament-detail',
      disabled: false,
    },
    {
      icon: 'account-group',
      title: 'Tournament Players',
      route: '/tournament-detail', // Players are shown in tournament detail
      disabled: false,
    },
    {
      icon: 'whistle',
      title: 'Tournament Referees',
      route: '/tournament-ref',
      disabled: false,
    },
  ];

  // Always show general menu, add tournament items if in tournament context
  const menuItems = currentContext === 'tournament' 
    ? [...defaultMenuItems, ...tournamentMenuItems] 
    : defaultMenuItems;

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View style={[styles.menuContainer, { transform: [{ translateX: slideAnim }] }]}>
          <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
              {currentContext === 'tournament' && tournamentName ? (
                <>
                  <Text style={styles.headerSubtitle}>Current Tournament:</Text>
                  <Text style={styles.headerTitle} numberOfLines={2}>
                    {tournamentName}
                  </Text>
                </>
              ) : (
                <Text style={styles.headerTitle}>BeachRef</Text>
              )}
            </View>
            
            <View style={styles.menuList}>
              {menuItems.map((item, index) => (
                <React.Fragment key={index}>
                  <MenuItem
                    icon={item.icon}
                    title={item.title}
                    onPress={() => handleMenuItemPress(item.route)}
                    disabled={item.disabled}
                  />
                  {/* Add separator between general and tournament items */}
                  {currentContext === 'tournament' && index === defaultMenuItems.length - 1 && (
                    <View style={styles.separator} />
                  )}
                </React.Fragment>
              ))}
            </View>
          </SafeAreaView>
        </Animated.View>
        
        {/* Close button positioned in top-right corner for left-side menu */}
        <SafeAreaView style={styles.closeButtonContainer}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Icon name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </SafeAreaView>
        
        <Pressable style={styles.backdrop} onPress={onClose} />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdrop: {
    position: 'absolute',
    left: 280,
    top: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  menuContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 280,
    backgroundColor: colors.background,
    shadowColor: '#000',
    shadowOffset: {
      width: 2,
      height: 0,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.primary,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.background,
    textAlign: 'center',
    flex: 1,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.background,
    textAlign: 'center',
    opacity: 0.8,
    marginBottom: 4,
  },
  closeButtonContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 1000,
  },
  closeButton: {
    padding: 8,
    marginTop: 12,
    marginLeft: 16,
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  menuList: {
    flex: 1,
    paddingTop: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.secondary,
  },
  menuIcon: {
    marginRight: 16,
  },
  menuText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  menuItemDisabled: {
    opacity: 0.5,
  },
  menuTextDisabled: {
    color: colors.textSecondary,
  },
  separator: {
    height: 1,
    backgroundColor: colors.secondary,
    marginHorizontal: 20,
    marginVertical: 8,
    opacity: 0.3,
  },
});

export default SideMenu;