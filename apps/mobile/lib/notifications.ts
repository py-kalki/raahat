import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { api } from './api';

// Configure default notification handler for foreground notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Registers device for push notifications on physical devices (Android/iOS)
 * and sends the token to the Raahat API server.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  // Push notifications require physical devices (not web or simulator)
  if (Platform.OS === 'web') {
    return null;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Push notification permission not granted');
      return null;
    }

    // Android Oreo+ channel requirement
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('emergency_corridor', {
        name: 'Emergency Corridor Alerts',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#C8503F',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      });
    }

    // Get the push token
    const tokenData = await Notifications.getExpoPushTokenAsync().catch(() => null);
    const token = tokenData?.data;

    if (token) {
      try {
        await api.registerPushToken(token);
        console.log('[Raahat Push] Push token registered successfully:', token);
      } catch (err) {
        console.warn('[Raahat Push] Failed to sync push token with server:', err);
      }
      return token;
    }
  } catch (err) {
    console.warn('[Raahat Push] Error acquiring push token:', err);
  }

  return null;
}
