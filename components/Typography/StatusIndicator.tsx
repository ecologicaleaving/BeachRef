/**
 * StatusIndicator Components - Quick Scanning Typography
 * Optimized for peripheral vision scanning and rapid status recognition
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Title, Heading, Subheading, EnhancedBodyText, EnhancedCaption } from './Text';
import { colors, spacing } from '../../theme/tokens';
// Removed unused import: getScanningPatternConfig

export type IndicatorStatus = 'active' | 'upcoming' | 'completed' | 'cancelled' | 'warning' | 'error';
export type IndicatorSize = 'small' | 'medium' | 'large';
export type IndicatorVariant = 'badge' | 'banner' | 'pill' | 'card';

export interface StatusIndicatorProps {
  status: IndicatorStatus;
  label: string;
  sublabel?: string;
  value?: string | number;
  size?: IndicatorSize;
  variant?: IndicatorVariant;
  critical?: boolean;
  testID?: string;
}

/**
 * StatusIndicator with typography optimized for quick scanning
 * Uses peripheral scanning patterns for maximum visibility
 */
export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  label,
  sublabel,
  value,
  size = 'medium',
  variant = 'badge',
  critical = false,
  testID,
}) => {
  const getStatusColor = () => {
    switch (status) {
      case 'active':
        return colors.success;
      case 'upcoming':
        return colors.primary;
      case 'completed':
        return colors.textSecondary;
      case 'cancelled':
        return colors.error;
      case 'warning':
        return colors.warning;
      case 'error':
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  const getBackgroundColor = () => {
    switch (status) {
      case 'active':
        return '#ECFDF5'; // Light green
      case 'upcoming':
        return '#EFF6FF'; // Light blue
      case 'completed':
        return '#F9FAFB'; // Light gray
      case 'cancelled':
        return '#FEF2F2'; // Light red
      case 'warning':
        return '#FFFBEB'; // Light yellow
      case 'error':
        return '#FEF2F2'; // Light red
      default:
        return '#F9FAFB';
    }
  };

  const getEmphasisLevel = () => {
    if (critical || status === 'error' || status === 'active') {
      return 'critical' as const;
    }
    if (status === 'warning' || status === 'upcoming') {
      return 'high' as const;
    }
    return 'medium' as const;
  };

  const renderBadge = () => (
    <View 
      style={[
        styles.badge, 
        styles[`${size}Badge`],
        { backgroundColor: getBackgroundColor(), borderColor: getStatusColor() }
      ]}
      testID={testID}
    >
      <EnhancedCaption 
        emphasis={getEmphasisLevel()}
        color="textPrimary"
        style={[styles.badgeText, { color: getStatusColor() }]}
      >
        {label.toUpperCase()}
      </EnhancedCaption>
      {value && (
        <Heading 
          emphasis={getEmphasisLevel()}
          color="textPrimary"
          style={[styles.badgeValue, { color: getStatusColor() }]}
        >
          {value}
        </Heading>
      )}
    </View>
  );

  const renderBanner = () => (
    <View 
      style={[
        styles.banner, 
        styles[`${size}Banner`],
        { backgroundColor: getStatusColor() }
      ]}
      testID={testID}
    >
      <Title
        level={2}
        critical={critical}
        color="background"
        style={styles.bannerText}
      >
        {label.toUpperCase()}
      </Title>
      {sublabel && (
        <EnhancedCaption 
          emphasis="medium"
          color="background"
          style={styles.bannerSublabel}
        >
          {sublabel}
        </EnhancedCaption>
      )}
    </View>
  );

  const renderPill = () => (
    <View 
      style={[
        styles.pill, 
        styles[`${size}Pill`],
        { backgroundColor: getStatusColor() }
      ]}
      testID={testID}
    >
      <EnhancedBodyText 
        emphasis={getEmphasisLevel()}
        color="background"
        style={styles.pillText}
      >
        {label}
      </EnhancedBodyText>
      {value && (
        <Subheading 
          emphasis="high"
          color="background"
          style={styles.pillValue}
        >
          {value}
        </Subheading>
      )}
    </View>
  );

  const renderCard = () => (
    <View 
      style={[
        styles.card, 
        styles[`${size}Card`],
        { backgroundColor: getBackgroundColor(), borderColor: getStatusColor() }
      ]}
      testID={testID}
    >
      <View style={styles.cardHeader}>
        <Heading 
          emphasis={getEmphasisLevel()}
          hierarchy="secondary"
          color="textPrimary"
          style={[styles.cardLabel, { color: getStatusColor() }]}
        >
          {label}
        </Heading>
        {value && (
          <Title
            level={2}
            critical={critical}
            color="textPrimary"
            style={[styles.cardValue, { color: getStatusColor() }]}
          >
            {value}
          </Title>
        )}
      </View>
      {sublabel && (
        <EnhancedCaption 
          emphasis="medium"
          color="textSecondary"
          style={styles.cardSublabel}
        >
          {sublabel}
        </EnhancedCaption>
      )}
    </View>
  );

  const renderIndicator = () => {
    switch (variant) {
      case 'banner':
        return renderBanner();
      case 'pill':
        return renderPill();
      case 'card':
        return renderCard();
      case 'badge':
      default:
        return renderBadge();
    }
  };

  return renderIndicator();
};

/**
 * LiveStatusIndicator - Special variant for active/live status
 * Uses critical typography optimization for maximum visibility
 */
export const LiveStatusIndicator: React.FC<{
  label?: string;
  sublabel?: string;
  testID?: string;
}> = ({ 
  label = 'LIVE NOW', 
  sublabel = 'Match in Progress',
  testID 
}) => (
  <StatusIndicator 
    status="active"
    label={label}
    sublabel={sublabel}
    variant="banner"
    size="large"
    critical
    testID={testID}
  />
);

/**
 * CompactStatusRow - Horizontal layout for multiple status indicators
 * Optimized for dashboard quick-scan patterns
 */
export const CompactStatusRow: React.FC<{
  indicators: Pick<StatusIndicatorProps, 'status' | 'label' | 'value'>[];
  testID?: string;
}> = ({ indicators, testID }) => (
  <View style={styles.statusRow} testID={testID}>
    {indicators.map((indicator, index) => (
      <StatusIndicator
        key={`${indicator.status}-${index}`}
        status={indicator.status}
        label={indicator.label}
        value={indicator.value}
        variant="pill"
        size="small"
      />
    ))}
  </View>
);

const styles = StyleSheet.create({
  // Badge styles
  badge: {
    borderRadius: 8,
    borderWidth: 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44, // Touch target minimum
  },
  smallBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    minHeight: 32,
  },
  mediumBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  largeBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 56,
  },
  badgeText: {
    fontWeight: '700',
    textAlign: 'center',
  },
  badgeValue: {
    marginTop: 2,
  },

  // Banner styles
  banner: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  smallBanner: {
    paddingVertical: spacing.sm,
    minHeight: 44,
  },
  mediumBanner: {
    paddingVertical: spacing.md,
  },
  largeBanner: {
    paddingVertical: spacing.lg,
    minHeight: 72,
  },
  bannerText: {
    textAlign: 'center',
    fontWeight: '800',
  },
  bannerSublabel: {
    marginTop: spacing.xs,
    textAlign: 'center',
  },

  // Pill styles
  pill: {
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
    marginHorizontal: spacing.xs,
  },
  smallPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    minHeight: 32,
  },
  mediumPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  largePill: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 48,
  },
  pillText: {
    fontWeight: '600',
    textAlign: 'center',
  },
  pillValue: {
    marginLeft: spacing.xs,
    fontWeight: '700',
  },

  // Card styles
  card: {
    borderRadius: 12,
    borderWidth: 2,
    padding: spacing.md,
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
    elevation: 4,
  },
  smallCard: {
    padding: spacing.sm,
  },
  mediumCard: {
    padding: spacing.md,
  },
  largeCard: {
    padding: spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  cardLabel: {
    flex: 1,
    fontWeight: '600',
  },
  cardValue: {
    fontWeight: '800',
  },
  cardSublabel: {
    marginTop: spacing.xs,
    textAlign: 'left',
  },

  // Status row styles
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    flexWrap: 'wrap',
    marginVertical: spacing.xs,
  },
});

export default StatusIndicator;