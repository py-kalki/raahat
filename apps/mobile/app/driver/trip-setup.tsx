import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FogBackground } from '../../components/ui/FogBackground';
import { GlassView } from '../../components/ui/GlassView';
import { EditorialHeadline } from '../../components/ui/EditorialHeadline';
import { PillButton } from '../../components/ui/PillButton';
import { useTripStore } from '../../store/tripStore';
import { requestAndGetCurrentLocation } from '../../lib/location';
import {
  MapPin,
  Navigation,
  Clock,
  Shield,
  ArrowLeft,
  Check,
  RefreshCw,
} from 'lucide-react-native';

export default function TripSetupScreen() {
  const router = useRouter();
  const { createTrip, isLoading } = useTripStore();
  const [isLocating, setIsLocating] = useState(false);

  const [pickup, setPickup] = useState({
    name: 'Detecting live GPS location...',
    lat: 28.5355,
    lng: 77.2882,
  });

  const [drop, setDrop] = useState({
    name: 'AIIMS Apex Trauma Center (Ring Road)',
    lat: 28.5672,
    lng: 77.2100,
  });

  const hospitalDestinations = [
    { name: 'AIIMS Apex Trauma Center', lat: 28.5672, lng: 77.2100, dist: '8.4 km', eta: '9 min' },
    { name: 'Safdarjung Hospital Emergency', lat: 28.5710, lng: 77.2075, dist: '8.9 km', eta: '11 min' },
    { name: 'Fortis Escorts Heart Institute', lat: 28.5601, lng: 77.2764, dist: '3.8 km', eta: '4 min' },
  ];

  const fetchLiveGPS = async () => {
    setIsLocating(true);
    try {
      const loc = await requestAndGetCurrentLocation();
      setPickup({
        name: loc.address || `Live Location (${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)})`,
        lat: loc.lat,
        lng: loc.lng,
      });
    } catch {
      setPickup({
        name: 'Apollo Emergency Center (Sarita Vihar)',
        lat: 28.5355,
        lng: 77.2882,
      });
    } finally {
      setIsLocating(false);
    }
  };

  useEffect(() => {
    fetchLiveGPS();
  }, []);

  const handleStartTrip = async () => {
    try {
      await createTrip(
        { lat: pickup.lat, lng: pickup.lng, address: pickup.name },
        { lat: drop.lat, lng: drop.lng, address: drop.name },
        'DL-01-AMB-108'
      );
      router.replace('/driver/active');
    } catch (err: any) {
      const errMsg = err.message || 'Failed to start trip';
      if (Platform.OS === 'web') {
        window.alert(errMsg);
      } else {
        Alert.alert('Trip Launch Error', errMsg);
      }
    }
  };

  return (
    <FogBackground>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header row */}
          <View style={styles.topRow}>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <ArrowLeft size={20} color="#111312" />
            </Pressable>
            <Text style={styles.screenLabel}>Trip Configuration</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Editorial Headline */}
          <View style={styles.headlineBox}>
            <EditorialHeadline
              plainText="Route and"
              italicText="Corridor Setup"
              size="display-lg"
            />
          </View>

          {/* Pickup & Destination Glass Card */}
          <GlassView radius="lg" elevation="2" style={styles.locationCard}>
            <View style={styles.stopRow}>
              <View style={[styles.dotIcon, { backgroundColor: '#4C9A6A' }]}>
                <Navigation size={12} color="#FFFFFF" />
              </View>
              <View style={styles.stopInfo}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={styles.stopLabel}>CURRENT GPS ORIGIN</Text>
                  <Pressable onPress={fetchLiveGPS} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    {isLocating ? (
                      <ActivityIndicator size="small" color="#4C9A6A" />
                    ) : (
                      <>
                        <RefreshCw size={10} color="#4C9A6A" />
                        <Text style={{ fontSize: 10, color: '#4C9A6A', fontWeight: '600' }}>Refresh GPS</Text>
                      </>
                    )}
                  </Pressable>
                </View>
                <Text style={styles.stopName} numberOfLines={2}>{pickup.name}</Text>
              </View>
            </View>

            <View style={styles.connectingLine} />

            <View style={styles.stopRow}>
              <View style={[styles.dotIcon, { backgroundColor: '#C8503F' }]}>
                <MapPin size={12} color="#FFFFFF" />
              </View>
              <View style={styles.stopInfo}>
                <Text style={styles.stopLabel}>DESTINATION</Text>
                <Text style={styles.stopName}>{drop.name}</Text>
              </View>
            </View>
          </GlassView>

          {/* Quick Destination Presets */}
          <View style={styles.presetSection}>
            <Text style={styles.presetTitle}>Select Trauma Destination</Text>
            {hospitalDestinations.map((hosp) => {
              const isSelected = drop.lat === hosp.lat;
              return (
                <Pressable
                  key={hosp.name}
                  onPress={() => setDrop({ name: hosp.name, lat: hosp.lat, lng: hosp.lng })}
                >
                  <GlassView
                    radius="md"
                    elevation="1"
                    style={[
                      styles.presetCard,
                      isSelected && styles.presetCardSelected,
                    ]}
                  >
                    <View style={styles.presetCardLeft}>
                      <Text style={styles.presetName}>{hosp.name}</Text>
                      <View style={styles.metaRow}>
                        <Clock size={12} color="#5E6661" />
                        <Text style={styles.metaText}>{hosp.eta}</Text>
                        <Text style={styles.metaDivider}>•</Text>
                        <Text style={styles.metaText}>{hosp.dist}</Text>
                      </View>
                    </View>
                    {isSelected && (
                      <View style={styles.checkCircle}>
                        <Check size={14} color="#FFFFFF" />
                      </View>
                    )}
                  </GlassView>
                </Pressable>
              );
            })}
          </View>

          {/* Corridor Readiness Summary */}
          <GlassView radius="lg" style={styles.summaryCard}>
            <View style={styles.summaryItem}>
              <Shield size={20} color="#6F9A78" />
              <View>
                <Text style={styles.summaryValue}>5 Police Posts</Text>
                <Text style={styles.summarySub}>On-duty along route</Text>
              </View>
            </View>
            <View style={styles.summaryItem}>
              <Clock size={20} color="#3E6B4B" />
              <View>
                <Text style={styles.summaryValue}>~4 min</Text>
                <Text style={styles.summarySub}>Advance officer alert</Text>
              </View>
            </View>
          </GlassView>

          {/* Primary CTA */}
          <View style={styles.ctaBox}>
            <PillButton
              label="Launch Emergency Corridor"
              loading={isLoading}
              onPress={handleStartTrip}
            />
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
    paddingTop: 8,
    paddingBottom: 40,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#5E6661',
  },
  headlineBox: {
    marginBottom: 18,
  },
  locationCard: {
    padding: 18,
    marginBottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
  },
  stopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dotIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopInfo: {
    flex: 1,
  },
  stopLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#5E6661',
    letterSpacing: 0.8,
  },
  stopName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111312',
    marginTop: 2,
  },
  connectingLine: {
    width: 2,
    height: 20,
    backgroundColor: '#DCE6E0',
    marginLeft: 11,
    marginVertical: 4,
  },
  presetSection: {
    marginBottom: 20,
  },
  presetTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2B2F2D',
    marginBottom: 10,
  },
  presetCard: {
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  presetCardSelected: {
    borderColor: '#6F9A78',
    borderWidth: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  presetCardLeft: {
    gap: 4,
  },
  presetName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111312',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#5E6661',
  },
  metaDivider: {
    color: '#B8C7BE',
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#6F9A78',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCard: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    marginBottom: 24,
    backgroundColor: 'rgba(220, 230, 224, 0.5)',
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111312',
  },
  summarySub: {
    fontSize: 11,
    color: '#5E6661',
  },
  ctaBox: {
    marginBottom: 16,
  },
});
