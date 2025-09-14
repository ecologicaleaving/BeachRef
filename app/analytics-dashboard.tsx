import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AnalyticsDashboard } from '../components/Analytics';
import { NavigationHeader } from '../components/navigation/NavigationHeader';
import { useAnalyticsSettings } from '../hooks/useAnalyticsSettings';

/**
 * Analytics Dashboard Screen
 * Following Story 4.3 AC3 - Navigation integration with existing app navigation
 * Uses Expo Router patterns established in existing screens
 */
export default function AnalyticsDashboardScreen() {
  // Load analytics settings for dashboard customization
  const { settings } = useAnalyticsSettings();

  const defaultTimeRange = {
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Last 30 days
    end: new Date().toISOString().split('T')[0],
  };

  return (
    <View style={styles.container}>
      <NavigationHeader
        title="Analytics Dashboard"
        showBackButton={true}
        rightComponent={null}
        showStatusBar={false}
      />
      
      <AnalyticsDashboard
        timeRange={settings?.timeRange || defaultTimeRange}
        customizations={settings?.customizations}
        enableRealTimeUpdates={settings?.enableRealTimeUpdates ?? true}
        refreshInterval={settings?.refreshInterval ?? 30000}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
});