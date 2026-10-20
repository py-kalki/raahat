import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';

export default function DriverRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/home');
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F4F7F5' }}>
      <ActivityIndicator size="large" color="#1F3A2A" />
    </View>
  );
}

