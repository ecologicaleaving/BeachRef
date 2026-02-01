/**
 * Court Information Component
 * Story 2.3: Tournament Info Panel System
 * 
 * Court assignments, conditions, and special requirements display
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet
} from 'react-native';
import { CourtInformationProps, CourtInfo } from '../../types/tournamentInfo';
import { designTokens } from '../../theme/tokens';
import { DataIcons, UtilityIcons } from '../Icons/IconLibrary';
import {
  getCourtsWithConditions,
  getCourtsWithSpecialRequirements
} from '../../utils/tournamentInfo';

const CourtInformation: React.FC<CourtInformationProps> = React.memo(({
  courts,
  selectedCourtId,
  onCourtSelect,
  showConditions = true,
  showSpecialRequirements = true
}) => {
  const styles = getStyles();

  const getCourtTypeIcon = (type: string) => {
    switch (type) {
      case 'main':
        return (
          <DataIcons.Location
            width={18}
            height={18}
            fill={designTokens.colors.primary}
          />
        );
      case 'practice':
        return (
          <UtilityIcons.Settings
            width={18}
            height={18}
            fill={designTokens.colors.secondary}
          />
        );
      case 'warm-up':
        return (
          <UtilityIcons.Activity
            width={18}
            height={18}
            fill={designTokens.colors.accent}
          />
        );
      default:
        return (
          <DataIcons.Location
            width={18}
            height={18}
            fill={designTokens.colors.textSecondary}
          />
        );
    }
  };

  const getCourtTypeColor = (type: string) => {
    switch (type) {
      case 'main':
        return designTokens.colors.primary;
      case 'practice':
        return designTokens.colors.secondary;
      case 'warm-up':
        return designTokens.colors.accent;
      default:
        return designTokens.colors.textSecondary;
    }
  };

  const renderCourtItem = ({ item }: { item: CourtInfo }) => {
    const isSelected = item.courtId === selectedCourtId;
    const hasConditions = showConditions && item.conditions;
    const hasSpecialRequirements = showSpecialRequirements && 
      item.specialRequirements && item.specialRequirements.length > 0;

    return (
      <TouchableOpacity
        style={[
          styles.courtItem,
          isSelected && styles.courtItemSelected
        ]}
        onPress={() => onCourtSelect?.(item.courtId)}
        testID={`court-item-${item.courtId}`}
        accessible={true}
        accessibilityLabel={`Court ${item.courtNumber} information`}
        accessibilityHint={onCourtSelect ? 'Tap to select court' : undefined}
      >
        {/* Court Header */}
        <View style={styles.courtHeader}>
          <View style={styles.courtTitleContainer}>
            {getCourtTypeIcon(item.type)}
            <View style={styles.courtTitleText}>
              <Text style={styles.courtNumber}>
                Court {item.courtNumber}
              </Text>
              <Text style={styles.courtLocation}>{item.location}</Text>
            </View>
          </View>
          <View style={[
            styles.courtTypeBadge,
            { backgroundColor: getCourtTypeColor(item.type) + '20' }
          ]}>
            <Text style={[
              styles.courtTypeText,
              { color: getCourtTypeColor(item.type) }
            ]}>
              {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
            </Text>
          </View>
        </View>

        {/* Court Specifications */}
        {(item.surfaceType || item.netHeight || item.dimensions) && (
          <View style={styles.courtSpecs}>
            {item.surfaceType && (
              <View style={styles.specItem}>
                <Text style={styles.specLabel}>Surface:</Text>
                <Text style={styles.specValue}>{item.surfaceType}</Text>
              </View>
            )}
            {item.netHeight && (
              <View style={styles.specItem}>
                <Text style={styles.specLabel}>Net Height:</Text>
                <Text style={styles.specValue}>{item.netHeight}m</Text>
              </View>
            )}
            {item.dimensions && (
              <View style={styles.specItem}>
                <Text style={styles.specLabel}>Dimensions:</Text>
                <Text style={styles.specValue}>{item.dimensions}</Text>
              </View>
            )}
          </View>
        )}

        {/* Court Conditions */}
        {hasConditions && (
          <View style={styles.conditionsContainer}>
            <View style={styles.conditionsHeader}>
              <UtilityIcons.Info
                width={14}
                height={14}
                fill={designTokens.colors.textSecondary}
              />
              <Text style={styles.conditionsTitle}>Conditions</Text>
            </View>
            <Text style={styles.conditionsText}>{item.conditions}</Text>
          </View>
        )}

        {/* Special Requirements */}
        {hasSpecialRequirements && (
          <View style={styles.requirementsContainer}>
            <View style={styles.requirementsHeader}>
              <UtilityIcons.Warning
                width={14}
                height={14}
                fill={designTokens.colors.warning}
              />
              <Text style={styles.requirementsTitle}>Special Requirements</Text>
            </View>
            <View style={styles.requirementsList}>
              {item.specialRequirements!.map((requirement, index) => (
                <View key={index} style={styles.requirementItem}>
                  <View style={styles.requirementBullet} />
                  <Text style={styles.requirementText}>{requirement}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Selection Indicator */}
        {isSelected && (
          <View style={styles.selectedIndicator}>
            <UtilityIcons.Check
              width={16}
              height={16}
              fill={designTokens.colors.primary}
            />
            <Text style={styles.selectedText}>Selected</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.title}>Court Information</Text>
      <Text style={styles.subtitle}>
        {courts.length} court{courts.length !== 1 ? 's' : ''} available
      </Text>
    </View>
  );

  const renderSummaryStats = () => {
    const mainCourts = courts.filter(court => court.type === 'main').length;
    const practiceCourts = courts.filter(court => court.type === 'practice').length;
    const courtsWithConditions = getCourtsWithConditions(courts).length;
    const courtsWithRequirements = getCourtsWithSpecialRequirements(courts).length;

    return (
      <View style={styles.summaryStats}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{mainCourts}</Text>
          <Text style={styles.statLabel}>Main Courts</Text>
        </View>
        {practiceCourts > 0 && (
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{practiceCourts}</Text>
            <Text style={styles.statLabel}>Practice</Text>
          </View>
        )}
        {courtsWithConditions > 0 && (
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{courtsWithConditions}</Text>
            <Text style={styles.statLabel}>With Conditions</Text>
          </View>
        )}
        {courtsWithRequirements > 0 && (
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{courtsWithRequirements}</Text>
            <Text style={styles.statLabel}>Special Requirements</Text>
          </View>
        )}
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <DataIcons.Location
        width={48}
        height={48}
        fill={designTokens.colors.textSecondary}
      />
      <Text style={styles.emptyStateTitle}>No courts available</Text>
      <Text style={styles.emptyStateSubtitle}>
        Court information will be displayed here when available
      </Text>
    </View>
  );

  if (courts.length === 0) {
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
      {renderSummaryStats()}
      
      <FlatList
        data={courts}
        renderItem={renderCourtItem}
        keyExtractor={(item) => item.courtId}
        showsVerticalScrollIndicator={false}
        scrollEnabled={courts.length > 3}
        style={styles.courtsList}
      />
    </View>
  );
});

const getStyles = () => {
  return StyleSheet.create({
    container: {
      backgroundColor: designTokens.colors.surfacePrimary,
      borderRadius: designTokens.spacing.borderRadius,
      padding: designTokens.spacing.large,
      marginHorizontal: designTokens.spacing.medium,
      marginVertical: designTokens.spacing.small,
      boxShadow: `0px 1px 2px rgba(0, 0, 0, 0.1)`,
      elevation: 2,
    },
    header: {
      marginBottom: designTokens.spacing.medium,
    },
    title: {
      ...designTokens.typography.h3,
      fontWeight: '700',
      color: designTokens.colors.textPrimary,
      marginBottom: 4,
    },
    subtitle: {
      ...designTokens.typography.bodySmall,
      color: designTokens.colors.textSecondary,
    },
    summaryStats: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      backgroundColor: designTokens.colors.surfaceSecondary,
      borderRadius: designTokens.spacing.borderRadius,
      paddingVertical: designTokens.spacing.medium,
      paddingHorizontal: designTokens.spacing.small,
      marginBottom: designTokens.spacing.medium,
    },
    statItem: {
      alignItems: 'center',
      flex: 1,
    },
    statValue: {
      ...designTokens.typography.h2,
      fontWeight: '700',
      color: designTokens.colors.primary,
    },
    statLabel: {
      ...designTokens.typography.caption,
      color: designTokens.colors.textSecondary,
      marginTop: 2,
      textAlign: 'center',
    },
    courtsList: {
      maxHeight: 400, // Prevent excessive height
    },
    courtItem: {
      backgroundColor: designTokens.colors.surfaceSecondary,
      borderRadius: designTokens.spacing.borderRadius,
      padding: designTokens.spacing.medium,
      marginBottom: designTokens.spacing.small,
      borderWidth: 1,
      borderColor: designTokens.colors.border,
      minHeight: 44, // Touch target compliance
    },
    courtItemSelected: {
      borderColor: designTokens.colors.primary,
      borderWidth: 2,
      backgroundColor: designTokens.colors.primary + '05',
    },
    courtHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: designTokens.spacing.small,
    },
    courtTitleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    courtTitleText: {
      marginLeft: designTokens.spacing.small,
      flex: 1,
    },
    courtNumber: {
      ...designTokens.typography.body,
      fontWeight: '700',
      color: designTokens.colors.textPrimary,
    },
    courtLocation: {
      ...designTokens.typography.bodySmall,
      color: designTokens.colors.textSecondary,
      marginTop: 2,
    },
    courtTypeBadge: {
      paddingHorizontal: designTokens.spacing.small,
      paddingVertical: 4,
      borderRadius: 6,
      alignItems: 'center',
    },
    courtTypeText: {
      ...designTokens.typography.caption,
      fontWeight: '600',
      fontSize: 11,
    },
    courtSpecs: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginBottom: designTokens.spacing.small,
      paddingVertical: designTokens.spacing.small,
      borderTopWidth: 1,
      borderTopColor: designTokens.colors.border,
    },
    specItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginRight: designTokens.spacing.large,
      marginBottom: 4,
    },
    specLabel: {
      ...designTokens.typography.caption,
      color: designTokens.colors.textSecondary,
      marginRight: 4,
    },
    specValue: {
      ...designTokens.typography.caption,
      fontWeight: '600',
      color: designTokens.colors.textPrimary,
    },
    conditionsContainer: {
      marginTop: designTokens.spacing.small,
      paddingTop: designTokens.spacing.small,
      borderTopWidth: 1,
      borderTopColor: designTokens.colors.border,
    },
    conditionsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
    },
    conditionsTitle: {
      ...designTokens.typography.bodySmall,
      fontWeight: '600',
      color: designTokens.colors.textSecondary,
      marginLeft: 4,
    },
    conditionsText: {
      ...designTokens.typography.bodySmall,
      color: designTokens.colors.textSecondary,
    },
    requirementsContainer: {
      marginTop: designTokens.spacing.small,
      paddingTop: designTokens.spacing.small,
      borderTopWidth: 1,
      borderTopColor: designTokens.colors.border,
    },
    requirementsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: designTokens.spacing.small,
    },
    requirementsTitle: {
      ...designTokens.typography.bodySmall,
      fontWeight: '600',
      color: designTokens.colors.warning,
      marginLeft: 4,
    },
    requirementsList: {
      marginLeft: designTokens.spacing.medium,
    },
    requirementItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 4,
    },
    requirementBullet: {
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: designTokens.colors.warning,
      marginTop: 7,
      marginRight: designTokens.spacing.small,
    },
    requirementText: {
      ...designTokens.typography.bodySmall,
      color: designTokens.colors.warning,
      flex: 1,
    },
    selectedIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: designTokens.spacing.small,
      paddingTop: designTokens.spacing.small,
      borderTopWidth: 1,
      borderTopColor: designTokens.colors.primary + '30',
    },
    selectedText: {
      ...designTokens.typography.bodySmall,
      fontWeight: '600',
      color: designTokens.colors.primary,
      marginLeft: 4,
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

CourtInformation.displayName = 'CourtInformation';

export default CourtInformation;