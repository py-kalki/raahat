import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ShieldAlert, Sparkles } from 'lucide-react-native';

export interface TagPillProps {
  label: string;
  icon?: 'sparkle' | 'shield';
}

export const TagPill: React.FC<TagPillProps> = ({ label, icon = 'shield' }) => {
  return (
    <View style={styles.container}>
      <View style={styles.iconBox}>
        {icon === 'shield' ? (
          <ShieldAlert size={12} color="#FFFFFF" />
        ) : (
          <Sparkles size={12} color="#FFFFFF" />
        )}
      </View>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 9999,
    backgroundColor: 'rgba(111, 154, 120, 0.22)',
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
  },
  iconBox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: '#111312',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  text: {
    fontSize: 13,
    fontWeight: '500',
    color: '#111312',
  },
});
