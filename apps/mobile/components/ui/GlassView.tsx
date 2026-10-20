import React from 'react';
import { View, StyleSheet, ViewProps, Platform } from 'react-native';
import { BlurView } from 'expo-blur';

export interface GlassViewProps extends ViewProps {
  variant?: 'light' | 'medium' | 'dark';
  radius?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'pill';
  elevation?: 'none' | '1' | '2' | '3';
}

const RADIUS_MAP = {
  xs: 8,
  sm: 12,
  md: 20,
  lg: 28,
  xl: 36,
  pill: 9999,
};

export const GlassView: React.FC<GlassViewProps> = ({
  variant = 'light',
  radius = 'lg',
  elevation = '2',
  style,
  children,
  ...props
}) => {
  const borderRadius = RADIUS_MAP[radius];

  const getElevationStyle = () => {
    if (elevation === '1') {
      return {
        shadowColor: '#1F3A2A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 2,
      };
    }
    if (elevation === '2') {
      return {
        shadowColor: '#1F3A2A',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 24,
        elevation: 6,
      };
    }
    if (elevation === '3') {
      return {
        shadowColor: '#1F3A2A',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.18,
        shadowRadius: 40,
        elevation: 10,
      };
    }
    return {};
  };

  const isDark = variant === 'dark';
  const bgColor = isDark
    ? 'rgba(17, 19, 18, 0.85)'
    : variant === 'medium'
    ? 'rgba(255, 255, 255, 0.35)'
    : 'rgba(255, 255, 255, 0.65)';

  const borderColor = isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.75)';

  return (
    <View
      style={[
        styles.base,
        {
          borderRadius,
          backgroundColor: bgColor,
          borderColor,
          borderWidth: 1,
        },
        getElevationStyle(),
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
  },
});
