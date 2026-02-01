/**
 * StatusCard Component
 * Story 1.4: Status-Driven Color Coding System
 * 
 * A card component that displays content with status-driven color coding
 * Used for assignment displays and tournament cards
 */

import React from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';

import { StatusBadge } from './StatusBadge';
import {
  getStatusColorWithText,
  TournamentStatus,
  statusColorThemes
} from '../../utils/statusColors';
import { spacing, colors } from '../../theme/tokens';
import { H2Text, BodyText, CaptionText } from '../Typography/Text';

export interface StatusCardProps {
  status: TournamentStatus;
  title: string;
  subtitle?: string;
  description?: string;
  metadata?: string;
  children?: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  showStatusBadge?: boolean;
  statusBadgePosition?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  variant?: 'default' | 'minimal' | 'elevated';
}

export const StatusCard: React.FC<StatusCardProps> = React.memo(({
  status,
  title,
  subtitle,
  description,
  metadata,
  children,
  onPress,
  style,
  showStatusBadge = true,
  statusBadgePosition = 'top-right',
  variant = 'default',
}) => {
  const statusColorInfo = getStatusColorWithText(status);
  const borderConfig = statusColorThemes.border[status];
  
  const getVariantStyles = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      borderLeftWidth: borderConfig.width * 2, // Double width for status indication
      borderLeftColor: statusColorInfo.backgroundColor,
    };
    
    switch (variant) {
      case 'elevated':
        return {
          ...baseStyle,
          elevation: 4,
          boxShadow: '0px 2px 4px rgba(51, 51, 51, 0.1)',
        };
      case 'minimal':
        return {
          ...baseStyle,
          borderWidth: 0,
          borderLeftWidth: borderConfig.width,
        };
      case 'default':
      default:
        return baseStyle;
    }
  };

  const getBadgePosition = (): ViewStyle => {
    const basePosition: ViewStyle = {
      position: 'absolute',
      zIndex: 1,
    };
    
    switch (statusBadgePosition) {
      case 'top-left':
        return { ...basePosition, top: spacing.sm, left: spacing.sm };
      case 'top-right':
        return { ...basePosition, top: spacing.sm, right: spacing.sm };
      case 'bottom-left':
        return { ...basePosition, bottom: spacing.sm, left: spacing.sm };
      case 'bottom-right':
        return { ...basePosition, bottom: spacing.sm, right: spacing.sm };
      default:
        return { ...basePosition, top: spacing.sm, right: spacing.sm };
    }
  };

  const cardContent = (
    <View style={[styles.card, getVariantStyles(), style]}>
      {showStatusBadge && (
        <View style={getBadgePosition()}>
          <StatusBadge status={status} size="small" />
        </View>
      )}
      
      <View style={[
        styles.content,
        showStatusBadge && { paddingTop: spacing.xl }
      ]}>
        <View style={styles.header}>
          <H2Text style={styles.title} numberOfLines={2}>
            {title}
          </H2Text>
          {subtitle && (
            <BodyText style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </BodyText>
          )}
        </View>
        
        {description && (
          <BodyText style={styles.description} numberOfLines={3}>
            {description}
          </BodyText>
        )}
        
        {children && (
          <View style={styles.children}>
            {children}
          </View>
        )}
        
        {metadata && (
          <CaptionText style={styles.metadata} numberOfLines={1}>
            {metadata}
          </CaptionText>
        )}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {cardContent}
      </TouchableOpacity>
    );
  }

  return cardContent;
});

StatusCard.displayName = 'StatusCard';

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background,
    borderRadius: 8,
    marginVertical: spacing.xs,
    minHeight: 80,
    position: 'relative',
  },
  content: {
    padding: spacing.md,
  },
  header: {
    marginBottom: spacing.sm,
  },
  title: {
    marginBottom: spacing.xs / 2,
  },
  subtitle: {
    color: colors.textSecondary,
  },
  description: {
    marginBottom: spacing.sm,
    lineHeight: 20,
  },
  children: {
    marginBottom: spacing.sm,
  },
  metadata: {
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
});

export default StatusCard;