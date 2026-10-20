import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FogBackground } from '../components/ui/FogBackground';
import { GlassView } from '../components/ui/GlassView';
import { EditorialHeadline } from '../components/ui/EditorialHeadline';
import { FloatingNav } from '../components/ui/FloatingNav';
import { PillButton } from '../components/ui/PillButton';
import { useTripStore } from '../store/tripStore';
import { api } from '../lib/api';
import {
  Navigation,
  CheckCircle2,
  Clock,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react-native';

export default function TripsScreen() {
  const router = useRouter();
  const { currentTrip, fetchActiveTrip } = useTripStore();
  const [currentTab, setCurrentTab] = useState('trips');
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActiveTrip();
    fetchTripHistory();
  }, []);

  const fetchTripHistory = async () => {
    try {
      setLoading(true);
      const data = await api.getAdminOverview();
      // Show trips from backend
      setHistory(data.activeTrips || []);
    } catch {
      // Fallback past mission records
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const sampleCompletedTrips = [
    {
      id: 'past-1',
      vehicle: 'DL-01-AMB-108',
      from: 'Sarita Vihar Emergency',
      to: 'AIIMS Apex Trauma Center',
      date: 'Today, 14:22',
      duration: '8 min 30 sec',
      officersAcked: 5,
      status: 'COMPLETED',
    },
    {
      id: 'past-2',
      vehicle: 'DL-04-AMB-204',
      from: 'Lajpat Nagar Ring Road',
      to: 'Safdarjung Hospital',
      date: 'Today, 11:05',
      duration: '6 min 15 sec',
      officersAcked: 4,
      status: 'COMPLETED',
    },
  ];

  return (
    <FogBackground>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTag}>TELEMETRY & LOGS</Text>
            <EditorialHeadline
              plainText="Corridor Missions &"
              italicText="Trip Records"
              size="display-lg"
            />
          </View>

          {/* Active Mission Card if available */}
          {currentTrip && (
            <View style={styles.activeSection}>
              <Text style={styles.sectionTitle}>Active Emergency Route</Text>
              <GlassView radius="xl" elevation="3" style={styles.activeCard}>
                <View style={styles.activeTop}>
                  <View style={styles.liveBadge}>
                    <View style={styles.pulseDot} />
                    <Text style={styles.liveText}>LIVE CORRIDOR</Text>
                  </View>
                  <Text style={styles.vehicleText}>
                    {currentTrip.vehicleNumber || 'DL-01-AMB-108'}
                  </Text>
                </View>

                <View style={styles.routeBox}>
                  <Text style={styles.fromText}>
                    Pickup: {currentTrip.pickupAddress || 'Current GPS Location'}
                  </Text>
                  <Text style={styles.toText}>
                    Destination: {currentTrip.dropAddress || 'AIIMS Trauma Center'}
                  </Text>
                </View>

                <View style={styles.btnRow}>
                  <PillButton
                    label="Resume Live Navigation"
                    onPress={() => router.push('/driver/active')}
                  />
                </View>
              </GlassView>
            </View>
          )}

          {/* Action: Setup New Mission */}
          <View style={styles.ctaBox}>
            <PillButton
              label="Setup New Emergency Route"
              onPress={() => router.push('/driver/trip-setup')}
            />
          </View>

          {/* Completed Missions History */}
          <View style={styles.historySection}>
            <Text style={styles.sectionTitle}>Completed Corridor Audits</Text>

            {sampleCompletedTrips.map((item) => (
              <GlassView
                key={item.id}
                radius="lg"
                elevation="1"
                style={styles.historyCard}
              >
                <View style={styles.histHeader}>
                  <View style={styles.histBadge}>
                    <CheckCircle2 size={14} color="#4C9A6A" />
                    <Text style={styles.histStatus}>Corridor Cleared</Text>
                  </View>
                  <Text style={styles.histDate}>{item.date}</Text>
                </View>

                <View style={styles.histRoute}>
                  <Text style={styles.histFrom}>{item.from}</Text>
                  <Text style={styles.histArrow}>➔</Text>
                  <Text style={styles.histTo}>{item.to}</Text>
                </View>

                <View style={styles.histFooter}>
                  <View style={styles.histFooterItem}>
                    <Clock size={12} color="#5E6661" />
                    <Text style={styles.histFooterText}>{item.duration}</Text>
                  </View>
                  <View style={styles.histFooterItem}>
                    <ShieldCheck size={12} color="#3E6B4B" />
                    <Text style={styles.histFooterText}>
                      {item.officersAcked} Police Posts Synchronized
                    </Text>
                  </View>
                </View>
              </GlassView>
            ))}
          </View>
        </ScrollView>

        {/* Floating Nav */}
        <FloatingNav
          currentTab={currentTab}
          onTabChange={(tab) => {
            setCurrentTab(tab);
            if (tab === 'home') router.push('/home');
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
  header: {
    marginBottom: 16,
  },
  headerTag: {
    fontSize: 11,
    fontWeight: '700',
    color: '#3E6B4B',
    letterSpacing: 1,
    marginBottom: 4,
  },
  activeSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2B2F2D',
    marginBottom: 10,
  },
  activeCard: {
    padding: 18,
    backgroundColor: 'rgba(31, 58, 42, 0.92)',
    gap: 12,
  },
  activeTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(200, 80, 63, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#C8503F',
  },
  liveText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  vehicleText: {
    color: '#A9C4AE',
    fontSize: 12,
    fontWeight: '600',
  },
  routeBox: {
    gap: 4,
  },
  fromText: {
    color: '#DCE6E0',
    fontSize: 13,
  },
  toText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  btnRow: {
    marginTop: 4,
  },
  ctaBox: {
    marginBottom: 20,
  },
  historySection: {
    gap: 12,
  },
  historyCard: {
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    gap: 10,
  },
  histHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  histBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  histStatus: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4C9A6A',
  },
  histDate: {
    fontSize: 11,
    color: '#5E6661',
  },
  histRoute: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  histFrom: {
    fontSize: 13,
    color: '#2B2F2D',
    fontWeight: '500',
  },
  histArrow: {
    color: '#6F9A78',
  },
  histTo: {
    fontSize: 13,
    color: '#111312',
    fontWeight: '600',
  },
  histFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.8)',
    paddingTop: 8,
  },
  histFooterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  histFooterText: {
    fontSize: 11,
    color: '#5E6661',
  },
});
