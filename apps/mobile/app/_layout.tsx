import React, { useEffect } from 'react';
import { Stack, Link, useRouter, useSegments } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { OfficerAlerts } from '../components/OfficerAlerts';
import NotificationSetup from '../components/NotificationSetup';
import { Platform, View, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  const user = useAuthStore(state => state.user);
  const router = useRouter();
  const segments = useSegments();
  useEffect(() => {
    const first = segments[0];
    if (!user && first && !['index', 'demo', '(auth)'].includes(first)) router.replace('/');
  }, [user, segments]);
  return (
    <SafeAreaProvider>
      {Platform.OS === 'web' && <View style={{ padding: 10, backgroundColor: '#1F3A2A', flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ color: 'white', fontSize: 12 }}>RAAH · DEMONSTRATION</Text>
        <Link href="/demo" style={{ color: 'white', fontSize: 13, textDecorationLine: 'underline' }}>Demo setup</Link>
      </View>}
      <StatusBar style="dark" />
      <NotificationSetup />
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
      <OfficerAlerts />
    </SafeAreaProvider>
  );
}
