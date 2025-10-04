import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { RealtimePerformanceMonitor } from '../services/RealtimePerformanceMonitor';
import { colors } from '../theme/tokens';

interface PerformanceDashboardProps {
  visible: boolean;
  onClose: () => void;
}

const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({
  visible,
  onClose,
}) => {
  const [metrics, setMetrics] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<string[]>([]);

  useEffect(() => {
    if (visible) {
      const updateMetrics = () => {
        const performanceMetrics = RealtimePerformanceMonitor.getPerformanceMetrics();
        const optimizationRecs = RealtimePerformanceMonitor.getOptimizationRecommendations();
        
        setMetrics(performanceMetrics);
        setRecommendations(optimizationRecs);
      };

      updateMetrics();
      
      // Update metrics every 5 seconds while dashboard is open
      const interval = setInterval(updateMetrics, 5000);
      
      return () => clearInterval(interval);
    }
  }, [visible]);

  const getMetricColor = (value: number, threshold: number, reverse: boolean = false) => {
    const isGood = reverse ? value < threshold : value > threshold;
    return isGood ? colors.success : colors.error;
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!metrics) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Real-Time Performance</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {/* Connection Metrics */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📡 Connection Performance</Text>
            <View style={styles.metricsGrid}>
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>Success Rate</Text>
                <Text style={[
                  styles.metricValue,
                  { color: getMetricColor(metrics.connectionSuccessRate, 80) }
                ]}>
                  {metrics.connectionSuccessRate.toFixed(1)}%
                </Text>
              </View>
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>Attempts</Text>
                <Text style={styles.metricValue}>{metrics.connectionAttempts}</Text>
              </View>
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>Failed</Text>
                <Text style={[
                  styles.metricValue,
                  { color: getMetricColor(metrics.failedConnections, 5, true) }
                ]}>
                  {metrics.failedConnections}
                </Text>
              </View>
            </View>
          </View>

          {/* Data Transfer Metrics */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📊 Data Transfer</Text>
            <View style={styles.metricsGrid}>
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>Messages</Text>
                <Text style={styles.metricValue}>{metrics.totalMessagesReceived}</Text>
              </View>
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>Data Volume</Text>
                <Text style={styles.metricValue}>
                  {formatBytes(metrics.totalBytesReceived)}
                </Text>
              </View>
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>Avg Size</Text>
                <Text style={styles.metricValue}>
                  {formatBytes(metrics.averageMessageSize)}
                </Text>
              </View>
            </View>
          </View>

          {/* Battery Optimization */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔋 Battery Optimization</Text>
            <View style={styles.metricsGrid}>
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>Background Events</Text>
                <Text style={styles.metricValue}>
                  {metrics.batteryOptimizationEvents}
                </Text>
              </View>
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>Background Disconnects</Text>
                <Text style={styles.metricValue}>
                  {metrics.backgroundDisconnections}
                </Text>
              </View>
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>Foreground Reconnects</Text>
                <Text style={styles.metricValue}>
                  {metrics.foregroundReconnections}
                </Text>
              </View>
            </View>
            
            <View style={styles.statusIndicator}>
              <Text style={styles.statusLabel}>Current State:</Text>
              <View style={[
                styles.statusBadge,
                {
                  backgroundColor: metrics.isBackgroundOptimized
                    ? colors.warning
                    : colors.success
                }
              ]}>
                <Text style={styles.statusText}>
                  {metrics.isBackgroundOptimized ? 'Battery Optimized' : 'Normal Operation'}
                </Text>
              </View>
            </View>
          </View>

          {/* Resource Usage */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⚡ Resource Usage</Text>
            <View style={styles.metricsGrid}>
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>Active Rate Limiters</Text>
                <Text style={[
                  styles.metricValue,
                  { color: getMetricColor(metrics.activeRateLimiters, 3, true) }
                ]}>
                  {metrics.activeRateLimiters}
                </Text>
              </View>
            </View>
          </View>

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>💡 Recommendations</Text>
              {recommendations.map((recommendation, index) => (
                <View key={index} style={styles.recommendation}>
                  <Text style={styles.recommendationText}>• {recommendation}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Performance Status */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🎯 Overall Performance</Text>
            <View style={styles.overallStatus}>
              <View style={[
                styles.performanceIndicator,
                {
                  backgroundColor: RealtimePerformanceMonitor.shouldOptimizeForBattery()
                    ? colors.warning
                    : colors.success
                }
              ]}>
                <Text style={styles.performanceText}>
                  {RealtimePerformanceMonitor.shouldOptimizeForBattery()
                    ? '⚠️ Optimization Recommended'
                    : '✅ Performance Good'
                  }
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

/**
 * Compact performance indicator for headers
 */
export const PerformanceIndicator: React.FC<{
  onPress?: () => void;
}> = ({ onPress }) => {
  const [shouldOptimize, setShouldOptimize] = useState(false);

  useEffect(() => {
    const checkPerformance = () => {
      setShouldOptimize(RealtimePerformanceMonitor.shouldOptimizeForBattery());
    };

    checkPerformance();
    const interval = setInterval(checkPerformance, 30000); // Check every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  return (
    <TouchableOpacity style={styles.compactIndicator} onPress={onPress}>
      <Text style={styles.compactIndicatorText}>
        {shouldOptimize ? '⚡' : '🔋'}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 10,
  },
  closeButtonText: {
    fontSize: 18,
    color: '#666',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metric: {
    flex: 1,
    minWidth: 80,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    textAlign: 'center',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  statusLabel: {
    fontSize: 14,
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  recommendation: {
    paddingVertical: 4,
  },
  recommendationText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  overallStatus: {
    alignItems: 'center',
  },
  performanceIndicator: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  performanceText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  compactIndicator: {
    padding: 4,
  },
  compactIndicatorText: {
    fontSize: 16,
  },
});

export default PerformanceDashboard;