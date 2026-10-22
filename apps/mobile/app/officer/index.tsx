import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FogBackground } from '../../components/ui/FogBackground';
import { GlassView } from '../../components/ui/GlassView';
import { EditorialHeadline } from '../../components/ui/EditorialHeadline';
import { FloatingNav } from '../../components/ui/FloatingNav';

import { useAuthStore } from '../../store/authStore';
import { useOfficerStore } from '../../store/officerStore';
import { socketManager } from '../../lib/socket';
import { api } from '../../lib/api';
import { requestAndGetCurrentLocation } from '../../lib/location';

import {
  Shield,
  Wifi,
  Navigation,
  Clock,
  History,
  CheckCircle2,
  AlertCircle,
  LogOut,
} from 'lucide-react-native';

export default function OfficerHomeScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { onDuty, setOnDuty, setActiveAlert, locationRecordedAt } =
    useOfficerStore();

  const [statusMessage, setStatusMessage] = useState('');
  const [connected, setConnected] = useState(false);
  const [dutyBusy, setDutyBusy] = useState(false);
  const [currentTab, setCurrentTab] = useState('officer');
  const gpsAccuracy = locationRecordedAt ? (Date.now() - Date.parse(locationRecordedAt) < 30 * 60000 ? 'Post recorded' : 'Refresh location') : 'Not captured';

  useEffect(() => {
    // Only officers can access the officer station
    if (user && user.role !== 'OFFICER') {
      router.replace('/home');
    }
  }, [user]);

  useEffect(() => {
    if (!user || user.role !== 'OFFICER') return;
    const socket = socketManager.getSocket();
    const sync = () => {
      setConnected(!!socket?.connected);
      api.getMe().then(profile => useOfficerStore.setState({ onDuty: profile.onDuty, locationRecordedAt: profile.lastLocationAt || null })).catch(() => {});

    };
    sync(); socket?.on('connect', sync);
    const disconnected = () => setConnected(false);
    socket?.on('disconnect', disconnected);
    return () => { socket?.off('connect', sync); socket?.off('disconnect', disconnected); };
  }, [user?.id]);

  const handleToggleDuty = async (val: boolean) => {
    setDutyBusy(true);
    setStatusMessage(val ? 'Requesting location — allow browser location access. This can take up to 20 seconds.' : 'Switching duty off…');
    try {
      const location = val ? await requestAndGetCurrentLocation() : null;
      await setOnDuty(val);
      if (location) {
        try { await api.sendOfficerLocation(location.lat, location.lng); }
        catch (error) { await setOnDuty(false).catch(() => {}); throw error; }
        useOfficerStore.setState({ locationRecordedAt: new Date().toISOString() });
      } else useOfficerStore.setState({ locationRecordedAt: null });
      setStatusMessage(val ? 'Post recorded once. Refresh after moving or after 30 minutes.' : 'Off duty. Location sharing stopped.');
    } catch (err: any) { setStatusMessage(err.message || 'Failed to update duty'); }
    finally { setDutyBusy(false); }
  };

  const handleTestAlert = () => {
    // Demo simulator button for testing the full-screen alarm
    setActiveAlert({
      alertId: 'demo-alert-01',
      tripId: 'demo-trip-01',
      officerId: 'off-101',
      etaSec: 180,
      distanceAheadM: 1400,
      message: 'EMERGENCY: Ambulance DL-01-AMB-108 reaching Ring Road junction in ~3 min.',
      vehicleNumber: 'DL-01-AMB-108',
      ambulanceLat: 28.6139,
      ambulanceLng: 77.2090,
    });
  };

  return (
    <FogBackground>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {!!statusMessage && <Text accessibilityLiveRegion="polite">{statusMessage}</Text>}
          {/* Greeting Row */}
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.badgeText}>
                Badge: {user?.badgeNumber || 'TP-101'}
              </Text>
              <Text style={styles.officerName}>
                Officer {user?.name || 'On Duty'}
              </Text>
            </View>

            <Pressable
              onPress={() => {
                logout();
                router.replace('/');
              }}
              style={styles.logoutBtn}
            >
              <LogOut size={18} color="#C8503F" />
            </Pressable>
          </View>

          {/* Headline */}
          <View style={styles.headlineBox}>
            <EditorialHeadline
              plainText="Traffic Corridor"
              italicText="Guard Station"
              size="display-lg"
            />
          </View>

          {/* Big On / Off Duty Toggle Glass Card */}
          <GlassView
            radius="xl"
            elevation="3"
            style={[
              styles.dutyCard,
              onDuty ? styles.dutyCardOn : styles.dutyCardOff,
            ]}
          >
            <View style={styles.dutyCardTop}>
              <View
                style={[
                  styles.dutyStatusDot,
                  onDuty ? styles.dutyDotGreen : styles.dutyDotGray,
                ]}
              />
              <Text
                style={[
                  styles.dutyStatusText,
                  onDuty ? styles.dutyTextGreen : styles.dutyTextGray,
                ]}
              >
                {onDuty ? 'STATUS: ON ACTIVE DUTY' : 'STATUS: OFF DUTY'}
              </Text>
            </View>

            <View style={styles.dutyToggleRow}>
              <View>
                <Text style={styles.toggleTitle}>Corridor Telemetry</Text>
                <Text style={styles.toggleSub}>
                  {onDuty
                    ? 'Stationary post recorded for this demo'
                    : 'Location sharing is paused for privacy'}
                </Text>
              </View>

              <Switch disabled={dutyBusy}
                value={onDuty}
                onValueChange={handleToggleDuty}
                trackColor={{ false: '#B8C7BE', true: '#4C9A6A' }}
                thumbColor="#FFFFFF"
              />
            </View>
          </GlassView>

          {/* Device Telemetry Health Cards */}
          <View style={styles.healthRow}>
            <GlassView radius="md" elevation="1" style={styles.healthCard}>
              <Navigation size={18} color="#3E6B4B" />
              <View>
                <Text style={styles.healthLabel}>Saved location</Text>
                <Text style={styles.healthVal}>{gpsAccuracy}</Text>
              </View>
            </GlassView>

            <GlassView radius="md" elevation="1" style={styles.healthCard}>
              <Wifi size={18} color="#4F7FA6" />
              <View>
                <Text style={styles.healthLabel}>Socket Sync</Text>
                <Text style={styles.healthVal}>{connected ? 'Connected' : 'Disconnected'}</Text>
              </View>
            </GlassView>
          </View>

          {/* Demo Trigger Button (For quick demo presentation) */}
          <Pressable onPress={handleTestAlert} style={styles.demoTrigger}>
            <GlassView radius="pill" style={styles.demoPill}>
              <AlertCircle size={14} color="#C8503F" />
              <Text style={styles.demoText}>Preview on-screen alarm</Text>
            </GlassView>
          </Pressable>

          {/* Shift Activity & Alert History */}
          <View style={styles.historySection}>
            <View style={styles.historyHeader}>
              <History size={16} color="#5E6661" />
              <Text style={styles.historyTitle}>Recent Corridors Cleared</Text>
            </View>

            <GlassView radius="lg" elevation="1" style={styles.historyItem}>
              <View style={styles.historyItemLeft}>
                <CheckCircle2 size={18} color="#4C9A6A" />
                <View>
                  <Text style={styles.historyItemTitle}>Ring Road Junction</Text>
                  <Text style={styles.historyItemSub}>
                    Ambulance DL-01-AMB-108 cleared in 2 min
                  </Text>
                </View>
              </View>
              <Text style={styles.historyTime}>18m ago</Text>
            </GlassView>

            <GlassView radius="lg" elevation="1" style={styles.historyItem}>
              <View style={styles.historyItemLeft}>
                <CheckCircle2 size={18} color="#4C9A6A" />
                <View>
                  <Text style={styles.historyItemTitle}>Safdarjung Outer Circle</Text>
                  <Text style={styles.historyItemSub}>
                    Ambulance DL-04-AMB-220 cleared in 3 min
                  </Text>
                </View>
              </View>
              <Text style={styles.historyTime}>1h ago</Text>
            </GlassView>
          </View>
        </ScrollView>

        {/* Floating Nav */}
        <FloatingNav
          currentTab={currentTab}
          onTabChange={(tab) => {
            setCurrentTab(tab);
            if (tab === 'home') router.push('/home');
            if (tab === 'trips') router.push('/trips');
            if (tab === 'corridor') router.push('/corridor');
            if (tab === 'officer') router.push('/officer');
            if (tab === 'profile') router.push('/profile');
          }}
        />

      </SafeAreaView>
    </FogBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 110,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  badgeText: {
    fontSize: 11,
    color: '#5E6661',
    fontWeight: '500',
  },
  officerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111312',
  },
  logoutBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headlineBox: {
    marginVertical: 10,
  },
  dutyCard: {
    padding: 20,
    marginBottom: 16,
  },
  dutyCardOn: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderColor: '#6F9A78',
    borderWidth: 1.5,
  },
  dutyCardOff: {
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
  },
  dutyCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  dutyStatusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dutyDotGreen: {
    backgroundColor: '#4C9A6A',
  },
  dutyDotGray: {
    backgroundColor: '#B8C7BE',
  },
  dutyStatusText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  dutyTextGreen: {
    color: '#4C9A6A',
  },
  dutyTextGray: {
    color: '#5E6661',
  },
  dutyToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111312',
  },
  toggleSub: {
    fontSize: 12,
    color: '#5E6661',
    marginTop: 2,
    maxWidth: 220,
  },
  healthRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  healthCard: {
    flex: 1,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
  },
  healthLabel: {
    fontSize: 11,
    color: '#5E6661',
  },
  healthVal: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111312',
  },
  demoTrigger: {
    alignItems: 'center',
    marginBottom: 20,
  },
  demoPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(200, 80, 63, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(200, 80, 63, 0.3)',
  },
  demoText: {
    fontSize: 12,
    color: '#C8503F',
    fontWeight: '600',
  },
  historySection: {
    gap: 10,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  historyTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#5E6661',
  },
  historyItem: {
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  historyItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  historyItemTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111312',
  },
  historyItemSub: {
    fontSize: 11,
    color: '#5E6661',
    marginTop: 2,
  },
  historyTime: {
    fontSize: 11,
    color: '#B8C7BE',
  },
});
