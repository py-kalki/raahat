import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FogBackground } from '../../components/ui/FogBackground';
import { GlassView } from '../../components/ui/GlassView';
import { EditorialHeadline } from '../../components/ui/EditorialHeadline';
import { PillButton } from '../../components/ui/PillButton';
import { CorridorMap } from '../../components/ui/CorridorMap';
import { useTripStore } from '../../store/tripStore';
import { socketManager } from '../../lib/socket';
import { SOCKET_EVENTS } from '@raahat/shared';
import {
  ShieldCheck,
  Navigation,
  Gauge,
  Clock,
  MapPin,
  Radio,
} from 'lucide-react-native';

export default function ActiveTripScreen() {
  const router = useRouter();
  const { currentTrip, acknowledgedCount, setAcknowledgedCount, endTrip, cancelTrip, fetchActiveTrip } =
    useTripStore();

  const [operationError, setOperationError] = useState('');
  const [isFinishing, setIsFinishing] = useState(false);

  useEffect(() => {
    fetchActiveTrip();

    const socket = socketManager.getSocket();
    if (socket) {
      socket.on(SOCKET_EVENTS.ALERT_ACKED, (data: any) => {
        setAcknowledgedCount(data.count);
      });
    }

    return () => {
      if (socket) {
        socket.off(SOCKET_EVENTS.ALERT_ACKED);
      }
    };
  }, []);

  const handleEnd = async () => {
    const doEnd = async () => {
      setIsFinishing(true);
      try {
        if (currentTrip?.id) {
          await endTrip(currentTrip.id);
          router.replace('/home');
        }
      } catch (err: any) {
        setOperationError(err.message || 'Could not end the trip. Please retry.');
      } finally {
        setIsFinishing(false);
      }
    };

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm('Arrived at hospital? Complete this emergency corridor.')) {
        await doEnd();
      }
    } else {
      Alert.alert(
        'Finish Corridor',
        'Arrived at hospital? Complete this emergency corridor.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Complete', onPress: doEnd },
        ]
      );
    }
  };

  const handleCancel = async () => {
    const doCancel = async () => {
      setIsFinishing(true);
      try {
        if (currentTrip?.id) {
          await cancelTrip(currentTrip.id);
          router.replace('/home');
        }
      } catch (err: any) {
        setOperationError(err.message || 'Could not cancel the trip. Please retry.');
      } finally {
        setIsFinishing(false);
      }
    };

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm('Are you sure you want to abort this emergency corridor?')) {
        await doCancel();
      }
    } else {
      Alert.alert(
        'Abort Corridor',
        'Are you sure you want to abort this emergency corridor?',
        [
          { text: 'Keep Active', style: 'cancel' },
          { text: 'Abort', style: 'destructive', onPress: doCancel },
        ]
      );
    }
  };

  const officers: Array<{ lat: number; lng: number; name?: string; acked?: boolean }> = [];

  return (
    <FogBackground>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {Platform.OS === 'web' && <PillButton label="Open demo simulation controls" onPress={() => router.push('/demo')} />}
          {/* Top Status Header */}
          <GlassView radius="lg" elevation="3" style={styles.statusHeader}>
            <View style={styles.statusTopRow}>
              <View style={styles.liveIndicator}>
                <Radio size={14} color="#C8503F" />
                <Text style={styles.liveText}>DEMO TRIP ACTIVE</Text>
              </View>
              <Text style={styles.vehicleId}>
                {currentTrip?.vehicleNumber || 'DL-01-AMB-108'}
              </Text>
            </View>

            <View style={styles.headlineWrapper}>
              <EditorialHeadline
                plainText="Corridor to"
                italicText={currentTrip?.dropAddress ? 'Trauma Center' : 'Hospital'}
                size="title-md"
              />
              <Text style={styles.destinationSub} numberOfLines={1}>
                {currentTrip?.dropAddress || 'AIIMS Apex Trauma Center (Ring Road)'}
              </Text>
            </View>

            {/* Acknowledged officers ahead banner */}
            <View style={styles.ackBanner}>
              <ShieldCheck size={20} color="#4C9A6A" />
              <View style={{ flex: 1 }}>
                <Text style={styles.ackCountText}>
                  {acknowledgedCount > 0
                    ? `${acknowledgedCount} Police Junctions Cleared Ahead`
                    : 'Waiting for officer acknowledgements'}
                </Text>
                <Text style={styles.ackSubText}>
                  Use Demo setup to send simulated route positions
                </Text>
              </View>
            </View>
          </GlassView>

          {/* Telemetry Matrix Glass Cards */}
          <View style={styles.matrixRow}>
            <GlassView radius="md" elevation="1" style={styles.matrixCard}>
              <Gauge size={18} color="#1F3A2A" />
              <Text style={styles.matrixValue}>{currentTrip?.currentSpeed != null ? `${Math.round(currentTrip.currentSpeed * 3.6)} km/h` : '—'}</Text>
              <Text style={styles.matrixLabel}>Last reported speed</Text>
            </GlassView>

            <GlassView radius="md" elevation="1" style={styles.matrixCard}>
              <Clock size={18} color="#3E6B4B" />
              <Text style={styles.matrixValue}>—</Text>
              <Text style={styles.matrixLabel}>Trauma ETA</Text>
            </GlassView>

            <GlassView radius="md" elevation="1" style={styles.matrixCard}>
              <Navigation size={18} color="#6F9A78" />
              <Text style={styles.matrixValue}>—</Text>
              <Text style={styles.matrixLabel}>Distance</Text>
            </GlassView>
          </View>

          {/* Real-Looking Interactive Street Map */}
          <View style={styles.mapBox}>
            <CorridorMap
              ambulanceLat={currentTrip?.currentLat ?? currentTrip?.pickupLat}
              ambulanceLng={currentTrip?.currentLng ?? currentTrip?.pickupLng}
              routeCoordinates={currentTrip?.route?.coordinates || []}
              officers={officers}
              height={320}
            />
          </View>

          {/* Action CTAs */}
          <View style={styles.actionsBox}>
            {!!operationError && <Text style={{ color: '#C8503F' }}>{operationError}</Text>}
            <PillButton
              label={isFinishing ? 'Completing Mission...' : 'Arrived at Hospital — End Trip'}
              loading={isFinishing}
              onPress={handleEnd}
            />

            <Pressable onPress={handleCancel} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>Abort Corridor</Text>
            </Pressable>
          </View>
        </ScrollView>
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
    paddingTop: 10,
    paddingBottom: 40,
    gap: 14,
  },
  statusHeader: {
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    gap: 10,
  },
  statusTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(200, 80, 63, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  liveText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#C8503F',
    letterSpacing: 0.8,
  },
  vehicleId: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5E6661',
  },
  headlineWrapper: {
    gap: 2,
  },
  destinationSub: {
    fontSize: 12,
    color: '#5E6661',
    marginTop: 2,
  },
  ackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(111, 154, 120, 0.18)',
    padding: 12,
    borderRadius: 14,
  },
  ackCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1F3A2A',
  },
  ackSubText: {
    fontSize: 10,
    color: '#5E6661',
  },
  matrixRow: {
    flexDirection: 'row',
    gap: 10,
  },
  matrixCard: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
  },
  matrixValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111312',
  },
  matrixLabel: {
    fontSize: 10,
    color: '#5E6661',
  },
  mapBox: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  actionsBox: {
    gap: 10,
    marginTop: 4,
  },
  cancelBtn: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    color: '#C8503F',
    fontSize: 13,
    fontWeight: '600',
  },
});
