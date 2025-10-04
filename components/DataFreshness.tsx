import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { designTokens } from '../theme/tokens';

interface DataFreshnessProps {
  timestamp?: number;
  maxAge?: number; // in milliseconds
  size?: 'small' | 'medium' | 'large';
  style?: any;
  showLabel?: boolean;
}

/**
 * Component to display data freshness information
 * Shows "last updated" time and freshness indicators
 */
export function DataFreshness({ 
  timestamp, 
  maxAge,
  size = 'small',
  showLabel = true,
  style 
}: DataFreshnessProps) {
  if (!timestamp) {
    return null;
  }

  const now = Date.now();
  const age = now - timestamp;
  
  // Get relative time string
  const getRelativeTime = () => {
    const seconds = Math.floor(age / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return `${seconds}s ago`;
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  // Get freshness level based on age
  const getFreshnessLevel = (): 'fresh' | 'moderate' | 'stale' => {
    if (!maxAge) {
      // Default freshness thresholds
      if (age < 5 * 60 * 1000) return 'fresh'; // < 5 minutes
      if (age < 60 * 60 * 1000) return 'moderate'; // < 1 hour
      return 'stale';
    }
    
    if (age < maxAge * 0.5) return 'fresh';
    if (age < maxAge) return 'moderate';
    return 'stale';
  };

  const freshnessLevel = getFreshnessLevel();
  const relativeTime = getRelativeTime();
  
  const colors = {
    fresh: '#4CAF50',
    moderate: '#FF9800', 
    stale: '#FF5722'
  };

  const icons = {
    fresh: '🟢',
    moderate: '🟡',
    stale: '🔴'
  };

  const sizeStyles = {
    small: styles.small,
    medium: styles.medium,
    large: styles.large,
  };

  const textSizes = {
    small: 10,
    medium: 12,
    large: 14,
  };

  return (
    <View style={[styles.container, sizeStyles[size], style]}>
      <Text style={[styles.icon, { fontSize: textSizes[size] }]}>
        {icons[freshnessLevel]}
      </Text>
      {showLabel && (
        <Text style={[
          styles.text, 
          { 
            fontSize: textSizes[size], 
            color: colors[freshnessLevel] 
          }
        ]}>
          {relativeTime}
        </Text>
      )}
    </View>
  );
}

/**
 * Detailed data freshness component with full timestamp
 */
export function DataFreshnessDetailed({ 
  timestamp, 
  maxAge,
  style 
}: DataFreshnessProps) {
  if (!timestamp) {
    return null;
  }

  const now = Date.now();
  const age = now - timestamp;
  const date = new Date(timestamp);
  
  const getFreshnessLevel = (): 'fresh' | 'moderate' | 'stale' => {
    if (!maxAge) {
      if (age < 5 * 60 * 1000) return 'fresh';
      if (age < 60 * 60 * 1000) return 'moderate';
      return 'stale';
    }
    
    if (age < maxAge * 0.5) return 'fresh';
    if (age < maxAge) return 'moderate';
    return 'stale';
  };

  const freshnessLevel = getFreshnessLevel();
  
  const formatFullDate = () => {
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getRelativeTime = () => {
    const seconds = Math.floor(age / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return `${seconds} second${seconds !== 1 ? 's' : ''} ago`;
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  };

  const colors = {
    fresh: '#4CAF50',
    moderate: '#FF9800', 
    stale: '#FF5722'
  };

  const labels = {
    fresh: 'Fresh',
    moderate: 'Moderate',
    stale: 'Stale'
  };

  return (
    <View style={[styles.detailedContainer, style]}>
      <View style={styles.detailedHeader}>
        <View style={[styles.freshnessIndicator, { backgroundColor: colors[freshnessLevel] }]} />
        <Text style={[styles.freshnessLabel, { color: colors[freshnessLevel] }]}>
          {labels[freshnessLevel]}
        </Text>
      </View>
      <Text style={styles.lastUpdated}>Last updated: {formatFullDate()}</Text>
      <Text style={styles.relativeTime}>{getRelativeTime()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  small: {
    // No additional styling
  },
  medium: {
    paddingVertical: 2,
  },
  large: {
    paddingVertical: 4,
  },
  icon: {
    marginRight: 4,
  },
  text: {
    fontWeight: '500',
  },
  detailedContainer: {
    backgroundColor: designTokens.neutrals.bgSurface,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#DDD',
  },
  detailedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  freshnessIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  freshnessLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  lastUpdated: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  relativeTime: {
    fontSize: 11,
    color: '#999',
  },
});