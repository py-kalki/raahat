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
import { FogBackground } from '../components/ui/FogBackground';
import { GlassView } from '../components/ui/GlassView';
import { EditorialHeadline } from '../components/ui/EditorialHeadline';
import { FloatingNav } from '../components/ui/FloatingNav';
import { CorridorMap } from '../components/ui/CorridorMap';
import { PillButton } from '../components/ui/PillButton';
import { useTripStore } from '../store/tripStore';
import { socketManager } from '../lib/socket';
import { SOCKET_EVENTS } from '@raahat/shared';
import {
  ShieldCheck,
  ShieldAlert,
  Navigation,
  Gauge,
  Clock,
  Compass,
} from 'lucide-react-native';

export default function CorridorGridScreen() {
  const router = useRouter();
  const { currentTrip, acknowledgedCount, setAcknowledgedCount, fetchActiveTrip } = useTripStore();
  const [currentTab, setCurrentTab] = useState('corridor');

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

  const officersAlongRoute = [
    {
      name: 'Officer Vikramaditya (Post 1)',
      location: 'Ring Road AIIMS Flyover',
      distance: '1.2 km ahead',
      acked: acknowledgedCount >= 1,
      lat: 28.5672,
      lng: 77.2100,
    },
    {
      name: 'Officer Neha Sharma (Post 2)',
      location: 'Safdarjung South Junction',
      distance: '3.4 km ahead',
      acked: acknowledgedCount >= 2,
      lat: 28.5600,
      lng: 77.2350,
    },
    {
      name: 'Officer Rajesh Verma (Post 3)',
      location: 'Lajpat Nagar Intersection',
      distance: '5.8 km ahead',
      acked: acknowledgedCount >= 3,
      lat: 28.5450,
      lng: 77.2700,
    },
  ];

  return (
    <FogBackground>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.tag}>CORRIDOR TOPOLOGY</Text>
            <EditorialHeadline
              plainText="Live Emergency"
              italicText="Corridor Grid"
              size="display-lg"
            />
          </View>

          {/* Real-looking Interactive Leaflet Map */}
          <View style={styles.mapContainer}>
            <CorridorMap
              ambulanceLat={currentTrip?.currentLat || 28.5450}
              ambulanceLng={currentTrip?.currentLng || 77.2700}
              routeCoordinates={currentTrip?.route?.coordinates || []}
              officers={officersAlongRoute.map((o) => ({
                lat: o.lat,
                lng: o.lng,
                name: o.name,
                acked: o.acked,
              }))}
              height={300}
            />
          </View>

          {/* Telemetry Metrics Glass Row */}
          <View style={styles.telemetryRow}>
            <GlassView radius="md" elevation="1" style={styles.telemetryCard}>
              <Gauge size={18} color="#1F3A2A" />
              <Text style={styles.telemetryVal}>
                {Math.round((currentTrip?.currentSpeed || 16) * 3.6)} km/h
              </Text>
              <Text style={styles.telemetryLabel}>Velocity</Text>
            </GlassView>

            <GlassView radius="md" elevation="1" style={styles.telemetryCard}>
              <Clock size={18} color="#3E6B4B" />
              <Text style={styles.telemetryVal}>~4 min</Text>
              <Text style={styles.telemetryLabel}>Alert Horizon</Text>
            </GlassView>

            <GlassView radius="md" elevation="1" style={styles.telemetryCard}>
              <Navigation size={18} color="#6F9A78" />
              <Text style={styles.telemetryVal}>
                {acknowledgedCount} Ready
              </Text>
              <Text style={styles.telemetryLabel}>Cleared Posts</Text>
            </GlassView>
          </View>

          {/* Active Officers Roster along the route */}
          <View style={styles.officersSection}>
            <Text style={styles.sectionTitle}>Police Stationed on Road Ahead</Text>
            {officersAlongRoute.map((off) => (
              <GlassView
                key={off.name}
                radius="lg"
                elevation="1"
                style={styles.officerCard}
              >
                <View style={styles.officerLeft}>
                  <View
                    style={[
                      styles.iconCircle,
                      off.acked ? styles.iconCircleGreen : styles.iconCircleAmber,
                    ]}
                  >
                    {off.acked ? (
                      <ShieldCheck size={18} color="#FFFFFF" />
                    ) : (
                      <ShieldAlert size={18} color="#FFFFFF" />
                    )}
                  </View>
                  <View style={styles.officerDetails}>
                    <Text style={styles.officerName}>{off.name}</Text>
                    <Text style={styles.officerLoc}>{off.location}</Text>
                    <Text style={styles.officerDist}>{off.distance}</Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.statusPill,
                    off.acked ? styles.statusPillGreen : styles.statusPillAmber,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      off.acked ? styles.statusTextGreen : styles.statusTextAmber,
                    ]}
                  >
                    {off.acked ? 'Path Cleared' : 'Broadcasting'}
                  </Text>
                </View>
              </GlassView>
            ))}
          </View>

          {/* If an active trip exists, offer quick jump to active driver view */}
          {currentTrip && (
            <View style={styles.ctaBox}>
              <PillButton
                label="Open In-Cabin Telemetry Screen"
                onPress={() => router.push('/driver/active')}
              />
            </View>
          )}
        </ScrollView>

        {/* Floating Nav */}
        <FloatingNav
          currentTab={currentTab}
          onTabChange={(tab) => {
            setCurrentTab(tab);
            if (tab === 'home') router.push('/home');
            if (tab === 'trips') router.push('/trips');
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
    marginBottom: 14,
  },
  tag: {
    fontSize: 11,
    fontWeight: '700',
    color: '#3E6B4B',
    letterSpacing: 1,
    marginBottom: 4,
  },
  mapContainer: {
    marginBottom: 16,
  },
  telemetryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  telemetryCard: {
    flex: 1,
    padding: 14,
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
  },
  telemetryVal: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111312',
  },
  telemetryLabel: {
    fontSize: 10,
    color: '#5E6661',
  },
  officersSection: {
    gap: 10,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2B2F2D',
    marginBottom: 4,
  },
  officerCard: {
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
  officerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleGreen: {
    backgroundColor: '#4C9A6A',
  },
  iconCircleAmber: {
    backgroundColor: '#E3A93B',
  },
  officerDetails: {
    gap: 2,
  },
  officerName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111312',
  },
  officerLoc: {
    fontSize: 11,
    color: '#5E6661',
  },
  officerDist: {
    fontSize: 11,
    color: '#3E6B4B',
    fontWeight: '500',
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  statusPillGreen: {
    backgroundColor: 'rgba(76, 154, 106, 0.15)',
  },
  statusPillAmber: {
    backgroundColor: 'rgba(227, 169, 59, 0.15)',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusTextGreen: {
    color: '#4C9A6A',
  },
  statusTextAmber: {
    color: '#E3A93B',
  },
  ctaBox: {
    marginBottom: 10,
  },
});
