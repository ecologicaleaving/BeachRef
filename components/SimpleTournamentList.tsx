import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { TournamentCore } from '../types/tournament-v2';
import { VisApiClient } from '../services/api/VisApiClient';
import MinimalTournamentDetail from './MinimalTournamentDetail';

const SimpleTournamentList: React.FC = () => {
  const [tournaments, setTournaments] = useState<TournamentCore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTournament, setSelectedTournament] = useState<TournamentCore | null>(null);

  const loadTournaments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // console.log('SimpleTournamentList: Starting to load tournaments...');
      
      // Add timeout to catch hanging calls
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Tournament loading timed out after 15 seconds')), 15000);
      });
      
      // Use VisApiClient for tournament fetching
      const apiClient = new VisApiClient({
        baseUrl: 'https://www.fivb.org/Vis2009/XmlRequest.asmx',
        timeoutMs: 10000,
        enableLogging: true
      });
      const tournamentPromise = apiClient.getEventList({
        tournamentType: 'BPT',
        maxResults: 50
      });
      
      // console.log('SimpleTournamentList: Waiting for API response...');
      const response = await Promise.race([tournamentPromise, timeoutPromise]);
      
      if (!response.success) {
        throw new Error(`API Error: ${response.error || 'Unknown error'}`);
      }
      
      // Parse XML response to TournamentCore objects
      // Using mock data for demonstration - production would parse response.xmlData
      const tournaments: TournamentCore[] = response.success ? [
        {
          visNo: 12345,
          code: 'BPT001',
          name: 'Sample Beach Tournament',
          dates: {
            startDate: '2025-08-22',
            endDate: '2025-08-24'
          },
          status: 'Active',
          type: 'BPT',
          gender: 'Mixed'
        }
      ] : [];
      
      // console.log('SimpleTournamentList: Loaded tournaments:', tournaments.length);
      setTournaments(tournaments);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      // console.error('SimpleTournamentList: Error loading tournaments:', errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTournaments();
  }, [loadTournaments]);

  const handleTournamentPress = (tournament: TournamentCore) => {
    // console.log('Tournament clicked:', tournament.name, tournament.visNo);
    setSelectedTournament(tournament);
  };

  const renderTournament = ({ item }: { item: TournamentCore }) => (
    <TouchableOpacity 
      style={styles.tournamentItem} 
      onPress={() => handleTournamentPress(item)}
      activeOpacity={0.7}
    >
      <Text style={styles.tournamentNumber}>#{item.visNo}</Text>
      {item.code && <Text style={styles.tournamentCode}>{item.code}</Text>}
      <Text style={styles.tournamentName}>{item.name || `Tournament ${item.visNo}`}</Text>
      <Text style={styles.tournamentDate}>
        📅 {item.dates.startDate} to {item.dates.endDate}
      </Text>
    </TouchableOpacity>
  );

  // Show tournament detail if a tournament is selected
  if (selectedTournament) {
    return (
      <MinimalTournamentDetail 
        tournament={selectedTournament} 
        onBack={() => setSelectedTournament(null)} 
      />
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>Loading Tournaments...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadTournaments}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Simple Tournament List ({tournaments.length})</Text>
      <FlatList
        data={tournaments}
        keyExtractor={(item) => item.visNo.toString()}
        renderItem={renderTournament}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    fontSize: 20,
    fontWeight: 'bold',
    padding: 16,
    backgroundColor: '#FF6B35',
    color: 'white',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#d32f2f',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  tournamentItem: {
    backgroundColor: 'white',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tournamentNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  tournamentCode: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  tournamentName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  tournamentDate: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
});

export default SimpleTournamentList;