/**
 * Quick Actions Component
 * Story 2.2: Match Result Card Optimization
 * 
 * One-touch buttons for forfeit, timeout, and special result scenarios
 */

import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Modal,
  TextInput,
  Alert,
  StyleSheet, 
  TextStyle 
} from 'react-native';
import { SpecialResult} from '../../types/MatchResults';
import { getSpecialResultText } from '../../utils/matchResults';
import { designTokens } from '../../theme/tokens';
import { ActionIcons, UtilityIcons } from '../Icons/IconLibrary';

interface QuickActionsProps {
  isVisible: boolean;
  isEditable?: boolean;
  onSpecialResult: (type: SpecialResult, notes?: string) => void;
  onClose: () => void;
}

const QuickActions: React.FC<QuickActionsProps> = React.memo(({
  isVisible,
  isEditable = false,
  onSpecialResult,
  onClose
}) => {
  const [selectedResult, setSelectedResult] = useState<SpecialResult | null>(null);
  const [notes, setNotes] = useState('');
  const [showNotesModal, setShowNotesModal] = useState(false);

  const styles = getStyles();

  const handleSpecialResult = (type: SpecialResult) => {
    if (!isEditable) return;

    setSelectedResult(type);
    
    // Some special results require notes
    if (type === 'other' || type === 'weather' || type === 'injury') {
      setShowNotesModal(true);
    } else {
      confirmSpecialResult(type);
    }
  };

  const confirmSpecialResult = (type: SpecialResult, resultNotes?: string) => {
    Alert.alert(
      'Confirm Special Result',
      `Are you sure you want to record "${getSpecialResultText(type)}"${resultNotes ? ` with notes: "${resultNotes}"` : ''}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Confirm', 
          style: 'destructive',
          onPress: () => {
            onSpecialResult(type, resultNotes || notes);
            resetState();
            onClose();
          }
        }
      ]
    );
  };

  const handleNotesSubmit = () => {
    if (selectedResult) {
      if (notes.trim().length === 0) {
        Alert.alert('Notes Required', 'Please provide notes for this special result.');
        return;
      }
      confirmSpecialResult(selectedResult, notes.trim());
    }
  };

  const resetState = () => {
    setSelectedResult(null);
    setNotes('');
    setShowNotesModal(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const quickActions: {
    type: SpecialResult;
    label: string;
    icon: keyof typeof ActionIcons;
    color: string;
    description: string;
  }[] = [
    {
      type: 'forfeit',
      label: 'Forfeit',
      icon: 'Stop',
      color: designTokens.colors.error,
      description: 'One team forfeits the match'
    },
    {
      type: 'timeout',
      label: 'Timeout',
      icon: 'Pause',
      color: designTokens.colors.warning,
      description: 'Match suspended due to timeout'
    },
    {
      type: 'injury',
      label: 'Injury',
      icon: 'Alert',
      color: designTokens.colors.error,
      description: 'Match stopped due to player injury'
    },
    {
      type: 'weather',
      label: 'Weather',
      icon: 'Weather',
      color: designTokens.colors.warning,
      description: 'Match affected by weather conditions'
    },
    {
      type: 'other',
      label: 'Other',
      icon: 'More',
      color: designTokens.colors.textSecondary,
      description: 'Other special circumstances'
    }
  ];

  const renderQuickActionButton = (action: typeof quickActions[0]) => {
    const IconComponent = ActionIcons[action.icon as keyof typeof ActionIcons];
    
    return (
      <TouchableOpacity
        key={action.type}
        style={[styles.actionButton, { borderColor: action.color }]}
        onPress={() => handleSpecialResult(action.type)}
        disabled={!isEditable}
        testID={`quick-action-${action.type}`}
        accessible={true}
        accessibilityLabel={action.label}
        accessibilityHint={action.description}
      >
        <IconComponent 
          width={24} 
          height={24} 
          fill={isEditable ? action.color : designTokens.colors.textDisabled} 
        />
        <Text style={[
          styles.actionButtonText,
          { color: isEditable ? action.color : designTokens.colors.textDisabled }
        ]}>
          {action.label}
        </Text>
        <Text style={styles.actionButtonDescription}>
          {action.description}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <>
      {/* Main Quick Actions Modal */}
      <Modal
        visible={isVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={handleClose}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Special Result Actions</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleClose}
                testID="close-quick-actions"
                accessible={true}
                accessibilityLabel="Close quick actions"
              >
                <UtilityIcons.Close 
                  width={24} 
                  height={24} 
                  fill={designTokens.colors.textPrimary} 
                />
              </TouchableOpacity>
            </View>

            {/* Description */}
            <Text style={styles.modalDescription}>
              Select a special result to record for this match. These actions will override the current score.
            </Text>

            {/* Quick Action Buttons */}
            <View style={styles.actionsContainer}>
              {quickActions.map(renderQuickActionButton)}
            </View>

            {/* Cancel Button */}
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleClose}
              testID="cancel-quick-actions"
              accessible={true}
              accessibilityLabel="Cancel special result"
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Notes Input Modal */}
      <Modal
        visible={showNotesModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowNotesModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.notesModalContainer}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedResult ? getSpecialResultText(selectedResult) : ''} Notes
              </Text>
            </View>

            {/* Description */}
            <Text style={styles.modalDescription}>
              Please provide details about this special result:
            </Text>

            {/* Notes Input */}
            <TextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="Enter notes about the special result..."
              multiline={true}
              numberOfLines={4}
              maxLength={500}
              autoFocus={true}
              testID="special-result-notes"
              accessible={true}
              accessibilityLabel="Special result notes"
              accessibilityHint="Enter details about why this special result occurred"
            />

            {/* Character Count */}
            <Text style={styles.characterCount}>
              {notes.length}/500 characters
            </Text>

            {/* Action Buttons */}
            <View style={styles.notesModalActions}>
              <TouchableOpacity
                style={styles.notesCancelButton}
                onPress={() => setShowNotesModal(false)}
                testID="cancel-notes"
                accessible={true}
                accessibilityLabel="Cancel notes entry"
              >
                <Text style={styles.notesCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.notesSubmitButton,
                  notes.trim().length === 0 && styles.notesSubmitButtonDisabled
                ]}
                onPress={handleNotesSubmit}
                disabled={notes.trim().length === 0}
                testID="submit-notes"
                accessible={true}
                accessibilityLabel="Submit special result with notes"
              >
                <Text style={styles.notesSubmitButtonText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
});

const getStyles = () => {
  return StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modalContainer: {
      backgroundColor: designTokens.colors.surfacePrimary,
      borderTopLeftRadius: designTokens.spacing.borderRadius * 2,
      borderTopRightRadius: designTokens.spacing.borderRadius * 2,
      paddingHorizontal: designTokens.spacing.large,
      paddingVertical: designTokens.spacing.large,
      maxHeight: '80%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: designTokens.spacing.medium,
    },
    modalTitle: {
      ...designTokens.typography.h2,
      fontWeight: '700',
      color: designTokens.colors.textPrimary,
    },
    closeButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: designTokens.colors.surfaceSecondary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalDescription: {
      ...designTokens.typography.body,
      color: designTokens.colors.textSecondary,
      marginBottom: designTokens.spacing.large,
      textAlign: 'center',
    },
    actionsContainer: {
      marginBottom: designTokens.spacing.large,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: designTokens.spacing.medium,
      marginBottom: designTokens.spacing.medium,
      borderRadius: designTokens.spacing.borderRadius,
      borderWidth: 2,
      backgroundColor: designTokens.colors.surfacePrimary,
      minHeight: 44, // Touch target compliance
    },
    actionButtonText: {
      ...designTokens.typography.body,
      fontWeight: '600',
      marginLeft: designTokens.spacing.medium,
      flex: 1,
    },
    actionButtonDescription: {
      ...designTokens.typography.caption,
      color: designTokens.colors.textSecondary,
      flex: 2,
      textAlign: 'right',
    },
    cancelButton: {
      backgroundColor: designTokens.colors.surfaceSecondary,
      borderRadius: designTokens.spacing.borderRadius,
      paddingVertical: designTokens.spacing.medium,
      alignItems: 'center',
      minHeight: 44,
    },
    cancelButtonText: {
      ...designTokens.typography.body,
      fontWeight: '600',
      color: designTokens.colors.textPrimary,
    },
    notesModalContainer: {
      backgroundColor: designTokens.colors.surfacePrimary,
      borderRadius: designTokens.spacing.borderRadius * 2,
      padding: designTokens.spacing.large,
      margin: designTokens.spacing.large,
      maxHeight: '80%',
    },
    notesInput: {
      ...designTokens.typography.body,
      borderWidth: 2,
      borderColor: designTokens.colors.border,
      borderRadius: designTokens.spacing.borderRadius,
      padding: designTokens.spacing.medium,
      marginBottom: designTokens.spacing.small,
      minHeight: 120,
      textAlignVertical: 'top',
      backgroundColor: designTokens.colors.surfaceSecondary,
    },
    characterCount: {
      ...designTokens.typography.caption,
      color: designTokens.colors.textSecondary,
      textAlign: 'right',
      marginBottom: designTokens.spacing.large,
    },
    notesModalActions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    notesCancelButton: {
      flex: 1,
      backgroundColor: designTokens.colors.surfaceSecondary,
      borderRadius: designTokens.spacing.borderRadius,
      paddingVertical: designTokens.spacing.medium,
      alignItems: 'center',
      marginRight: designTokens.spacing.small,
      minHeight: 44,
    },
    notesCancelButtonText: {
      ...designTokens.typography.body,
      fontWeight: '600',
      color: designTokens.colors.textPrimary,
    },
    notesSubmitButton: {
      flex: 1,
      backgroundColor: designTokens.colors.primary,
      borderRadius: designTokens.spacing.borderRadius,
      paddingVertical: designTokens.spacing.medium,
      alignItems: 'center',
      marginLeft: designTokens.spacing.small,
      minHeight: 44,
    },
    notesSubmitButtonDisabled: {
      backgroundColor: designTokens.colors.surfaceDisabled,
      opacity: 0.5,
    },
    notesSubmitButtonText: {
      ...designTokens.typography.body,
      fontWeight: '600',
      color: designTokens.colors.surfacePrimary,
    },
  });
};

QuickActions.displayName = 'QuickActions';

export default QuickActions;