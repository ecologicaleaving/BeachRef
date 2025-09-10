import React, { useState, useCallback } from 'react';
import { View, ScrollView, RefreshControl, StyleSheet, Text } from 'react-native';
import { useAnalyticsDashboard } from '../../hooks/useAnalyticsDashboard';
import { AnalyticsWidget } from './AnalyticsWidget';
import { AnalyticsRefreshIndicator } from './AnalyticsRefreshIndicator';
import { Container } from '../Foundation/Container';
import { GracefulErrorBoundary } from '../GracefulErrorBoundary';

/**
 * Analytics Customization Interface
 * Following Story 4.3 specifications
 */
export interface AnalyticsCustomization {
  timeRange: { start: string; end: string };
  showTournamentAnalytics: boolean;
  showRefereeAnalytics: boolean;
  showPerformanceMetrics: boolean;
  refreshInterval: number;
  widgetLayout: 'grid' | 'list';
}

/**
 * Analytics Dashboard Data Interface
 * Combines tournament and referee analytics following Story 4.3 specifications
 */
export interface AnalyticsDashboardData {
  tournamentAnalytics: any; // Will be enhanced when tournament analytics are available
  refereeAnalytics: any[];
  lastUpdated: string;
  source: 'database' | 'cache';
  performance: { queryTime: number };
}

/**
 * Analytics Dashboard Props Interface
 * Following Story 4.3 component specifications
 */
export interface AnalyticsDashboardProps {
  timeRange?: { start: string; end: string };
  customizations?: AnalyticsCustomization;
  refreshInterval?: number;
  enableRealTimeUpdates?: boolean;
}

/**
 * Main Analytics Dashboard Component
 * Integrates tournament and referee analytics with real-time updates
 * Following Epic 4 Story 3 requirements
 */
export function AnalyticsDashboard({
  timeRange,
  customizations,
  refreshInterval = 30000, // 30 seconds for real-time updates
  enableRealTimeUpdates = true,
}: AnalyticsDashboardProps) {
  // Default customizations following Story 4.3 specifications
  const defaultCustomizations: AnalyticsCustomization = {
    timeRange: timeRange || {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Last 30 days
      end: new Date().toISOString().split('T')[0],
    },
    showTournamentAnalytics: true,
    showRefereeAnalytics: true,
    showPerformanceMetrics: true,
    refreshInterval,
    widgetLayout: 'grid',
  };

  const activeCustomizations = {
    ...defaultCustomizations,
    ...customizations,
  };

  const [currentView, setCurrentView] = useState<'overview' | 'tournaments' | 'referees'>('overview');

  // Use the new analytics dashboard hook with real-time updates
  const {
    data: dashboardData,
    isLoading,
    error: dashboardError,
    isRefreshing,
    performance,
    actions: { refresh: handleRefresh },
    status,
  } = useAnalyticsDashboard(activeCustomizations.timeRange, {
    enableRealTimeUpdates,
    refreshInterval: activeCustomizations.refreshInterval,
    enablePerformanceMonitoring: true,
    autoRefresh: true,
    cacheStrategy: 'live',
  });

  // Navigation between different analytics views
  const handleViewChange = useCallback((view: 'overview' | 'tournaments' | 'referees') => {
    setCurrentView(view);
  }, []);

  // Extract data for components
  const hasError = dashboardError;

  return (
    <GracefulErrorBoundary>
      <Container style={styles.container}>
        {/* Analytics refresh indicator following Story 4.3 AC6 */}
        <AnalyticsRefreshIndicator
          lastUpdated={status.lastUpdated}
          source={status.source}
          isRefreshing={isRefreshing}
          onRefresh={handleRefresh}
          performance={performance}
        />

        {/* Navigation between analytics views */}
        <View style={styles.navigationBar}>
          <Text 
            style={[styles.navButton, currentView === 'overview' && styles.activeNavButton]}
            onPress={() => handleViewChange('overview')}
          >
            Overview
          </Text>
          {activeCustomizations.showTournamentAnalytics && (
            <Text 
              style={[styles.navButton, currentView === 'tournaments' && styles.activeNavButton]}
              onPress={() => handleViewChange('tournaments')}
            >
              Tournaments
            </Text>
          )}
          {activeCustomizations.showRefereeAnalytics && (
            <Text 
              style={[styles.navButton, currentView === 'referees' && styles.activeNavButton]}
              onPress={() => handleViewChange('referees')}
            >
              Referees
            </Text>
          )}
        </View>

        <ScrollView 
          style={styles.scrollView}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor="#007AFF"
            />
          }
        >
          {/* Error State */}
          {hasError && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>
                Failed to load analytics data. Pull to refresh.
              </Text>
            </View>
          )}

          {/* Overview View */}
          {currentView === 'overview' && (
            <View style={styles.widgetContainer}>
              {activeCustomizations.showRefereeAnalytics && (
                <AnalyticsWidget
                  type="referee"
                  data={dashboardData?.refereeAnalytics || []}
                  loading={isLoading}
                  onRefresh={handleRefresh}
                  onDrillDown={() => handleViewChange('referees')}
                />
              )}
              
              {activeCustomizations.showPerformanceMetrics && (
                <AnalyticsWidget
                  type="performance"
                  data={dashboardData}
                  loading={isLoading}
                  onRefresh={handleRefresh}
                />
              )}

              {activeCustomizations.showTournamentAnalytics && (
                <AnalyticsWidget
                  type="tournament"
                  data={dashboardData?.tournamentAnalytics}
                  loading={isLoading}
                  onRefresh={handleRefresh}
                  onDrillDown={() => handleViewChange('tournaments')}
                />
              )}
            </View>
          )}

          {/* Referee Analytics View */}
          {currentView === 'referees' && activeCustomizations.showRefereeAnalytics && (
            <View style={styles.widgetContainer}>
              <AnalyticsWidget
                type="referee"
                data={dashboardData?.refereeAnalytics || []}
                loading={isLoading}
                onRefresh={handleRefresh}
                expanded={true}
              />
            </View>
          )}

          {/* Tournament Analytics View (placeholder for future enhancement) */}
          {currentView === 'tournaments' && activeCustomizations.showTournamentAnalytics && (
            <View style={styles.widgetContainer}>
              <AnalyticsWidget
                type="tournament"
                data={dashboardData?.tournamentAnalytics}
                loading={isLoading}
                onRefresh={handleRefresh}
                expanded={true}
              />
            </View>
          )}

          {/* Loading State */}
          {isLoading && (!dashboardData?.refereeAnalytics || dashboardData.refereeAnalytics.length === 0) && (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading analytics data...</Text>
            </View>
          )}
        </ScrollView>
      </Container>
    </GracefulErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  navigationBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  navButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    textAlign: 'center',
  },
  activeNavButton: {
    backgroundColor: '#007AFF',
    color: 'white',
  },
  scrollView: {
    flex: 1,
  },
  widgetContainer: {
    padding: 16,
    gap: 16,
  },
  errorContainer: {
    padding: 20,
    alignItems: 'center',
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 16,
    textAlign: 'center',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
  },
});