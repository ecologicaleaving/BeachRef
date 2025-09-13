import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Modal,
  Pressable,
  Animated,
  ScrollView,
  Easing,
  Dimensions,
  Switch,
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { TournamentCore } from '../../types/tournament-v2';
import { useFavoriteTournaments } from '../../hooks/useFavoriteTournaments';
import { Icon } from '../Icons/MaterialCommunityIcons';
import { colors } from '../../theme/tokens';
import { DefaultTournamentService } from '../../services/DefaultTournamentService';

interface SubMenuItem {
  key: 'schedule' | 'ranking' | 'entryList' | 'officials';
  label: string;
  route: string;
  icon: string;
}

interface TournamentMenuItemProps {
  tournament: TournamentCore;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onSubMenuPress: (route: string) => void;
  onToggleFavorite: () => void;
}

interface GmailStyleSideMenuProps {
  isVisible: boolean;
  onClose: () => void;
  currentTournament?: TournamentCore;
}

const SUBMENU_ITEMS: SubMenuItem[] = [
  { key: 'schedule', label: 'Schedule/Results', route: '/tournament-detail', icon: 'calendar-clock' },
  { key: 'ranking', label: 'Ranking', route: '/tournament-detail?tab=ranking', icon: 'trophy' },
  { key: 'entryList', label: 'Entry List', route: '/tournament-detail?tab=teams', icon: 'format-list-bulleted' },
  { key: 'officials', label: 'Officials', route: '/tournament-ref', icon: 'whistle' },
];

const MAIN_MENU_ITEMS = [
  { icon: 'tournament', title: 'All Tournaments', route: '/tournament-selection' },
  { icon: 'account-group', title: 'All Players', route: '/players' },
  { icon: 'whistle', title: 'All Referees', route: '/all-referees' },
  { icon: 'cog', title: 'Settings', route: '/settings' },
];

const TournamentMenuItem: React.FC<TournamentMenuItemProps> = ({
  tournament,
  isExpanded,
  onToggleExpand,
  onSubMenuPress,
  onToggleFavorite
}) => {
  const expandAnimation = React.useRef(new Animated.Value(0)).current;
  const pressAnimation = React.useRef(new Animated.Value(1)).current;
  const [isPressed, setIsPressed] = useState(false);

  useEffect(() => {
    Animated.timing(expandAnimation, {
      toValue: isExpanded ? 1 : 0,
      duration: 250,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [isExpanded, expandAnimation]);

  const handlePressIn = () => {
    setIsPressed(true);
    Animated.timing(pressAnimation, {
      toValue: 0.95,
      duration: 100,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    setIsPressed(false);
    Animated.timing(pressAnimation, {
      toValue: 1,
      duration: 150,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  };

  const subMenuHeight = expandAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, SUBMENU_ITEMS.length * 44], // 44px per item
  });

  const chevronRotation = expandAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '90deg'],
  });

  return (
    <View style={styles.tournamentItem}>
      <TouchableOpacity
        style={[styles.favoriteTournamentHeader, {
          backgroundColor: isPressed ? 'rgba(25, 118, 210, 0.08)' : 'transparent'
        }]}
        onPress={onToggleExpand}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <Animated.View style={{ transform: [{ scale: pressAnimation }], flex: 1, flexDirection: 'row', alignItems: 'center' }}>

        <View style={styles.tournamentInfo}>
          <Text style={styles.tournamentName} numberOfLines={1}>
            {tournament.name}
          </Text>
          <Text style={styles.tournamentDetails} numberOfLines={1}>
            {tournament.city} • {tournament.tournamentType}
          </Text>
        </View>

        </Animated.View>
      </TouchableOpacity>

      <Animated.View style={[styles.subMenuContainer, { height: subMenuHeight }]}>
        <View style={styles.subMenuItems}>
          {SUBMENU_ITEMS.map((item, index) => (
            <TouchableOpacity
              key={item.key}
              style={[
                styles.subMenuItem,
                {
                  opacity: expandAnimation,
                  transform: [{
                    translateX: expandAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-20, 0],
                    })
                  }],
                  backgroundColor: 'transparent'
                }
              ]}
              onPress={() => onSubMenuPress(item.route)}
              activeOpacity={1}
            >
              <Text style={styles.subMenuText}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>
    </View>
  );
};

const { width: screenWidth } = Dimensions.get('window');
const MENU_WIDTH = 320;

export const GmailStyleSideMenu: React.FC<GmailStyleSideMenuProps> = ({
  isVisible,
  onClose,
  currentTournament
}) => {
  const router = useRouter();
  const slideAnim = React.useRef(new Animated.Value(-MENU_WIDTH)).current;
  const backdropOpacity = React.useRef(new Animated.Value(0)).current;
  const { favoriteTournaments, toggleFavorite, isLoading } = useFavoriteTournaments();
  const gestureRef = useRef(null);

  const [defaultTournament, setDefaultTournament] = useState<any>(null);
  const [isLoadingDefault, setIsLoadingDefault] = useState(true);

  const [expandedTournaments, setExpandedTournaments] = useState<Set<string>>(new Set());
  const [favoritesExpanded, setFavoritesExpanded] = useState(true);
  const [defaultExpanded, setDefaultExpanded] = useState(true);
  const [defaultSubmenuExpanded, setDefaultSubmenuExpanded] = useState(false);

  useEffect(() => {
    if (isVisible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 280,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        })
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -MENU_WIDTH,
          duration: 220,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 150,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [isVisible, slideAnim, backdropOpacity]);

  // Load default tournament and set up listener
  useEffect(() => {
    const loadDefaultTournament = async () => {
      try {
        setIsLoadingDefault(true);
        const defaultTourney = await DefaultTournamentService.getDefaultTournament();
        setDefaultTournament(defaultTourney);
      } catch (error) {
        console.error('Error loading default tournament:', error);
        setDefaultTournament(null);
      } finally {
        setIsLoadingDefault(false);
      }
    };

    if (isVisible) {
      loadDefaultTournament();
    }

    // Set up listener for default tournament changes
    const removeListener = DefaultTournamentService.addListener((tournament) => {
      setDefaultTournament(tournament);
    });

    return removeListener;
  }, [isVisible]);

  const handleMenuItemPress = (route: string) => {
    onClose();
    router.push(route as any);
  };

  const handleTournamentToggle = (tournamentId: string) => {
    setExpandedTournaments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tournamentId)) {
        newSet.delete(tournamentId);
      } else {
        newSet.add(tournamentId);
      }
      return newSet;
    });
  };

  const handleSubMenuPress = (route: string) => {
    onClose();
    router.push(route as any);
  };

  const handleToggleFavorite = async (tournament: TournamentCore) => {
    await toggleFavorite(tournament);
  };

  const handleToggleDefaultTournament = async (value: boolean) => {
    try {
      if (!value && defaultTournament) {
        // Turning off - clear the default tournament
        await DefaultTournamentService.clearDefaultTournament();
        setDefaultTournament(null);
      } else if (value && !defaultTournament) {
        // Turning on - but we can't set a default from the sidebar alone
        // This should only be handled by the TournamentCard component
        // So we'll just return without doing anything for now
        console.log('Cannot set default tournament from sidebar - use tournament detail screen');
      }
    } catch (error) {
      console.error('Error toggling default tournament:', error);
    }
  };

  const handleGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: slideAnim } }],
    { useNativeDriver: false }
  );

  const handleGestureStateChange = (event: any) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      const { translationX, velocityX } = event.nativeEvent;
      const shouldClose = translationX < -MENU_WIDTH * 0.3 || velocityX < -500;

      if (shouldClose) {
        onClose();
      } else {
        // Snap back to open position
        Animated.spring(slideAnim, {
          toValue: 0,
          velocity: velocityX,
          tension: 300,
          friction: 35,
          useNativeDriver: false,
        }).start();
      }
    }
  };

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[styles.backdrop, {
            opacity: backdropOpacity.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.5],
              extrapolate: 'clamp'
            })
          }]}
        >
          <BlurView intensity={20} style={StyleSheet.absoluteFillObject} />
        </Animated.View>

        <PanGestureHandler
          ref={gestureRef}
          onGestureEvent={handleGestureEvent}
          onHandlerStateChange={handleGestureStateChange}
          activeOffsetX={[-15, 15]}
          failOffsetY={[-10, 10]}
        >
          <Animated.View style={[styles.menuContainer, { transform: [{ translateX: slideAnim }] }]}>
          <SafeAreaView style={styles.safeArea}>
            <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.headerTitle}>BeachRef</Text>
              </View>

              {/* Default Tournament Section */}
              {(defaultTournament || isLoadingDefault) && (
                <View style={styles.section}>
                  <TouchableOpacity
                    style={styles.sectionHeader}
                    onPress={() => setDefaultExpanded(!defaultExpanded)}
                    activeOpacity={1}
                  >
                    <Text style={styles.sectionTitle}>Default Tournament</Text>
                    {defaultTournament && (
                      <View style={styles.defaultBadge}>
                        <Text style={styles.defaultBadgeText}>★</Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  {defaultExpanded && (
                    <View style={styles.defaultContainer}>
                      {isLoadingDefault ? (
                        <Text style={styles.loadingText}>Loading default...</Text>
                      ) : defaultTournament ? (
                        <View style={styles.defaultTournamentItem}>
                          <View style={styles.tournamentHeader}>
                            <TouchableOpacity
                              style={styles.defaultTournamentMainButton}
                              onPress={() => setDefaultSubmenuExpanded(!defaultSubmenuExpanded)}
                              activeOpacity={1}
                            >
                              <View style={styles.defaultTournamentInfo}>
                                <Text style={styles.defaultTournamentName} numberOfLines={2}>
                                  {defaultTournament.name}
                                </Text>
                                <Text style={styles.defaultTournamentMeta} numberOfLines={1}>
                                  Default tournament
                                </Text>
                              </View>
                            </TouchableOpacity>

                            <View style={styles.defaultToggleContainer}>
                              <Switch
                                value={!!defaultTournament}
                                onValueChange={handleToggleDefaultTournament}
                                trackColor={{ false: '#767577', true: colors.primary }}
                                thumbColor={colors.background}
                                style={styles.defaultSwitch}
                              />
                            </View>
                          </View>

                          {/* Default Tournament Submenus */}
                          {defaultSubmenuExpanded && (
                            <View style={styles.defaultSubMenuContainer}>
                              {SUBMENU_ITEMS.map((item, index) => (
                                <TouchableOpacity
                                  key={item.key}
                                  style={styles.defaultSubMenuItem}
                                  onPress={() => handleSubMenuPress(item.route)}
                                  activeOpacity={1}
                                >
                                  <Text style={styles.defaultSubMenuText}>{item.label}</Text>
                                </TouchableOpacity>
                              ))}
                            </View>
                          )}
                        </View>
                      ) : (
                        <View style={styles.emptyDefault}>
                          <Text style={styles.emptyText}>No default tournament set</Text>
                          <Text style={styles.emptySubtext}>Set a LIVE tournament as default from the tournament list</Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              )}

              {/* Favorites Section */}
              <View style={styles.section}>
                <TouchableOpacity
                  style={styles.sectionHeader}
                  onPress={() => setFavoritesExpanded(!favoritesExpanded)}
                  activeOpacity={1}
                >
                  <Text style={styles.sectionTitle}>Favorites</Text>
                  <View style={styles.favoriteBadge}>
                    <Text style={styles.favoriteBadgeText}>{favoriteTournaments.length}</Text>
                  </View>
                </TouchableOpacity>

                {favoritesExpanded && (
                  <View style={styles.favoritesContainer}>
                    {isLoading ? (
                      <Text style={styles.loadingText}>Loading favorites...</Text>
                    ) : favoriteTournaments.length === 0 ? (
                      <View style={styles.emptyFavorites}>
                        <Text style={styles.emptyText}>No favorite tournaments yet</Text>
                        <Text style={styles.emptySubtext}>Tap the star on any tournament to add it here</Text>
                      </View>
                    ) : (
                      favoriteTournaments.map((tournament) => (
                        <TournamentMenuItem
                          key={tournament.id}
                          tournament={tournament}
                          isExpanded={expandedTournaments.has(tournament.id)}
                          onToggleExpand={() => handleTournamentToggle(tournament.id)}
                          onSubMenuPress={handleSubMenuPress}
                          onToggleFavorite={() => handleToggleFavorite(tournament)}
                        />
                      ))
                    )}
                  </View>
                )}
              </View>

              {/* Main Menu Section */}
              <View style={styles.separator} />

              <View style={styles.section}>
                <View style={styles.mainMenuContainer}>
                  {MAIN_MENU_ITEMS.map((item, index) => {
                    return (
                      <TouchableOpacity
                        key={index}
                        style={styles.mainMenuItem}
                        onPress={() => handleMenuItemPress(item.route)}
                        activeOpacity={0.7}
                        accessibilityLabel={item.title}
                        accessibilityRole="button"
                      >
                        <Text style={styles.mainMenuText}>{item.title}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </ScrollView>
          </SafeAreaView>
          </Animated.View>
        </PanGestureHandler>

        <Pressable
          style={[styles.pressableBackdrop, { left: MENU_WIDTH }]}
          onPress={onClose}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  backdrop: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  pressableBackdrop: {
    position: 'absolute',
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
    width: MENU_WIDTH,
    backgroundColor: colors.background,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  safeArea: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.primary,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.background,
  },

  // Section Styles
  section: {
    paddingTop: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginLeft: 8,
    flex: 1,
  },
  favoriteBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    minWidth: 24,
    alignItems: 'center',
  },
  favoriteBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.background,
  },

  // Default Tournament Section
  defaultBadge: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    minWidth: 24,
    alignItems: 'center',
  },
  defaultBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000',
  },
  defaultContainer: {
    paddingBottom: 8,
  },
  defaultTournamentItem: {
    marginBottom: 4,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 8,
    marginHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  tournamentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  defaultTournamentMainButton: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  defaultTournamentInfo: {
    flex: 1,
  },
  defaultTournamentName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  defaultTournamentMeta: {
    fontSize: 12,
    color: '#B8860B',
    fontWeight: '500',
  },
  defaultToggleContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  defaultSwitch: {
    transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }],
  },
  defaultSubMenuContainer: {
    paddingLeft: 16,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 215, 0, 0.2)',
    paddingTop: 8,
  },
  defaultSubMenuItem: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    marginHorizontal: 4,
    marginVertical: 1,
    backgroundColor: 'rgba(255, 215, 0, 0.05)',
  },
  defaultSubMenuText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  emptyDefault: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },

  // Favorites Section
  favoritesContainer: {
    paddingBottom: 8,
  },
  emptyFavorites: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
    opacity: 0.7,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 20,
  },

  // Tournament Item Styles
  tournamentItem: {
    marginBottom: 4,
  },
  favoriteTournamentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    minHeight: 52,
    borderRadius: 8,
    marginHorizontal: 8,
  },
  tournamentInfo: {
    flex: 1,
  },
  tournamentName: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  tournamentDetails: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // Sub Menu Styles
  subMenuContainer: {
    overflow: 'hidden',
  },
  subMenuItems: {
    paddingLeft: 20,
  },
  subMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    height: 44,
    borderRadius: 6,
    marginHorizontal: 12,
    marginVertical: 1,
  },
  subMenuText: {
    fontSize: 14,
    color: colors.textSecondary,
  },

  // Main Menu Styles
  separator: {
    height: 1,
    backgroundColor: colors.secondary,
    marginVertical: 8,
    marginHorizontal: 20,
    opacity: 0.3,
  },
  mainMenuContainer: {
    paddingBottom: 16,
  },
  mainMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    minHeight: 52,
    borderRadius: 8,
    marginHorizontal: 8,
    marginVertical: 2,
  },
  mainMenuText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textPrimary,
  },
});

export default GmailStyleSideMenu;