import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors, designTokens } from '../theme/tokens';
import { Tournament } from '../types/tournament';
import { AssignmentStatusProvider } from '../hooks/useAssignmentStatus';
import BottomTabNavigation from '../components/navigation/BottomTabNavigation';
import NavigationHeader from '../components/navigation/NavigationHeader';

const ToolsSelectionScreenContent: React.FC = () => {
  const router = useRouter();
  const { tournamentData } = useLocalSearchParams<{ tournamentData: string }>();

  const tournament: Tournament = React.useMemo(() => {
    try {
      return JSON.parse(tournamentData || '{}') as Tournament;
    } catch {
      return {} as Tournament;
    }
  }, [tournamentData]);

  const tools = [
    // Tools removed as per user request - only using tournament details and referee list
  ];

  const handleToolPress = (tool: typeof tools[0]) => {
    if (tournament && tournament.No) {
      router.push({
        pathname: tool.route,
        params: { tournamentData: JSON.stringify(tournament) }
      });
    } else {
      router.push(tool.route);
    }
  };

  return (
    <View style={styles.container}>
      <NavigationHeader
        title="Tools"
        showBackButton={false}
        showStatusBar={false}
        rightComponent={
          <TouchableOpacity 
            style={styles.tournamentSelectButton}
            onPress={() => router.push('/tournament-selection')}
          >
            <Text style={styles.tournamentSelectButtonText}>📋</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.pageTitle}>Tools</Text>
        <Text style={styles.pageSubtitle}>Monitoring tools have been simplified - use Tournament Details and Referee List</Text>

        <View style={styles.toolsGrid}>
          <View style={styles.emptyToolsMessage}>
            <Text style={styles.emptyText}>📋</Text>
            <Text style={styles.emptyTitle}>Simplified Interface</Text>
            <Text style={styles.emptyDescription}>
              Use the Tournament Details screen for match monitoring and the Referee List (🏐 button) for referee tools.
            </Text>
          </View>
        </View>

        {tournament.Name && (
          <View style={styles.tournamentInfo}>
            <Text style={styles.tournamentInfoTitle}>Current Tournament</Text>
            <Text style={styles.tournamentName}>{tournament.Name}</Text>
          </View>
        )}
      </ScrollView>

      <BottomTabNavigation 
        currentTab="monitor" 
        onTabPress={(tab) => {
          if (tab === 'details' && tournament) {
            router.push({
              pathname: '/tournament-detail',
              params: { tournamentData: JSON.stringify(tournament) }
            });
          } else if (tab === 'monitor') {
            // Already on tools page, do nothing
            return;
          }
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1B365D',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 8,
  },
  pageSubtitle: {
    fontSize: 16,
    color: designTokens.neutrals.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 24,
  },
  toolsGrid: {
    paddingHorizontal: 16,
    gap: 16,
  },
  toolCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  toolHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  toolIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  toolIconText: {
    fontSize: 24,
  },
  toolInfo: {
    flex: 1,
  },
  toolTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B365D',
    marginBottom: 4,
  },
  toolDescription: {
    fontSize: 14,
    color: designTokens.neutrals.textSecondary,
    lineHeight: 20,
  },
  toolAction: {
    alignItems: 'flex-end',
  },
  actionText: {
    fontSize: 16,
    fontWeight: '600',
  },
  tournamentInfo: {
    marginHorizontal: 16,
    marginTop: 32,
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tournamentInfoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: designTokens.neutrals.textSecondary,
    marginBottom: 4,
  },
  tournamentName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1B365D',
  },
  tournamentSelectButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1B365D',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1B365D',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  tournamentSelectButtonText: {
    fontSize: 18,
    color: '#FFFFFF',
  },
  emptyToolsMessage: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyText: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1B365D',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 16,
    color: designTokens.neutrals.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
});

const ToolsSelectionScreen: React.FC = () => {
  return (
    <AssignmentStatusProvider>
      <ToolsSelectionScreenContent />
    </AssignmentStatusProvider>
  );
};

export default ToolsSelectionScreen;