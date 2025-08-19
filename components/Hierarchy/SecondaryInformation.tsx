/**
 * Secondary Information Components
 * Tournament context, match details, and team information optimized for quick scanning
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { designTokens } from '../../theme/tokens';
import { HierarchyContainer, InfoGroup } from './InformationArchitecture';
import { VisualHierarchyText, SectionHeader } from './VisualHierarchyText';
import { ScanOptimizedLayout, QuickScanGrid } from './ScanOptimizedLayout';

// Tournament Context Display
interface TournamentContextProps {
  tournamentTitle: string;
  location?: string;
  dateRange?: string;
  phase?: string;
  compact?: boolean;
  onPress?: () => void;
}

export const TournamentContext: React.FC<TournamentContextProps> = ({
  tournamentTitle,
  location,
  dateRange,
  phase,
  compact = false,
  onPress,
}) => {
  const content = (
    <InfoGroup priority="secondary" separated={!compact}>
      <SectionHeader priority="secondary">
        Tournament Context
      </SectionHeader>
      
      <ScanOptimizedLayout pattern="f-pattern" spacing="tight">
        <VisualHierarchyText
          priority="secondary"
          variant="body"
          emphasis="strong"
          style={styles.tournamentTitle}
        >
          {tournamentTitle}
        </VisualHierarchyText>
        
        {location && (
          <View style={styles.contextRow}>
            <Text style={styles.contextLabel}>📍</Text>
            <VisualHierarchyText
              priority="secondary"
              variant="body"
              style={styles.contextValue}
            >
              {location}
            </VisualHierarchyText>
          </View>
        )}
        
        {dateRange && (
          <View style={styles.contextRow}>
            <Text style={styles.contextLabel}>📅</Text>
            <VisualHierarchyText
              priority="secondary"
              variant="body"
              style={styles.contextValue}
            >
              {dateRange}
            </VisualHierarchyText>
          </View>
        )}
        
        {phase && (
          <View style={styles.contextBadge}>
            <VisualHierarchyText
              priority="secondary"
              variant="caption"
              emphasis="strong"
              style={styles.phaseText}
            >
              {phase}
            </VisualHierarchyText>
          </View>
        )}
      </ScanOptimizedLayout>
    </InfoGroup>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} style={styles.touchable}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

// Match Details Display
interface MatchDetailsProps {
  matchType?: string;
  round?: string;
  importance?: 'high' | 'medium' | 'low';
  duration?: string;
  court?: string;
  courtType?: string;
  officials?: string[];
  compact?: boolean;
}

export const MatchDetails: React.FC<MatchDetailsProps> = ({
  matchType,
  round,
  importance,
  duration,
  court,
  courtType,
  officials,
  compact = false,
}) => {
  return (
    <InfoGroup priority="secondary" separated={true}>
      <SectionHeader priority="secondary">
        Match Details
      </SectionHeader>
      
      <QuickScanGrid columns={compact ? 1 : 2} priority="secondary">
        {matchType && (
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Type:</Text>
            <VisualHierarchyText
              priority="secondary"
              variant="body"
              style={styles.detailValue}
            >
              {matchType}
            </VisualHierarchyText>
          </View>
        )}
        
        {round && (
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Round:</Text>
            <VisualHierarchyText
              priority="secondary"
              variant="body"
              style={styles.detailValue}
            >
              {round}
            </VisualHierarchyText>
          </View>
        )}
        
        {importance && (
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Priority:</Text>
            <View style={[styles.importanceBadge, styles[`${importance}Importance`]]}>
              <Text style={[styles.importanceText, styles[`${importance}ImportanceText`]]}>
                {importance.toUpperCase()}
              </Text>
            </View>
          </View>
        )}
        
        {duration && (
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Duration:</Text>
            <VisualHierarchyText
              priority="secondary"
              variant="body"
              style={styles.detailValue}
            >
              {duration}
            </VisualHierarchyText>
          </View>
        )}
        
        {court && (
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Court:</Text>
            <VisualHierarchyText
              priority="secondary"
              variant="body"
              emphasis="strong"
              style={styles.detailValue}
            >
              {court} {courtType && `(${courtType})`}
            </VisualHierarchyText>
          </View>
        )}
      </QuickScanGrid>
      
      {officials && officials.length > 0 && (
        <View style={styles.officialsSection}>
          <Text style={styles.detailLabel}>Officials:</Text>
          <View style={styles.officialsList}>
            {officials.map((official, index) => (
              <VisualHierarchyText
                key={index}
                priority="secondary"
                variant="caption"
                style={styles.officialName}
              >
                {official}
              </VisualHierarchyText>
            ))}
          </View>
        </View>
      )}
    </InfoGroup>
  );
};

// Team Information Layout
interface TeamInfoProps {
  teams: string[];
  rankings?: number[];
  countries?: string[];
  records?: string[];
  compact?: boolean;
}

export const TeamInformation: React.FC<TeamInfoProps> = ({
  teams,
  rankings,
  countries,
  records,
  compact = false,
}) => {
  return (
    <InfoGroup priority="secondary" separated={true}>
      <SectionHeader priority="secondary">
        Teams
      </SectionHeader>
      
      <ScanOptimizedLayout 
        pattern={compact ? "layered" : "z-pattern"} 
        spacing="normal"
      >
        {teams.map((team, index) => (
          <View key={index} style={styles.teamCard}>
            <VisualHierarchyText
              priority="secondary"
              variant="body"
              emphasis="strong"
              style={styles.teamName}
            >
              {team}
            </VisualHierarchyText>
            
            <View style={styles.teamDetails}>
              {countries?.[index] && (
                <Text style={styles.teamCountry}>
                  🏁 {countries[index]}
                </Text>
              )}
              
              {rankings?.[index] && (
                <View style={styles.rankingBadge}>
                  <Text style={styles.rankingText}>
                    #{rankings[index]}
                  </Text>
                </View>
              )}
              
              {records?.[index] && (
                <Text style={styles.teamRecord}>
                  {records[index]}
                </Text>
              )}
            </View>
            
            {index < teams.length - 1 && (
              <View style={styles.versusIndicator}>
                <Text style={styles.versusText}>VS</Text>
              </View>
            )}
          </View>
        ))}
      </ScanOptimizedLayout>
    </InfoGroup>
  );
};

// Information Grouping Container for Visual Separation
interface InfoClusterProps {
  children: React.ReactNode;
  title?: string;
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

export const InfoCluster: React.FC<InfoClusterProps> = ({
  children,
  title,
  collapsible = false,
  defaultExpanded = true,
}) => {
  const [expanded, setExpanded] = React.useState(defaultExpanded);

  return (
    <HierarchyContainer priority="secondary" grouping={true}>
      {title && (
        <TouchableOpacity
          onPress={collapsible ? () => setExpanded(!expanded) : undefined}
          style={styles.clusterHeader}
        >
          <SectionHeader priority="secondary" collapsible={collapsible}>
            {title}
          </SectionHeader>
          {collapsible && (
            <Text style={styles.expandIcon}>
              {expanded ? '▼' : '▶'}
            </Text>
          )}
        </TouchableOpacity>
      )}
      
      {expanded && (
        <View style={styles.clusterContent}>
          {children}
        </View>
      )}
    </HierarchyContainer>
  );
};

const styles = StyleSheet.create({
  // Tournament Context
  tournamentTitle: {
    marginBottom: designTokens.spacing.xs,
    textAlign: 'center',
  },
  
  contextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  
  contextLabel: {
    fontSize: 14,
    marginRight: designTokens.spacing.xs,
  },
  
  contextValue: {
    flex: 1,
  },
  
  contextBadge: {
    alignSelf: 'center',
    backgroundColor: designTokens.brandColors.secondaryLight,
    paddingHorizontal: designTokens.spacing.sm,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: designTokens.spacing.xs,
  },
  
  phaseText: {
    color: designTokens.colors.secondary,
  },
  
  touchable: {
    borderRadius: 8,
  },
  
  // Match Details
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: designTokens.spacing.xs,
    flex: 1,
  },
  
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: designTokens.colors.textSecondary,
    marginRight: designTokens.spacing.xs,
    minWidth: 60,
  },
  
  detailValue: {
    flex: 1,
  },
  
  importanceBadge: {
    paddingHorizontal: designTokens.spacing.xs,
    paddingVertical: 2,
    borderRadius: 4,
  },
  
  highImportance: {
    backgroundColor: designTokens.colors.error,
  },
  
  mediumImportance: {
    backgroundColor: designTokens.colors.warning,
  },
  
  lowImportance: {
    backgroundColor: designTokens.colors.textSecondary,
  },
  
  importanceText: {
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  
  highImportanceText: {
    color: designTokens.colors.background,
  },
  
  mediumImportanceText: {
    color: designTokens.colors.background,
  },
  
  lowImportanceText: {
    color: designTokens.colors.background,
  },
  
  officialsSection: {
    marginTop: designTokens.spacing.sm,
    paddingTop: designTokens.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: designTokens.brandColors.primaryLight,
  },
  
  officialsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: designTokens.spacing.xs,
    marginTop: designTokens.spacing.xs,
  },
  
  officialName: {
    backgroundColor: designTokens.brandColors.primaryLight,
    paddingHorizontal: designTokens.spacing.xs,
    paddingVertical: 2,
    borderRadius: 4,
  },
  
  // Team Information
  teamCard: {
    backgroundColor: designTokens.colors.background,
    padding: designTokens.spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: designTokens.brandColors.primaryLight,
    marginVertical: designTokens.spacing.xs,
    position: 'relative',
  },
  
  teamName: {
    textAlign: 'center',
    marginBottom: designTokens.spacing.xs,
  },
  
  teamDetails: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: designTokens.spacing.xs,
  },
  
  teamCountry: {
    fontSize: 12,
    color: designTokens.colors.textSecondary,
  },
  
  rankingBadge: {
    backgroundColor: designTokens.colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  
  rankingText: {
    color: designTokens.colors.background,
    fontSize: 12,
    fontWeight: 'bold',
  },
  
  teamRecord: {
    fontSize: 12,
    color: designTokens.colors.textSecondary,
    fontWeight: '600',
  },
  
  versusIndicator: {
    position: 'absolute',
    right: -15,
    top: '50%',
    backgroundColor: designTokens.colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    transform: [{ translateY: -12 }],
  },
  
  versusText: {
    color: designTokens.colors.background,
    fontSize: 10,
    fontWeight: 'bold',
  },
  
  // Info Cluster
  clusterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: designTokens.spacing.xs,
  },
  
  expandIcon: {
    fontSize: 16,
    color: designTokens.colors.textSecondary,
  },
  
  clusterContent: {
    paddingTop: designTokens.spacing.sm,
  },
});