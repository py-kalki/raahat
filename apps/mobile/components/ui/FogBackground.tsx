import React from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export const FogBackground: React.FC<ViewProps> = ({ children, style, ...props }) => {
  return (
    <View style={[styles.container, style]} {...props}>
      <LinearGradient
        colors={['#F4F7F5', '#E3ECE6', '#CBDAD0']}
        locations={[0, 0.55, 1.0]}
        style={StyleSheet.absoluteFillObject}
      />
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F7F5',
  },
});
