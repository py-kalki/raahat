import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FogBackground } from '../components/ui/FogBackground';
import { GlassView } from '../components/ui/GlassView';
import { EditorialHeadline } from '../components/ui/EditorialHeadline';
import { FloatingNav } from '../components/ui/FloatingNav';
import { PillButton } from '../components/ui/PillButton';
import { useAuthStore } from '../store/authStore';
import { useTripStore } from '../store/tripStore';
import { requestAndGetCurrentLocation, UserLocation } from '../lib/location';
import { getNearestHospitals, Hospital } from '../lib/hospitals';
import {
  Navigation,
  ShieldCheck,
  MapPin,
  Clock,
  Activity,
  HeartPulse,
  Radio,
  CheckCircle,
  Building2,
} from 'lucide-react-native';

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { currentTrip, fetchActiveTrip } = useTripStore();

  const [currentTab, setCurrentTab] = useState('home');
  const [locationError, setLocationError] = useState('');
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [loadingLoc, setLoadingLoc] = useState(true);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loadingHospitals, setLoadingHospitals] = useState(true);

  const captureId = useRef(0);
  const captureLocation = async () => {
    const id = ++captureId.current;
    setLoadingLoc(true); setLocationError(''); setLocation(null); setHospitals([]); setLoadingHospitals(false);
    try {
      const loc = await requestAndGetCurrentLocation({ preview: true });
      if (id !== captureId.current) return;
      setLocation(loc); setLoadingLoc(false); setLoadingHospitals(true);
      const nearby = await getNearestHospitals(loc.lat, loc.lng);
      if (id === captureId.current) setHospitals(nearby);
    } catch (error: any) { if (id === captureId.current) setLocationError(error.message || 'Location unavailable. Retry or enter coordinates in trip setup.'); }
    finally { if (id === captureId.current) { setLoadingLoc(false); setLoadingHospitals(false); } }
  };

  useEffect(() => {
    if (!user || user.role === 'ADMIN') return;
    // If an officer accesses /home, redirect to their dedicated Officer Guard Station
    if (user?.role === 'OFFICER') {
      router.replace('/officer');
      return;
    }

    void captureLocation();

    // 2. Fetch real active trip if any exists in DB
    fetchActiveTrip();
    return () => { captureId.current++; };
  }, [user?.id]);

  return (
    <FogBackground>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header Row */}
          <View style={styles.headerRow}>
            <View>
              <View style={styles.verifiedRow}>
                <ShieldCheck size={14} color="#4C9A6A" />
                <Text style={styles.verifiedBadge}>
                  VERIFIED EMERGENCY AMBULANCE • DL-01-AMB-108
                </Text>
              </View>
              <Text style={styles.welcomeText}>
                Driver {user?.name || 'Ramesh Singh'}
              </Text>
            </View>

            <Pressable
              onPress={() => router.push('/profile')}
              style={styles.avatarBtn}
            >
              <Text style={styles.avatarInitial}>
                {user?.name ? user.name.charAt(0).toUpperCase() : 'R'}
              </Text>
            </Pressable>
          </View>

          {/* Real Live GPS Telemetry Card */}
          <GlassView radius="lg" elevation="2" style={styles.gpsCard}>
            <View style={styles.gpsTopRow}>
              <View style={styles.gpsStatusIndicator}>
                <Radio size={14} color="#4C9A6A" />
                <Text style={styles.gpsStatusText}>ONE-TIME LOCATION</Text>
              </View>
              {loadingLoc ? (
                <ActivityIndicator size="small" color="#1F3A2A" />
              ) : (
                <Text style={styles.gpsCoords}>
                  {location?.lat.toFixed(4)}, {location?.lng.toFixed(4)}
                </Text>
              )}
            </View>
            <View style={styles.gpsAddressRow}>
              <MapPin size={16} color="#3E6B4B" />
              <Text style={styles.gpsAddressText} accessibilityLiveRegion="polite">
                {locationError || location?.address || 'Requesting location (up to 8 seconds). Allow access if prompted…'}
              </Text>
            </View>
            {!!location && <Text style={styles.gpsAddressText}>{location.accuracy != null && location.accuracy > 100 ? 'Approximate preview only' : 'Location received'} · reported accuracy ±{Math.round(location.accuracy || 0)} m</Text>}
            {!loadingLoc && <PillButton label="Retry location" variant="secondary" onPress={() => { void captureLocation(); }} />}
            {!!locationError && <PillButton label="Enter pickup coordinates in trip setup" variant="secondary" onPress={() => router.push('/driver/trip-setup')} />}
          </GlassView>

          {/* Editorial Headline */}
          <View style={styles.headlineBox}>
            <EditorialHeadline
              plainText="Ambulance Emergency"
              italicText="Corridor Command"
              size="display-lg"
            />
          </View>

          {/* Active Trip Status or Ready to Launch Banner */}
          {currentTrip ? (
            <GlassView radius="xl" elevation="3" style={styles.activeMissionCard}>
              <View style={styles.missionHeader}>
                <View style={styles.missionPulse}>
                  <View style={styles.pulseDot} />
                  <Text style={styles.missionPulseText}>MISSION IN PROGRESS</Text>
                </View>
                <Text style={styles.missionVehicle}>
                  {currentTrip.vehicleNumber || 'DL-01-AMB-108'}
                </Text>
              </View>

              <Text style={styles.missionTitle}>
                Corridor to {currentTrip.dropAddress || 'Hospital'}
              </Text>
              <Text style={styles.missionSub}>
                Police junctions along route are actively alerted
              </Text>

              <View style={styles.missionBtnBox}>
                <PillButton
                  label="Open Live Corridor Screen"
                  onPress={() => router.push('/driver/active')}
                />
              </View>
            </GlassView>
          ) : (
            <GlassView radius="xl" elevation="3" style={styles.heroCard}>
              <View style={styles.heroTop}>
                <View style={styles.readyBadge}>
                  <CheckCircle size={14} color="#4C9A6A" />
                  <Text style={styles.readyText}>Grid Synchronized</Text>
                </View>
                <HeartPulse size={22} color="#1F3A2A" />
              </View>

              <Text style={styles.heroTitle}>Automated Green Corridor</Text>
              <Text style={styles.heroDesc}>
                Broadcasting ambulance route automatically alerts traffic police posts within 4 minutes ahead.
              </Text>

              <View style={styles.heroAction}>
                <PillButton
                  label="Dispatch Emergency Corridor"
                  onPress={() => router.push('/driver/trip-setup')}
                />
              </View>
            </GlassView>
          )}

          {/* Real Nearby Emergency Hospitals (GPS Auto-Detected) */}
          <View style={styles.hospitalsSection}>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionTitle}>Nearest Trauma Centers</Text>
                <Text style={styles.sectionSubtitle}>
                  {location ? 'Based on your reported location; confirm pickup before starting a ride' : 'Waiting for a location before searching'}
                </Text>
              </View>
              <View style={styles.autoDetectedBadge}>
                <Radio size={11} color="#3E6B4B" />
                <Text style={styles.autoDetectedBadgeText}>{loadingLoc ? 'WAITING FOR LOCATION' : !location ? 'LOCATION UNAVAILABLE' : (location.accuracy || 0) > 100 ? 'APPROXIMATE LOCATION' : 'LOCATION RECEIVED'}</Text>
              </View>
            </View>

            {loadingHospitals ? (
              <GlassView radius="md" elevation="1" style={styles.hospLoadingCard}>
                <ActivityIndicator size="small" color="#1F3A2A" />
                <Text style={styles.hospLoadingText}>
                  Scanning nearest trauma centers & calculating corridor ETAs...
                </Text>
              </GlassView>
            ) : hospitals.length === 0 ? (
              <GlassView radius="md" elevation="1" style={styles.hospEmptyCard}>
                <Text style={styles.hospEmptyText}>
                  {!location ? 'Location is not available yet. Retry above or enter your pickup coordinates in trip setup.' : 'No nearby hospitals found. Search for a destination in trip setup.'}
                </Text>
              </GlassView>
            ) : (
              hospitals.map((hosp, idx) => {
                const isClosest = idx === 0;
                return (
                  <Pressable
                    key={hosp.id || hosp.name}
                    onPress={() =>
                      router.push({
                        pathname: '/driver/trip-setup',
                        params: {
                          hospName: hosp.name,
                          hospLat: hosp.lat.toString(),
                          hospLng: hosp.lng.toString(),
                        },
                      })
                    }
                  >
                    <GlassView
                      radius="md"
                      elevation="1"
                      style={[
                        styles.hospitalCard,
                        isClosest && styles.closestHospitalCard,
                      ]}
                    >
                      <View style={styles.hospLeft}>
                        <View style={styles.hospTitleRow}>
                          <Text style={styles.hospName} numberOfLines={1}>
                            {hosp.name}
                          </Text>
                          {isClosest && (
                            <View style={styles.closestBadge}>
                              <Text style={styles.closestBadgeText}>CLOSEST</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.hospAddress} numberOfLines={1}>
                          {hosp.address}
                        </Text>
                        <View style={styles.hospMeta}>
                          <Clock size={12} color="#3E6B4B" />
                          <Text style={styles.hospMetaText}>Corridor ETA {hosp.eta}</Text>
                          <Text style={styles.hospDivider}>•</Text>
                          <Navigation size={12} color="#3E6B4B" />
                          <Text style={styles.hospMetaText}>{hosp.distance}</Text>
                        </View>
                      </View>
                      <View style={styles.hospActionBtn}>
                        <Text style={styles.hospActionText}>Route</Text>
                      </View>
                    </GlassView>
                  </Pressable>
                );
              })
            )}
          </View>
        </ScrollView>

        {/* 5-Tab Floating Nav */}
        <FloatingNav
          currentTab={currentTab}
          onTabChange={(tab) => {
            setCurrentTab(tab);
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
    marginBottom: 14,
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  verifiedBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#3E6B4B',
    letterSpacing: 0.8,
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111312',
    marginTop: 2,
  },
  avatarBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#1F3A2A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  gpsCard: {
    padding: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    marginBottom: 16,
    gap: 8,
  },
  gpsTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gpsStatusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  gpsStatusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4C9A6A',
  },
  gpsCoords: {
    fontSize: 11,
    color: '#5E6661',
    fontWeight: '500',
  },
  gpsAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gpsAddressText: {
    flex: 1,
    fontSize: 13,
    color: '#2B2F2D',
    fontWeight: '500',
  },
  headlineBox: {
    marginBottom: 14,
  },
  heroCard: {
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    marginBottom: 20,
    gap: 10,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  readyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(76, 154, 106, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  readyText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4C9A6A',
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111312',
  },
  heroDesc: {
    fontSize: 13,
    color: '#5E6661',
    lineHeight: 19,
  },
  heroAction: {
    marginTop: 8,
  },
  activeMissionCard: {
    padding: 20,
    backgroundColor: 'rgba(31, 58, 42, 0.95)',
    marginBottom: 20,
    gap: 10,
  },
  missionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  missionPulse: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(200, 80, 63, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#C8503F',
  },
  missionPulseText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  missionVehicle: {
    color: '#A9C4AE',
    fontSize: 12,
    fontWeight: '600',
  },
  missionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  missionSub: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 13,
  },
  missionBtnBox: {
    marginTop: 8,
  },
  hospitalsSection: {
    gap: 10,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2B2F2D',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#5E6661',
    marginTop: 2,
  },
  autoDetectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(76, 154, 106, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  autoDetectedBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#3E6B4B',
    letterSpacing: 0.5,
  },
  hospLoadingCard: {
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  hospLoadingText: {
    fontSize: 12,
    color: '#5E6661',
    flex: 1,
  },
  hospEmptyCard: {
    padding: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
  },
  hospEmptyText: {
    fontSize: 12,
    color: '#5E6661',
  },
  hospitalCard: {
    padding: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  closestHospitalCard: {
    borderColor: '#4C9A6A',
    borderWidth: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
  },
  hospLeft: {
    flex: 1,
    gap: 4,
    paddingRight: 10,
  },
  hospTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hospName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111312',
    flexShrink: 1,
  },
  closestBadge: {
    backgroundColor: '#4C9A6A',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  closestBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  hospAddress: {
    fontSize: 12,
    color: '#5E6661',
  },
  hospMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  hospMetaText: {
    fontSize: 11,
    color: '#3E6B4B',
    fontWeight: '500',
  },
  hospDivider: {
    color: '#B8C7BE',
  },
  hospActionBtn: {
    backgroundColor: 'rgba(31, 58, 42, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignItems: 'center',
  },
  hospActionText: {
    color: '#1F3A2A',
    fontSize: 12,
    fontWeight: '700',
  },
});
