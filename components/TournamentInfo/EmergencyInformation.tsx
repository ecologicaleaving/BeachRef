/**
 * Emergency Information Component
 * Story 2.3: Tournament Info Panel System
 * 
 * Tournament director contact and emergency procedures quick access
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Linking
} from 'react-native';
import { EmergencyInformationProps, EmergencyContact, EmergencyProcedure } from '../../types/tournamentInfo';
import { designTokens } from '../../theme/tokens';
import { DataIcons, UtilityIcons, ActionIcons } from '../Icons/IconLibrary';
import {
  getMostRelevantEmergencyProcedures,
  formatEmergencyContactInfo
} from '../../utils/tournamentInfo';

const EmergencyInformation: React.FC<EmergencyInformationProps> = React.memo(({
  procedures,
  emergencyContacts,
  onContactPress,
  onProcedureExpand,
  showQuickAccess = true
}) => {
  const [expandedProcedure, setExpandedProcedure] = useState<string | null>(null);
  const styles = getStyles();

  const handleContactPress = async (contact: EmergencyContact) => {
    if (onContactPress) {
      onContactPress(contact);
      return;
    }

    // Default behavior: try to call the contact
    const phoneUrl = `tel:${contact.phone}`;
    
    try {
      const canOpen = await Linking.canOpenURL(phoneUrl);
      if (canOpen) {
        Alert.alert(
          'Emergency Call',
          `Call ${contact.name}?\n${contact.phone}`,
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Call', 
              style: 'default',
              onPress: () => Linking.openURL(phoneUrl)
            }
          ]
        );
      } else {
        Alert.alert(
          'Contact Information',
          formatEmergencyContactInfo(contact),
          [{ text: 'OK' }]
        );
      }
    } catch {
      Alert.alert(
        'Contact Information',
        formatEmergencyContactInfo(contact),
        [{ text: 'OK' }]
      );
    }
  };

  const handleProcedureToggle = (procedureType: string) => {
    const newExpanded = expandedProcedure === procedureType ? null : procedureType;
    setExpandedProcedure(newExpanded);
    onProcedureExpand?.(procedureType);
  };

  const getEmergencyIcon = (type: string) => {
    switch (type) {
      case 'medical':
        return (
          <DataIcons.Health
            width={18}
            height={18}
            fill={designTokens.colors.error}
          />
        );
      case 'weather':
        return (
          <UtilityIcons.Weather
            width={18}
            height={18}
            fill={designTokens.colors.warning}
          />
        );
      case 'security':
        return (
          <UtilityIcons.Security
            width={18}
            height={18}
            fill={designTokens.colors.error}
          />
        );
      case 'equipment':
        return (
          <UtilityIcons.Settings
            width={18}
            height={18}
            fill={designTokens.colors.secondary}
          />
        );
      default:
        return (
          <UtilityIcons.Warning
            width={18}
            height={18}
            fill={designTokens.colors.textSecondary}
          />
        );
    }
  };

  const getEmergencyColor = (type: string) => {
    switch (type) {
      case 'medical':
      case 'security':
        return designTokens.colors.error;
      case 'weather':
        return designTokens.colors.warning;
      case 'equipment':
        return designTokens.colors.secondary;
      default:
        return designTokens.colors.textSecondary;
    }
  };

  const renderQuickAccessContacts = () => {
    if (!showQuickAccess || emergencyContacts.length === 0) return null;

    // Show top 3 most important contacts
    const quickContacts = emergencyContacts
      .filter(contact => contact.available24h)
      .slice(0, 3);

    if (quickContacts.length === 0) return null;

    return (
      <View style={styles.quickAccessSection}>
        <Text style={styles.sectionTitle}>Quick Access</Text>
        <View style={styles.quickContactsGrid}>
          {quickContacts.map((contact, index) => (
            <TouchableOpacity
              key={index}
              style={styles.quickContactButton}
              onPress={() => handleContactPress(contact)}
              testID={`quick-contact-${index}`}
              accessible={true}
              accessibilityLabel={`Quick call ${contact.name}`}
            >
              <DataIcons.Phone
                width={24}
                height={24}
                fill={designTokens.colors.background}
              />
              <Text style={styles.quickContactName} numberOfLines={1}>
                {contact.name}
              </Text>
              <Text style={styles.quickContactRole} numberOfLines={1}>
                {contact.role}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderEmergencyContact = (contact: EmergencyContact, index: number) => (
    <TouchableOpacity
      key={index}
      style={styles.emergencyContact}
      onPress={() => handleContactPress(contact)}
      testID={`emergency-contact-${index}`}
      accessible={true}
      accessibilityLabel={`Emergency contact ${contact.name}`}
    >
      <View style={styles.contactHeader}>
        <View style={styles.contactInfo}>
          <DataIcons.Phone
            width={16}
            height={16}
            fill={designTokens.colors.error}
          />
          <View style={styles.contactDetails}>
            <Text style={styles.contactName}>{contact.name}</Text>
            <Text style={styles.contactRole}>{contact.role}</Text>
          </View>
        </View>
        <View style={styles.contactActions}>
          {contact.available24h && (
            <View style={styles.availabilityBadge}>
              <Text style={styles.availabilityText}>24/7</Text>
            </View>
          )}
          <ActionIcons.Phone
            width={20}
            height={20}
            fill={designTokens.colors.error}
          />
        </View>
      </View>
      <Text style={styles.contactPhone}>{contact.phone}</Text>
      {contact.email && (
        <Text style={styles.contactEmail}>{contact.email}</Text>
      )}
    </TouchableOpacity>
  );

  const renderProcedureStep = (step: string, index: number) => (
    <View key={index} style={styles.procedureStep}>
      <View style={styles.stepNumber}>
        <Text style={styles.stepNumberText}>{index + 1}</Text>
      </View>
      <Text style={styles.stepText}>{step}</Text>
    </View>
  );

  const renderEmergencyProcedure = (procedure: EmergencyProcedure, index: number) => {
    const isExpanded = expandedProcedure === procedure.type;

    return (
      <View key={index} style={styles.procedureContainer}>
        <TouchableOpacity
          style={styles.procedureHeader}
          onPress={() => handleProcedureToggle(procedure.type)}
          testID={`procedure-${procedure.type}`}
          accessible={true}
          accessibilityLabel={`${procedure.title} emergency procedure`}
        >
          <View style={styles.procedureTitleContainer}>
            {getEmergencyIcon(procedure.type)}
            <View style={styles.procedureTitleText}>
              <Text style={styles.procedureTitle}>{procedure.title}</Text>
              <Text style={[
                styles.procedureType,
                { color: getEmergencyColor(procedure.type) }
              ]}>
                {procedure.type.charAt(0).toUpperCase() + procedure.type.slice(1)}
              </Text>
            </View>
          </View>
          <View style={styles.procedureToggle}>
            <Text style={styles.stepsCount}>
              {procedure.steps.length} steps
            </Text>
            <UtilityIcons.ChevronDown
              width={16}
              height={16}
              fill={designTokens.colors.textSecondary}
              style={isExpanded && styles.chevronRotated}
            />
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.procedureContent}>
            <ScrollView
              style={styles.stepsContainer}
              showsVerticalScrollIndicator={false}
            >
              {procedure.steps.map(renderProcedureStep)}
            </ScrollView>
            
            {procedure.contacts.length > 0 && (
              <View style={styles.procedureContacts}>
                <Text style={styles.procedureContactsTitle}>
                  Emergency Contacts for {procedure.title}
                </Text>
                {procedure.contacts.map((contact, contactIndex) => (
                  <TouchableOpacity
                    key={contactIndex}
                    style={styles.procedureContactItem}
                    onPress={() => handleContactPress(contact)}
                    accessible={true}
                    accessibilityLabel={`Call ${contact.name} for ${procedure.title}`}
                  >
                    <Text style={styles.procedureContactName}>
                      {contact.name} ({contact.role})
                    </Text>
                    <Text style={styles.procedureContactPhone}>
                      {contact.phone}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <DataIcons.Emergency
        width={24}
        height={24}
        fill={designTokens.colors.error}
      />
      <Text style={styles.title}>Emergency Information</Text>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <DataIcons.Emergency
        width={48}
        height={48}
        fill={designTokens.colors.textSecondary}
      />
      <Text style={styles.emptyStateTitle}>No emergency information</Text>
      <Text style={styles.emptyStateSubtitle}>
        Emergency contacts and procedures will be displayed here
      </Text>
    </View>
  );

  if (emergencyContacts.length === 0 && procedures.length === 0) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        {renderEmptyState()}
      </View>
    );
  }

  const relevantProcedures = getMostRelevantEmergencyProcedures(procedures, 5);

  return (
    <View style={styles.container}>
      {renderHeader()}
      
      {renderQuickAccessContacts()}
      
      {emergencyContacts.length > 0 && (
        <View style={styles.contactsSection}>
          <Text style={styles.sectionTitle}>Emergency Contacts</Text>
          {emergencyContacts.slice(0, 4).map(renderEmergencyContact)}
        </View>
      )}
      
      {relevantProcedures.length > 0 && (
        <View style={styles.proceduresSection}>
          <Text style={styles.sectionTitle}>Emergency Procedures</Text>
          {relevantProcedures.map(renderEmergencyProcedure)}
        </View>
      )}
    </View>
  );
});

const getStyles = () => {
  return StyleSheet.create({
    container: {
      backgroundColor: designTokens.colors.surfacePrimary,
      borderRadius: designTokens.spacing.borderRadius,
      padding: designTokens.spacing.large,
      marginHorizontal: designTokens.spacing.medium,
      marginVertical: designTokens.spacing.small,
      boxShadow: `0px 2px 4px rgba(0, 0, 0, 0.15)`,
      elevation: 3,
      borderLeftWidth: 4,
      borderLeftColor: designTokens.colors.error,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: designTokens.spacing.large,
    },
    title: {
      ...designTokens.typography.h3,
      fontWeight: '700',
      color: designTokens.colors.textPrimary,
      marginLeft: designTokens.spacing.small,
    },
    sectionTitle: {
      ...designTokens.typography.body,
      fontWeight: '600',
      color: designTokens.colors.textSecondary,
      marginBottom: designTokens.spacing.medium,
    },
    quickAccessSection: {
      marginBottom: designTokens.spacing.large,
    },
    quickContactsGrid: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    quickContactButton: {
      flex: 1,
      backgroundColor: designTokens.colors.error,
      borderRadius: designTokens.spacing.borderRadius,
      padding: designTokens.spacing.medium,
      alignItems: 'center',
      marginHorizontal: 4,
      minHeight: 80, // Touch target compliance
    },
    quickContactName: {
      ...designTokens.typography.bodySmall,
      fontWeight: '600',
      color: designTokens.colors.background,
      marginTop: 4,
      textAlign: 'center',
    },
    quickContactRole: {
      ...designTokens.typography.caption,
      color: designTokens.colors.background,
      opacity: 0.9,
      textAlign: 'center',
    },
    contactsSection: {
      marginBottom: designTokens.spacing.large,
    },
    emergencyContact: {
      backgroundColor: designTokens.colors.error + '10',
      borderRadius: designTokens.spacing.borderRadius,
      padding: designTokens.spacing.medium,
      marginBottom: designTokens.spacing.small,
      borderWidth: 1,
      borderColor: designTokens.colors.error + '30',
      minHeight: 44, // Touch target compliance
    },
    contactHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: designTokens.spacing.small,
    },
    contactInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    contactDetails: {
      marginLeft: designTokens.spacing.small,
      flex: 1,
    },
    contactName: {
      ...designTokens.typography.body,
      fontWeight: '700',
      color: designTokens.colors.textPrimary,
    },
    contactRole: {
      ...designTokens.typography.bodySmall,
      color: designTokens.colors.textSecondary,
      marginTop: 2,
    },
    contactActions: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    availabilityBadge: {
      backgroundColor: designTokens.colors.success,
      borderRadius: 4,
      paddingHorizontal: 6,
      paddingVertical: 2,
      marginRight: designTokens.spacing.small,
    },
    availabilityText: {
      ...designTokens.typography.caption,
      color: designTokens.colors.background,
      fontWeight: '600',
      fontSize: 10,
    },
    contactPhone: {
      ...designTokens.typography.h3,
      fontWeight: '700',
      color: designTokens.colors.error,
      marginBottom: 4,
    },
    contactEmail: {
      ...designTokens.typography.bodySmall,
      color: designTokens.colors.textSecondary,
    },
    proceduresSection: {
      marginBottom: designTokens.spacing.medium,
    },
    procedureContainer: {
      backgroundColor: designTokens.colors.surfaceSecondary,
      borderRadius: designTokens.spacing.borderRadius,
      marginBottom: designTokens.spacing.small,
      overflow: 'hidden',
    },
    procedureHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: designTokens.spacing.medium,
      minHeight: 44, // Touch target compliance
    },
    procedureTitleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    procedureTitleText: {
      marginLeft: designTokens.spacing.small,
      flex: 1,
    },
    procedureTitle: {
      ...designTokens.typography.body,
      fontWeight: '600',
      color: designTokens.colors.textPrimary,
    },
    procedureType: {
      ...designTokens.typography.caption,
      marginTop: 2,
    },
    procedureToggle: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    stepsCount: {
      ...designTokens.typography.caption,
      color: designTokens.colors.textSecondary,
      marginRight: designTokens.spacing.small,
    },
    chevronRotated: {
      transform: [{ rotate: '180deg' }],
    },
    procedureContent: {
      borderTopWidth: 1,
      borderTopColor: designTokens.colors.border,
    },
    stepsContainer: {
      padding: designTokens.spacing.medium,
      maxHeight: 200, // Prevent excessive height
    },
    procedureStep: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: designTokens.spacing.medium,
    },
    stepNumber: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: designTokens.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: designTokens.spacing.small,
      marginTop: 2,
    },
    stepNumberText: {
      ...designTokens.typography.caption,
      color: designTokens.colors.background,
      fontWeight: '700',
    },
    stepText: {
      ...designTokens.typography.body,
      color: designTokens.colors.textPrimary,
      flex: 1,
      lineHeight: designTokens.typography.body.lineHeight * 1.2,
    },
    procedureContacts: {
      padding: designTokens.spacing.medium,
      borderTopWidth: 1,
      borderTopColor: designTokens.colors.border,
      backgroundColor: designTokens.colors.background,
    },
    procedureContactsTitle: {
      ...designTokens.typography.bodySmall,
      fontWeight: '600',
      color: designTokens.colors.textSecondary,
      marginBottom: designTokens.spacing.small,
    },
    procedureContactItem: {
      backgroundColor: designTokens.colors.error + '10',
      borderRadius: 6,
      padding: designTokens.spacing.small,
      marginBottom: 4,
      minHeight: 44, // Touch target compliance
    },
    procedureContactName: {
      ...designTokens.typography.bodySmall,
      fontWeight: '600',
      color: designTokens.colors.textPrimary,
    },
    procedureContactPhone: {
      ...designTokens.typography.bodySmall,
      color: designTokens.colors.error,
      fontWeight: '600',
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: designTokens.spacing.extraLarge,
    },
    emptyStateTitle: {
      ...designTokens.typography.h3,
      color: designTokens.colors.textSecondary,
      marginTop: designTokens.spacing.medium,
      marginBottom: designTokens.spacing.small,
    },
    emptyStateSubtitle: {
      ...designTokens.typography.body,
      color: designTokens.colors.textSecondary,
      textAlign: 'center',
      opacity: 0.7,
    },
  });
};

EmergencyInformation.displayName = 'EmergencyInformation';

export default EmergencyInformation;