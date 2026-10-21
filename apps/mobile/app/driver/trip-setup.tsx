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
  TextInput,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FogBackground } from '../../components/ui/FogBackground';
import { GlassView } from '../../components/ui/GlassView';
import { EditorialHeadline } from '../../components/ui/EditorialHeadline';
import { PillButton } from '../../components/ui/PillButton';
import { useTripStore } from '../../store/tripStore';
import { requestAndGetCurrentLocation } from '../../lib/location';
import { getNearestHospitals, Hospital, searchHospitals } from '../../lib/hospitals';
import {
  MapPin,
  Navigation,
  Clock,
  Shield,
  ArrowLeft,
  Check,
  RefreshCw,
  Radio,
  Search,
  X,
  Building2,
} from 'lucide-react-native';

export default function TripSetupScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    hospName?: string;
    hospLat?: string;
    hospLng?: string;
  }>();

  const { createTrip, isLoading } = useTripStore();
  const [isLocating, setIsLocating] = useState(false);
  const [locationReady, setLocationReady] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [loadingHospitals, setLoadingHospitals] = useState(true);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Hospital[] | null>(null);

  const [pickup, setPickup] = useState({
    name: 'Detecting live GPS location...',
    lat: 28.5355,
    lng: 77.2882,
  });

  const [drop, setDrop] = useState({
    name: params.hospName || 'Locating closest trauma destination...',
    lat: params.hospLat ? parseFloat(params.hospLat) : 28.5672,
    lng: params.hospLng ? parseFloat(params.hospLng) : 77.2100,
  });

  const fetchLiveGPS = async () => {
    setIsLocating(true);
    setLocationReady(false);
    setLocationError('');
    setLoadingHospitals(true);
    try {
      const loc = await requestAndGetCurrentLocation();
      setPickup({
        name: loc.address || `Live Location (${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)})`,
        lat: loc.lat,
        lng: loc.lng,
      });

      // Dynamically discover nearest hospitals based on live GPS
      const nearby = await getNearestHospitals(loc.lat, loc.lng);
      setHospitals(nearby);

      // If user came with preselected hospital via params, keep that
      if (params.hospName && params.hospLat && params.hospLng) {
        setDrop({
          name: params.hospName,
          lat: parseFloat(params.hospLat),
          lng: parseFloat(params.hospLng),
        });
      } else if (nearby.length > 0) {
        // Automatically select the closest detected hospital!
        setDrop({
          name: nearby[0].name,
          lat: nearby[0].lat,
          lng: nearby[0].lng,
        });
      }
      setLocationReady(true);
    } catch (error: any) {
      setLocationError(error.message || 'Could not get your location. Allow location access and retry.');
      setPickup({ name: 'Location unavailable — tap Refresh GPS', lat: 0, lng: 0 });
    } finally {
      setIsLocating(false);
      setLoadingHospitals(false);
    }
  };

  useEffect(() => {
    fetchLiveGPS();
  }, []);

  const handleSearch = async (text: string) => {
    setSearchQuery(text);
    if (text.trim().length >= 2) {
      setSearching(true);
      try {
        const results = await searchHospitals(text, pickup.lat, pickup.lng);
        setSearchResults(results);
      } catch {
        setSearchResults(null);
      } finally {
        setSearching(false);
      }
    } else {
      setSearchResults(null);
    }
  };

  const handleStartTrip = async () => {
    if (!locationReady || isLocating || !drop.name || hospitals.length === 0 && !params.hospName) return;
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

  const displayedHospitals = searchResults !== null ? searchResults : hospitals;

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
                <Text style={styles.stopLabel}>SELECTED DESTINATION</Text>
                <Text style={styles.stopName} numberOfLines={2}>{drop.name}</Text>
              </View>
            </View>
          </GlassView>

          {/* Quick Destination Presets (GPS Auto-Detected) */}
          <View style={styles.presetSection}>
            <View style={styles.presetHeaderRow}>
              <View>
                <Text style={styles.presetTitle}>Select Trauma Destination</Text>
                <Text style={styles.presetSubtitle}>
                  Ranked by distance from your current coordinates
                </Text>
              </View>
              <View style={styles.gpsBadge}>
                <Radio size={11} color="#3E6B4B" />
                <Text style={styles.gpsBadgeText}>GPS AUTO-DETECT</Text>
              </View>
            </View>

            {/* Optional Hospital Search Bar */}
            <View style={styles.searchBar}>
              <Search size={14} color="#5E6661" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search specific hospital..."
                placeholderTextColor="#8F9E95"
                value={searchQuery}
                onChangeText={handleSearch}
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => handleSearch('')} style={styles.searchClearBtn}>
                  <X size={14} color="#5E6661" />
                </Pressable>
              )}
            </View>

            {loadingHospitals || searching ? (
              <GlassView radius="md" elevation="1" style={styles.loadingBox}>
                <ActivityIndicator size="small" color="#1F3A2A" />
                <Text style={styles.loadingText}>
                  {searching
                    ? 'Searching medical facilities...'
                    : 'Auto-detecting closest hospitals to your live GPS...'}
                </Text>
              </GlassView>
            ) : displayedHospitals.length === 0 ? (
              <GlassView radius="md" elevation="1" style={styles.emptyBox}>
                <Text style={styles.emptyText}>
                  No matching hospitals found. Try another query or select apex center.
                </Text>
              </GlassView>
            ) : (
              displayedHospitals.map((hosp, idx) => {
                const isSelected =
                  drop.lat === hosp.lat ||
                  drop.name.toLowerCase() === hosp.name.toLowerCase();
                const isClosest = idx === 0 && searchResults === null;

                return (
                  <Pressable
                    key={hosp.id || hosp.name}
                    onPress={() =>
                      setDrop({ name: hosp.name, lat: hosp.lat, lng: hosp.lng })
                    }
                  >
                    <GlassView
                      radius="md"
                      elevation="1"
                      style={[
                        styles.presetCard,
                        isSelected && styles.presetCardSelected,
                        isClosest && !isSelected && styles.closestCardBorder,
                      ]}
                    >
                      <View style={styles.presetCardLeft}>
                        <View style={styles.hospTitleRow}>
                          <Text style={styles.presetName} numberOfLines={1}>
                            {hosp.name}
                          </Text>
                          {isClosest && (
                            <View style={styles.closestBadge}>
                              <Text style={styles.closestBadgeText}>CLOSEST</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.hospAddressText} numberOfLines={1}>
                          {hosp.address}
                        </Text>
                        <View style={styles.metaRow}>
                          <Clock size={12} color="#3E6B4B" />
                          <Text style={styles.metaText}>ETA {hosp.eta}</Text>
                          <Text style={styles.metaDivider}>•</Text>
                          <Navigation size={12} color="#3E6B4B" />
                          <Text style={styles.metaText}>{hosp.distance}</Text>
                        </View>
                      </View>
                      {isSelected ? (
                        <View style={styles.checkCircle}>
                          <Check size={14} color="#FFFFFF" />
                        </View>
                      ) : (
                        <View style={styles.unselectedRadio} />
                      )}
                    </GlassView>
                  </Pressable>
                );
              })
            )}
          </View>

          {/* Corridor Readiness Summary */}
          <GlassView radius="lg" style={styles.summaryCard}>
            <View style={styles.summaryItem}>
              <Shield size={20} color="#6F9A78" />
              <View>
                <Text style={styles.summaryValue}>Demo corridor</Text>
                <Text style={styles.summarySub}>Availability varies by route</Text>
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

          {locationError ? <Text style={{ color: '#C8503F', marginBottom: 12 }}>{locationError}</Text> : null}
          {/* Primary CTA */}
          <View style={styles.ctaBox}>
            <PillButton
              label="Launch Emergency Corridor"
              loading={isLoading}
              disabled={!locationReady || isLocating || (hospitals.length === 0 && !params.hospName)}
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
  presetHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  presetTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2B2F2D',
  },
  presetSubtitle: {
    fontSize: 12,
    color: '#5E6661',
    marginTop: 2,
  },
  gpsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(76, 154, 106, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  gpsBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#3E6B4B',
    letterSpacing: 0.5,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#DCE6E0',
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#111312',
    padding: 0,
  },
  searchClearBtn: {
    padding: 4,
  },
  loadingBox: {
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  loadingText: {
    fontSize: 12,
    color: '#5E6661',
    flex: 1,
  },
  emptyBox: {
    padding: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 12,
    color: '#5E6661',
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
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  closestCardBorder: {
    borderColor: 'rgba(76, 154, 106, 0.5)',
    borderWidth: 1,
  },
  presetCardLeft: {
    flex: 1,
    gap: 4,
    paddingRight: 10,
  },
  hospTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  presetName: {
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
  hospAddressText: {
    fontSize: 12,
    color: '#5E6661',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  metaText: {
    fontSize: 12,
    color: '#3E6B4B',
    fontWeight: '500',
  },
  metaDivider: {
    color: '#B8C7BE',
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#6F9A78',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unselectedRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#B8C7BE',
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
