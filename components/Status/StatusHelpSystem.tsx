/**
 * StatusHelpSystem Component
 * Story 2.4: Professional Status Indicator System
 * 
 * Interactive help system for status indicators with accessibility features
 */

import React from 'react';
import { View, Text, ScrollView, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { StatusType} from '../../types/status';
import { AccessibilityStatusIndicator } from './AccessibilityStatusIndicator';
import { designTokens } from '../../theme/tokens';
import { 
  _getStatusText, 
  _getStatusCategory,
  isAssignmentStatus,
  isMatchStatus,
  isSystemStatus,
  isUrgencyStatus,
} from '../../utils/statusIndicators';
import { UtilityIcons } from '../Icons/IconLibrary';

// Status help information
export interface StatusHelpInfo {
  type: StatusType;
  title: string;
  description: string;
  usage: string;
  accessibility: string;
  examples?: string[];
}

// Complete status help database
const statusHelpDatabase: StatusHelpInfo[] = [
  // Assignment statuses
  {
    type: 'current',
    title: 'Current Assignment',
    description: 'Indicates an assignment that is currently active and requires immediate attention.',
    usage: 'Used to highlight the referee\'s current active assignment on match cards and lists.',
    accessibility: 'High contrast color with dot pattern for color-blind users. Screen reader announces "Current assignment status".',
    examples: ['Match starting now', 'Currently officiating', 'Active court assignment'],
  },
  {
    type: 'upcoming',
    title: 'Upcoming Assignment',
    description: 'Shows assignments scheduled for the future that the referee should prepare for.',
    usage: 'Displayed on assignment cards to help referees plan their schedule.',
    accessibility: 'Professional blue color with stripe pattern for color-blind users.',
    examples: ['Next match in 30 minutes', 'Tomorrow\'s assignment', 'Scheduled for later'],
  },
  {
    type: 'completed',
    title: 'Completed Assignment',
    description: 'Indicates assignments that have been successfully completed.',
    usage: 'Used to show assignment history and completed matches.',
    accessibility: 'Success green color, no pattern needed as completed state is typically clear.',
    examples: ['Match finished', 'Results submitted', 'Assignment completed'],
  },
  {
    type: 'cancelled',
    title: 'Cancelled Assignment',
    description: 'Shows assignments that have been cancelled and no longer require attention.',
    usage: 'Helps referees understand schedule changes and cancelled matches.',
    accessibility: 'High contrast color with diagonal pattern for clear visual distinction.',
    examples: ['Match cancelled', 'Court unavailable', 'Weather cancellation'],
  },
  {
    type: 'changed',
    title: 'Changed Assignment',
    description: 'Indicates assignments that have been modified and require review.',
    usage: 'Alerts referees to assignment changes such as time, court, or team modifications.',
    accessibility: 'Warning color with dot pattern to draw attention to changes.',
    examples: ['Time changed', 'Court reassigned', 'Team substitution'],
  },
  
  // Match statuses
  {
    type: 'pre-match',
    title: 'Pre-Match Preparation',
    description: 'Indicates matches in preparation phase before official start.',
    usage: 'Used during warm-up periods and pre-match briefings.',
    accessibility: 'Secondary color with stripe pattern for pre-game identification.',
    examples: ['Warm-up period', 'Equipment check', 'Team briefing'],
  },
  {
    type: 'in-progress',
    title: 'Match In Progress',
    description: 'Shows matches that are currently being played.',
    usage: 'Highlights active matches requiring ongoing officiation.',
    accessibility: 'High visibility color with pulsing animation and dot pattern.',
    examples: ['Live match', 'Currently playing', 'Set in progress'],
  },
  {
    type: 'delayed',
    title: 'Match Delayed',
    description: 'Indicates matches that have been postponed but not cancelled.',
    usage: 'Helps referees understand schedule disruptions and wait times.',
    accessibility: 'Warning color with diagonal pattern for clear delay indication.',
    examples: ['Weather delay', 'Equipment issue', 'Previous match running long'],
  },
  {
    type: 'suspended',
    title: 'Match Suspended',
    description: 'Shows matches that have been temporarily stopped.',
    usage: 'Used when matches are paused due to external factors.',
    accessibility: 'Error color with diagonal pattern for urgent attention.',
    examples: ['Rain suspension', 'Medical timeout', 'Technical issue'],
  },
  
  // System statuses
  {
    type: 'online',
    title: 'System Online',
    description: 'Indicates the app is connected and all systems are operational.',
    usage: 'Provides confidence that data is current and sync is working.',
    accessibility: 'Success color without pattern as online state is positive.',
    examples: ['Connected to server', 'Real-time updates', 'Sync active'],
  },
  {
    type: 'offline',
    title: 'System Offline',
    description: 'Shows when the app is disconnected from the server.',
    usage: 'Alerts referees that data may be outdated and sync is not available.',
    accessibility: 'Muted color with diagonal pattern indicating disconnection.',
    examples: ['No internet connection', 'Server unavailable', 'Airplane mode'],
  },
  {
    type: 'sync-pending',
    title: 'Sync Pending',
    description: 'Indicates data synchronization is in progress.',
    usage: 'Shows when the app is working to update or upload data.',
    accessibility: 'Warning color with pulsing animation and dot pattern.',
    examples: ['Uploading results', 'Downloading updates', 'Synchronizing data'],
  },
  {
    type: 'error',
    title: 'System Error',
    description: 'Indicates a system error that requires attention.',
    usage: 'Alerts referees to technical issues that may affect functionality.',
    accessibility: 'Error color with diagonal pattern for urgent attention.',
    examples: ['Connection failed', 'Upload error', 'Data corruption'],
  },
  
  // Urgency statuses
  {
    type: 'critical',
    title: 'Critical Alert',
    description: 'Highest priority alert requiring immediate action.',
    usage: 'Used for emergency situations and time-critical issues.',
    accessibility: 'Emergency color with pulsing animation and icon pattern for maximum visibility.',
    examples: ['Emergency on court', 'Urgent schedule change', 'Safety issue'],
  },
  {
    type: 'warning',
    title: 'Warning Notice',
    description: 'Important notice that requires attention but not immediately critical.',
    usage: 'Alerts referees to potential issues or important information.',
    accessibility: 'Warning color with icon pattern for clear identification.',
    examples: ['Weather watch', 'Equipment issue', 'Schedule conflict'],
  },
  {
    type: 'action-required',
    title: 'Action Required',
    description: 'Indicates that the referee needs to take specific action.',
    usage: 'Prompts referees to complete tasks or respond to requests.',
    accessibility: 'Accent color with icon pattern to encourage interaction.',
    examples: ['Submit results', 'Confirm assignment', 'Update availability'],
  },
];

// Status help modal
export interface StatusHelpModalProps {
  visible: boolean;
  onClose: () => void;
  initialStatus?: StatusType;
  showAccessibilityInfo?: boolean;
  testID?: string;
}

export const StatusHelpModal = React.memo<StatusHelpModalProps>(({
  visible,
  onClose,
  initialStatus,
  showAccessibilityInfo = true,
  testID = 'status-help-modal',
}) => {
  const [selectedCategory, setSelectedCategory] = React.useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = React.useState<StatusType | null>(initialStatus || null);
  
  const categories = React.useMemo(() => [
    { id: 'assignment', label: 'Assignment Status', statuses: statusHelpDatabase.filter(s => isAssignmentStatus(s.type)) },
    { id: 'match', label: 'Match Status', statuses: statusHelpDatabase.filter(s => isMatchStatus(s.type)) },
    { id: 'system', label: 'System Status', statuses: statusHelpDatabase.filter(s => isSystemStatus(s.type)) },
    { id: 'urgency', label: 'Urgency Alerts', statuses: statusHelpDatabase.filter(s => isUrgencyStatus(s.type)) },
  ], []);
  
  const selectedStatusInfo = React.useMemo(() => {
    return selectedStatus ? statusHelpDatabase.find(s => s.type === selectedStatus) : null;
  }, [selectedStatus]);
  
  const renderCategoryList = () => (
    <ScrollView style={styles.categoryList} testID={`${testID}-categories`}>
      <Text style={styles.modalTitle}>Status Indicator Help</Text>
      <Text style={styles.modalSubtitle}>
        Select a category to learn about different status indicators
      </Text>
      
      {categories.map((category) => (
        <TouchableOpacity
          key={category.id}
          style={styles.categoryItem}
          onPress={() => setSelectedCategory(category.id)}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={`View ${category.label} help`}
          testID={`${testID}-category-${category.id}`}
        >
          <Text style={styles.categoryLabel}>{category.label}</Text>
          <Text style={styles.categoryCount}>
            {category.statuses.length} indicators
          </Text>
        </TouchableOpacity>
      ))}
      
      {showAccessibilityInfo && (
        <View style={styles.accessibilitySection}>
          <Text style={styles.sectionTitle}>Accessibility Features</Text>
          <Text style={styles.accessibilityText}>
            • Color-blind patterns for visual distinction{'\n'}
            • High contrast mode for outdoor visibility{'\n'}
            • Screen reader optimized descriptions{'\n'}
            • Touch target compliance (44px minimum)
          </Text>
        </View>
      )}
    </ScrollView>
  );
  
  const renderStatusList = () => {
    const category = categories.find(c => c.id === selectedCategory);
    if (!category) return null;
    
    return (
      <ScrollView style={styles.statusList} testID={`${testID}-statuses`}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => setSelectedCategory(null)}
            style={styles.backButton}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Go back to categories"
            testID={`${testID}-back`}
          >
            <UtilityIcons.External size={20} color={designTokens.colors.accent} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        </View>
        
        <Text style={styles.modalTitle}>{category.label}</Text>
        
        {category.statuses.map((status) => (
          <TouchableOpacity
            key={status.type}
            style={styles.statusItem}
            onPress={() => setSelectedStatus(status.type)}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={`Learn about ${status.title}`}
            testID={`${testID}-status-${status.type}`}
          >
            <AccessibilityStatusIndicator
              type={status.type}
              size="medium"
              variant="full"
              colorBlindSupport={true}
              screenReaderOptimized={false}
              testID={`${testID}-indicator-${status.type}`}
            />
            <View style={styles.statusInfo}>
              <Text style={styles.statusTitle}>{status.title}</Text>
              <Text style={styles.statusDescription} numberOfLines={2}>
                {status.description}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };
  
  const renderStatusDetail = () => {
    if (!selectedStatusInfo) return null;
    
    return (
      <ScrollView style={styles.statusDetail} testID={`${testID}-detail`}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => setSelectedStatus(null)}
            style={styles.backButton}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Go back to status list"
            testID={`${testID}-detail-back`}
          >
            <UtilityIcons.External size={20} color={designTokens.colors.accent} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.statusHeader}>
          <AccessibilityStatusIndicator
            type={selectedStatusInfo.type}
            size="large"
            variant="prominent"
            colorBlindSupport={true}
            screenReaderOptimized={false}
            testID={`${testID}-detail-indicator`}
          />
          <Text style={styles.detailTitle}>{selectedStatusInfo.title}</Text>
        </View>
        
        <View style={styles.detailSection}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.sectionText}>{selectedStatusInfo.description}</Text>
        </View>
        
        <View style={styles.detailSection}>
          <Text style={styles.sectionTitle}>Usage</Text>
          <Text style={styles.sectionText}>{selectedStatusInfo.usage}</Text>
        </View>
        
        {showAccessibilityInfo && (
          <View style={styles.detailSection}>
            <Text style={styles.sectionTitle}>Accessibility</Text>
            <Text style={styles.sectionText}>{selectedStatusInfo.accessibility}</Text>
          </View>
        )}
        
        {selectedStatusInfo.examples && (
          <View style={styles.detailSection}>
            <Text style={styles.sectionTitle}>Examples</Text>
            {selectedStatusInfo.examples.map((example, index) => (
              <Text key={index} style={styles.exampleText}>
                • {example}
              </Text>
            ))}
          </View>
        )}
      </ScrollView>
    );
  };
  
  const renderContent = () => {
    if (selectedStatus) return renderStatusDetail();
    if (selectedCategory) return renderStatusList();
    return renderCategoryList();
  };
  
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      testID={testID}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Close help"
            testID={`${testID}-close`}
          >
            <Text style={styles.closeText}>Done</Text>
          </TouchableOpacity>
        </View>
        
        {renderContent()}
      </View>
    </Modal>
  );
});

StatusHelpModal.displayName = 'StatusHelpModal';

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: designTokens.colors.background,
  },
  
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: designTokens.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.colors.textSecondary + '20',
  },
  
  closeButton: {
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.sm,
  },
  
  closeText: {
    fontSize: 16,
    fontWeight: '600',
    color: designTokens.colors.accent,
  },
  
  categoryList: {
    flex: 1,
    padding: designTokens.spacing.md,
  },
  
  statusList: {
    flex: 1,
    padding: designTokens.spacing.md,
  },
  
  statusDetail: {
    flex: 1,
    padding: designTokens.spacing.md,
  },
  
  modalTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: designTokens.colors.textPrimary,
    marginBottom: designTokens.spacing.sm,
  },
  
  modalSubtitle: {
    fontSize: 16,
    color: designTokens.colors.textSecondary,
    marginBottom: designTokens.spacing.lg,
  },
  
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: designTokens.spacing.lg,
  },
  
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: designTokens.spacing.sm,
  },
  
  backText: {
    fontSize: 16,
    color: designTokens.colors.accent,
    marginLeft: designTokens.spacing.xs,
  },
  
  categoryItem: {
    backgroundColor: designTokens.colors.background,
    borderWidth: 1,
    borderColor: designTokens.colors.textSecondary + '20',
    borderRadius: 12,
    padding: designTokens.spacing.md,
    marginBottom: designTokens.spacing.sm,
  },
  
  categoryLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: designTokens.colors.textPrimary,
    marginBottom: 4,
  },
  
  categoryCount: {
    fontSize: 14,
    color: designTokens.colors.textSecondary,
  },
  
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: designTokens.colors.background,
    borderWidth: 1,
    borderColor: designTokens.colors.textSecondary + '20',
    borderRadius: 12,
    padding: designTokens.spacing.md,
    marginBottom: designTokens.spacing.sm,
  },
  
  statusInfo: {
    flex: 1,
    marginLeft: designTokens.spacing.md,
  },
  
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: designTokens.colors.textPrimary,
    marginBottom: 4,
  },
  
  statusDescription: {
    fontSize: 14,
    color: designTokens.colors.textSecondary,
    lineHeight: 20,
  },
  
  statusHeader: {
    alignItems: 'center',
    marginBottom: designTokens.spacing.lg,
  },
  
  detailTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: designTokens.colors.textPrimary,
    marginTop: designTokens.spacing.md,
    textAlign: 'center',
  },
  
  detailSection: {
    marginBottom: designTokens.spacing.lg,
  },
  
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: designTokens.colors.textPrimary,
    marginBottom: designTokens.spacing.sm,
  },
  
  sectionText: {
    fontSize: 16,
    color: designTokens.colors.textSecondary,
    lineHeight: 24,
  },
  
  exampleText: {
    fontSize: 15,
    color: designTokens.colors.textSecondary,
    lineHeight: 22,
    marginBottom: 4,
  },
  
  accessibilitySection: {
    marginTop: designTokens.spacing.lg,
    padding: designTokens.spacing.md,
    backgroundColor: designTokens.colors.textSecondary + '10',
    borderRadius: 12,
  },
  
  accessibilityText: {
    fontSize: 15,
    color: designTokens.colors.textSecondary,
    lineHeight: 22,
  },
});

export default {
  StatusHelpModal,
  statusHelpDatabase,
};