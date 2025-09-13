/**
 * InfoPanel Component - Structured Text Hierarchy for Tournament Details
 * Optimized for detailed information presentation with clear scanning hierarchy
 */

import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Title, Heading, Subheading, EnhancedBodyText, EnhancedCaption } from './Text';
import { colors, spacing } from '../../theme/tokens';

export interface InfoItem {
  key: string;
  label: string;
  value: string | number;
  emphasis?: 'critical' | 'high' | 'medium' | 'low';
  sublabel?: string;
}

export interface InfoSection {
  title: string;
  items: InfoItem[];
  priority?: 'primary' | 'secondary' | 'tertiary';
}

export interface InfoPanelProps {
  title?: string;
  sections: InfoSection[];
  variant?: 'card' | 'list' | 'compact';
  scrollable?: boolean;
  testID?: string;
}

/**
 * InfoPanel with structured text hierarchy for tournament information
 * Supports multiple display variants for different contexts
 */
export const InfoPanel: React.FC<InfoPanelProps> = ({
  title,
  sections,
  variant = 'card',
  scrollable = false,
  testID,
}) => {
  const renderInfoItem = (item: InfoItem, index: number) => {
    const emphasis = item.emphasis || 'medium';
    const isLast = index === sections.reduce((acc, section) => acc + section.items.length, 0) - 1;

    return (
      <View key={item.key} style={[styles.infoItem, !isLast && styles.infoItemBorder]}>
        <View style={styles.infoItemContent}>
          <EnhancedCaption 
            emphasis="medium"
            color="textSecondary"
            style={styles.infoLabel}
          >
            {item.label}
          </EnhancedCaption>
          
          <EnhancedBodyText 
            emphasis={emphasis}
            hierarchy="tertiary"
            color="textPrimary"
            style={styles.infoValue}
          >
            {item.value}
          </EnhancedBodyText>
          
          {item.sublabel && (
            <EnhancedCaption 
              emphasis="low"
              color="textSecondary"
              style={styles.infoSublabel}
            >
              {item.sublabel}
            </EnhancedCaption>
          )}
        </View>
      </View>
    );
  };

  const renderSection = (section: InfoSection, sectionIndex: number) => {
    const hierarchyLevel = section.priority || 'secondary';
    
    return (
      <View key={sectionIndex} style={styles.section}>
        <Heading 
          emphasis="high"
          hierarchy={hierarchyLevel}
          color="textPrimary"
          style={styles.sectionTitle}
        >
          {section.title}
        </Heading>
        
        <View style={styles.sectionContent}>
          {section.items.map((item, itemIndex) => renderInfoItem(item, itemIndex))}
        </View>
      </View>
    );
  };

  const renderCard = () => (
    <View style={styles.cardContainer} testID={testID}>
      {title && (
        <Title 
          level={2}
          color="textPrimary"
          style={styles.panelTitle}
        >
          {title}
        </Title>
      )}
      {sections.map(renderSection)}
    </View>
  );

  const renderList = () => (
    <View style={styles.listContainer} testID={testID}>
      {title && (
        <Heading 
          emphasis="high"
          hierarchy="primary"
          color="textPrimary"
          style={styles.panelTitle}
        >
          {title}
        </Heading>
      )}
      {sections.map(renderSection)}
    </View>
  );

  const renderCompact = () => (
    <View style={styles.compactContainer} testID={testID}>
      {title && (
        <Subheading 
          emphasis="medium"
          color="textPrimary"
          style={styles.compactTitle}
        >
          {title}
        </Subheading>
      )}
      <View style={styles.compactGrid}>
        {sections.map(section => (
          <View key={section.title} style={styles.compactSection}>
            <EnhancedCaption 
              emphasis="medium"
              color="textSecondary"
              style={styles.compactSectionTitle}
            >
              {section.title.toUpperCase()}
            </EnhancedCaption>
            {section.items.map(item => (
              <View key={item.key} style={styles.compactItem}>
                <EnhancedBodyText 
                  emphasis={item.emphasis || 'medium'}
                  color="textPrimary"
                  style={styles.compactValue}
                >
                  {item.value}
                </EnhancedBodyText>
              </View>
            ))}
          </View>
        ))}
      </View>
    </View>
  );

  const renderPanel = () => {
    switch (variant) {
      case 'list':
        return renderList();
      case 'compact':
        return renderCompact();
      case 'card':
      default:
        return renderCard();
    }
  };

  return scrollable ? (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      {renderPanel()}
    </ScrollView>
  ) : (
    renderPanel()
  );
};

/**
 * TournamentInfoPanel - Specialized variant for tournament details
 * Pre-configured with tournament-specific sections and priorities
 */
export const TournamentInfoPanel: React.FC<{
  tournament: {
    name: string;
    category: string;
    dates: string;
    location: string;
    surface: string;
    status: string;
  };
  matches?: {
    total: number;
    completed: number;
    remaining: number;
  };
  refereeInfo?: {
    assigned: number;
    confirmed: number;
    active: number;
  };
  testID?: string;
}> = ({ tournament, matches, refereeInfo, testID }) => {
  const sections: InfoSection[] = [
    {
      title: 'Tournament Details',
      priority: 'primary',
      items: [
        { key: 'name', label: 'Tournament', value: tournament.name, emphasis: 'high' },
        { key: 'category', label: 'Category', value: tournament.category },
        { key: 'dates', label: 'Dates', value: tournament.dates },
        { key: 'location', label: 'Location', value: tournament.location },
        { key: 'surface', label: 'Surface', value: tournament.surface },
        { key: 'status', label: 'Status', value: tournament.status, emphasis: 'high' },
      ],
    },
  ];

  if (matches) {
    sections.push({
      title: 'Match Progress',
      priority: 'secondary',
      items: [
        { key: 'total', label: 'Total Matches', value: matches.total },
        { key: 'completed', label: 'Completed', value: matches.completed, emphasis: 'medium' },
        { key: 'remaining', label: 'Remaining', value: matches.remaining, emphasis: 'high' },
      ],
    });
  }

  if (refereeInfo) {
    sections.push({
      title: 'Referee Assignments',
      priority: 'secondary',
      items: [
        { key: 'assigned', label: 'Assigned', value: refereeInfo.assigned },
        { key: 'confirmed', label: 'Confirmed', value: refereeInfo.confirmed, emphasis: 'medium' },
        { key: 'active', label: 'Active Now', value: refereeInfo.active, emphasis: 'critical' },
      ],
    });
  }

  return (
    <InfoPanel
      title="Tournament Information"
      sections={sections}
      variant="card"
      testID={testID}
    />
  );
};

const styles = StyleSheet.create({
  // Card variant styles
  cardContainer: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: spacing.lg,
    margin: spacing.md,
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  // List variant styles
  listContainer: {
    padding: spacing.md,
    backgroundColor: colors.background,
  },

  // Compact variant styles
  compactContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: spacing.md,
    margin: spacing.sm,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  compactTitle: {
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  compactGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  compactSection: {
    flex: 1,
    minWidth: 100,
    marginHorizontal: spacing.xs,
    marginVertical: spacing.xs,
  },
  compactSectionTitle: {
    marginBottom: spacing.xs,
    textAlign: 'center',
    fontWeight: '600',
  },
  compactItem: {
    alignItems: 'center',
    marginVertical: 2,
  },
  compactValue: {
    textAlign: 'center',
    fontWeight: '500',
  },

  // Common styles
  panelTitle: {
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    marginBottom: spacing.md,
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  sectionContent: {
    paddingLeft: spacing.sm,
  },
  infoItem: {
    paddingVertical: spacing.sm,
  },
  infoItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoItemContent: {
    paddingHorizontal: spacing.sm,
  },
  infoLabel: {
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  infoValue: {
    marginBottom: spacing.xs,
    fontWeight: '500',
  },
  infoSublabel: {
    fontStyle: 'italic',
  },
  scrollContainer: {
    flexGrow: 1,
  },
});

export default InfoPanel;