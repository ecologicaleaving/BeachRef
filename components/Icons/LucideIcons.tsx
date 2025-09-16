// Temporary Lucide Icons implementation for BeachRef
// Using Unicode symbols until Lucide React Native is properly installed

import React from 'react';
import { Text, TextStyle } from 'react-native';

interface IconProps {
  size?: number;
  color?: string;
  style?: TextStyle;
}

// Beach Volleyball specific icons using Unicode
export const Calendar: React.FC<IconProps> = ({ size = 24, color = '#1B365D', style }) => (
  <Text style={[{ fontSize: size, color }, style]}>📅</Text>
);

export const Clock: React.FC<IconProps> = ({ size = 24, color = '#1B365D', style }) => (
  <Text style={[{ fontSize: size, color }, style]}>🕐</Text>
);

export const Users: React.FC<IconProps> = ({ size = 24, color = '#1B365D', style }) => (
  <Text style={[{ fontSize: size, color }, style]}>👥</Text>
);

export const Trophy: React.FC<IconProps> = ({ size = 24, color = '#1B365D', style }) => (
  <Text style={[{ fontSize: size, color }, style]}>🏆</Text>
);

export const GoldMedal: React.FC<IconProps> = ({ size = 24, color = '#FFD700', style }) => (
  <Text style={[{ fontSize: size, color }, style]}>🥇</Text>
);

export const BronzeMedal: React.FC<IconProps> = ({ size = 24, color = '#CD7F32', style }) => (
  <Text style={[{ fontSize: size, color }, style]}>🥉</Text>
);

export const MapPin: React.FC<IconProps> = ({ size = 24, color = '#1B365D', style }) => (
  <Text style={[{ fontSize: size, color }, style]}>📍</Text>
);

export const Activity: React.FC<IconProps> = ({ size = 24, color = '#1B365D', style }) => (
  <Text style={[{ fontSize: size, color }, style]}>📊</Text>
);

export const CheckCircle: React.FC<IconProps> = ({ size = 24, color = '#1B365D', style }) => (
  <Text style={[{ fontSize: size, color }, style]}>✅</Text>
);

export const Settings: React.FC<IconProps> = ({ size = 24, color = '#1B365D', style }) => (
  <Text style={[{ fontSize: size, color }, style]}>⚙️</Text>
);

export const ArrowLeft: React.FC<IconProps> = ({ size = 24, color = '#1B365D', style }) => (
  <Text style={[{ fontSize: size, color }, style]}>←</Text>
);

export const ArrowRight: React.FC<IconProps> = ({ size = 24, color = '#1B365D', style }) => (
  <Text style={[{ fontSize: size, color }, style]}>→</Text>
);

export const Volleyball: React.FC<IconProps> = ({ size = 24, color = '#1B365D', style }) => (
  <Text style={[{ fontSize: size, color }, style]}>🏐</Text>
);

export const Whistle: React.FC<IconProps> = ({ size = 24, color = '#1B365D', style }) => (
  <Text style={[{ fontSize: size, color }, style]}>🔔</Text>
);

// Simple icon wrapper for consistent styling
export const Icon: React.FC<{ name: string } & IconProps> = ({ name, size, color, style }) => {
  const iconMap: { [key: string]: React.FC<IconProps> } = {
    calendar: Calendar,
    clock: Clock,
    users: Users,
    trophy: Trophy,
    'gold-medal': GoldMedal,
    'bronze-medal': BronzeMedal,
    'map-pin': MapPin,
    activity: Activity,
    'check-circle': CheckCircle,
    settings: Settings,
    'arrow-left': ArrowLeft,
    'arrow-right': ArrowRight,
    volleyball: Volleyball,
    whistle: Whistle,
  };

  const IconComponent = iconMap[name];
  if (!IconComponent) {
    return <Text style={[{ fontSize: size || 24, color: color || '#1B365D' }, style]}>❓</Text>;
  }

  return <IconComponent size={size} color={color} style={style} />;
};

export default {
  Calendar,
  Clock,
  Users,
  Trophy,
  GoldMedal,
  BronzeMedal,
  MapPin,
  Activity,
  CheckCircle,
  Settings,
  ArrowLeft,
  ArrowRight,
  Volleyball,
  Whistle,
  Icon,
};