/**
 * Result Submission Workflow Component
 * Story 2.2: Match Result Card Optimization
 * 
 * Manages the complete result submission workflow with confirmation and undo capabilities
 */

import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Modal,
  Alert,
  StyleSheet, 
  _ViewStyle, 
  _TextStyle,
  ActivityIndicator 
} from 'react-native';
import { EnhancedMatchResult, ResultStatus } from '../../types/MatchResults';
import { 
  validateMatchResult,
  _needsSync,
  _getResultStatusText,
  formatMatchTime,
  calculateFinalScore,
  convertToSetScores
} from '../../utils/matchResults';
import { designTokens } from '../../theme/tokens';
import { ActionIcons, StatusIcons, UtilityIcons } from '../Icons/IconLibrary';

interface ResultSubmissionWorkflowProps {
  matchResult: EnhancedMatchResult;
  isVisible: boolean;
  onSubmit: (matchResult: EnhancedMatchResult) => Promise<boolean>;
  onUndo?: (matchResult: EnhancedMatchResult) => Promise<boolean>;
  onClose: () => void;
  allowUndo?: boolean;
}

interface SubmissionStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'error';
  required: boolean;
}

const ResultSubmissionWorkflow: React.FC<ResultSubmissionWorkflowProps> = React.memo(({
  matchResult,
  isVisible,
  onSubmit,
  onUndo,
  onClose,
  allowUndo = true
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showUndoConfirmation, setShowUndoConfirmation] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [steps, setSteps] = useState<SubmissionStep[]>([]);

  const styles = getStyles();

  // Initialize submission steps
  useEffect(() => {
    if (isVisible) {
      initializeSteps();
    }
  }, [isVisible, matchResult]);

  const initializeSteps = () => {
    const validationErrors = validateMatchResult(matchResult);
    const hasErrors = validationErrors.some(error => error.severity === 'error');
    const sets = convertToSetScores(matchResult);
    const finalScore = calculateFinalScore(sets);

    const submissionSteps: SubmissionStep[] = [
      {
        id: 'validation',
        title: 'Validate Result',
        description: hasErrors ? 'Fix validation errors before continuing' : 'Result validation passed',
        status: hasErrors ? 'error' : 'completed',
        required: true,
      },
      {
        id: 'confirmation',
        title: 'Confirm Details',
        description: 'Review match result details',
        status: 'pending',
        required: true,
      },
      {
        id: 'submission',
        title: 'Submit Result',
        description: 'Upload result to tournament system',
        status: 'pending',
        required: true,
      },
      {
        id: 'sync',
        title: 'Sync Confirmation',
        description: 'Confirm result is synced with server',
        status: 'pending',
        required: false,
      },
    ];

    setSteps(submissionSteps);
    setCurrentStep(hasErrors ? 0 : 1);
    setSubmissionError(null);
  };

  const updateStepStatus = (stepId: string, status: SubmissionStep['status']) => {
    setSteps(prevSteps => 
      prevSteps.map(step => 
        step.id === stepId ? { ...step, status } : step
      )
    );
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmissionError(null);

    try {
      // Step 1: Final validation
      updateStepStatus('validation', 'in-progress');
      setCurrentStep(0);
      
      const validationErrors = validateMatchResult(matchResult);
      const hasErrors = validationErrors.some(error => error.severity === 'error');
      
      if (hasErrors) {
        updateStepStatus('validation', 'error');
        setSubmissionError('Please fix validation errors before submitting');
        setIsSubmitting(false);
        return;
      }
      
      updateStepStatus('validation', 'completed');
      
      // Step 2: Confirmation (user already confirmed by clicking submit)
      updateStepStatus('confirmation', 'completed');
      setCurrentStep(2);
      
      // Step 3: Submit to server
      updateStepStatus('submission', 'in-progress');
      
      const submitResult = {
        ...matchResult,
        resultStatus: 'submitted' as ResultStatus,
        submittedAt: new Date(),
        lastModified: new Date(),
      };
      
      const success = await onSubmit(submitResult);
      
      if (!success) {
        updateStepStatus('submission', 'error');
        setSubmissionError('Failed to submit result. Please try again.');
        setIsSubmitting(false);
        return;
      }
      
      updateStepStatus('submission', 'completed');
      setCurrentStep(3);
      
      // Step 4: Sync confirmation
      updateStepStatus('sync', 'in-progress');
      
      // Simulate sync confirmation delay
      setTimeout(() => {
        updateStepStatus('sync', 'completed');
        setIsSubmitting(false);
        
        Alert.alert(
          'Result Submitted',
          'Match result has been successfully submitted and synced.',
          [
            { 
              text: 'OK', 
              onPress: onClose
            }
          ]
        );
      }, 2000);
      
    } catch (error) {
      updateStepStatus('submission', 'error');
      setSubmissionError('Network error. Result will be cached and synced later.');
      setIsSubmitting(false);
    }
  };

  const handleUndo = async () => {
    if (!onUndo) return;
    
    try {
      const success = await onUndo(matchResult);
      if (success) {
        Alert.alert(
          'Result Undone',
          'Match result has been successfully reverted.',
          [{ text: 'OK', onPress: onClose }]
        );
      } else {
        Alert.alert(
          'Undo Failed',
          'Unable to undo the result. Please contact support.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      Alert.alert(
        'Undo Error',
        'Network error. Please try again later.',
        [{ text: 'OK' }]
      );
    }
  };

  const renderStepIcon = (step: SubmissionStep) => {
    switch (step.status) {
      case 'completed':
        return (
          <StatusIcons.Completed 
            width={24} 
            height={24} 
            fill={designTokens.colors.statusColors.completed} 
          />
        );
      case 'in-progress':
        return (
          <ActivityIndicator 
            size="small" 
            color={designTokens.colors.primary} 
          />
        );
      case 'error':
        return (
          <StatusIcons.Error 
            width={24} 
            height={24} 
            fill={designTokens.colors.error} 
          />
        );
      default:
        return (
          <StatusIcons.Pending 
            width={24} 
            height={24} 
            fill={designTokens.colors.textSecondary} 
          />
        );
    }
  };

  const renderMatchSummary = () => {
    const sets = convertToSetScores(matchResult);
    const finalScore = calculateFinalScore(sets);

    return (
      <View style={styles.summaryContainer}>
        <Text style={styles.summaryTitle}>Match Summary</Text>
        
        <View style={styles.summaryMatch}>
          <Text style={styles.summaryTeams}>
            {matchResult.teamAName} vs {matchResult.teamBName}
          </Text>
          <Text style={styles.summaryDetails}>
            Court {matchResult.court} • {formatMatchTime(new Date(matchResult.localDate))}
          </Text>
        </View>

        {matchResult.specialResult ? (
          <View style={styles.specialResultSummary}>
            <Text style={styles.specialResultText}>
              Special Result: {matchResult.specialResult.toUpperCase()}
            </Text>
            {matchResult.specialResultNotes && (
              <Text style={styles.specialResultNotes}>
                {matchResult.specialResultNotes}
              </Text>
            )}
          </View>
        ) : (
          <View style={styles.scoreSummary}>
            <Text style={styles.finalScoreText}>
              Final Score: {finalScore.homeSets} - {finalScore.awaySets}
            </Text>
            <View style={styles.setScores}>
              {sets.map((set, index) => {
                if (set.homeScore === 0 && set.awayScore === 0) return null;
                return (
                  <Text key={index} style={styles.setScoreText}>
                    Set {index + 1}: {set.homeScore}-{set.awayScore}
                  </Text>
                );
              })}
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderSubmissionSteps = () => (
    <View style={styles.stepsContainer}>
      <Text style={styles.stepsTitle}>Submission Progress</Text>
      
      {steps.map((step, index) => (
        <View 
          key={step.id} 
          style={[
            styles.stepItem,
            index === currentStep && styles.stepItemActive
          ]}
        >
          <View style={styles.stepIcon}>
            {renderStepIcon(step)}
          </View>
          
          <View style={styles.stepContent}>
            <Text style={[
              styles.stepTitle,
              step.status === 'completed' && styles.stepTitleCompleted,
              step.status === 'error' && styles.stepTitleError
            ]}>
              {step.title}
            </Text>
            <Text style={styles.stepDescription}>
              {step.description}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );

  return (
    <>
      {/* Main Submission Modal */}
      <Modal
        visible={isVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={!isSubmitting ? onClose : undefined}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Submit Match Result</Text>
              {!isSubmitting && (
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={onClose}
                  testID="close-submission-workflow"
                >
                  <UtilityIcons.Close 
                    width={24} 
                    height={24} 
                    fill={designTokens.colors.textPrimary} 
                  />
                </TouchableOpacity>
              )}
            </View>

            {/* Match Summary */}
            {renderMatchSummary()}

            {/* Submission Steps */}
            {renderSubmissionSteps()}

            {/* Error Message */}
            {submissionError && (
              <View style={styles.errorContainer}>
                <UtilityIcons.Warning 
                  width={20} 
                  height={20} 
                  fill={designTokens.colors.error} 
                />
                <Text style={styles.errorText}>{submissionError}</Text>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actionsContainer}>
              {matchResult.resultStatus === 'submitted' && allowUndo && onUndo ? (
                <TouchableOpacity
                  style={styles.undoButton}
                  onPress={() => setShowUndoConfirmation(true)}
                  disabled={isSubmitting}
                  testID="undo-submission"
                >
                  <ActionIcons.Undo 
                    width={20} 
                    height={20} 
                    fill={designTokens.colors.error} 
                  />
                  <Text style={styles.undoButtonText}>Undo Submission</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    (isSubmitting || steps[0]?.status === 'error') && styles.submitButtonDisabled
                  ]}
                  onPress={handleSubmit}
                  disabled={isSubmitting || steps[0]?.status === 'error'}
                  testID="confirm-submission"
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color={designTokens.colors.surfacePrimary} />
                  ) : (
                    <ActionIcons.Submit 
                      width={20} 
                      height={20} 
                      fill={designTokens.colors.surfacePrimary} 
                    />
                  )}
                  <Text style={styles.submitButtonText}>
                    {isSubmitting ? 'Submitting...' : 'Confirm & Submit'}
                  </Text>
                </TouchableOpacity>
              )}

              {!isSubmitting && (
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={onClose}
                  testID="cancel-submission"
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Undo Confirmation Modal */}
      <Modal
        visible={showUndoConfirmation}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowUndoConfirmation(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.undoConfirmationContainer}>
            <Text style={styles.undoConfirmationTitle}>Undo Submission</Text>
            <Text style={styles.undoConfirmationText}>
              Are you sure you want to undo this result submission? This action cannot be undone and may affect tournament scheduling.
            </Text>
            
            <View style={styles.undoConfirmationActions}>
              <TouchableOpacity
                style={styles.undoCancelButton}
                onPress={() => setShowUndoConfirmation(false)}
                testID="cancel-undo"
              >
                <Text style={styles.undoCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.undoConfirmButton}
                onPress={() => {
                  setShowUndoConfirmation(false);
                  handleUndo();
                }}
                testID="confirm-undo"
              >
                <Text style={styles.undoConfirmButtonText}>Undo</Text>
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
      justifyContent: 'center',
      alignItems: 'center',
      padding: designTokens.spacing.large,
    },
    modalContainer: {
      backgroundColor: designTokens.colors.surfacePrimary,
      borderRadius: designTokens.spacing.borderRadius * 2,
      padding: designTokens.spacing.large,
      width: '100%',
      maxWidth: 600,
      maxHeight: '90%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: designTokens.spacing.large,
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
    summaryContainer: {
      backgroundColor: designTokens.colors.surfaceSecondary,
      borderRadius: designTokens.spacing.borderRadius,
      padding: designTokens.spacing.medium,
      marginBottom: designTokens.spacing.large,
    },
    summaryTitle: {
      ...designTokens.typography.h3,
      fontWeight: '600',
      color: designTokens.colors.textPrimary,
      marginBottom: designTokens.spacing.small,
    },
    summaryMatch: {
      marginBottom: designTokens.spacing.small,
    },
    summaryTeams: {
      ...designTokens.typography.body,
      fontWeight: '600',
      color: designTokens.colors.textPrimary,
    },
    summaryDetails: {
      ...designTokens.typography.bodySmall,
      color: designTokens.colors.textSecondary,
    },
    scoreSummary: {
      alignItems: 'center',
    },
    finalScoreText: {
      ...designTokens.typography.h3,
      fontWeight: '700',
      color: designTokens.colors.textPrimary,
      marginBottom: designTokens.spacing.small,
    },
    setScores: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
    },
    setScoreText: {
      ...designTokens.typography.caption,
      color: designTokens.colors.textSecondary,
      marginHorizontal: designTokens.spacing.small,
    },
    specialResultSummary: {
      alignItems: 'center',
    },
    specialResultText: {
      ...designTokens.typography.h3,
      fontWeight: '700',
      color: designTokens.colors.error,
      marginBottom: designTokens.spacing.small,
    },
    specialResultNotes: {
      ...designTokens.typography.bodySmall,
      color: designTokens.colors.textSecondary,
      textAlign: 'center',
    },
    stepsContainer: {
      marginBottom: designTokens.spacing.large,
    },
    stepsTitle: {
      ...designTokens.typography.body,
      fontWeight: '600',
      color: designTokens.colors.textPrimary,
      marginBottom: designTokens.spacing.medium,
    },
    stepItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: designTokens.spacing.small,
      paddingHorizontal: designTokens.spacing.medium,
      borderRadius: designTokens.spacing.borderRadius,
      marginBottom: designTokens.spacing.small,
    },
    stepItemActive: {
      backgroundColor: designTokens.colors.surfaceSecondary,
    },
    stepIcon: {
      width: 32,
      alignItems: 'center',
    },
    stepContent: {
      flex: 1,
      marginLeft: designTokens.spacing.medium,
    },
    stepTitle: {
      ...designTokens.typography.bodySmall,
      fontWeight: '600',
      color: designTokens.colors.textPrimary,
    },
    stepTitleCompleted: {
      color: designTokens.colors.statusColors.completed,
    },
    stepTitleError: {
      color: designTokens.colors.error,
    },
    stepDescription: {
      ...designTokens.typography.caption,
      color: designTokens.colors.textSecondary,
    },
    errorContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: `${designTokens.colors.error}15`,
      borderRadius: designTokens.spacing.borderRadius,
      padding: designTokens.spacing.medium,
      marginBottom: designTokens.spacing.large,
    },
    errorText: {
      ...designTokens.typography.bodySmall,
      color: designTokens.colors.error,
      marginLeft: designTokens.spacing.small,
      flex: 1,
    },
    actionsContainer: {
      gap: designTokens.spacing.medium,
    },
    submitButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: designTokens.colors.statusColors.completed,
      borderRadius: designTokens.spacing.borderRadius,
      paddingVertical: designTokens.spacing.medium,
      minHeight: 44,
    },
    submitButtonDisabled: {
      backgroundColor: designTokens.colors.surfaceDisabled,
      opacity: 0.5,
    },
    submitButtonText: {
      ...designTokens.typography.body,
      fontWeight: '600',
      color: designTokens.colors.surfacePrimary,
      marginLeft: designTokens.spacing.small,
    },
    undoButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: designTokens.colors.surfaceSecondary,
      borderRadius: designTokens.spacing.borderRadius,
      paddingVertical: designTokens.spacing.medium,
      minHeight: 44,
      borderWidth: 2,
      borderColor: designTokens.colors.error,
    },
    undoButtonText: {
      ...designTokens.typography.body,
      fontWeight: '600',
      color: designTokens.colors.error,
      marginLeft: designTokens.spacing.small,
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
    undoConfirmationContainer: {
      backgroundColor: designTokens.colors.surfacePrimary,
      borderRadius: designTokens.spacing.borderRadius * 2,
      padding: designTokens.spacing.large,
      maxWidth: 400,
    },
    undoConfirmationTitle: {
      ...designTokens.typography.h3,
      fontWeight: '700',
      color: designTokens.colors.textPrimary,
      marginBottom: designTokens.spacing.medium,
    },
    undoConfirmationText: {
      ...designTokens.typography.body,
      color: designTokens.colors.textSecondary,
      marginBottom: designTokens.spacing.large,
      textAlign: 'center',
    },
    undoConfirmationActions: {
      flexDirection: 'row',
      gap: designTokens.spacing.medium,
    },
    undoCancelButton: {
      flex: 1,
      backgroundColor: designTokens.colors.surfaceSecondary,
      borderRadius: designTokens.spacing.borderRadius,
      paddingVertical: designTokens.spacing.medium,
      alignItems: 'center',
      minHeight: 44,
    },
    undoCancelButtonText: {
      ...designTokens.typography.body,
      fontWeight: '600',
      color: designTokens.colors.textPrimary,
    },
    undoConfirmButton: {
      flex: 1,
      backgroundColor: designTokens.colors.error,
      borderRadius: designTokens.spacing.borderRadius,
      paddingVertical: designTokens.spacing.medium,
      alignItems: 'center',
      minHeight: 44,
    },
    undoConfirmButtonText: {
      ...designTokens.typography.body,
      fontWeight: '600',
      color: designTokens.colors.surfacePrimary,
    },
  });
};

ResultSubmissionWorkflow.displayName = 'ResultSubmissionWorkflow';

export default ResultSubmissionWorkflow;