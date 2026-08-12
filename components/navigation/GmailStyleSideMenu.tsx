import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Modal,
  Pressable,
  Animated,
  Switch,
  ScrollView,
  Easing,
  PanResponder,
  } from 'react-native';
// The swipe-to-close gesture uses React Native's built-in PanResponder instead
// of `react-native-gesture-handler` (issue #38). This single import used to be
// the only reason gesture-handler was in the graph, and gesture-handler in turn
// pulls in react-native-reanimated through `handlers/gestures/reanimatedWrapper`
// — together 300 modules and ~900 KB of the entry chunk, for one drawer swipe.
// PanResponder ships with react-native-web, which is already bundled.
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { TournamentCore } from '../../types/tournament-v2';
import { useFavoriteTournaments } from '../../hooks/useFavoriteTournaments';
import { Icon } from '../Icons/MaterialCommunityIcons';
import { colors } from '../../theme/tokens';
import { DefaultTournamentService } from '../../services/DefaultTournamentService';
// Lo stato di accesso si legge dalla copia LOCALE (issue #103). Importare
// `AccessService` per chiedere `statoAccesso()` qui dentro trascinerebbe
// `@supabase/supabase-js` nel chunk d'ingresso — il menu sta su ogni pagina —
// e vanificherebbe l'`import()` dinamico che quel servizio usa apposta.
// `esci` invece si importa: e' solo un riferimento a funzione, e il client
// arriva soltanto se qualcuno preme davvero il bottone.
import { useAccessoRicordato } from '../../hooks/useAccessoRicordato';
import { esci } from '../../services/auth/AccessService';

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
  onSubMenuPress: (route: string, tournament: TournamentCore) => void;
  // onToggleFavorite removed - unused (TS6133)
}

interface GmailStyleSideMenuProps {
  isVisible: boolean;
  onClose: () => void;
  // currentTournament removed - unused (TS6133)
}

const SUBMENU_ITEMS: SubMenuItem[] = [
  { key: 'schedule', label: 'Schedule/Results', route: '/tournament-detail', icon: 'calendar-clock' },
  { key: 'ranking', label: 'Ranking', route: '/tournament-detail?tab=ranking', icon: 'trophy' },
  { key: 'entryList', label: 'Entry List', route: '/tournament-detail?tab=teams', icon: 'format-list-bulleted' },
  { key: 'officials', label: 'Officials', route: '/tournament-ref', icon: 'whistle' },
];

const MAIN_MENU_ITEMS = [
  { icon: 'tournament', title: 'All Tournaments', route: '/tournament-selection', enabled: true },
  { icon: 'whistle', title: 'All Referees', route: '/all-referees', enabled: false },
  { icon: 'cog', title: 'Settings', route: '/settings', enabled: false },
];

const TournamentMenuItem: React.FC<TournamentMenuItemProps> = ({
  tournament,
  isExpanded,
  onToggleExpand,
  onSubMenuPress,
}) => {
  const expandAnimation = React.useRef(new Animated.Value(0)).current;
  const pressAnimation = React.useRef(new Animated.Value(1)).current;
  const [isPressed, setIsPressed] = useState(false);
  const [, setIsDefault] = useState(false); // Only setter used (TS6133)

  // Check if this tournament is default
  useEffect(() => {
    const checkDefaultStatus = async () => {
      try {
        const defaultStatus = await DefaultTournamentService.isDefaultTournament(tournament.visNo);
        setIsDefault(defaultStatus);
      } catch (error) {
        setIsDefault(false);
      }
    };
    checkDefaultStatus();
  }, [tournament.visNo]);

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

  // chevronRotation removed - unused (TS6133)

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
          {SUBMENU_ITEMS.map((item) => ( // index removed - unused (TS6133)
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
              onPress={() => onSubMenuPress(item.route, tournament)}
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

// screenWidth removed - unused (TS6133)
const MENU_WIDTH = 320;

export const GmailStyleSideMenu: React.FC<GmailStyleSideMenuProps> = ({
  isVisible,
  onClose,
}) => {
  const router = useRouter();
  const slideAnim = React.useRef(new Animated.Value(-MENU_WIDTH)).current;
  const backdropOpacity = React.useRef(new Animated.Value(0)).current;
  const { favoriteTournaments, toggleFavorite, isLoading } = useFavoriteTournaments();

  const [defaultTournament, setDefaultTournament] = useState<TournamentCore | null>(null);
  const [, setIsLoadingDefault] = useState(true); // Only setter used (TS6133)
  // defaultTournamentExpanded, setDefaultTournamentExpanded removed - unused (TS6133)

  const [expandedTournaments, setExpandedTournaments] = useState<Set<string>>(new Set());
  const [favoritesExpanded, setFavoritesExpanded] = useState(true);
  // defaultExpanded, setDefaultExpanded removed - unused (TS6133)
  // defaultSubmenuExpanded, setDefaultSubmenuExpanded removed - unused (TS6133)

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

  // --- Accesso (issue #103) -------------------------------------------------
  //
  // `/accedi` e `/referee-stats-lab` esistono dalla #97 ma non erano collegate
  // da nessuna parte: si raggiungevano solo digitando l'indirizzo.
  //
  // `/iscrizione` NON compare qui, ed e' voluto: ci si iscrive solo con un
  // indirizzo mandato a mano, perche' autenticarsi con Google e' alla portata di
  // chiunque mentre l'autorizzazione e' un invito.
  const accesso = useAccessoRicordato();

  useEffect(() => {
    if (isVisible) accesso.rileggi();
  }, [isVisible, accesso.rileggi]);

  const handleEsci = async () => {
    onClose();
    await esci();
    accesso.rileggi();
    router.replace('/' as any);
  };

  const vociAccesso: { titolo: string; onPress: () => void }[] = accesso.autenticato
    ? [
        // "Stats" solo a chi e' autorizzato. Chi si e' autenticato senza invito
        // non la vede: la distinzione fra "chi sei" e "se puoi" e' la stessa
        // che la #97 ha messo nel database, e il menu la rispecchia invece di
        // mostrare una porta che si apre su un rifiuto.
        ...(accesso.autorizzato
          ? [{ titolo: 'Stats', onPress: () => handleMenuItemPress('/referee-stats-lab') }]
          : [{ titolo: 'Accesso', onPress: () => handleMenuItemPress('/accedi') }]),
        { titolo: 'Esci', onPress: handleEsci },
      ]
    : [{ titolo: 'Accedi con Google', onPress: () => handleMenuItemPress('/accedi') }];

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

  const handleSubMenuPress = (route: string, tournament: TournamentCore) => {
    onClose();

    // Encode tournament data as JSON and append to route
    const tournamentData = encodeURIComponent(JSON.stringify(tournament));

    // Check if route already has parameters
    const separator = route.includes('?') ? '&' : '?';
    const fullRoute = `${route}${separator}tournamentData=${tournamentData}`;

    router.push(fullRoute as any);
  };

  const handleToggleFavorite = async (tournament: TournamentCore) => {
    await toggleFavorite(tournament);
  };

  const handleToggleDefaultTournament = async (value: boolean) => {
    try {
      if (!value && defaultTournament) {
        // Turning off - clear the default tournament
        await DefaultTournamentService.clearDefaultTournament();
        // Don't manually set state - let the listener handle it for consistency
      }
      // Note: Setting a default from sidebar is not allowed - must be done from tournament card
      // The switch should only appear when there's already a default tournament to turn off
    } catch (error) {
      console.error('Error toggling default tournament:', error);
    }
  };

  // Swipe-to-close, reimplemented on PanResponder. Behaviour is unchanged:
  // the pan only takes over past a 15 px horizontal movement and bails out if
  // the movement is mostly vertical (the former `activeOffsetX` /`failOffsetY`),
  // it drives `slideAnim` while dragging, and on release it either closes past
  // 30 % of the menu width / a fast left flick, or springs back open.
  const panResponder = React.useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_evt, gestureState) =>
          Math.abs(gestureState.dx) > 15 && Math.abs(gestureState.dy) < 10,
        onPanResponderMove: (_evt, gestureState) => {
          // Only the closing direction is draggable; dragging right would pull
          // the menu past its open position.
          slideAnim.setValue(Math.min(0, gestureState.dx));
        },
        onPanResponderRelease: (_evt, gestureState) => {
          const velocityX = gestureState.vx * 1000; // px/ms -> px/s
          const shouldClose =
            gestureState.dx < -MENU_WIDTH * 0.3 || velocityX < -500;

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
        },
        onPanResponderTerminationRequest: () => false,
      }),
    [slideAnim, onClose]
  );

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

        <Animated.View
            {...panResponder.panHandlers}
            style={[styles.menuContainer, { transform: [{ translateX: slideAnim }] }]}
          >
          <SafeAreaView style={styles.safeArea}>
            <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.headerTitle}>BeachRef</Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={onClose}
                  activeOpacity={0.7}
                >
                  <Icon name="close" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              {/* Timezone Toggle - Hidden by default, set to local time */}
              {/*
              <TimezoneToggle
                tournamentTimezone={currentTournament?.DefaultTimeZone}
                onTimezonePreferenceChange={(useLocalTime) => {
                  // Timezone preference change handled by the toggle component
                }}
              />
              */}

              {/* Favorites Section - Only show if there are favorites */}
              {favoriteTournaments.length > 0 && (
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
              )}

              {/* Default Tournament - Show without section title */}
              {defaultTournament && (
                <>
                  <View style={styles.separator} />
                  <View style={styles.section}>
                    <View style={styles.defaultTournamentMenuItem}>
                      <Icon name="star" size={16} color="#FFD700" style={styles.starIcon} />
                      <Text style={styles.defaultTournamentMenuText} numberOfLines={1}>
                        {defaultTournament.name}
                      </Text>
                      <Switch
                        value={!!defaultTournament}
                        onValueChange={handleToggleDefaultTournament}
                        trackColor={{ false: '#767577', true: '#FFD700' }}
                        thumbColor={!!defaultTournament ? '#FFFFFF' : '#f4f3f4'}
                        style={styles.defaultSwitchInline}
                      />
                    </View>

                    <View style={styles.defaultSubMenuContainer}>
                        <TouchableOpacity
                          style={styles.defaultSubMenuItem}
                          onPress={async () => {
                            try {
                              // Default tournament is now a complete TournamentCore object
                              const tournamentToPass = defaultTournament;
                              handleMenuItemPress(`/tournament-detail?tournamentData=${encodeURIComponent(JSON.stringify(tournamentToPass))}&tab=schedule`);
                            } catch (error) {
                              console.error('Error preparing tournament data:', error);
                              // Fallback to default tournament data (still TournamentCore)
                              handleMenuItemPress(`/tournament-detail?tournamentData=${encodeURIComponent(JSON.stringify(defaultTournament))}&tab=schedule`);
                            }
                          }}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.defaultSubMenuText}>Schedule & Results</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.defaultSubMenuItem}
                          onPress={async () => {
                            try {
                              // Default tournament is now a complete TournamentCore object
                              const tournamentToPass = defaultTournament;
                              handleMenuItemPress(`/tournament-detail?tournamentData=${encodeURIComponent(JSON.stringify(tournamentToPass))}&tab=officials`);
                            } catch (error) {
                              console.error('Error preparing tournament data:', error);
                              // Fallback to default tournament data (still TournamentCore)
                              handleMenuItemPress(`/tournament-detail?tournamentData=${encodeURIComponent(JSON.stringify(defaultTournament))}&tab=officials`);
                            }
                          }}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.defaultSubMenuText}>Officials</Text>
                        </TouchableOpacity>
                      </View>
                  </View>
                </>
              )}

              {/* Main Menu Section */}
              <View style={styles.separator} />

              <View style={styles.section}>
                <View style={styles.mainMenuContainer}>
                  {MAIN_MENU_ITEMS.map((item, index) => {
                    return (
                      <TouchableOpacity
                        key={index}
                        style={[styles.mainMenuItem, !item.enabled && styles.mainMenuItemDisabled]}
                        onPress={item.enabled ? () => handleMenuItemPress(item.route) : undefined}
                        activeOpacity={item.enabled ? 0.7 : 1}
                        disabled={!item.enabled}
                        accessibilityLabel={item.title}
                        accessibilityRole="button"
                      >
                        <Text style={[styles.mainMenuText, !item.enabled && styles.mainMenuTextDisabled]}>
                          {item.title}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}

                  {vociAccesso.map(voce => (
                    <TouchableOpacity
                      key={voce.titolo}
                      style={styles.mainMenuItem}
                      onPress={voce.onPress}
                      activeOpacity={0.7}
                      accessibilityLabel={voce.titolo}
                      accessibilityRole="button"
                    >
                      <Text style={styles.mainMenuText}>{voce.titolo}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>
          </SafeAreaView>
          </Animated.View>

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
    paddingTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
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
    borderRadius: 8,
    marginHorizontal: 8,
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
    marginLeft: 24, // Move submenu items to the right for differentiation
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

  // Default Tournament Menu Item
  defaultTournamentMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    minHeight: 52,
    borderRadius: 8,
    marginHorizontal: 8,
    marginVertical: 2,
  },
  defaultTournamentMenuText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginLeft: 8,
    flex: 1,
  },
  starIcon: {
    marginRight: 4,
  },
  subMenuIcon: {
    marginRight: 12,
  },
  defaultSwitchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 8,
    marginHorizontal: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 215, 0, 0.2)',
  },
  defaultSwitchLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  defaultSwitchInline: {
    transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }],
    marginHorizontal: 8,
  },

  // Main Menu Styles
  separator: {
    height: 1,
    backgroundColor: colors.secondary,
    marginVertical: 4,
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
  mainMenuItemDisabled: {
    opacity: 0.5,
  },
  mainMenuTextDisabled: {
    color: colors.textSecondary,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
});

export default GmailStyleSideMenu;