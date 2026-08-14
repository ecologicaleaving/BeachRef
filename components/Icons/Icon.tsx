/**
 * Icon Component
 * Story 1.5: Outdoor-Optimized Iconography
 * 
 * High-visibility, outdoor-optimized icon component for tournament referees
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity, ViewStyle, AccessibilityRole, AccessibilityState, AccessibilityValue, Platform, Text } from 'react-native';
import { Ionicons } from './vectorIconSets';
import { 
  IconSize, 
  IconVariant, 
  IconCategory,
  getIconName,
  getIconStyles,
  getVariantIconName,
  ICON_COLOR_THEMES 
} from '../../utils/icons';

export interface IconProps {
  category: IconCategory;
  name: string;
  size?: IconSize;
  variant?: IconVariant;
  theme?: keyof typeof ICON_COLOR_THEMES;
  colorKey?: string;
  isInteractive?: boolean;
  isEmergency?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  /**
   * Override espliciti di dimensione e colore (issue #49).
   *
   * ~60 call site passavano gia' `width` / `height` / `fill` a queste icone:
   * sono scritti contro la convenzione delle icone SVG, mentre `Icon` ragiona
   * per `size` (token) e `colorKey` (chiave di tema). Erano props ignorate e
   * non dichiarate. Invece di dichiararle e continuare a ignorarle, qui
   * vengono onorate: `width`/`height` vincono sul token `size`, `fill` vince
   * sul colore derivato da `colorKey`. Chi non le passa non cambia
   * comportamento.
   */
  width?: number;
  height?: number;
  fill?: string;
  /**
   * Props di accessibilita' inoltrate al nodo host (issue #111).
   *
   * `AccessibilityIcon` — che esiste per aggiungere accessibilita' a `Icon` —
   * passava GIA' tutte queste, e `Icon` le scartava perche' non le
   * dichiarava: stato, valore, live region e il ruolo che
   * `AccessibilityIcon.getAccessibilityRole()` calcola non arrivavano mai al
   * `View`. Un'icona che annuncia di essere selezionata non lo annunciava, e
   * `accessibilityElementsHidden` non nascondeva niente.
   *
   * TypeScript non l'ha segnalato perche' le props non dichiarate finivano in
   * `...iconProps` di `AccessibilityIcon` senza che nessuno le rileggesse.
   */
  accessibilityRole?: AccessibilityRole;
  accessibilityState?: AccessibilityState;
  accessibilityValue?: AccessibilityValue;
  accessibilityLiveRegion?: 'none' | 'polite' | 'assertive';
  accessibilityElementsHidden?: boolean;
  importantForAccessibility?: 'auto' | 'yes' | 'no' | 'no-hide-descendants';
}

export const Icon: React.FC<IconProps> = React.memo(({
  category,
  name,
  size = 'medium',
  variant = 'outlined',
  theme = 'default',
  colorKey = 'primary',
  isInteractive = false,
  isEmergency = false,
  onPress,
  style,
  testID,
  accessibilityLabel,
  accessibilityHint,
  width,
  height,
  fill,
  accessibilityRole,
  accessibilityState,
  accessibilityValue,
  accessibilityLiveRegion,
  accessibilityElementsHidden,
  importantForAccessibility,
}) => {
  const baseIconName = getIconName(category, name);
  const variantIconName = getVariantIconName(baseIconName, variant);
  const baseStyles = getIconStyles(size, theme, colorKey, variant, isInteractive, isEmergency);
  // Gli override espliciti vincono sui token; vedi la nota su IconProps.
  const iconStyles = {
    ...baseStyles,
    size: width ?? height ?? baseStyles.size,
    color: fill ?? baseStyles.color,
  };
  
  // Log accessibility warnings
  if (!iconStyles.contrast.compliant) {
    // console.warn(`Icon contrast insufficient for outdoor visibility: ${iconStyles.contrast.ratio.toFixed(2)}:1`);
  }

  const containerStyle: ViewStyle[] = [
    styles.container,
    iconStyles.style,
    style,
  ];

  // Inoltrate a entrambi i rami (issue #111). `accessibilityRole` esplicito
  // vince su quello derivato dal tema: e' il modo in cui `AccessibilityIcon`
  // distingue un'icona-bottone da un'immagine, e finora non aveva effetto.
  const a11yProps = {
    accessibilityRole: (accessibilityRole ??
      iconStyles.accessibility.accessibilityRole) as AccessibilityRole,
    accessibilityLabel: accessibilityLabel || `${category} ${name} icon`,
    accessibilityHint,
    accessibilityState,
    accessibilityValue,
    accessibilityLiveRegion,
    accessibilityElementsHidden,
    importantForAccessibility,
  };

  const iconElement = Platform.OS === 'web' ? (
    // Web fallback to avoid font loading timeouts
    <Text aria-label={variantIconName} style={{ fontSize: iconStyles.size, color: iconStyles.color, opacity: iconStyles.variant === 'filled' && !isEmergency ? 0.95 : 1.0 }}>
      ●
    </Text>
  ) : (
    <Ionicons
      name={variantIconName as any}
      size={iconStyles.size}
      color={iconStyles.color}
      style={{
        opacity: iconStyles.variant === 'filled' && !isEmergency ? 0.95 : 1.0,
      }}
    />
  );

  // If interactive, wrap in TouchableOpacity
  if (isInteractive && onPress) {
    return (
      <TouchableOpacity
        style={containerStyle}
        onPress={onPress}
        activeOpacity={0.7}
        testID={testID}
        {...a11yProps}
      >
        {iconElement}
      </TouchableOpacity>
    );
  }

  // Non-interactive icon
  //
  // `accessible` non e' ridondante accanto a `accessibilityRole` (issue #111).
  // Una `View` che dichiara ruolo ed etichetta ma non `accessible` NON e' un
  // elemento di accessibilita': VoiceOver non annuncia l'etichetta e continua
  // a navigare i figli separatamente — e il figlio, qui, e' il glifo. Chi usa
  // uno screen reader sentiva il glifo al posto di "navigation home icon".
  //
  // Il `TouchableOpacity` del ramo interattivo lo e' gia' di suo, e infatti
  // era l'unico ramo che i test trovavano.
  return (
    <View
      style={containerStyle}
      testID={testID}
      accessible
      {...a11yProps}
    >
      {iconElement}
    </View>
  );
});

Icon.displayName = 'Icon';

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default Icon;
