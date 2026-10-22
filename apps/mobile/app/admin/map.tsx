import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FogBackground } from '../../components/ui/FogBackground';
import { GlassView } from '../../components/ui/GlassView';
import { EditorialHeadline } from '../../components/ui/EditorialHeadline';
import { api } from '../../lib/api';
import {
  Users,
  Activity,
  Shield,
  Navigation,
  ArrowRight,
  RefreshCw,
  LogOut,
} from 'lucide-react-native';
import { useAuthStore } from '../../store/authStore';

export default function AdminMapScreen() {
  const router = useRouter();
  const { logout } = useAuthStore();
  const [activeTrips, setActiveTrips] = useState<any[]>([]);
  const [officers, setOfficers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchOverview = async () => {
    setIsLoading(true);
    try {
      const data = await api.getAdminOverview();
      setActiveTrips(data.activeTrips || []);
      setOfficers(data.onDutyOfficers || []);
    } catch {
      // Fallback demo data
      setActiveTrips([
        {
          id: 'trip-demo-1',
          vehicleNumber: 'DL-01-AMB-108',
          pickupAddress: 'Apollo Trauma',
          dropAddress: 'AIIMS Central',
          currentSpeed: 16.5,
          alerts: [{ status: 'ACKNOWLEDGED' }, { status: 'PENDING' }],
        },
      ]);
      setOfficers([
        { id: '1', user: { name: 'Officer Vikramaditya', badgeNumber: 'TP-101' }, onDuty: true },
        { id: '2', user: { name: 'Officer Neha Sharma', badgeNumber: 'TP-102' }, onDuty: true },
        { id: '3', user: { name: 'Officer Rajesh Verma', badgeNumber: 'TP-103' }, onDuty: true },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  return (
    <FogBackground>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.adminTag}>Central Command Center</Text>
              <Text style={styles.adminTitle}>Raah Live Grid</Text>
            </View>

            <View style={styles.headerActions}>
              <Pressable onPress={fetchOverview} style={styles.iconBtn}>
                <RefreshCw size={16} color="#111312" />
              </Pressable>
              <Pressable
                onPress={() => {
                  logout();
                  router.replace('/(auth)/login');
                }}
                style={styles.iconBtn}
              >
                <LogOut size={16} color="#C8503F" />
              </Pressable>
            </View>
          </View>

          {/* Headline */}
          <View style={styles.headlineBox}>
            <EditorialHeadline
              plainText="Corridor Oversight and"
              italicText="Active Missions"
              size="display-lg"
            />
          </View>

          {/* Navigation to User Verification */}
          <Pressable onPress={() => router.push('/admin/users')}>
            <GlassView radius="lg" elevation="2" style={styles.verifyLinkCard}>
              <View style={styles.verifyLeft}>
                <Users size={20} color="#1F3A2A" />
                <View>
                  <Text style={styles.verifyTitle}>User Approval Gate</Text>
                  <Text style={styles.verifySub}>
                    Review pending drivers and officers
                  </Text>
                </View>
              </View>
              <ArrowRight size={18} color="#111312" />
            </GlassView>
          </Pressable>

          {/* Key Metrics Row */}
          <View style={styles.metricRow}>
            <GlassView radius="md" elevation="1" style={styles.metricCard}>
              <Activity size={18} color="#C8503F" />
              <Text style={styles.metricVal}>{activeTrips.length}</Text>
              <Text style={styles.metricLabel}>Active Ambulances</Text>
            </GlassView>

            <GlassView radius="md" elevation="1" style={styles.metricCard}>
              <Shield size={18} color="#4C9A6A" />
              <Text style={styles.metricVal}>{officers.length}</Text>
              <Text style={styles.metricLabel}>On-Duty Police</Text>
            </GlassView>
          </View>

          {/* Active Missions List */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Active Emergency Corridors</Text>
            {activeTrips.map((trip) => {
              const acks =
                trip.alerts?.filter((a: any) => a.status === 'ACKNOWLEDGED').length || 0;
              return (
                <GlassView
                  key={trip.id}
                  radius="lg"
                  elevation="2"
                  style={styles.tripCard}
                >
                  <View style={styles.tripCardHeader}>
                    <View style={styles.vehicleBadge}>
                      <Navigation size={12} color="#FFFFFF" />
                      <Text style={styles.vehicleNumber}>{trip.vehicleNumber}</Text>
                    </View>
                    <Text style={styles.speedText}>
                      {Math.round((trip.currentSpeed || 15) * 3.6)} km/h
                    </Text>
                  </View>

                  <View style={styles.routeRow}>
                    <Text style={styles.routeText}>
                      {trip.pickupAddress || 'Pickup'} ➔ {trip.dropAddress || 'Hospital'}
                    </Text>
                  </View>

                  <View style={styles.tripCardFooter}>
                    <Text style={styles.ackBadge}>
                      {acks} Junctions Cleared Ahead
                    </Text>
                  </View>
                </GlassView>
              );
            })}
          </View>

          {/* On-Duty Police Roster */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Stationed Corridor Officers</Text>
            {officers.map((off) => (
              <GlassView
                key={off.id}
                radius="md"
                elevation="1"
                style={styles.officerRow}
              >
                <View style={styles.officerLeft}>
                  <View style={styles.greenDutyDot} />
                  <View>
                    <Text style={styles.officerNameText}>
                      {off.user?.name || 'Traffic Officer'}
                    </Text>
                    <Text style={styles.officerBadgeText}>
                      Badge: {off.user?.badgeNumber || 'TP-00'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.officerStatusText}>Sharing GPS</Text>
              </GlassView>
            ))}
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
    paddingTop: 12,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  adminTag: {
    fontSize: 11,
    color: '#5E6661',
    fontWeight: '500',
  },
  adminTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111312',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headlineBox: {
    marginVertical: 10,
  },
  verifyLinkCard: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  verifyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  verifyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111312',
  },
  verifySub: {
    fontSize: 11,
    color: '#5E6661',
  },
  metricRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  metricCard: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
  },
  metricVal: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111312',
  },
  metricLabel: {
    fontSize: 11,
    color: '#5E6661',
  },
  section: {
    marginBottom: 22,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2B2F2D',
  },
  tripCard: {
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    gap: 8,
  },
  tripCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vehicleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#C8503F',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  vehicleNumber: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  speedText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111312',
  },
  routeRow: {
    marginTop: 4,
  },
  routeText: {
    fontSize: 13,
    color: '#2B2F2D',
  },
  tripCardFooter: {
    marginTop: 4,
  },
  ackBadge: {
    fontSize: 11,
    color: '#3E6B4B',
    fontWeight: '600',
  },
  officerRow: {
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
  },
  officerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  greenDutyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4C9A6A',
  },
  officerNameText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111312',
  },
  officerBadgeText: {
    fontSize: 11,
    color: '#5E6661',
  },
  officerStatusText: {
    fontSize: 11,
    color: '#3E6B4B',
    fontWeight: '500',
  },
});
