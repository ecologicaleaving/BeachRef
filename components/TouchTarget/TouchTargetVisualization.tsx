/**
 * TouchTargetVisualization
 * Visual debugging and testing component for touch target compliance
 */

import React, { useState, useCallback, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Dimensions,
  TouchableOpacity,
  Modal,
  ScrollView,
  Switch,
} from 'react-native';
import type {
  TouchTargetVisualizationData,
  TouchTargetValidationStatus,
  TouchTargetPriority,
  TouchTargetIssue,
} from '../../types/touchTarget';
import {
  DEFAULT_TOUCH_TARGET_COMPLIANCE,
  auditComponentTouchTargets,
} from '../../utils/touchTargets';

export interface TouchTargetVisualizationProps {
  /**
   * Touch targets to visualize
   */
  touchTargets: TouchTargetVisualizationData[];
  
  /**
   * Visualization settings
   */
  enabled?: boolean;
  showCompliantTargets?: boolean;
  showNonCompliantTargets?: boolean;
  showWarnings?: boolean;
  showDimensions?: boolean;
  showAccessibilityInfo?: boolean;
  
  /**
   * Interaction settings
   */
  onTargetPress?: (target: TouchTargetVisualizationData) => void;
  onIssuePress?: (issue: TouchTargetIssue) => void;
  
  /**
   * Styling
   */
  overlayOpacity?: number;
  compliantColor?: string;
  nonCompliantColor?: string;
  warningColor?: string;
  
  /**
   * Debug panel
   */
  showDebugPanel?: boolean;
  debugPanelPosition?: 'top' | 'bottom' | 'left' | 'right';
}

/**
 * TouchTargetVisualization provides visual debugging for touch target compliance
 */
export const TouchTargetVisualization: React.FC<TouchTargetVisualizationProps> = React.memo(({
  touchTargets = [],
  enabled = __DEV__,
  showCompliantTargets = true,
  showNonCompliantTargets = true,
  showWarnings = true,
  showDimensions = true,
  showAccessibilityInfo = true,
  onTargetPress,
  onIssuePress,
  overlayOpacity = 0.3,
  compliantColor = '#4CAF50',
  nonCompliantColor = '#F44336',
  warningColor = '#FF9800',
  showDebugPanel = false,
  debugPanelPosition = 'bottom',
}) => {
  const [selectedTarget, setSelectedTarget] = useState<TouchTargetVisualizationData | null>(null);
  const [debugPanelVisible, setDebugPanelVisible] = useState(showDebugPanel);
  const [visualizationSettings, setVisualizationSettings] = useState({
    showCompliant: showCompliantTargets,
    showNonCompliant: showNonCompliantTargets,
    showWarnings: showWarnings,
    showDimensions: showDimensions,
    showAccessibility: showAccessibilityInfo,
  });
  
  // Filter touch targets based on settings
  const visibleTargets = useMemo(() => {
    return touchTargets.filter(target => {
      switch (target.compliance) {
        case 'compliant':
          return visualizationSettings.showCompliant;
        case 'non-compliant':
          return visualizationSettings.showNonCompliant;
        case 'warning':
          return visualizationSettings.showWarnings;
        default:
          return true;
      }
    });
  }, [touchTargets, visualizationSettings]);
  
  // Calculate compliance statistics
  const complianceStats = useMemo(() => {
    const stats = touchTargets.reduce((acc, target) => {
      acc.total++;
      acc[target.compliance]++;
      return acc;
    }, {
      total: 0,
      compliant: 0,
      'non-compliant': 0,
      warning: 0,
      unknown: 0,
    });
    
    const complianceScore = stats.total > 0 
      ? Math.round(((stats.compliant + stats.warning * 0.5) / stats.total) * 100)
      : 100;
    
    return { ...stats, complianceScore };
  }, [touchTargets]);
  
  // Get color for touch target based on compliance
  const getTargetColor = useCallback((compliance: TouchTargetValidationStatus): string => {
    switch (compliance) {
      case 'compliant': return compliantColor;
      case 'non-compliant': return nonCompliantColor;
      case 'warning': return warningColor;
      default: return '#9E9E9E';
    }
  }, [compliantColor, nonCompliantColor, warningColor]);
  
  // Handle touch target press
  const handleTargetPress = useCallback((target: TouchTargetVisualizationData) => {
    setSelectedTarget(target);
    onTargetPress?.(target);
  }, [onTargetPress]);
  
  // Handle issue press
  const handleIssuePress = useCallback((issue: TouchTargetIssue) => {
    onIssuePress?.(issue);
  }, [onIssuePress]);
  
  // Render touch target overlay
  const renderTouchTargetOverlay = useCallback((target: TouchTargetVisualizationData) => {
    const targetColor = getTargetColor(target.compliance);
    const isSelected = selectedTarget?.targetId === target.targetId;
    
    return (
      <TouchableOpacity
        key={target.targetId}
        style={[
          styles.touchTargetOverlay,
          {
            left: target.bounds.x,
            top: target.bounds.y,
            width: target.bounds.width,
            height: target.bounds.height,
            backgroundColor: `${targetColor}${Math.round(overlayOpacity * 255).toString(16).padStart(2, '0')}`,
            borderColor: targetColor,
            borderWidth: isSelected ? 3 : 1,
          }
        ]}
        onPress={() => handleTargetPress(target)}
        activeOpacity={0.7}
      >
        {visualizationSettings.showDimensions && (
          <View style={styles.dimensionLabel}>
            <Text style={styles.dimensionText}>
              {target.bounds.width}×{target.bounds.height}
            </Text>
          </View>
        )}
        
        {target.issues.length > 0 && (
          <View style={styles.issueIndicator}>
            <Text style={styles.issueCount}>{target.issues.length}</Text>
          </View>
        )}
        
        {isSelected && (
          <View style={styles.selectionIndicator}>
            <Text style={styles.selectionText}>Selected</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }, [visualizationSettings.showDimensions, overlayOpacity, getTargetColor, selectedTarget, handleTargetPress]);
  
  // Render debug panel
  const renderDebugPanel = () => (
    <View style={[
      styles.debugPanel,
      debugPanelPosition === 'top' && styles.debugPanelTop,
      debugPanelPosition === 'bottom' && styles.debugPanelBottom,
      debugPanelPosition === 'left' && styles.debugPanelLeft,
      debugPanelPosition === 'right' && styles.debugPanelRight,
    ]}>
      <ScrollView style={styles.debugScrollView}>
        <Text style={styles.debugTitle}>Touch Target Debug Panel</Text>
        
        {/* Compliance Statistics */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Compliance Statistics</Text>
          <Text style={styles.statText}>Overall Score: {complianceStats.complianceScore}%</Text>
          <Text style={styles.statText}>Compliant: {complianceStats.compliant}</Text>
          <Text style={styles.statText}>Warnings: {complianceStats.warning}</Text>
          <Text style={styles.statText}>Non-Compliant: {complianceStats['non-compliant']}</Text>
          <Text style={styles.statText}>Total: {complianceStats.total}</Text>
        </View>
        
        {/* Visualization Settings */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Visualization Settings</Text>
          
          <View style={styles.settingRow}>
            <Text>Show Compliant Targets</Text>
            <Switch
              value={visualizationSettings.showCompliant}
              onValueChange={(value) => setVisualizationSettings(prev => ({
                ...prev,
                showCompliant: value
              }))}
            />
          </View>
          
          <View style={styles.settingRow}>
            <Text>Show Non-Compliant Targets</Text>
            <Switch
              value={visualizationSettings.showNonCompliant}
              onValueChange={(value) => setVisualizationSettings(prev => ({
                ...prev,
                showNonCompliant: value
              }))}
            />
          </View>
          
          <View style={styles.settingRow}>
            <Text>Show Warnings</Text>
            <Switch
              value={visualizationSettings.showWarnings}
              onValueChange={(value) => setVisualizationSettings(prev => ({
                ...prev,
                showWarnings: value
              }))}
            />
          </View>
          
          <View style={styles.settingRow}>
            <Text>Show Dimensions</Text>
            <Switch
              value={visualizationSettings.showDimensions}
              onValueChange={(value) => setVisualizationSettings(prev => ({
                ...prev,
                showDimensions: value
              }))}
            />
          </View>
        </View>
        
        {/* Selected Target Details */}
        {selectedTarget && (
          <View style={styles.targetDetailsSection}>
            <Text style={styles.sectionTitle}>Selected Target Details</Text>
            <Text style={styles.detailText}>ID: {selectedTarget.targetId}</Text>
            <Text style={styles.detailText}>Component: {selectedTarget.metadata.componentName}</Text>
            <Text style={styles.detailText}>Type: {selectedTarget.metadata.interactionType}</Text>
            <Text style={styles.detailText}>Compliance: {selectedTarget.compliance}</Text>
            <Text style={styles.detailText}>Priority: {selectedTarget.priority}</Text>
            <Text style={styles.detailText}>
              Dimensions: {selectedTarget.bounds.width}×{selectedTarget.bounds.height}
            </Text>
            
            {selectedTarget.issues.length > 0 && (
              <View style={styles.issuesSection}>
                <Text style={styles.issuesTitle}>Issues:</Text>
                {selectedTarget.issues.map((issue, index) => (
                  <TouchableOpacity
                    key={issue.id}
                    style={styles.issueItem}
                    onPress={() => handleIssuePress(issue)}
                  >
                    <Text style={[styles.issueText, { color: issue.severity === 'error' ? nonCompliantColor : warningColor }]}>
                      {issue.severity.toUpperCase()}: {issue.message}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
      
      <TouchableOpacity
        style={styles.closePanelButton}
        onPress={() => setDebugPanelVisible(false)}
      >
        <Text style={styles.closePanelText}>Close</Text>
      </TouchableOpacity>
    </View>
  );
  
  // Don't render if not enabled
  if (!enabled) {
    return null;
  }
  
  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: 'box-none' }]}>
      {/* Touch target overlays */}
      {visibleTargets.map(renderTouchTargetOverlay)}
      
      {/* Debug panel toggle button */}
      {!debugPanelVisible && (
        <TouchableOpacity
          style={styles.debugToggleButton}
          onPress={() => setDebugPanelVisible(true)}
        >
          <Text style={styles.debugToggleText}>
            Debug ({complianceStats.complianceScore}%)
          </Text>
        </TouchableOpacity>
      )}
      
      {/* Debug panel modal */}
      {debugPanelVisible && (
        <Modal
          visible={debugPanelVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setDebugPanelVisible(false)}
        >
          {renderDebugPanel()}
        </Modal>
      )}
    </View>
  );
});

TouchTargetVisualization.displayName = 'TouchTargetVisualization';

const styles = StyleSheet.create({
  touchTargetOverlay: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
  },
  dimensionLabel: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 2,
    borderRadius: 2,
  },
  dimensionText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  issueIndicator: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#F44336',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  issueCount: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  selectionIndicator: {
    position: 'absolute',
    bottom: -20,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    padding: 4,
    borderRadius: 4,
  },
  selectionText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  debugToggleButton: {
    position: 'absolute',
    top: 50,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 8,
    borderRadius: 20,
    zIndex: 1000,
  },
  debugToggleText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  debugPanel: {
    backgroundColor: 'white',
    borderRadius: 8,
    margin: 20,
    maxHeight: '80%',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  debugPanelTop: {
    marginTop: 50,
    marginBottom: 'auto',
  },
  debugPanelBottom: {
    marginTop: 'auto',
    marginBottom: 50,
  },
  debugPanelLeft: {
    marginRight: 'auto',
    width: '50%',
  },
  debugPanelRight: {
    marginLeft: 'auto',
    width: '50%',
  },
  debugScrollView: {
    maxHeight: '90%',
  },
  debugTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  statsSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  settingsSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  targetDetailsSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  statText: {
    fontSize: 14,
    marginVertical: 2,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 8,
  },
  detailText: {
    fontSize: 14,
    marginVertical: 2,
  },
  issuesSection: {
    marginTop: 12,
  },
  issuesTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  issueItem: {
    padding: 8,
    backgroundColor: '#F5F5F5',
    marginVertical: 2,
    borderRadius: 4,
  },
  issueText: {
    fontSize: 12,
  },
  closePanelButton: {
    backgroundColor: '#2196F3',
    padding: 12,
    alignItems: 'center',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  closePanelText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default TouchTargetVisualization;