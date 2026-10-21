import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { useOfficerStore } from '../store/officerStore';
import { api } from '../lib/api';
import { requestAndGetCurrentLocation } from '../lib/location';
import { enableWebPush, disableWebPush, testWebPush } from '../lib/notifications.web';
import { socketManager } from '../lib/socket';
import { sampleRoute } from '../lib/demo-route';
import { CorridorMap } from './ui/CorridorMap';

export default function DemoPanel() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [message, setMessage] = useState('Use two phones or separate browser profiles: one driver and one officer.');
  const [busy, setBusy] = useState(false), [connected, setConnected] = useState(false);
  const [running, setRunning] = useState(false), [progress, setProgress] = useState(0);
  const [trip, setTrip] = useState<any>(null), [position, setPosition] = useState<[number, number] | null>(null);
  const runId = useRef(0), mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    const socket = socketManager.getSocket();
    const update = () => setConnected(!!socket?.connected);
    update(); socket?.on('connect', update); socket?.on('disconnect', update);
    return () => { mounted.current = false; runId.current++; socket?.off('connect', update); socket?.off('disconnect', update); };
  }, [user?.id]);
  const act = async (action: () => Promise<string>) => {
    setBusy(true);
    setMessage('Working… If a permission prompt appears, allow access.');
    try { setMessage(await action()); } catch (error: any) { setMessage(error.message || 'Operation failed. Please try again.'); }
    finally { setBusy(false); }
  };
  const simulate = async () => {
    const id = ++runId.current;
    setRunning(true); setProgress(0);
    try {
      const activeTrip = await api.getActiveTrip();
      const points = sampleRoute(activeTrip.route?.coordinates || []);
      setTrip(activeTrip);
      setMessage('DEMO: sending simulated positions to the corridor server. Keep this page visible.');
      for (let index = 0; index < points.length; index++) {
        if (id !== runId.current || !mounted.current) return;
        if (document.hidden) throw new Error('Simulation stopped because the page was hidden. Start again when ready.');
        const socket = socketManager.getSocket();
        if (!socket?.connected) throw new Error('Simulation stopped: server connection lost.');
        const [lng, lat] = points[index];
        const result = await socket.timeout(20000).emitWithAck('driver:location', { tripId: activeTrip.id, lat, lng, speed: 18, timestamp: Date.now() });
        if (id !== runId.current || !mounted.current) return;
        if (!result?.success) throw new Error(result?.error || 'Server rejected the simulated location.');
        setPosition([lng, lat]); setProgress(Math.round(index / (points.length - 1) * 100));
        if (index < points.length - 1) await new Promise(resolve => setTimeout(resolve, 2500));
      }
      setMessage('Simulation reached the destination. End the trip from the active trip screen when ready.');
    } catch (error: any) { if (mounted.current && id === runId.current) setMessage(error.message || 'Simulation failed.'); }
    finally { if (mounted.current && id === runId.current) setRunning(false); }
  };
  const button = (label: string, onPress: () => void, disabled = false) => <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={[styles.button, disabled && { opacity: 0.45 }]}><Text style={styles.buttonText}>{label}</Text></Pressable>;
  return <View style={styles.content}>
    <Text style={styles.title}>Browser demo setup</Text>
    <Text style={styles.body}>One-time location · Browser notifications · Simulated ambulance movement</Text>
    <Text style={styles.status} accessibilityLiveRegion="polite">{message}</Text>
    {!user ? <>{button('Go to sign in', () => router.replace('/'))}<Text style={styles.body}>Sign in to connect your location and notifications to the correct role.</Text></> : <>
      <Text style={styles.heading}>{user.name} · {user.role}</Text>
      {button('Return to my dashboard', () => router.push(user.role === 'OFFICER' ? '/officer' : user.role === 'ADMIN' ? '/admin/map' : '/home'), running)}
      <Text style={styles.body}>Server: {connected ? 'Connected' : 'Disconnected / reconnecting'}</Text>
      <Text style={styles.heading}>1. Capture your location once</Text>
      <Text style={styles.body}>For officers, this records your stationary post and turns duty on. Refresh if you move or after 30 minutes. There is no background tracking.</Text>
      {button('Get my location', () => act(async () => {
        const location = await requestAndGetCurrentLocation();
        if (user.role === 'OFFICER') {
          await api.setDutyStatus(true);
          try { await api.sendOfficerLocation(location.lat, location.lng); }
          catch (error) { await api.setDutyStatus(false).catch(() => {}); useOfficerStore.setState({ onDuty: false, locationRecordedAt: null }); throw error; }
          useOfficerStore.setState({ onDuty: true, locationRecordedAt: new Date().toISOString() });
        }
        return `${location.address}. Accuracy: ${Math.round(location.accuracy || 0)} m.${user.role === 'OFFICER' ? ' Your post is on duty.' : ''}`;
      }), busy || running)}
      <Text style={styles.heading}>2. Enable browser notifications</Text>
      <Text style={styles.body}>Allow notifications for this website. The test sends a real push through the server. Browser and battery settings can delay delivery.</Text>
      {button('Enable notifications for this account', () => act(async () => { await enableWebPush(); return 'Notifications enabled. Send a test to verify delivery.'; }), busy || running)}
      {button('Send test notification', () => act(async () => { await testWebPush(); return 'Push service accepted the test. Check your notification tray.'; }), busy || running)}
      {button('Disable notifications', () => act(async () => { await disableWebPush(); return 'Notifications disabled on this device.'; }), busy || running)}
      {user.role === 'DRIVER' && <>
        <Text style={styles.heading}>3. Simulate an ambulance trip</Text>
        <Text style={styles.body}>Create a trip passing your officer’s post. This sends sample positions along its route, not live GPS readings.</Text>
        {button('Create / view trip', () => router.push('/home'), running)}
        {running ? button(`Stop simulation (${progress}%)`, () => { runId.current++; setRunning(false); setMessage('Simulation stopped. The trip remains active.'); }) : button('Simulate my active trip', simulate, busy || !connected)}
        {position && <CorridorMap ambulanceLng={position[0]} ambulanceLat={position[1]} routeCoordinates={trip?.route?.coordinates || []} officers={[]} height={280} />}
      </>}
    </>}
    <Text style={styles.heading}>Install on your home screen</Text>
    <Text style={styles.body}>In Android Chrome, open the ⋮ menu and choose “Add to Home screen” or “Install app”. No APK or USB debugging is needed. Internet access is required.</Text>
  </View>;
}
const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: 640, alignSelf: 'center', padding: 22, gap: 14, paddingBottom: 60 },
  title: { fontSize: 30, color: '#1F3A2A', fontWeight: '600' },
  heading: { fontSize: 19, color: '#1F3A2A', fontWeight: '600', marginTop: 12 },
  body: { fontSize: 15, lineHeight: 23, color: '#5E6661' },
  status: { fontSize: 15, lineHeight: 22, padding: 16, backgroundColor: '#DCE6E0', borderRadius: 12, color: '#1F3A2A' },
  button: { padding: 17, borderRadius: 28, backgroundColor: '#1F3A2A', alignItems: 'center' },
  buttonText: { color: 'white', fontSize: 15, fontWeight: '600' },
});
