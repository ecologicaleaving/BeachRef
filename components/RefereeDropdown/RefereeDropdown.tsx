import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';

interface Referee {
  No: string;
  Name: string;
  FederationCode?: string;
}

interface RefereeDropdownProps {
  referees: Referee[];
  selectedReferee: Referee | null;
  onRefereeSelect: (referee: Referee) => void;
  loading?: boolean;
  placeholder?: string;
  emptyMessage?: string;
}

export const RefereeDropdown: React.FC<RefereeDropdownProps> = ({
  referees,
  selectedReferee,
  onRefereeSelect,
  loading = false,
  placeholder = "Select a referee...",
  emptyMessage = "No referees available",
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleRefereeSelect = (referee: Referee) => {
    onRefereeSelect(referee);
    setIsOpen(false);
  };

  const clearSelection = () => {
    onRefereeSelect(null as any);
    setIsOpen(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Select Referee</Text>
      
      {/* Dropdown Button */}
      <TouchableOpacity
        style={[styles.dropdownButton, isOpen && styles.dropdownButtonOpen]}
        onPress={() => setIsOpen(!isOpen)}
        disabled={loading || referees.length === 0}
      >
        <View style={styles.dropdownContent}>
          {selectedReferee ? (
            <View style={styles.selectedRefereeInfo}>
              <Text style={styles.selectedRefereeName}>{selectedReferee.Name}</Text>
              {selectedReferee.FederationCode && (
                <Text style={styles.selectedRefereeCode}>({selectedReferee.FederationCode})</Text>
              )}
            </View>
          ) : (
            <Text style={styles.placeholderText}>
              {loading ? 'Loading referees...' : referees.length === 0 ? emptyMessage : placeholder}
            </Text>
          )}
          
          {loading ? (
            <ActivityIndicator size="small" color="#4A90A4" />
          ) : (
            <Text style={[styles.dropdownArrow, isOpen && styles.dropdownArrowUp]}>
              ▼
            </Text>
          )}
        </View>
      </TouchableOpacity>

      {/* Dropdown List */}
      {isOpen && !loading && referees.length > 0 && (
        <View style={styles.dropdownList}>
          <ScrollView style={styles.scrollView} nestedScrollEnabled>
            {/* Clear Selection Option */}
            {selectedReferee && (
              <TouchableOpacity
                style={[styles.refereeItem, styles.clearItem]}
                onPress={clearSelection}
              >
                <Text style={styles.clearText}>Clear Selection</Text>
              </TouchableOpacity>
            )}
            
            {/* Referee List */}
            {referees.map((referee) => (
              <TouchableOpacity
                key={referee.No}
                style={[
                  styles.refereeItem,
                  selectedReferee?.No === referee.No && styles.selectedRefereeItem
                ]}
                onPress={() => handleRefereeSelect(referee)}
              >
                <View style={styles.refereeInfo}>
                  <Text style={[
                    styles.refereeName,
                    selectedReferee?.No === referee.No && styles.selectedRefereeName
                  ]}>
                    {referee.Name}
                  </Text>
                  {referee.FederationCode && (
                    <Text style={[
                      styles.refereeCode,
                      selectedReferee?.No === referee.No && styles.selectedRefereeCode
                    ]}>
                      ({referee.FederationCode})
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1B365D',
    marginBottom: 8,
  },
  dropdownButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 48,
  },
  dropdownButtonOpen: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomColor: 'transparent',
  },
  dropdownContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flex: 1,
  },
  selectedRefereeInfo: {
    flex: 1,
  },
  selectedRefereeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1B365D',
  },
  selectedRefereeCode: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  placeholderText: {
    fontSize: 16,
    color: '#9CA3AF',
    flex: 1,
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 8,
  },
  dropdownArrowUp: {
    transform: [{ rotate: '180deg' }],
  },
  dropdownList: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: '#E5E7EB',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    maxHeight: 200,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  scrollView: {
    maxHeight: 200,
  },
  refereeItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  selectedRefereeItem: {
    backgroundColor: '#EFF6FF',
  },
  clearItem: {
    backgroundColor: '#FEF2F2',
    borderBottomColor: '#FECACA',
  },
  refereeInfo: {
    flex: 1,
  },
  refereeName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1B365D',
  },
  selectedRefereeName: {
    fontWeight: '600',
    color: '#2563EB',
  },
  refereeCode: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  selectedRefereeCode: {
    color: '#3B82F6',
  },
  clearText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#DC2626',
    textAlign: 'center',
  },
});

export default RefereeDropdown;