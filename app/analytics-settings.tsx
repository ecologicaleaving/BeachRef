import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AnalyticsSettings } from '../components/Analytics';
import { NavigationHeader } from '../components/navigation/NavigationHeader';

/**
 * Analytics Settings Screen
 * Following Story 4.3 AC4 - Analytics settings and customization options
 * Uses Expo Router patterns established in existing screens
 */
export default function AnalyticsSettingsScreen() {
  return (
    <View style={styles.container}>
      <NavigationHeader
        title="Analytics Settings"
        showBackButton={true}
        rightComponent={null}
      />
      
      <AnalyticsSettings showAdvanced={true} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
});