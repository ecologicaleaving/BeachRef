/**
 * Tournament Info Panel Base Component
 * Story 2.3: Tournament Info Panel System
 * 
 * Base component with hierarchical information architecture and collapsible sections
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  LayoutAnimation,
  Platform,
  UIManager
} from 'react-native';
import {
  TournamentInfoPanelProps,
  PanelSectionConfig
} from '../../types/tournamentInfo';
import { designTokens } from '../../theme/tokens';
import { UtilityIcons, StatusIcons, DataIcons } from '../Icons/IconLibrary';
import {
  isPanelSectionCollapsed,
  togglePanelSection,
  getActiveWeatherAlerts
} from '../../utils/tournamentInfo';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const TournamentInfoPanel: React.FC<TournamentInfoPanelProps> = React.memo(({
  tournamentInfo,
  refereeSchedule,
  courts,
  weatherAlerts = [],
  emergencyProcedures,
  isCollapsible = true,
  defaultCollapsed = false,
  onSectionToggle,
  onEmergencyContact,
  onCourtSelect
}) => {
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(() => {
    const initialCollapsed = new Set<string>();
    if (defaultCollapsed) {
      // Add all section IDs to collapsed set if defaultCollapsed is true
      const sections = getPanelSections();
      sections.forEach(section => {
        if (section.defaultCollapsed) {
          initialCollapsed.add(section.id);
        }
      });
    }
    return initialCollapsed;
  });

  const [lastUpdated] = useState<Date>(new Date());
  const activeWeatherAlerts = getActiveWeatherAlerts(weatherAlerts);

  const styles = getStyles();

  // Panel sections configuration
  function getPanelSections(): PanelSectionConfig[] {
    return [
      {
        id: 'tournament-header',
        title: 'Tournament Information',
        isCollapsible: false,
        defaultCollapsed: false,
        priority: 1,
        icon: 'tournament'
      },
      {
        id: 'schedule-overview',
        title: 'My Schedule',
        isCollapsible: true,
        defaultCollapsed: false,
        priority: 2,
        icon: 'calendar',
        badge: refereeSchedule.length
      },
      {
        id: 'weather-alerts',
        title: 'Weather Alerts',
        isCollapsible: true,
        defaultCollapsed: activeWeatherAlerts.length === 0,
        priority: 3,
        icon: 'weather',
        badge: activeWeatherAlerts.length > 0 ? activeWeatherAlerts.length : undefined
      },
      {
        id: 'court-information',
        title: 'Court Information',
        isCollapsible: true,
        defaultCollapsed: true,
        priority: 4,
        icon: 'location',
        badge: courts.length
      },
      {
        id: 'emergency-information',
        title: 'Emergency Information',
        isCollapsible: true,
        defaultCollapsed: true,
        priority: 5,
        icon: 'phone'
      }
    ];
  }

  const handleSectionToggle = useCallback((sectionId: string) => {
    if (!isCollapsible) return;

    LayoutAnimation.configureNext({
      duration: 300,
      create: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
      update: {
        type: LayoutAnimation.Types.easeInEaseOut,
      },
    });

    const newCollapsedSections = togglePanelSection(sectionId, collapsedSections);
    setCollapsedSections(newCollapsedSections);

    const isCollapsed = isPanelSectionCollapsed(sectionId, newCollapsedSections);
    onSectionToggle?.(sectionId, isCollapsed);
  }, [isCollapsible, collapsedSections, onSectionToggle]);

  const renderSectionHeader = useCallback((section: PanelSectionConfig) => {
    const isCollapsed = isPanelSectionCollapsed(section.id, collapsedSections);
    const showToggle = section.isCollapsible && isCollapsible;

    return (
      <TouchableOpacity
        style={[
          styles.sectionHeader,
          !showToggle && styles.sectionHeaderNonCollapsible
        ]}
        onPress={showToggle ? () => handleSectionToggle(section.id) : undefined}
        disabled={!showToggle}
        testID={`section-header-${section.id}`}
        accessible={true}
        accessibilityLabel={`${section.title} section ${isCollapsed ? 'collapsed' : 'expanded'}`}
        accessibilityHint={showToggle ? 'Tap to toggle section' : undefined}
      >
        <View style={styles.sectionHeaderContent}>
          <View style={styles.sectionTitleContainer}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.badge && (
              <View style={styles.sectionBadge}>
                <Text style={styles.sectionBadgeText}>{section.badge}</Text>
              </View>
            )}
          </View>
          {showToggle && (
            <UtilityIcons.ChevronDown
              width={20}
              height={20}
              fill={designTokens.colors.textSecondary}
              style={[
                styles.chevronIcon,
                isCollapsed && styles.chevronIconCollapsed
              ]}
            />
          )}
        </View>
      </TouchableOpacity>
    );
  }, [collapsedSections, isCollapsible, handleSectionToggle, styles]);

  const renderTournamentHeader = useCallback(() => {
    return (
      <View style={styles.sectionContent}>
        <View style={styles.tournamentInfoContainer}>
          <View style={styles.tournamentBasicInfo}>
            <Text style={styles.tournamentName}>{tournamentInfo.name}</Text>
            <View style={styles.tournamentMetadata}>
              <DataIcons.Location
                width={16}
                height={16}
                fill={designTokens.colors.textSecondary}
              />
              <Text style={styles.tournamentLocation}>
                {tournamentInfo.location} • {tournamentInfo.venue}
              </Text>
            </View>
            <View style={styles.tournamentMetadata}>
              <DataIcons.Time
                width={16}
                height={16}
                fill={designTokens.colors.textSecondary}
              />
              <Text style={styles.tournamentDates}>
                {tournamentInfo.startDate.toLocaleDateString()} - {tournamentInfo.endDate.toLocaleDateString()}
              </Text>
            </View>
          </View>
          <View style={styles.tournamentStatus}>
            <StatusIcons.Current
              width={20}
              height={20}
              fill={designTokens.colors.statusColors.current}
            />
            <Text style={styles.tournamentStatusText}>
              {tournamentInfo.status.charAt(0).toUpperCase() + tournamentInfo.status.slice(1)}
            </Text>
          </View>
        </View>
      </View>
    );
  }, [tournamentInfo, styles]);

  const renderScheduleOverview = useCallback(() => {
    const upcomingMatches = refereeSchedule
      .filter(item => item.status === 'scheduled')
      .slice(0, 3);

    return (
      <View style={styles.sectionContent}>
        {upcomingMatches.length > 0 ? (
          upcomingMatches.map((match, index) => (
            <View key={match.matchId} style={styles.scheduleItem}>
              <View style={styles.scheduleTimeContainer}>
                <Text style={styles.scheduleTime}>
                  {match.scheduledTime.toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                  })}
                </Text>
                <Text style={styles.scheduleCourt}>Court {match.courtNumber}</Text>
              </View>
              <View style={styles.scheduleDetails}>
                <Text style={styles.scheduleTeams}>
                  {match.teamA} vs {match.teamB}
                </Text>
                <Text style={styles.scheduleRound}>
                  {match.round} • {match.refereePosition} Referee
                </Text>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No upcoming matches scheduled</Text>
          </View>
        )}
      </View>
    );
  }, [refereeSchedule, styles]);

  const renderWeatherAlerts = useCallback(() => {
    if (activeWeatherAlerts.length === 0) {
      return (
        <View style={styles.sectionContent}>
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No active weather alerts</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.sectionContent}>
        {activeWeatherAlerts.slice(0, 3).map((alert, index) => (
          <View
            key={alert.id}
            style={[
              styles.weatherAlert,
              alert.severity === 'critical' && styles.weatherAlertCritical,
              alert.severity === 'high' && styles.weatherAlertHigh
            ]}
          >
            <View style={styles.weatherAlertHeader}>
              <UtilityIcons.Warning
                width={16}
                height={16}
                fill={
                  alert.severity === 'critical'
                    ? designTokens.colors.error
                    : alert.severity === 'high'
                    ? designTokens.colors.warning
                    : designTokens.colors.textSecondary
                }
              />
              <Text style={styles.weatherAlertTitle}>{alert.title}</Text>
            </View>
            <Text style={styles.weatherAlertDescription}>{alert.description}</Text>
            <Text style={styles.weatherAlertTime}>
              Issued: {alert.issuedAt.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit'
              })}
            </Text>
          </View>
        ))}
      </View>
    );
  }, [activeWeatherAlerts, styles]);

  const renderCourtInformation = useCallback(() => {
    return (
      <View style={styles.sectionContent}>
        {courts.slice(0, 4).map((court, index) => (
          <TouchableOpacity
            key={court.courtId}
            style={styles.courtItem}
            onPress={() => onCourtSelect?.(court.courtId)}
            testID={`court-item-${court.courtId}`}
            accessible={true}
            accessibilityLabel={`Court ${court.courtNumber} information`}
          >
            <View style={styles.courtHeader}>
              <Text style={styles.courtNumber}>Court {court.courtNumber}</Text>
              <Text style={styles.courtType}>{court.type}</Text>
            </View>
            {court.conditions && (
              <Text style={styles.courtConditions}>{court.conditions}</Text>
            )}
            {court.specialRequirements && court.specialRequirements.length > 0 && (
              <Text style={styles.courtRequirements}>
                {court.specialRequirements.join(', ')}
              </Text>
            )}
          </TouchableOpacity>
        ))}
      </View>
    );
  }, [courts, onCourtSelect, styles]);

  const renderEmergencyInformation = useCallback(() => {
    return (
      <View style={styles.sectionContent}>
        <View style={styles.emergencyContact}>
          <View style={styles.emergencyContactHeader}>
            <DataIcons.Phone
              width={16}
              height={16}
              fill={designTokens.colors.error}
            />
            <Text style={styles.emergencyContactTitle}>Tournament Director</Text>
          </View>
          <TouchableOpacity
            style={styles.emergencyContactButton}
            onPress={() => onEmergencyContact?.(tournamentInfo.director)}
            testID="emergency-contact-director"
            accessible={true}
            accessibilityLabel={`Call ${tournamentInfo.director.name}`}
          >
            <Text style={styles.emergencyContactName}>{tournamentInfo.director.name}</Text>
            <Text style={styles.emergencyContactPhone}>{tournamentInfo.director.phone}</Text>
          </TouchableOpacity>
        </View>
        
        {tournamentInfo.director.emergencyPhone && (
          <View style={styles.emergencyContact}>
            <Text style={styles.emergencyContactTitle}>Emergency Line</Text>
            <TouchableOpacity
              style={styles.emergencyContactButton}
              onPress={() => onEmergencyContact?.({
                name: 'Emergency Services',
                phone: tournamentInfo.director.emergencyPhone!,
                role: 'Emergency',
                available24h: true
              })}
              testID="emergency-contact-emergency"
              accessible={true}
              accessibilityLabel="Call emergency services"
            >
              <Text style={styles.emergencyContactPhone}>
                {tournamentInfo.director.emergencyPhone}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }, [tournamentInfo.director, onEmergencyContact, styles]);

  const renderSectionContent = useCallback((sectionId: string) => {
    switch (sectionId) {
      case 'tournament-header':
        return renderTournamentHeader();
      case 'schedule-overview':
        return renderScheduleOverview();
      case 'weather-alerts':
        return renderWeatherAlerts();
      case 'court-information':
        return renderCourtInformation();
      case 'emergency-information':
        return renderEmergencyInformation();
      default:
        return null;
    }
  }, [
    renderTournamentHeader,
    renderScheduleOverview,
    renderWeatherAlerts,
    renderCourtInformation,
    renderEmergencyInformation
  ]);

  const sections = getPanelSections();

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      testID="tournament-info-panel"
      accessible={true}
      accessibilityLabel="Tournament information panel"
    >
      {sections.map((section) => {
        const isCollapsed = isPanelSectionCollapsed(section.id, collapsedSections);

        return (
          <View key={section.id} style={styles.section}>
            {renderSectionHeader(section)}
            {!isCollapsed && renderSectionContent(section.id)}
          </View>
        );
      })}
      
      <View style={styles.lastUpdatedContainer}>
        <Text style={styles.lastUpdatedText}>
          Last updated: {lastUpdated.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit'
          })}
        </Text>
      </View>
    </ScrollView>
  );
});

const getStyles = (): StyleSheet.NamedStyles<any> => {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: designTokens.colors.background,
    },
    section: {
      marginBottom: designTokens.spacing.small,
    },
    sectionHeader: {
      backgroundColor: designTokens.colors.surfacePrimary,
      paddingVertical: designTokens.spacing.medium,
      paddingHorizontal: designTokens.spacing.large,
      borderRadius: designTokens.spacing.borderRadius,
      marginHorizontal: designTokens.spacing.medium,
      minHeight: 44, // Touch target compliance
      boxShadow: `0px 1px 2px rgba(0, 0, 0, 0.1)`,
      elevation: 2,
    },
    sectionHeaderNonCollapsible: {
      backgroundColor: 'transparent',
      boxShadow: 'none',
      elevation: 0,
    },
    sectionHeaderContent: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    sectionTitleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    sectionTitle: {
      ...designTokens.typography.h3,
      fontWeight: '700',
      color: designTokens.colors.textPrimary,
    },
    sectionBadge: {
      backgroundColor: designTokens.colors.primary,
      borderRadius: 12,
      paddingHorizontal: designTokens.spacing.small,
      paddingVertical: 2,
      marginLeft: designTokens.spacing.small,
      minWidth: 24,
      alignItems: 'center',
    },
    sectionBadgeText: {
      ...designTokens.typography.caption,
      color: designTokens.colors.background,
      fontWeight: '600',
      fontSize: 12,
    },
    chevronIcon: {
      transform: [{ rotate: '0deg' }],
      transition: 'transform 0.3s ease',
    },
    chevronIconCollapsed: {
      transform: [{ rotate: '-90deg' }],
    },
    sectionContent: {
      paddingHorizontal: designTokens.spacing.large,
      paddingBottom: designTokens.spacing.medium,
    },
    
    // Tournament Header Styles
    tournamentInfoContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    tournamentBasicInfo: {
      flex: 1,
      marginRight: designTokens.spacing.medium,
    },
    tournamentName: {
      ...designTokens.typography.h2,
      fontWeight: '700',
      color: designTokens.colors.textPrimary,
      marginBottom: designTokens.spacing.small,
    },
    tournamentMetadata: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
    },
    tournamentLocation: {
      ...designTokens.typography.body,
      color: designTokens.colors.textSecondary,
      marginLeft: designTokens.spacing.small,
    },
    tournamentDates: {
      ...designTokens.typography.body,
      color: designTokens.colors.textSecondary,
      marginLeft: designTokens.spacing.small,
    },
    tournamentStatus: {
      alignItems: 'center',
    },
    tournamentStatusText: {
      ...designTokens.typography.bodySmall,
      color: designTokens.colors.statusColors.current,
      marginTop: 4,
      fontWeight: '600',
    },
    
    // Schedule Styles
    scheduleItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: designTokens.spacing.small,
      borderBottomWidth: 1,
      borderBottomColor: designTokens.colors.border,
    },
    scheduleTimeContainer: {
      alignItems: 'flex-start',
      marginRight: designTokens.spacing.medium,
      minWidth: 80,
    },
    scheduleTime: {
      ...designTokens.typography.body,
      fontWeight: '600',
      color: designTokens.colors.textPrimary,
    },
    scheduleCourt: {
      ...designTokens.typography.caption,
      color: designTokens.colors.textSecondary,
    },
    scheduleDetails: {
      flex: 1,
    },
    scheduleTeams: {
      ...designTokens.typography.body,
      color: designTokens.colors.textPrimary,
      marginBottom: 2,
    },
    scheduleRound: {
      ...designTokens.typography.bodySmall,
      color: designTokens.colors.textSecondary,
    },
    
    // Weather Alert Styles
    weatherAlert: {
      backgroundColor: designTokens.colors.surfaceSecondary,
      borderRadius: designTokens.spacing.borderRadius,
      padding: designTokens.spacing.medium,
      marginBottom: designTokens.spacing.small,
      borderLeftWidth: 4,
      borderLeftColor: designTokens.colors.textSecondary,
    },
    weatherAlertHigh: {
      borderLeftColor: designTokens.colors.warning,
    },
    weatherAlertCritical: {
      borderLeftColor: designTokens.colors.error,
      backgroundColor: '#FFF5F5',
    },
    weatherAlertHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: designTokens.spacing.small,
    },
    weatherAlertTitle: {
      ...designTokens.typography.body,
      fontWeight: '600',
      color: designTokens.colors.textPrimary,
      marginLeft: designTokens.spacing.small,
    },
    weatherAlertDescription: {
      ...designTokens.typography.bodySmall,
      color: designTokens.colors.textSecondary,
      marginBottom: designTokens.spacing.small,
    },
    weatherAlertTime: {
      ...designTokens.typography.caption,
      color: designTokens.colors.textSecondary,
    },
    
    // Court Information Styles
    courtItem: {
      backgroundColor: designTokens.colors.surfaceSecondary,
      borderRadius: designTokens.spacing.borderRadius,
      padding: designTokens.spacing.medium,
      marginBottom: designTokens.spacing.small,
      minHeight: 44, // Touch target compliance
    },
    courtHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: designTokens.spacing.small,
    },
    courtNumber: {
      ...designTokens.typography.body,
      fontWeight: '600',
      color: designTokens.colors.textPrimary,
    },
    courtType: {
      ...designTokens.typography.caption,
      color: designTokens.colors.textSecondary,
      textTransform: 'capitalize',
    },
    courtConditions: {
      ...designTokens.typography.bodySmall,
      color: designTokens.colors.textSecondary,
      marginBottom: 4,
    },
    courtRequirements: {
      ...designTokens.typography.bodySmall,
      color: designTokens.colors.warning,
      fontStyle: 'italic',
    },
    
    // Emergency Information Styles
    emergencyContact: {
      marginBottom: designTokens.spacing.medium,
    },
    emergencyContactHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: designTokens.spacing.small,
    },
    emergencyContactTitle: {
      ...designTokens.typography.body,
      fontWeight: '600',
      color: designTokens.colors.textPrimary,
      marginLeft: designTokens.spacing.small,
    },
    emergencyContactButton: {
      backgroundColor: designTokens.colors.error,
      borderRadius: designTokens.spacing.borderRadius,
      padding: designTokens.spacing.medium,
      minHeight: 44, // Touch target compliance
      alignItems: 'center',
    },
    emergencyContactName: {
      ...designTokens.typography.body,
      fontWeight: '600',
      color: designTokens.colors.background,
    },
    emergencyContactPhone: {
      ...designTokens.typography.h3,
      fontWeight: '700',
      color: designTokens.colors.background,
      marginTop: 4,
    },
    
    // Common Styles
    emptyState: {
      alignItems: 'center',
      paddingVertical: designTokens.spacing.large,
    },
    emptyStateText: {
      ...designTokens.typography.body,
      color: designTokens.colors.textSecondary,
      fontStyle: 'italic',
    },
    lastUpdatedContainer: {
      alignItems: 'center',
      paddingVertical: designTokens.spacing.medium,
      marginTop: designTokens.spacing.medium,
    },
    lastUpdatedText: {
      ...designTokens.typography.caption,
      color: designTokens.colors.textSecondary,
    },
  });
};

TournamentInfoPanel.displayName = 'TournamentInfoPanel';

export default TournamentInfoPanel;