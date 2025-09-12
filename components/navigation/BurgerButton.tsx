import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Icon } from '../Icons/MaterialCommunityIcons';

interface BurgerButtonProps {
  onPress: () => void;
  color?: string;
  size?: number;
}

export const BurgerButton: React.FC<BurgerButtonProps> = ({ 
  onPress, 
  color = '#FFFFFF', 
  size = 24 
}) => {
  return (
    <TouchableOpacity
      style={styles.button}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Icon name="menu" size={size} color={color} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    padding: 8,
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default BurgerButton;