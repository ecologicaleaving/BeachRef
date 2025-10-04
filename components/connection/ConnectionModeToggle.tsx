import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { ConnectionStrategy } from '../../services/NetworkStateManager';
import { designTokens } from '../../theme/tokens';

interface ConnectionModeToggleProps {
  currentMode: ConnectionStrategy;
  onModeChange: (mode: ConnectionStrategy) => void;
  disabled?: boolean;
  showLabel?: boolean;
}

interface ConnectionMode {
  strategy: ConnectionStrategy;
  name: string;
  description: string;
  icon: string;
  color: string;
}

const CONNECTION_MODES: ConnectionMode[] = [
  {
    strategy: ConnectionStrategy.AGGRESSIVE_WEBSOCKET,
    name: 'Fast Mode',
    description: 'Fastest updates, best for stable Wi-Fi connections',
    icon: '⚡',
    color: '#4CAF50',
  },
  {
    strategy: ConnectionStrategy.CONSERVATIVE_WEBSOCKET,
    name: 'Stable Mode',
    description: 'Balanced performance, good for most connections',
    icon: '🔄',
    color: '#2196F3',
  },
  {
    strategy: ConnectionStrategy.HYBRID_MODE,
    name: 'Hybrid Mode',
    description: 'Mix of real-time and polling, adaptive to conditions',
    icon: '🔀',
    color: '#FF9800',
  },
  {
    strategy: ConnectionStrategy.POLLING_ONLY,
    name: 'Polling Mode',
    description: 'Regular updates, best for slower connections',
    icon: '🔃',
    color: '#9C27B0',
  },
  {
    strategy: ConnectionStrategy.OFFLINE_MODE,
    name: 'Offline Mode',
    description: 'Manual refresh only, no automatic updates',
    icon: '📴',
    color: '#9E9E9E',
  },
];

const ConnectionModeToggle: React.FC<ConnectionModeToggleProps> = ({
  currentMode,
  onModeChange,
  disabled = false,
  showLabel = true,
}) => {
  const [isModalVisible, setIsModalVisible] = useState(false);

  const currentModeInfo = CONNECTION_MODES.find(mode => mode.strategy === currentMode) || CONNECTION_MODES[1];

  const handleModeSelect = (mode: ConnectionStrategy) => {
    onModeChange(mode);
    setIsModalVisible(false);
  };

  const isRecommended = (mode: ConnectionStrategy) => {
    // This would typically come from the network state manager
    return mode === ConnectionStrategy.CONSERVATIVE_WEBSOCKET;
  };

  const isAvailable = (mode: ConnectionStrategy) => {
    if (disabled) return false;
    // Offline mode is always available
    if (mode === ConnectionStrategy.OFFLINE_MODE) return true;
    // Other modes depend on network connectivity
    return true; // This would check actual network state
  };

  return (
    <View style={styles.container}>
      {showLabel && (
        <Text style={styles.label}>Connection Mode</Text>
      )}
      
      <TouchableOpacity
        style={[
          styles.toggle,
          { borderColor: currentModeInfo.color },
          disabled && styles.toggleDisabled,
        ]}
        onPress={() => setIsModalVisible(true)}
        disabled={disabled}
      >
        <Text style={styles.toggleIcon}>{currentModeInfo.icon}</Text>
        <View style={styles.toggleInfo}>
          <Text style={[styles.toggleText, disabled && styles.toggleTextDisabled]}>
            {currentModeInfo.name}
          </Text>
          <Text style={[styles.toggleDescription, disabled && styles.toggleDescriptionDisabled]}>
            {currentModeInfo.description}
          </Text>
        </View>
        <Text style={[styles.chevron, disabled && styles.chevronDisabled]}>›</Text>
      </TouchableOpacity>

      <Modal
        visible={isModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Connection Mode</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setIsModalVisible(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {CONNECTION_MODES.map((mode) => {
                const isSelected = mode.strategy === currentMode;
                const available = isAvailable(mode.strategy);
                const recommended = isRecommended(mode.strategy);

                return (
                  <TouchableOpacity
                    key={mode.strategy}
                    style={[
                      styles.modeOption,
                      isSelected && styles.modeOptionSelected,
                      !available && styles.modeOptionDisabled,
                    ]}
                    onPress={() => handleModeSelect(mode.strategy)}
                    disabled={!available}
                  >
                    <Text style={styles.modeIcon}>{mode.icon}</Text>
                    
                    <View style={styles.modeInfo}>
                      <View style={styles.modeHeader}>
                        <Text style={[
                          styles.modeName,
                          isSelected && styles.modeNameSelected,
                          !available && styles.modeNameDisabled,
                        ]}>
                          {mode.name}
                        </Text>
                        {recommended && (
                          <View style={styles.recommendedBadge}>
                            <Text style={styles.recommendedText}>RECOMMENDED</Text>
                          </View>
                        )}
                      </View>
                      
                      <Text style={[
                        styles.modeDescription,
                        isSelected && styles.modeDescriptionSelected,
                        !available && styles.modeDescriptionDisabled,
                      ]}>
                        {mode.description}
                      </Text>
                    </View>

                    <View style={styles.modeIndicator}>
                      {isSelected && (
                        <View style={[styles.selectedIndicator, { backgroundColor: mode.color }]} />
                      )}
                      {!available && (
                        <Text style={styles.unavailableText}>Unavailable</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.modalFooter}>
              <Text style={styles.footerNote}>
                Mode selection affects update frequency and battery usage
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  toggleDisabled: {
    backgroundColor: designTokens.neutrals.bgSurface,
    borderColor: designTokens.neutrals.borderSubtle,
  },
  toggleIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  toggleInfo: {
    flex: 1,
  },
  toggleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 2,
  },
  toggleTextDisabled: {
    color: '#9E9E9E',
  },
  toggleDescription: {
    fontSize: 12,
    color: '#666666',
  },
  toggleDescriptionDisabled: {
    color: '#BDBDBD',
  },
  chevron: {
    fontSize: 20,
    color: '#666666',
    fontWeight: 'bold',
  },
  chevronDisabled: {
    color: '#BDBDBD',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333333',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 18,
    color: '#666666',
  },
  modalBody: {
    flex: 1,
  },
  modeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modeOptionSelected: {
    backgroundColor: '#F8F9FF',
  },
  modeOptionDisabled: {
    opacity: 0.5,
  },
  modeIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  modeInfo: {
    flex: 1,
  },
  modeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  modeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  modeNameSelected: {
    color: '#2196F3',
  },
  modeNameDisabled: {
    color: '#9E9E9E',
  },
  recommendedBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  recommendedText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modeDescription: {
    fontSize: 14,
    color: '#666666',
  },
  modeDescriptionSelected: {
    color: '#555555',
  },
  modeDescriptionDisabled: {
    color: '#BDBDBD',
  },
  modeIndicator: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
  },
  selectedIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  unavailableText: {
    fontSize: 10,
    color: '#F44336',
    textAlign: 'center',
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  footerNote: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
  },
});

export default ConnectionModeToggle;