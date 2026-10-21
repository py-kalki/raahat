import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FogBackground } from '../components/ui/FogBackground';
import { GlassView } from '../components/ui/GlassView';
import { EditorialHeadline } from '../components/ui/EditorialHeadline';
import { FloatingNav } from '../components/ui/FloatingNav';
import { PillButton } from '../components/ui/PillButton';
import { useAuthStore } from '../store/authStore';
import { requestAndGetCurrentLocation, UserLocation } from '../lib/location';
import { socketManager } from '../lib/socket';
import {
  User as UserIcon,
  ShieldCheck,
  Phone,
  Truck,
  Shield,
  Radio,
  LogOut,
  RefreshCw,
  MapPin,
} from 'lucide-react-native';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, login, logout } = useAuthStore();
  const [currentTab, setCurrentTab] = useState('profile');
  const [location, setLocation] = useState<UserLocation | null>(null);

  useEffect(() => {
    (async () => {
      try { const loc = await requestAndGetCurrentLocation(); setLocation(loc); }
      catch { setLocation(null); }
    })();
  }, []);

  const handleSwitchPersona = async (phoneNum: string) => {
    try {
      const newUser = await login(phoneNum, 'password123');
      if (newUser.role === 'ADMIN') {
        router.replace('/admin/map');
      } else if (newUser.role === 'OFFICER') {
        router.replace('/officer');
      } else {
        router.replace('/home');
      }
    } catch (err: any) {
      if (Platform.OS === 'web') {
        window.alert(err.message || 'Failed to switch persona');
      } else {
        Alert.alert('Error', err.message);
      }
    }
  };

  const handleLogout = () => {
    logout();
    router.replace('/');
  };

  return (
    <FogBackground>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.tag}>RESPONDER IDENTITY</Text>
            <EditorialHeadline
              plainText="Unit Profile &"
              italicText="Access Control"
              size="display-lg"
            />
          </View>

          {/* User Profile Glass Card */}
          <GlassView radius="xl" elevation="3" style={styles.profileCard}>
            <View style={styles.avatarRow}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </Text>
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.userName}>{user?.name || 'Emergency Unit'}</Text>
                <View style={styles.roleBadge}>
                  <ShieldCheck size={14} color="#4C9A6A" />
                  <Text style={styles.roleText}>{user?.role || 'DRIVER'} • VERIFIED</Text>
                </View>
              </View>
            </View>

            <View style={styles.detailList}>
              <View style={styles.detailItem}>
                <Phone size={16} color="#5E6661" />
                <Text style={styles.detailLabel}>Official Contact:</Text>
                <Text style={styles.detailValue}>{user?.phone || '9888888888'}</Text>
              </View>

              <View style={styles.detailItem}>
                <Truck size={16} color="#5E6661" />
                <Text style={styles.detailLabel}>Assigned Unit:</Text>
                <Text style={styles.detailValue}>
                  {user?.vehicleNumber || user?.badgeNumber || 'DL-01-AMB-108'}
                </Text>
              </View>

              <View style={styles.detailItem}>
                <MapPin size={16} color="#3E6B4B" />
                <Text style={styles.detailLabel}>GPS Fix:</Text>
                <Text style={styles.detailValue} numberOfLines={1}>
                  {location?.address || 'Acquiring GPS...'}
                </Text>
              </View>
            </View>
          </GlassView>

          {/* Persona / Role Fast Switcher */}
          <View style={styles.switchSection}>
            <Text style={styles.sectionTitle}>Quick Persona Switcher (Testing)</Text>
            <Text style={styles.sectionSub}>
              Switch roles with one tap to test driver and police interactions:
            </Text>

            <Pressable onPress={() => handleSwitchPersona('9888888888')}>
              <GlassView
                radius="lg"
                elevation="1"
                style={[
                  styles.personaCard,
                  user?.role === 'DRIVER' && styles.personaCardActive,
                ]}
              >
                <View style={styles.personaLeft}>
                  <Truck size={18} color="#1F3A2A" />
                  <View>
                    <Text style={styles.personaTitle}>Ramesh Singh (Ambulance Driver)</Text>
                    <Text style={styles.personaSub}>Vehicle DL-01-AMB-108</Text>
                  </View>
                </View>
                <Text style={styles.switchAction}>Switch ➔</Text>
              </GlassView>
            </Pressable>

            <Pressable onPress={() => handleSwitchPersona('9777777701')}>
              <GlassView
                radius="lg"
                elevation="1"
                style={[
                  styles.personaCard,
                  user?.role === 'OFFICER' && styles.personaCardActive,
                ]}
              >
                <View style={styles.personaLeft}>
                  <Shield size={18} color="#3E6B4B" />
                  <View>
                    <Text style={styles.personaTitle}>Officer Vikramaditya (Traffic Police)</Text>
                    <Text style={styles.personaSub}>Badge TP-101 • Ring Road Post</Text>
                  </View>
                </View>
                <Text style={styles.switchAction}>Switch ➔</Text>
              </GlassView>
            </Pressable>

            <Pressable onPress={() => handleSwitchPersona('9999999999')}>
              <GlassView
                radius="lg"
                elevation="1"
                style={[
                  styles.personaCard,
                  user?.role === 'ADMIN' && styles.personaCardActive,
                ]}
              >
                <View style={styles.personaLeft}>
                  <Radio size={18} color="#111312" />
                  <View>
                    <Text style={styles.personaTitle}>Central Control Dispatcher (Admin)</Text>
                    <Text style={styles.personaSub}>Command Grid & Approvals</Text>
                  </View>
                </View>
                <Text style={styles.switchAction}>Switch ➔</Text>
              </GlassView>
            </Pressable>
          </View>

          {/* Logout Button */}
          <View style={styles.logoutWrapper}>
            <Pressable onPress={handleLogout} style={styles.logoutBtn}>
              <LogOut size={18} color="#C8503F" />
              <Text style={styles.logoutText}>Sign Out of Raahat Grid</Text>
            </Pressable>
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
  tag: {
    fontSize: 11,
    fontWeight: '700',
    color: '#3E6B4B',
    letterSpacing: 1,
    marginBottom: 4,
  },
  profileCard: {
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    marginBottom: 20,
    gap: 16,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1F3A2A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
  },
  profileInfo: {
    gap: 4,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111312',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4C9A6A',
  },
  detailList: {
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(220, 230, 224, 0.8)',
    paddingTop: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailLabel: {
    fontSize: 12,
    color: '#5E6661',
  },
  detailValue: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#111312',
  },
  switchSection: {
    gap: 10,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2B2F2D',
  },
  sectionSub: {
    fontSize: 12,
    color: '#5E6661',
    marginBottom: 4,
  },
  personaCard: {
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
  },
  personaCardActive: {
    borderColor: '#4C9A6A',
    borderWidth: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  personaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  personaTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111312',
  },
  personaSub: {
    fontSize: 11,
    color: '#5E6661',
  },
  switchAction: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3E6B4B',
  },
  logoutWrapper: {
    marginTop: 6,
    marginBottom: 20,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 9999,
    backgroundColor: 'rgba(200, 80, 63, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(200, 80, 63, 0.3)',
  },
  logoutText: {
    color: '#C8503F',
    fontSize: 14,
    fontWeight: '600',
  },
});
