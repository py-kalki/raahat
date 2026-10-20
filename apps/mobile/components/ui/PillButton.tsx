import React from 'react';
import {
  Pressable,
  Text,
  View,
  StyleSheet,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { ArrowRight } from 'lucide-react-native';

export interface PillButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
}

export const PillButton: React.FC<PillButtonProps> = ({
  label,
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary',
}) => {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.timing(scaleAnim, {
      toValue: 0.97,
      duration: 120,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      damping: 10,
      stiffness: 300,
      useNativeDriver: true,
    }).start();
  };

  const isDanger = variant === 'danger';
  const isSecondary = variant === 'secondary';

  const backgroundColor = isDanger
    ? '#C8503F'
    : isSecondary
    ? 'rgba(255, 255, 255, 0.7)'
    : '#111312';

  const textColor = isSecondary ? '#111312' : '#FFFFFF';

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        style={[
          styles.container,
          { backgroundColor },
          disabled && styles.disabled,
        ]}
      >
        <Text style={[styles.label, { color: textColor }]}>{label}</Text>
        <View style={styles.trailingCircle}>
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <ArrowRight size={18} color={isSecondary ? '#111312' : '#FFFFFF'} />
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 56,
    borderRadius: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 24,
    paddingRight: 10,
    shadowColor: '#1F3A2A',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.18,
    shadowRadius: 40,
    elevation: 8,
  },
  label: {
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: 0,
  },
  trailingCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.45,
  },
});
