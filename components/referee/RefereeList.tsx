import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { designTokens } from '../../theme/tokens';

interface RefereeFromDB {
  No: string;
  Name: string;
  FederationCode?: string;
  Level?: string;
  isSelected?: boolean;
}

interface RefereeListProps {
  refereeList: RefereeFromDB[];
  loading: boolean;
  onRefereeSelect: (referee: RefereeFromDB) => void;
  onBack: () => void;
}

export const RefereeList: React.FC<RefereeListProps> = ({
  refereeList,
  loading,
  onRefereeSelect,
  onBack,
}) => {
  const renderRefereeItem = ({ item }: { item: RefereeFromDB }) => (
    <View style={styles.refereeCard}>
      <View style={styles.refereeInfo}>
        <Text style={styles.refereeName}>{item.Name}</Text>
        {item.FederationCode && (
          <Text style={styles.refereeFederation}>
            {item.FederationCode}
          </Text>
        )}
        {item.No && (
          <Text style={styles.refereeNumber}>
            #{item.No}
          </Text>
        )}
      </View>
      <TouchableOpacity
        style={styles.selectButton}
        onPress={() => onRefereeSelect(item)}
      >
        <Text style={styles.selectButtonText}>Go</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B35" />
          <Text style={styles.loadingText}>Loading referees...</Text>
        </View>
      ) : (
        <FlatList
          data={refereeList}
          renderItem={renderRefereeItem}
          keyExtractor={(item) => item.No}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#1B365D',
    fontWeight: '600',
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1B365D',
  },
  headerSpacer: {
    width: 50, // Balance the back button
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: designTokens.neutrals.textSecondary,
  },
  listContainer: {
    padding: 16,
  },
  refereeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    boxShadow: '0px 2px 4px rgba(27, 54, 93, 0.08)',
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  refereeInfo: {
    flex: 1,
  },
  refereeName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B365D',
    marginBottom: 4,
  },
  refereeFederation: {
    fontSize: 14,
    color: designTokens.neutrals.textSecondary,
    fontWeight: '500',
    marginBottom: 2,
  },
  refereeNumber: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  selectButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  selectButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});