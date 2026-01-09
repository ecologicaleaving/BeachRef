import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Text,
  ActivityIndicator,
} from 'react-native';
import { Button } from '../Foundation/Button';
import { Container } from '../Foundation/Container';
import { useAnalyticsSettings } from '../../hooks/useAnalyticsSettings';
import type { AnalyticsCustomization } from './AnalyticsDashboard';
import { designTokens } from '../../theme/tokens';

/**
 * Analytics Settings Props Interface
 * Following Story 4.3 component specifications
 */
export interface AnalyticsSettingsProps {
  preferences?: any;
  onPreferencesChange?: (preferences: any) => void;
  onReset?: () => void;
  showAdvanced?: boolean;
}

/**
 * Time Range Option Interface
 */
interface TimeRangeOption {
  label: string;
  value: string;
  days: number;
}

/**
 * Refresh Interval Option Interface
 */
interface RefreshIntervalOption {
  label: string;
  value: number;
  description: string;
}

/**
 * Analytics Settings Component
 * User customization interface for analytics dashboard
 * Following Story 4.3 AC4 requirements
 */
export function AnalyticsSettings({
  onPreferencesChange: externalOnChange,
  onReset: externalOnReset,
  showAdvanced = true,
}: AnalyticsSettingsProps) {
  const {
    settings,
    isLoading,
    error,
    updateSettings,
    resetSettings,
    exportSettings,
  } = useAnalyticsSettings();

  const [isExporting, setIsExporting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Time range options for analytics data (last 7 days, 30 days, season)
  const timeRangeOptions: TimeRangeOption[] = [
    { label: 'Last 7 days', value: 'week', days: 7 },
    { label: 'Last 30 days', value: 'month', days: 30 },
    { label: 'Last 90 days', value: 'quarter', days: 90 },
    { label: 'Current season', value: 'season', days: 365 },
  ];

  // Refresh interval options following Epic 4 real-time requirements
  const refreshIntervalOptions: RefreshIntervalOption[] = [
    { label: 'Real-time (30s)', value: 30000, description: 'Updates every 30 seconds' },
    { label: 'Frequent (1m)', value: 60000, description: 'Updates every minute' },
    { label: 'Moderate (5m)', value: 300000, description: 'Updates every 5 minutes' },
    { label: 'Conservative (15m)', value: 900000, description: 'Updates every 15 minutes' },
  ];

  // Current time range based on settings
  const getCurrentTimeRange = (): string => {
    if (!settings?.timeRange) return 'month';
    
    const daysDiff = Math.ceil(
      (new Date(settings.timeRange.end).getTime() - new Date(settings.timeRange.start).getTime()) / 
      (1000 * 60 * 60 * 24)
    );
    
    const option = timeRangeOptions.find(opt => Math.abs(opt.days - daysDiff) <= 1);
    return option?.value || 'month';
  };

  // Update time range selection
  const handleTimeRangeChange = useCallback(async (optionValue: string) => {
    const option = timeRangeOptions.find(opt => opt.value === optionValue);
    if (!option) return;

    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - option.days * 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0];

    try {
      await updateSettings({
        timeRange: { start: startDate, end: endDate },
        customizations: {
          ...settings?.customizations,
          timeRange: { start: startDate, end: endDate },
        },
      });

      if (externalOnChange) {
        externalOnChange({ timeRange: { start: startDate, end: endDate } });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update time range setting');
    }
  }, [settings, updateSettings, externalOnChange]);

  // Update refresh interval
  const handleRefreshIntervalChange = useCallback(async (interval: number) => {
    try {
      await updateSettings({
        refreshInterval: interval,
        customizations: {
          ...settings?.customizations,
          refreshInterval: interval,
        },
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to update refresh interval');
    }
  }, [settings, updateSettings]);

  // Toggle analytics widget visibility
  const handleWidgetVisibilityChange = useCallback(async (
    widget: keyof AnalyticsCustomization,
    visible: boolean
  ) => {
    if (!settings?.customizations) return;

    try {
      await updateSettings({
        customizations: {
          ...settings.customizations,
          [widget]: visible,
        },
      });

      if (externalOnChange) {
        externalOnChange({ [widget]: visible });
      }
    } catch (error) {
      Alert.alert('Error', `Failed to update ${widget} setting`);
    }
  }, [settings, updateSettings, externalOnChange]);

  // Toggle real-time updates
  const handleRealTimeToggle = useCallback(async (enabled: boolean) => {
    try {
      await updateSettings({ enableRealTimeUpdates: enabled });
    } catch (error) {
      Alert.alert('Error', 'Failed to update real-time updates setting');
    }
  }, [updateSettings]);

  // Export settings
  const handleExportSettings = useCallback(async () => {
    setIsExporting(true);
    try {
      await exportSettings();

      // For demo purposes, show the exported settings
      // In production, this would save to file or share
      Alert.alert(
        'Settings Exported',
        'Settings exported successfully. In production, this would save to a file.',
        [{ text: 'OK', style: 'default' }]
      );
      
    } catch (error) {
      Alert.alert('Error', 'Failed to export settings');
    } finally {
      setIsExporting(false);
    }
  }, [exportSettings]);

  // Reset settings to defaults
  const handleResetSettings = useCallback(async () => {
    Alert.alert(
      'Reset Settings',
      'Are you sure you want to reset all analytics settings to defaults?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            setIsResetting(true);
            try {
              await resetSettings();
              
              if (externalOnReset) {
                externalOnReset();
              }
              
              Alert.alert('Success', 'Settings reset to defaults');
            } catch (error) {
              Alert.alert('Error', 'Failed to reset settings');
            } finally {
              setIsResetting(false);
            }
          },
        },
      ]
    );
  }, [resetSettings, externalOnReset]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading settings...</Text>
      </View>
    );
  }

  if (!settings) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load settings</Text>
        <Button title="Retry" onPress={() => window.location.reload()} />
      </View>
    );
  }

  return (
    <Container style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Time Range Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Time Range</Text>
          <Text style={styles.sectionDescription}>
            Select the time period for analytics data
          </Text>
          
          {timeRangeOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.optionButton,
                getCurrentTimeRange() === option.value && styles.selectedOption,
              ]}
              onPress={() => handleTimeRangeChange(option.value)}
            >
              <Text
                style={[
                  styles.optionText,
                  getCurrentTimeRange() === option.value && styles.selectedOptionText,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Widget Visibility Toggles */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Analytics Widgets</Text>
          <Text style={styles.sectionDescription}>
            Choose which analytics widgets to display
          </Text>

          <View style={styles.toggleItem}>
            <View style={styles.toggleContent}>
              <Text style={styles.toggleLabel}>Tournament Analytics</Text>
              <Text style={styles.toggleDescription}>Show tournament participation trends</Text>
            </View>
            <Switch
              value={settings.customizations?.showTournamentAnalytics ?? true}
              onValueChange={(value) => handleWidgetVisibilityChange('showTournamentAnalytics', value)}
              trackColor={{ false: '#d1d5db', true: '#3b82f6' }}
            />
          </View>

          <View style={styles.toggleItem}>
            <View style={styles.toggleContent}>
              <Text style={styles.toggleLabel}>Referee Analytics</Text>
              <Text style={styles.toggleDescription}>Show referee performance metrics</Text>
            </View>
            <Switch
              value={settings.customizations?.showRefereeAnalytics ?? true}
              onValueChange={(value) => handleWidgetVisibilityChange('showRefereeAnalytics', value)}
              trackColor={{ false: '#d1d5db', true: '#3b82f6' }}
            />
          </View>

          <View style={styles.toggleItem}>
            <View style={styles.toggleContent}>
              <Text style={styles.toggleLabel}>Performance Metrics</Text>
              <Text style={styles.toggleDescription}>Show system performance data</Text>
            </View>
            <Switch
              value={settings.customizations?.showPerformanceMetrics ?? true}
              onValueChange={(value) => handleWidgetVisibilityChange('showPerformanceMetrics', value)}
              trackColor={{ false: '#d1d5db', true: '#3b82f6' }}
            />
          </View>
        </View>

        {/* Real-time Updates */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Real-time Updates</Text>
          <Text style={styles.sectionDescription}>
            Configure automatic data refresh behavior
          </Text>

          <View style={styles.toggleItem}>
            <View style={styles.toggleContent}>
              <Text style={styles.toggleLabel}>Enable Real-time Updates</Text>
              <Text style={styles.toggleDescription}>Automatically refresh analytics data</Text>
            </View>
            <Switch
              value={settings.enableRealTimeUpdates}
              onValueChange={handleRealTimeToggle}
              trackColor={{ false: '#d1d5db', true: '#3b82f6' }}
            />
          </View>

          {settings.enableRealTimeUpdates && (
            <View style={styles.subsection}>
              <Text style={styles.subsectionTitle}>Refresh Interval</Text>
              {refreshIntervalOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.optionButton,
                    settings.refreshInterval === option.value && styles.selectedOption,
                  ]}
                  onPress={() => handleRefreshIntervalChange(option.value)}
                >
                  <View>
                    <Text
                      style={[
                        styles.optionText,
                        settings.refreshInterval === option.value && styles.selectedOptionText,
                      ]}
                    >
                      {option.label}
                    </Text>
                    <Text style={styles.optionDescription}>
                      {option.description}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Advanced Settings */}
        {showAdvanced && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Advanced</Text>
            <Text style={styles.sectionDescription}>
              Import, export, and reset settings
            </Text>

            <View style={styles.buttonGroup}>
              <Button
                title={isExporting ? 'Exporting...' : 'Export Settings'}
                onPress={handleExportSettings}
                disabled={isExporting}
                style={[styles.actionButton, styles.secondaryButton]}
              />

              <Button
                title={isResetting ? 'Resetting...' : 'Reset to Defaults'}
                onPress={handleResetSettings}
                disabled={isResetting}
                style={[styles.actionButton, styles.dangerButton]}
              />
            </View>

            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error.message}</Text>
              </View>
            )}
          </View>
        )}

        {/* Settings Info */}
        <View style={styles.infoSection}>
          <Text style={styles.infoText}>
            Last updated: {new Date(settings.lastUpdated).toLocaleString()}
          </Text>
          <Text style={styles.infoText}>
            Real-time updates: {settings.enableRealTimeUpdates ? 'Enabled' : 'Disabled'}
          </Text>
          <Text style={styles.infoText}>
            Refresh interval: {settings.refreshInterval / 1000}s
          </Text>
        </View>
      </ScrollView>
    </Container>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: designTokens.neutrals.textPrimary,
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    color: designTokens.neutrals.textSecondary,
    marginBottom: 16,
  },
  subsection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: designTokens.neutrals.textPrimary,
    marginBottom: 12,
  },
  optionButton: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 8,
    backgroundColor: 'white',
  },
  selectedOption: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  optionText: {
    fontSize: 16,
    color: designTokens.neutrals.textPrimary,
    fontWeight: '500',
  },
  selectedOptionText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  optionDescription: {
    fontSize: 12,
    color: designTokens.neutrals.textSecondary,
    marginTop: 2,
  },
  toggleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  toggleContent: {
    flex: 1,
    paddingRight: 16,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: designTokens.neutrals.textPrimary,
  },
  toggleDescription: {
    fontSize: 14,
    color: designTokens.neutrals.textSecondary,
    marginTop: 2,
  },
  buttonGroup: {
    gap: 12,
  },
  actionButton: {
    marginVertical: 4,
  },
  secondaryButton: {
    backgroundColor: '#6c757d',
  },
  dangerButton: {
    backgroundColor: '#dc3545',
  },
  infoSection: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    marginBottom: 24,
  },
  infoText: {
    fontSize: 12,
    color: designTokens.neutrals.textSecondary,
    marginBottom: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: designTokens.neutrals.textSecondary,
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#d32f2f',
    textAlign: 'center',
    marginBottom: 16,
  },
});