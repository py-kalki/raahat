import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#F4F7F5' },
          animation: 'fade_from_bottom',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)/login" />
        <Stack.Screen name="driver/index" />
        <Stack.Screen name="driver/trip-setup" />
        <Stack.Screen name="driver/active" />
        <Stack.Screen name="officer/index" />
        <Stack.Screen name="admin/map" />
        <Stack.Screen name="admin/users" />
      </Stack>
    </SafeAreaProvider>
  );
}
