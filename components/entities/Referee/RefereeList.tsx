import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Text,
  RefreshControl,
} from 'react-native';
import { EventReferee, RefereeOfficial, isActiveOfficial } from '../../../types/referee-v2';
import { RefereeCard } from './RefereeCard';
import { ActionIcons, UtilityIcons } from '../../Icons/IconLibrary';
import { colors } from '../../../theme/tokens';

export interface RefereeListProps {
  referees: (EventReferee | RefereeOfficial)[];
  onRefereePress?: (referee: EventReferee | RefereeOfficial) => void;
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  refreshing?: boolean;
  showStatusBadge?: boolean;
  showRole?: boolean;
  showAssignments?: boolean;
  compactMode?: boolean;
  filterByStatus?: 'all' | 'active' | 'inactive' | 'suspended' | 'restricted';
  filterByGender?: 'all' | 'M' | 'W';
  filterByType?: 'all' | 'Referee' | 'Technical' | 'Administrative';
  filterByRole?: string | 'all';
  groupByStatus?: boolean;
  maxItems?: number;
  emptyMessage?: string;
  variant?: 'default' | 'assignment' | 'selection';
  assignmentCounts?: Record<string, number>;
}

/**
 * Unified Referee List Component
 * Displays referees with filtering, sorting, and grouping capabilities
 */
export const RefereeList: React.FC<RefereeListProps> = ({
  referees,
  onRefereePress,
  loading = false,
  error = null,
  onRefresh,
  refreshing = false,
  showStatusBadge = true,
  showRole = false,
  showAssignments = false,
  compactMode = false,
  filterByStatus = 'all',
  filterByGender = 'all',
  filterByType = 'all',
  filterByRole = 'all',
  groupByStatus = false,
  maxItems,
  emptyMessage = 'No referees found',
  variant = 'default',
  assignmentCounts = {},
}) => {
  
  // Filter and sort referees
  const filteredReferees = useMemo(() => {
    let filtered = [...referees];

    // Apply status filter
    if (filterByStatus !== 'all') {
      filtered = filtered.filter(referee => {
        return referee.status.toLowerCase() === filterByStatus.toLowerCase();
      });
    }

    // Apply gender filter
    if (filterByGender !== 'all') {
      filtered = filtered.filter(referee => {
        return referee.gender === filterByGender;
      });
    }

    // Apply type filter
    if (filterByType !== 'all') {
      filtered = filtered.filter(referee => {
        return referee.type === filterByType;
      });
    }

    // Apply role filter (only for RefereeOfficial)
    if (filterByRole !== 'all') {
      filtered = filtered.filter(referee => {
        const role = (referee as RefereeOfficial).role;
        return role === filterByRole;
      });
    }

    // Sort by status and name
    filtered.sort((a, b) => {
      // Priority order: active -> restricted -> inactive -> suspended
      const statusPriority = { 
        active: 0, 
        restricted: 1, 
        inactive: 2, 
        suspended: 3 
      };
      const priorityA = statusPriority[a.status.toLowerCase() as keyof typeof statusPriority] ?? 4;
      const priorityB = statusPriority[b.status.toLowerCase() as keyof typeof statusPriority] ?? 4;
      
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      
      // Within same status, sort by name
      const nameA = `${a.firstName} ${a.lastName}`;
      const nameB = `${b.firstName} ${b.lastName}`;
      return nameA.localeCompare(nameB);
    });

    // Apply max items limit
    if (maxItems && maxItems > 0) {
      filtered = filtered.slice(0, maxItems);
    }

    return filtered;
  }, [referees, filterByStatus, filterByGender, filterByType, filterByRole, maxItems]);

  // Group referees by status if requested
  const groupedReferees = useMemo(() => {
    if (!groupByStatus) {
      return [{ title: '', data: filteredReferees }];
    }

    const groups = filteredReferees.reduce((acc, referee) => {
      const status = referee.status;
      const statusTitle = status === 'Active' ? 'Active Referees' : 
                         status === 'Inactive' ? 'Inactive Referees' : 
                         status === 'Suspended' ? 'Suspended Referees' :
                         status === 'Restricted' ? 'Restricted Referees' :
                         'Other Referees';
      
      if (!acc[statusTitle]) {
        acc[statusTitle] = [];
      }
      acc[statusTitle].push(referee);
      return acc;
    }, {} as Record<string, (EventReferee | RefereeOfficial)[]>);

    return Object.entries(groups).map(([title, data]) => ({ title, data }));
  }, [filteredReferees, groupByStatus]);

  // Get assignment count for referee
  const getAssignmentCount = (referee: EventReferee | RefereeOfficial): number => {
    const id = 'RefereeId' in referee ? referee.RefereeId : referee.noOfficial;
    return assignmentCounts[id] || 0;
  };

  // Render referee item
  const renderReferee = useCallback(({ item }: { item: EventReferee | RefereeOfficial }) => (
    <RefereeCard
      referee={item}
      onPress={onRefereePress}
      showStatusBadge={showStatusBadge}
      showRole={showRole}
      showAssignments={showAssignments}
      compact={compactMode}
      variant={variant}
      assignmentCount={getAssignmentCount(item)}
    />
  ), [onRefereePress, showStatusBadge, showRole, showAssignments, compactMode, variant, assignmentCounts]);

  // Render section header for grouped display
  const renderSectionHeader = ({ section }: { section: { title: string } }) => {
    if (!section.title) return null;
    
    return (
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionHeaderText}>{section.title}</Text>
        <View style={styles.sectionHeaderLine} />
      </View>
    );
  };

  // Render empty state
  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <ActionIcons.Referee style={styles.emptyIcon} />
      <Text style={styles.emptyTitle}>No Referees Found</Text>
      <Text style={styles.emptySubtitle}>
        {error ? error : emptyMessage}
      </Text>
      {error && onRefresh && (
        <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
          <UtilityIcons.Refresh style={styles.retryIcon} />
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // Render loading state
  if (loading && filteredReferees.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Loading referees...</Text>
        </View>
      </View>
    );
  }

  // Render grouped list
  if (groupByStatus) {
    return (
      <View style={styles.container}>
        <FlatList
          data={groupedReferees.flatMap(section => [
            { type: 'header', title: section.title, key: `header-${section.title}` },
            ...section.data.map(referee => ({ 
              type: 'referee', 
              referee, 
              key: 'RefereeId' in referee ? referee.RefereeId : referee.noOfficial 
            }))
          ])}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => {
            if (item.type === 'header') {
              return renderSectionHeader({ section: { title: item.title } });
            }
            return renderReferee({ item: (item as any).referee });
          }}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[colors.accent]}
                tintColor={colors.accent}
              />
            ) : undefined
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.listContent,
            filteredReferees.length === 0 && styles.listContentEmpty
          ]}
        />
      </View>
    );
  }

  // Render simple list
  return (
    <View style={styles.container}>
      <FlatList
        data={filteredReferees}
        keyExtractor={(item) => 'RefereeId' in item ? item.RefereeId : item.noOfficial}
        renderItem={renderReferee}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.accent]}
              tintColor={colors.accent}
            />
          ) : undefined
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContent,
          filteredReferees.length === 0 && styles.listContentEmpty
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  listContent: {
    paddingBottom: 32,
  },
  listContentEmpty: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 64,
    color: '#D1D5DB',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1B365D',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryIcon: {
    fontSize: 18,
    color: '#FFFFFF',
    marginRight: 8,
  },
  retryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#F8FAFC',
  },
  sectionHeaderText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B365D',
    marginRight: 16,
  },
  sectionHeaderLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
});