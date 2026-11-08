/**
 * AssignmentStatusManager Component
 * Manages assignment status updates, preparation, and history
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Modal,
  Alert,
} from 'react-native';
import { Assignment, AssignmentStatus } from '../../types/assignments';
import { designTokens } from '../../theme/tokens';
import { StatusIndicator } from '../Status/StatusIndicator';

export interface AssignmentNote {
  id: string;
  text: string;
  timestamp: Date;
  type: 'preparation' | 'performance' | 'general';
}

export interface AssignmentPreparation {
  id: string;
  assignmentId: string;
  checklist: PrepChecklistItem[];
  notes: AssignmentNote[];
  specialRequirements: string[];
  lastUpdated: Date;
}

export interface PrepChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  required: boolean;
}

interface AssignmentStatusManagerProps {
  assignment: Assignment;
  onStatusUpdate: (assignmentId: string, status: AssignmentStatus) => void;
  onPreparationUpdate: (preparation: AssignmentPreparation) => void;
  preparation?: AssignmentPreparation;
  visible: boolean;
  onClose: () => void;
}

export const AssignmentStatusManager: React.FC<AssignmentStatusManagerProps> = ({
  assignment,
  onStatusUpdate,
  onPreparationUpdate,
  preparation,
  visible,
  onClose,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<AssignmentStatus>(assignment.status);
  const [newNote, setNewNote] = useState('');
  const [newRequirement, setNewRequirement] = useState('');
  const [checklist, setChecklist] = useState<PrepChecklistItem[]>(
    preparation?.checklist || getDefaultChecklist()
  );

  function getDefaultChecklist(): PrepChecklistItem[] {
    return [
      {
        id: '1',
        text: 'Review match details and teams',
        completed: false,
        required: true,
      },
      {
        id: '2',
        text: 'Check equipment and uniform',
        completed: false,
        required: true,
      },
      {
        id: '3',
        text: 'Arrive at court 15 minutes early',
        completed: false,
        required: true,
      },
      {
        id: '4',
        text: 'Coordinate with other match officials',
        completed: false,
        required: false,
      },
    ];
  }

  const statusOptions: { value: AssignmentStatus; label: string; color: string }[] = [
    { value: 'upcoming', label: 'Confirmed', color: designTokens.statusColors.upcoming },
    { value: 'current', label: 'In Progress', color: designTokens.statusColors.current },
    { value: 'completed', label: 'Completed', color: designTokens.statusColors.completed },
    { value: 'cancelled', label: 'Cancelled', color: designTokens.statusColors.cancelled },
  ];

  const handleStatusUpdate = () => {
    if (selectedStatus !== assignment.status) {
      Alert.alert(
        'Update Status',
        `Change assignment status from "${assignment.status}" to "${selectedStatus}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Update',
            onPress: () => onStatusUpdate(assignment.id, selectedStatus),
          },
        ]
      );
    }
  };

  const handleAddNote = () => {
    if (newNote.trim()) {
      const note: AssignmentNote = {
        id: Date.now().toString(),
        text: newNote.trim(),
        timestamp: new Date(),
        type: 'preparation',
      };

      const updatedPreparation: AssignmentPreparation = {
        id: preparation?.id || Date.now().toString(),
        assignmentId: assignment.id,
        checklist,
        notes: [...(preparation?.notes || []), note],
        specialRequirements: preparation?.specialRequirements || [],
        lastUpdated: new Date(),
      };

      onPreparationUpdate(updatedPreparation);
      setNewNote('');
    }
  };

  const handleAddRequirement = () => {
    if (newRequirement.trim()) {
      const updatedPreparation: AssignmentPreparation = {
        id: preparation?.id || Date.now().toString(),
        assignmentId: assignment.id,
        checklist,
        notes: preparation?.notes || [],
        specialRequirements: [...(preparation?.specialRequirements || []), newRequirement.trim()],
        lastUpdated: new Date(),
      };

      onPreparationUpdate(updatedPreparation);
      setNewRequirement('');
    }
  };

  const toggleChecklistItem = (itemId: string) => {
    const updatedChecklist = checklist.map(item =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );
    setChecklist(updatedChecklist);

    const updatedPreparation: AssignmentPreparation = {
      id: preparation?.id || Date.now().toString(),
      assignmentId: assignment.id,
      checklist: updatedChecklist,
      notes: preparation?.notes || [],
      specialRequirements: preparation?.specialRequirements || [],
      lastUpdated: new Date(),
    };

    onPreparationUpdate(updatedPreparation);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Manage Assignment</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Done</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Assignment Summary */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Assignment Details</Text>
            <View style={styles.assignmentSummary}>
              <Text style={styles.assignmentTeams}>
                {assignment.homeTeam} vs {assignment.awayTeam}
              </Text>
              <Text style={styles.assignmentDetails}>
                Court {assignment.courtNumber} • {assignment.refereePosition}
              </Text>
              <Text style={styles.assignmentTime}>
                {assignment.matchTime.toLocaleDateString('en-US')} at{' '}
                {assignment.matchTime.toLocaleTimeString('en-US', { 
                  hour: 'numeric', 
                  minute: '2-digit',
                  hour12: true 
                })}
              </Text>
            </View>
          </View>

          {/* Status Management */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Status Management</Text>
            <View style={styles.statusOptions}>
              {statusOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.statusOption,
                    selectedStatus === option.value && styles.selectedStatusOption,
                  ]}
                  onPress={() => setSelectedStatus(option.value)}
                >
                  <StatusIndicator
                    type={option.value}
                    size="small"
                    showIcon={true}
                    showText={false}
                  />
                  <Text
                    style={[
                      styles.statusOptionText,
                      selectedStatus === option.value && styles.selectedStatusOptionText,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {selectedStatus !== assignment.status && (
              <TouchableOpacity style={styles.updateButton} onPress={handleStatusUpdate}>
                <Text style={styles.updateButtonText}>Update Status</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Preparation Checklist */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Preparation Checklist</Text>
            {checklist.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.checklistItem, item.completed && styles.completedChecklistItem]}
                onPress={() => toggleChecklistItem(item.id)}
              >
                <View style={[styles.checkbox, item.completed && styles.checkedBox]}>
                  {item.completed && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text
                  style={[
                    styles.checklistText,
                    item.completed && styles.completedChecklistText,
                  ]}
                >
                  {item.text}
                </Text>
                {item.required && <Text style={styles.requiredBadge}>Required</Text>}
              </TouchableOpacity>
            ))}
          </View>

          {/* Special Requirements */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Special Requirements</Text>
            {preparation?.specialRequirements?.map((requirement, index) => (
              <View key={index} style={styles.requirementItem}>
                <Text style={styles.requirementText}>{requirement}</Text>
              </View>
            ))}
            <View style={styles.addSection}>
              <TextInput
                style={styles.textInput}
                placeholder="Add special requirement..."
                value={newRequirement}
                onChangeText={setNewRequirement}
                multiline
              />
              <TouchableOpacity
                style={[styles.addButton, !newRequirement.trim() && styles.disabledButton]}
                onPress={handleAddRequirement}
                disabled={!newRequirement.trim()}
              >
                <Text style={styles.addButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Notes */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Preparation Notes</Text>
            {preparation?.notes?.map((note) => (
              <View key={note.id} style={styles.noteItem}>
                <Text style={styles.noteText}>{note.text}</Text>
                <Text style={styles.noteTimestamp}>
                  {note.timestamp.toLocaleDateString('en-US')} at{' '}
                  {note.timestamp.toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                  })}
                </Text>
              </View>
            ))}
            <View style={styles.addSection}>
              <TextInput
                style={styles.textInput}
                placeholder="Add preparation note..."
                value={newNote}
                onChangeText={setNewNote}
                multiline
              />
              <TouchableOpacity
                style={[styles.addButton, !newNote.trim() && styles.disabledButton]}
                onPress={handleAddNote}
                disabled={!newNote.trim()}
              >
                <Text style={styles.addButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: designTokens.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.brandColors.primaryLight,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: designTokens.colors.textPrimary,
  },
  closeButton: {
    backgroundColor: designTokens.colors.secondary,
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.xs,
    borderRadius: 6,
    minHeight: designTokens.iconTokens.accessibility.minimumTouchTarget,
    justifyContent: 'center',
  },
  closeButtonText: {
    color: designTokens.colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: designTokens.spacing.md,
  },
  section: {
    marginBottom: designTokens.spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: designTokens.colors.textPrimary,
    marginBottom: designTokens.spacing.sm,
  },
  assignmentSummary: {
    backgroundColor: designTokens.brandColors.primaryLight,
    padding: designTokens.spacing.md,
    borderRadius: 8,
  },
  assignmentTeams: {
    fontSize: 18,
    fontWeight: 'bold',
    color: designTokens.colors.textPrimary,
    marginBottom: 4,
  },
  assignmentDetails: {
    fontSize: 14,
    color: designTokens.colors.textSecondary,
    marginBottom: 4,
  },
  assignmentTime: {
    fontSize: 14,
    fontWeight: '600',
    color: designTokens.colors.textPrimary,
  },
  statusOptions: {
    gap: designTokens.spacing.sm,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: designTokens.brandColors.primaryLight,
    backgroundColor: designTokens.colors.background,
    minHeight: designTokens.iconTokens.accessibility.minimumTouchTarget,
    gap: designTokens.spacing.sm,
  },
  selectedStatusOption: {
    backgroundColor: designTokens.brandColors.primaryLight,
    borderColor: designTokens.colors.secondary,
  },
  statusOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: designTokens.colors.textPrimary,
  },
  selectedStatusOptionText: {
    fontWeight: 'bold',
  },
  updateButton: {
    backgroundColor: designTokens.colors.accent,
    paddingVertical: designTokens.spacing.sm,
    borderRadius: 8,
    marginTop: designTokens.spacing.md,
    alignItems: 'center',
    minHeight: designTokens.iconTokens.accessibility.minimumTouchTarget,
    justifyContent: 'center',
  },
  updateButtonText: {
    color: designTokens.colors.background,
    fontSize: 16,
    fontWeight: 'bold',
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: designTokens.spacing.sm,
    paddingHorizontal: designTokens.spacing.sm,
    borderRadius: 8,
    marginBottom: designTokens.spacing.xs,
    backgroundColor: designTokens.colors.background,
    minHeight: designTokens.iconTokens.accessibility.minimumTouchTarget,
    gap: designTokens.spacing.sm,
  },
  completedChecklistItem: {
    backgroundColor: designTokens.brandColors.primaryLight,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: designTokens.colors.textSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkedBox: {
    backgroundColor: designTokens.colors.accent,
    borderColor: designTokens.colors.accent,
  },
  checkmark: {
    color: designTokens.colors.background,
    fontSize: 16,
    fontWeight: 'bold',
  },
  checklistText: {
    flex: 1,
    fontSize: 16,
    color: designTokens.colors.textPrimary,
  },
  completedChecklistText: {
    textDecorationLine: 'line-through',
    color: designTokens.colors.textSecondary,
  },
  requiredBadge: {
    fontSize: 10,
    fontWeight: '600',
    color: designTokens.colors.error,
    backgroundColor: '#FFE5E5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  requirementItem: {
    padding: designTokens.spacing.sm,
    backgroundColor: designTokens.brandColors.primaryLight,
    borderRadius: 6,
    marginBottom: designTokens.spacing.xs,
  },
  requirementText: {
    fontSize: 14,
    color: designTokens.colors.textPrimary,
  },
  noteItem: {
    padding: designTokens.spacing.sm,
    backgroundColor: designTokens.brandColors.primaryLight,
    borderRadius: 6,
    marginBottom: designTokens.spacing.xs,
  },
  noteText: {
    fontSize: 14,
    color: designTokens.colors.textPrimary,
    marginBottom: 4,
  },
  noteTimestamp: {
    fontSize: 12,
    color: designTokens.colors.textSecondary,
  },
  addSection: {
    flexDirection: 'row',
    gap: designTokens.spacing.sm,
    alignItems: 'flex-end',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: designTokens.brandColors.primaryLight,
    borderRadius: 6,
    paddingHorizontal: designTokens.spacing.sm,
    paddingVertical: designTokens.spacing.sm,
    fontSize: 16,
    color: designTokens.colors.textPrimary,
    backgroundColor: designTokens.colors.background,
    minHeight: designTokens.iconTokens.accessibility.minimumTouchTarget,
  },
  addButton: {
    backgroundColor: designTokens.colors.secondary,
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.sm,
    borderRadius: 6,
    minHeight: designTokens.iconTokens.accessibility.minimumTouchTarget,
    justifyContent: 'center',
  },
  disabledButton: {
    backgroundColor: designTokens.colors.textSecondary,
    opacity: 0.6,
  },
  addButtonText: {
    color: designTokens.colors.background,
    fontSize: 14,
    fontWeight: '600',
  },
});