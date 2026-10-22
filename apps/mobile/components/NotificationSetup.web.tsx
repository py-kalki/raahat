import React, { useEffect, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { enableWebPush, registerForPushNotificationsAsync, testWebPush, webPushReady } from '../lib/notifications.web';

export default function NotificationSetup() {
  const user = useAuthStore(state => state.user);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('Enable phone notifications to receive corridor alerts outside the app.');
  useEffect(() => {
    if (user?.role !== 'OFFICER') return;
    let active = true;
    setReady(false);
    setMessage('Enable phone notifications to receive corridor alerts outside the app.');
    const refresh = () => { void webPushReady().then(value => { if (active) setReady(value); }).catch(() => { if (active) setReady(false); }); };
    const sync = () => {
      void registerForPushNotificationsAsync().then(async () => {
        const connected = await webPushReady();
        if (active) {
          setReady(connected);
          if (connected) setMessage('This account is connected for notifications. Send a test and check the notification tray.');
        }
      }).catch(error => { if (active) setMessage(error.message); });
    };
    sync();
    window.addEventListener('raah-push-change', refresh);
    window.addEventListener('focus', sync);
    return () => { active = false; window.removeEventListener('raah-push-change', refresh); window.removeEventListener('focus', sync); };
  }, [user?.id]);
  if (user?.role !== 'OFFICER') return null;
  const act = async () => {
    setBusy(true);
    try {
      if (ready) { await testWebPush(); setMessage('Test accepted by the push service. Check the phone notification tray; this does not confirm display on your device.'); }
      else { await enableWebPush(); setReady(true); setMessage('This account is connected for notifications. Send a test and check the notification tray.'); }
    } catch (error: any) { setMessage(error.message || 'Could not enable notifications. Try again.'); }
    finally { setBusy(false); }
  };
  return <View style={{ padding: 12, backgroundColor: ready ? '#E8F3E9' : '#FFF3D8', borderBottomWidth: 1, borderBottomColor: '#C9D7CC' }}>
    <Text style={{ fontWeight: '700', color: '#1F3A2A' }}>Phone notifications: {ready ? 'connected' : 'setup needed'}</Text>
    <Text accessibilityLiveRegion="polite" style={{ marginVertical: 5, color: '#33443A', fontSize: 13 }}>{message}</Text>
    <Pressable accessibilityRole="button" disabled={busy} onPress={act} style={{ alignSelf: 'flex-start', padding: 10, backgroundColor: '#1F3A2A', borderRadius: 6, opacity: busy ? 0.6 : 1 }}>
      <Text style={{ color: '#FFF' }}>{busy ? 'Working…' : ready ? 'Send test notification' : 'Enable phone notifications'}</Text>
    </Pressable>
  </View>;
}
