/**
 * Weather Alerts Component
 * Story 2.3: Tournament Info Panel System
 * 
 * Weather/condition alerts integration with priority system
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert
} from 'react-native';
import { WeatherAlertsProps, WeatherAlert } from '../../types/tournamentInfo';
import { designTokens } from '../../theme/tokens';
import { UtilityIcons, StatusIcons, DataIcons } from '../Icons/IconLibrary';
import {
  getActiveWeatherAlerts,
  getWeatherAlertPriority,
  formatWeatherAlertTime,
  isWeatherAlertActive,
  getWeatherAlertSeverityColor
} from '../../utils/tournamentInfo';

const WeatherAlerts: React.FC<WeatherAlertsProps> = React.memo(({
  alerts = [],
  maxAlertsToShow = 5,
  showExpired = false,
  onAlertPress,
  onDismissAlert,
  enablePushNotifications = true,
  autoRefreshInterval = 300000 // 5 minutes
}) => {
  const [expandedAlert, setExpandedAlert] = useState<string | null>(null);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const styles = getStyles();

  // Filter and sort alerts
  const activeAlerts = getActiveWeatherAlerts(alerts);
  const relevantAlerts = showExpired 
    ? alerts.filter(alert => !dismissedAlerts.has(alert.id))
    : activeAlerts.filter(alert => !dismissedAlerts.has(alert.id));
  
  const sortedAlerts = relevantAlerts
    .sort((a, b) => getWeatherAlertPriority(b) - getWeatherAlertPriority(a))
    .slice(0, maxAlertsToShow);

  const handleAlertPress = (alert: WeatherAlert) => {
    if (onAlertPress) {
      onAlertPress(alert);
    } else {
      // Default behavior: expand/collapse alert
      setExpandedAlert(expandedAlert === alert.id ? null : alert.id);
    }
  };

  const handleDismissAlert = (alertId: string) => {
    Alert.alert(
      'Dismiss Alert',
      'Are you sure you want to dismiss this weather alert?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Dismiss',
          style: 'destructive',
          onPress: () => {
            setDismissedAlerts(prev => new Set([...prev, alertId]));
            if (expandedAlert === alertId) {
              setExpandedAlert(null);
            }
            onDismissAlert?.(alertId);
          }
        }
      ]
    );
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return (
          <StatusIcons.Error
            width={20}
            height={20}
            fill={designTokens.colors.error}
          />
        );
      case 'high':
        return (
          <UtilityIcons.Warning
            width={20}
            height={20}
            fill={designTokens.colors.warning}
          />
        );
      case 'medium':
        return (
          <UtilityIcons.Info
            width={20}
            height={20}
            fill={designTokens.colors.accent}
          />
        );
      case 'low':
        return (
          <DataIcons.Info
            width={20}
            height={20}
            fill={designTokens.colors.textSecondary}
          />
        );
      default:
        return (
          <UtilityIcons.Warning
            width={20}
            height={20}
            fill={designTokens.colors.textSecondary}
          />
        );
    }
  };

  const renderAlertHeader = (alert: WeatherAlert) => {
    const isExpanded = expandedAlert === alert.id;
    const isActive = isWeatherAlertActive(alert);
    const severityColor = getWeatherAlertSeverityColor(alert.severity);

    return (
      <View style={styles.alertHeader}>
        <View style={styles.alertHeaderLeft}>
          {getSeverityIcon(alert.severity)}
          <View style={styles.alertTitleContainer}>
            <Text style={[styles.alertTitle, { color: severityColor }]} numberOfLines={isExpanded ? undefined : 1}>
              {alert.title}
            </Text>
            <View style={styles.alertMetadata}>
              <Text style={styles.alertSeverityText}>
                {alert.severity.toUpperCase()}
              </Text>
              <View style={styles.alertMetadataDivider} />
              <Text style={styles.alertTimeText}>
                {formatWeatherAlertTime(alert.issuedAt)}
              </Text>
              {!isActive && (
                <>
                  <View style={styles.alertMetadataDivider} />
                  <Text style={styles.alertExpiredText}>EXPIRED</Text>
                </>
              )}
            </View>
          </View>
        </View>
        <View style={styles.alertHeaderRight}>
          {alert.dismissible && (
            <TouchableOpacity
              style={styles.dismissButton}
              onPress={() => handleDismissAlert(alert.id)}
              testID={`dismiss-alert-${alert.id}`}
              accessible={true}
              accessibilityLabel="Dismiss alert"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <UtilityIcons.Close
                width={16}
                height={16}
                fill={designTokens.colors.textSecondary}
              />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.expandButton}
            onPress={() => handleAlertPress(alert)}
            testID={`expand-alert-${alert.id}`}
            accessible={true}
            accessibilityLabel={isExpanded ? 'Collapse alert details' : 'Expand alert details'}
          >
            <UtilityIcons.ChevronDown
              width={16}
              height={16}
              fill={designTokens.colors.textSecondary}
              style={isExpanded && styles.chevronRotated}
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderAlertContent = (alert: WeatherAlert) => {
    if (expandedAlert !== alert.id) return null;

    return (
      <View style={styles.alertContent}>
        <Text style={styles.alertDescription}>{alert.description}</Text>
        
        {alert.affectedAreas && alert.affectedAreas.length > 0 && (
          <View style={styles.affectedAreasContainer}>
            <Text style={styles.affectedAreasTitle}>Affected Areas:</Text>
            <View style={styles.affectedAreasList}>
              {alert.affectedAreas.map((area, index) => (
                <View key={index} style={styles.affectedAreaItem}>
                  <DataIcons.Location
                    width={12}
                    height={12}
                    fill={designTokens.colors.textSecondary}
                  />
                  <Text style={styles.affectedAreaText}>{area}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {alert.recommendations && alert.recommendations.length > 0 && (
          <View style={styles.recommendationsContainer}>
            <Text style={styles.recommendationsTitle}>Recommendations:</Text>
            <View style={styles.recommendationsList}>
              {alert.recommendations.map((recommendation, index) => (
                <View key={index} style={styles.recommendationItem}>
                  <View style={styles.recommendationBullet} />
                  <Text style={styles.recommendationText}>{recommendation}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {alert.expiresAt && (
          <View style={styles.expirationContainer}>
            <DataIcons.Time
              width={14}
              height={14}
              fill={designTokens.colors.textSecondary}
            />
            <Text style={styles.expirationText}>
              Expires: {formatWeatherAlertTime(alert.expiresAt)}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderAlertItem = ({ item }: { item: WeatherAlert }) => {
    const severityColor = getWeatherAlertSeverityColor(item.severity);
    const isActive = isWeatherAlertActive(item);

    return (
      <View
        style={[
          styles.alertItem,
          { borderLeftColor: severityColor },
          !isActive && styles.alertItemExpired
        ]}
      >
        {renderAlertHeader(item)}
        {renderAlertContent(item)}
      </View>
    );
  };

  const renderHeader = () => {
    const criticalCount = sortedAlerts.filter(alert => alert.severity === 'critical').length;
    const activeCount = sortedAlerts.filter(alert => isWeatherAlertActive(alert)).length;

    return (
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <UtilityIcons.Weather
            width={24}
            height={24}
            fill={criticalCount > 0 ? designTokens.colors.error : designTokens.colors.textSecondary}
          />
          <Text style={styles.title}>Weather Alerts</Text>
          {activeCount > 0 && (
            <View style={styles.alertCountBadge}>
              <Text style={styles.alertCountText}>{activeCount}</Text>
            </View>
          )}
        </View>
        {criticalCount > 0 && (
          <View style={styles.criticalIndicator}>
            <StatusIcons.Error
              width={16}
              height={16}
              fill={designTokens.colors.error}
            />
            <Text style={styles.criticalText}>{criticalCount} Critical</Text>
          </View>
        )}
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <UtilityIcons.Weather
        width={48}
        height={48}
        fill={designTokens.colors.textSecondary}
      />
      <Text style={styles.emptyStateTitle}>No weather alerts</Text>
      <Text style={styles.emptyStateSubtitle}>
        Weather conditions are currently favorable
      </Text>
    </View>
  );

  if (sortedAlerts.length === 0) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        {renderEmptyState()}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderHeader()}
      <FlatList
        data={sortedAlerts}
        renderItem={renderAlertItem}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        scrollEnabled={sortedAlerts.length > 3}
        style={styles.alertsList}
      />
      
      {alerts.length > maxAlertsToShow && (
        <View style={styles.moreAlertsIndicator}>
          <Text style={styles.moreAlertsText}>
            +{alerts.length - maxAlertsToShow} more alerts available
          </Text>
        </View>
      )}
    </View>
  );
});

const getStyles = (): StyleSheet.NamedStyles<any> => {
  return StyleSheet.create({
    container: {
      backgroundColor: designTokens.colors.surfacePrimary,
      borderRadius: designTokens.spacing.borderRadius,
      padding: designTokens.spacing.large,
      marginHorizontal: designTokens.spacing.medium,
      marginVertical: designTokens.spacing.small,
      boxShadow: `0px 2px 4px rgba(0, 0, 0, 0.1)`,
      elevation: 3,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: designTokens.spacing.medium,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    title: {
      ...designTokens.typography.h3,
      fontWeight: '700',
      color: designTokens.colors.textPrimary,
      marginLeft: designTokens.spacing.small,
    },
    alertCountBadge: {
      backgroundColor: designTokens.colors.error,
      borderRadius: 10,
      paddingHorizontal: 6,
      paddingVertical: 2,
      marginLeft: designTokens.spacing.small,
      minWidth: 20,
      alignItems: 'center',
    },
    alertCountText: {
      ...designTokens.typography.caption,
      color: designTokens.colors.background,
      fontWeight: '600',
      fontSize: 11,
    },
    criticalIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: designTokens.colors.error + '15',
      paddingHorizontal: designTokens.spacing.small,
      paddingVertical: 4,
      borderRadius: 4,
    },
    criticalText: {
      ...designTokens.typography.caption,
      color: designTokens.colors.error,
      fontWeight: '600',
      marginLeft: 4,
    },
    alertsList: {
      maxHeight: 400, // Prevent excessive height
    },
    alertItem: {
      backgroundColor: designTokens.colors.surfaceSecondary,
      borderRadius: designTokens.spacing.borderRadius,
      marginBottom: designTokens.spacing.small,
      borderLeftWidth: 4,
      overflow: 'hidden',
    },
    alertItemExpired: {
      opacity: 0.6,
    },
    alertHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      padding: designTokens.spacing.medium,
      minHeight: 44, // Touch target compliance
    },
    alertHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      flex: 1,
      marginRight: designTokens.spacing.small,
    },
    alertTitleContainer: {
      marginLeft: designTokens.spacing.small,
      flex: 1,
    },
    alertTitle: {
      ...designTokens.typography.body,
      fontWeight: '700',
      marginBottom: 4,
    },
    alertMetadata: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
    },
    alertSeverityText: {
      ...designTokens.typography.caption,
      color: designTokens.colors.textSecondary,
      fontWeight: '600',
      fontSize: 10,
    },
    alertTimeText: {
      ...designTokens.typography.caption,
      color: designTokens.colors.textSecondary,
    },
    alertExpiredText: {
      ...designTokens.typography.caption,
      color: designTokens.colors.error,
      fontWeight: '600',
      fontSize: 10,
    },
    alertMetadataDivider: {
      width: 1,
      height: 10,
      backgroundColor: designTokens.colors.border,
      marginHorizontal: 6,
    },
    alertHeaderRight: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    dismissButton: {
      padding: 4,
      marginRight: designTokens.spacing.small,
      minHeight: 24,
      minWidth: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    expandButton: {
      padding: 4,
      minHeight: 24,
      minWidth: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    chevronRotated: {
      transform: [{ rotate: '180deg' }],
    },
    alertContent: {
      paddingHorizontal: designTokens.spacing.medium,
      paddingBottom: designTokens.spacing.medium,
      borderTopWidth: 1,
      borderTopColor: designTokens.colors.border,
    },
    alertDescription: {
      ...designTokens.typography.body,
      color: designTokens.colors.textPrimary,
      lineHeight: designTokens.typography.body.lineHeight * 1.3,
      marginBottom: designTokens.spacing.medium,
    },
    affectedAreasContainer: {
      marginBottom: designTokens.spacing.medium,
    },
    affectedAreasTitle: {
      ...designTokens.typography.bodySmall,
      fontWeight: '600',
      color: designTokens.colors.textSecondary,
      marginBottom: designTokens.spacing.small,
    },
    affectedAreasList: {
      marginLeft: designTokens.spacing.small,
    },
    affectedAreaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
    },
    affectedAreaText: {
      ...designTokens.typography.bodySmall,
      color: designTokens.colors.textPrimary,
      marginLeft: 4,
    },
    recommendationsContainer: {
      marginBottom: designTokens.spacing.medium,
    },
    recommendationsTitle: {
      ...designTokens.typography.bodySmall,
      fontWeight: '600',
      color: designTokens.colors.textSecondary,
      marginBottom: designTokens.spacing.small,
    },
    recommendationsList: {
      marginLeft: designTokens.spacing.small,
    },
    recommendationItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: designTokens.spacing.small,
    },
    recommendationBullet: {
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: designTokens.colors.accent,
      marginTop: 7,
      marginRight: designTokens.spacing.small,
    },
    recommendationText: {
      ...designTokens.typography.bodySmall,
      color: designTokens.colors.textPrimary,
      flex: 1,
      lineHeight: designTokens.typography.bodySmall.lineHeight * 1.2,
    },
    expirationContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: designTokens.spacing.small,
      paddingTop: designTokens.spacing.small,
      borderTopWidth: 1,
      borderTopColor: designTokens.colors.border,
    },
    expirationText: {
      ...designTokens.typography.caption,
      color: designTokens.colors.textSecondary,
      marginLeft: 4,
    },
    moreAlertsIndicator: {
      alignItems: 'center',
      paddingVertical: designTokens.spacing.small,
      marginTop: designTokens.spacing.small,
      borderTopWidth: 1,
      borderTopColor: designTokens.colors.border,
    },
    moreAlertsText: {
      ...designTokens.typography.caption,
      color: designTokens.colors.textSecondary,
      fontStyle: 'italic',
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: designTokens.spacing.extraLarge,
    },
    emptyStateTitle: {
      ...designTokens.typography.h3,
      color: designTokens.colors.textSecondary,
      marginTop: designTokens.spacing.medium,
      marginBottom: designTokens.spacing.small,
    },
    emptyStateSubtitle: {
      ...designTokens.typography.body,
      color: designTokens.colors.textSecondary,
      textAlign: 'center',
      opacity: 0.7,
    },
  });
};

WeatherAlerts.displayName = 'WeatherAlerts';

export default WeatherAlerts;