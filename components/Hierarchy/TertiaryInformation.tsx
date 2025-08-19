/**
 * Tertiary Information Components
 * General tournament information, statistics, and administrative details with minimal visual weight
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { designTokens } from '../../theme/tokens';
import { HierarchyContainer, InfoGroup } from './InformationArchitecture';
import { VisualHierarchyText, SectionHeader } from './VisualHierarchyText';
import { ScanOptimizedLayout } from './ScanOptimizedLayout';

// General Tournament Information with Minimal Visual Weight
interface TournamentInfoProps {
  organizerInfo?: string;
  sponsorInfo?: string;
  category?: string;
  format?: string;
  totalMatches?: number;
  participants?: number;
  prize?: string;
  website?: string;
  collapsed?: boolean;
  onToggle?: (collapsed: boolean) => void;
}

export const GeneralTournamentInfo: React.FC<TournamentInfoProps> = ({
  organizerInfo,
  sponsorInfo,
  category,
  format,
  totalMatches,
  participants,
  prize,
  website,
  collapsed = true,
  onToggle,
}) => {
  const [isCollapsed, setIsCollapsed] = React.useState(collapsed);

  const handleToggle = () => {
    const newCollapsed = !isCollapsed;
    setIsCollapsed(newCollapsed);
    onToggle?.(newCollapsed);
  };

  return (
    <HierarchyContainer priority="tertiary" style={styles.tertiaryContainer}>
      <TouchableOpacity onPress={handleToggle} style={styles.tertiaryHeader}>
        <SectionHeader priority="tertiary">
          Tournament Information
        </SectionHeader>
        <Text style={styles.collapseIcon}>
          {isCollapsed ? '▶' : '▼'}
        </Text>
      </TouchableOpacity>

      {!isCollapsed && (
        <View style={styles.tertiaryContent}>
          <ScanOptimizedLayout pattern="layered" spacing="tight">
            {category && (
              <TertiaryDataItem label="Category" value={category} />
            )}
            {format && (
              <TertiaryDataItem label="Format" value={format} />
            )}
            {participants && (
              <TertiaryDataItem label="Participants" value={participants.toString()} />
            )}
            {totalMatches && (
              <TertiaryDataItem label="Total Matches" value={totalMatches.toString()} />
            )}
            {prize && (
              <TertiaryDataItem label="Prize Pool" value={prize} />
            )}
            {organizerInfo && (
              <TertiaryDataItem label="Organizer" value={organizerInfo} />
            )}
            {sponsorInfo && (
              <TertiaryDataItem label="Sponsor" value={sponsorInfo} />
            )}
            {website && (
              <TertiaryDataItem label="Website" value={website} link />
            )}
          </ScanOptimizedLayout>
        </View>
      )}
    </HierarchyContainer>
  );
};

// Statistics Display with Progressive Disclosure
interface StatisticsProps {
  matchesCompleted?: number;
  totalMatches?: number;
  averageMatchDuration?: string;
  setsPlayed?: number;
  refereeAssignments?: number;
  completionPercentage?: number;
  collapsed?: boolean;
}

export const TournamentStatistics: React.FC<StatisticsProps> = ({
  matchesCompleted,
  totalMatches,
  averageMatchDuration,
  setsPlayed,
  refereeAssignments,
  completionPercentage,
  collapsed = true,
}) => {
  const [isCollapsed, setIsCollapsed] = React.useState(collapsed);

  const stats = [
    { label: 'Matches Completed', value: matchesCompleted, total: totalMatches },
    { label: 'Avg Duration', value: averageMatchDuration },
    { label: 'Sets Played', value: setsPlayed },
    { label: 'Your Assignments', value: refereeAssignments },
    { label: 'Progress', value: completionPercentage ? `${completionPercentage}%` : undefined },
  ].filter(stat => stat.value !== undefined);

  return (
    <HierarchyContainer priority="tertiary" style={styles.tertiaryContainer}>
      <TouchableOpacity onPress={() => setIsCollapsed(!isCollapsed)} style={styles.tertiaryHeader}>
        <SectionHeader priority="tertiary">
          Tournament Statistics
        </SectionHeader>
        <Text style={styles.collapseIcon}>
          {isCollapsed ? '▶' : '▼'}
        </Text>
      </TouchableOpacity>

      {!isCollapsed && (
        <View style={styles.tertiaryContent}>
          <View style={styles.statsGrid}>
            {stats.map((stat, index) => (
              <View key={index} style={styles.statItem}>
                <VisualHierarchyText
                  priority="tertiary"
                  variant="caption"
                  style={styles.statLabel}
                >
                  {stat.label}
                </VisualHierarchyText>
                <VisualHierarchyText
                  priority="tertiary"
                  variant="body"
                  emphasis="normal"
                  style={styles.statValue}
                >
                  {stat.total ? `${stat.value}/${stat.total}` : stat.value}
                </VisualHierarchyText>
              </View>
            ))}
          </View>
        </View>
      )}
    </HierarchyContainer>
  );
};

// Administrative Details with Expandable Sections
interface AdminDetailsProps {
  regulations?: string[];
  contacts?: Array<{ name: string; role: string; phone?: string; email?: string }>;
  procedures?: Array<{ title: string; description: string }>;
  updates?: Array<{ time: string; message: string }>;
  collapsed?: boolean;
}

export const AdministrativeDetails: React.FC<AdminDetailsProps> = ({
  regulations,
  contacts,
  procedures,
  updates,
  collapsed = true,
}) => {
  const [isCollapsed, setIsCollapsed] = React.useState(collapsed);
  const [expandedSections, setExpandedSections] = React.useState<Set<string>>(new Set());

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  return (
    <HierarchyContainer priority="tertiary" style={styles.tertiaryContainer}>
      <TouchableOpacity onPress={() => setIsCollapsed(!isCollapsed)} style={styles.tertiaryHeader}>
        <SectionHeader priority="tertiary">
          Administrative Details
        </SectionHeader>
        <Text style={styles.collapseIcon}>
          {isCollapsed ? '▶' : '▼'}
        </Text>
      </TouchableOpacity>

      {!isCollapsed && (
        <ScrollView style={styles.tertiaryContent} nestedScrollEnabled>
          {regulations && regulations.length > 0 && (
            <ExpandableSection
              title="Regulations"
              expanded={expandedSections.has('regulations')}
              onToggle={() => toggleSection('regulations')}
            >
              {regulations.map((rule, index) => (
                <VisualHierarchyText
                  key={index}
                  priority="tertiary"
                  variant="caption"
                  style={styles.listItem}
                >
                  • {rule}
                </VisualHierarchyText>
              ))}
            </ExpandableSection>
          )}

          {contacts && contacts.length > 0 && (
            <ExpandableSection
              title="Emergency Contacts"
              expanded={expandedSections.has('contacts')}
              onToggle={() => toggleSection('contacts')}
            >
              {contacts.map((contact, index) => (
                <View key={index} style={styles.contactItem}>
                  <VisualHierarchyText
                    priority="tertiary"
                    variant="body"
                    emphasis="strong"
                    style={styles.contactName}
                  >
                    {contact.name}
                  </VisualHierarchyText>
                  <VisualHierarchyText
                    priority="tertiary"
                    variant="caption"
                    style={styles.contactRole}
                  >
                    {contact.role}
                  </VisualHierarchyText>
                  {contact.phone && (
                    <Text style={styles.contactPhone}>{contact.phone}</Text>
                  )}
                </View>
              ))}
            </ExpandableSection>
          )}

          {procedures && procedures.length > 0 && (
            <ExpandableSection
              title="Procedures"
              expanded={expandedSections.has('procedures')}
              onToggle={() => toggleSection('procedures')}
            >
              {procedures.map((procedure, index) => (
                <View key={index} style={styles.procedureItem}>
                  <VisualHierarchyText
                    priority="tertiary"
                    variant="body"
                    emphasis="strong"
                    style={styles.procedureTitle}
                  >
                    {procedure.title}
                  </VisualHierarchyText>
                  <VisualHierarchyText
                    priority="tertiary"
                    variant="caption"
                    style={styles.procedureDescription}
                  >
                    {procedure.description}
                  </VisualHierarchyText>
                </View>
              ))}
            </ExpandableSection>
          )}

          {updates && updates.length > 0 && (
            <ExpandableSection
              title="Recent Updates"
              expanded={expandedSections.has('updates')}
              onToggle={() => toggleSection('updates')}
            >
              {updates.map((update, index) => (
                <View key={index} style={styles.updateItem}>
                  <Text style={styles.updateTime}>{update.time}</Text>
                  <VisualHierarchyText
                    priority="tertiary"
                    variant="caption"
                    style={styles.updateMessage}
                  >
                    {update.message}
                  </VisualHierarchyText>
                </View>
              ))}
            </ExpandableSection>
          )}
        </ScrollView>
      )}
    </HierarchyContainer>
  );
};

// Helper Components
interface TertiaryDataItemProps {
  label: string;
  value: string;
  link?: boolean;
}

const TertiaryDataItem: React.FC<TertiaryDataItemProps> = ({ label, value, link }) => (
  <View style={styles.dataItem}>
    <Text style={styles.dataLabel}>{label}:</Text>
    <VisualHierarchyText
      priority="tertiary"
      variant="caption"
      style={[styles.dataValue, link && styles.linkValue]}
    >
      {value}
    </VisualHierarchyText>
  </View>
);

interface ExpandableSectionProps {
  title: string;
  children: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
}

const ExpandableSection: React.FC<ExpandableSectionProps> = ({
  title,
  children,
  expanded,
  onToggle,
}) => (
  <View style={styles.expandableSection}>
    <TouchableOpacity onPress={onToggle} style={styles.sectionHeader}>
      <VisualHierarchyText
        priority="tertiary"
        variant="body"
        style={styles.sectionTitle}
      >
        {title}
      </VisualHierarchyText>
      <Text style={styles.sectionIcon}>
        {expanded ? '▼' : '▶'}
      </Text>
    </TouchableOpacity>
    {expanded && (
      <View style={styles.sectionContent}>
        {children}
      </View>
    )}
  </View>
);

// Information Density Balancer - Responsive layout for mobile readability
interface DensityBalancerProps {
  children: React.ReactNode;
  maxHeight?: number;
  showScrollIndicator?: boolean;
}

export const InformationDensityBalancer: React.FC<DensityBalancerProps> = ({
  children,
  maxHeight = 200,
  showScrollIndicator = false,
}) => {
  return (
    <View style={[styles.densityBalancer, { maxHeight }]}>
      <ScrollView
        style={styles.scrollableContent}
        showsVerticalScrollIndicator={showScrollIndicator}
        nestedScrollEnabled
      >
        {children}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  // Tertiary Container Base
  tertiaryContainer: {
    backgroundColor: designTokens.brandColors.primaryLight,
    opacity: 0.9,
    marginHorizontal: designTokens.spacing.md,
    marginVertical: designTokens.spacing.xs,
    borderRadius: 8,
    overflow: 'hidden',
  },

  tertiaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: designTokens.spacing.sm,
    paddingVertical: designTokens.spacing.xs,
    backgroundColor: designTokens.brandColors.primaryLight,
  },

  collapseIcon: {
    fontSize: 12,
    color: designTokens.colors.textSecondary,
  },

  tertiaryContent: {
    paddingHorizontal: designTokens.spacing.sm,
    paddingVertical: designTokens.spacing.xs,
    maxHeight: 250, // Limit height to prevent overwhelming
  },

  // Data Items
  dataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },

  dataLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: designTokens.colors.textSecondary,
    marginRight: designTokens.spacing.xs,
    minWidth: 80,
  },

  dataValue: {
    flex: 1,
  },

  linkValue: {
    color: designTokens.colors.secondary,
    textDecorationLine: 'underline',
  },

  // Statistics
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: designTokens.spacing.xs,
  },

  statItem: {
    flex: 0.48,
    backgroundColor: designTokens.colors.background,
    padding: designTokens.spacing.xs,
    borderRadius: 6,
    alignItems: 'center',
    minHeight: 50,
    justifyContent: 'center',
  },

  statLabel: {
    textAlign: 'center',
    marginBottom: 2,
  },

  statValue: {
    textAlign: 'center',
    fontWeight: 'bold',
  },

  // Expandable Sections
  expandableSection: {
    marginVertical: designTokens.spacing.xs,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: designTokens.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.brandColors.secondaryLight,
  },

  sectionTitle: {
    fontWeight: '600',
  },

  sectionIcon: {
    fontSize: 10,
    color: designTokens.colors.textSecondary,
  },

  sectionContent: {
    paddingTop: designTokens.spacing.xs,
    paddingLeft: designTokens.spacing.sm,
  },

  // List Items
  listItem: {
    marginVertical: 2,
    lineHeight: 16,
  },

  // Contacts
  contactItem: {
    marginVertical: designTokens.spacing.xs,
    paddingBottom: designTokens.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.brandColors.primaryLight,
  },

  contactName: {
    marginBottom: 2,
  },

  contactRole: {
    marginBottom: 2,
    fontStyle: 'italic',
  },

  contactPhone: {
    fontSize: 12,
    color: designTokens.colors.secondary,
    fontWeight: 'bold',
  },

  // Procedures
  procedureItem: {
    marginVertical: designTokens.spacing.xs,
  },

  procedureTitle: {
    marginBottom: 2,
  },

  procedureDescription: {
    lineHeight: 16,
  },

  // Updates
  updateItem: {
    flexDirection: 'row',
    marginVertical: designTokens.spacing.xs,
    paddingBottom: designTokens.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.brandColors.primaryLight,
  },

  updateTime: {
    fontSize: 10,
    color: designTokens.colors.textSecondary,
    marginRight: designTokens.spacing.xs,
    minWidth: 50,
  },

  updateMessage: {
    flex: 1,
    lineHeight: 16,
  },

  // Density Balancer
  densityBalancer: {
    borderRadius: 8,
    overflow: 'hidden',
  },

  scrollableContent: {
    flex: 1,
  },
});