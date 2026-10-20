import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FogBackground } from '../../components/ui/FogBackground';
import { GlassView } from '../../components/ui/GlassView';
import { EditorialHeadline } from '../../components/ui/EditorialHeadline';
import { api } from '../../lib/api';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Shield,
  Ambulance,
  UserCheck,
} from 'lucide-react-native';

export default function AdminUsersScreen() {
  const router = useRouter();
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      const data = await api.getAdminUsers('PENDING');
      setPendingUsers(data);
    } catch {
      // Demo mock fallback
      setPendingUsers([
        {
          id: 'user-p1',
          name: 'Sunil Rathore',
          phone: '9811122233',
          role: 'DRIVER',
          vehicleNumber: 'DL-01-AMB-999',
          verificationStatus: 'PENDING',
        },
        {
          id: 'user-p2',
          name: 'Constable Devendra Singh',
          phone: '9711122244',
          role: 'OFFICER',
          badgeNumber: 'TP-205',
          verificationStatus: 'PENDING',
        },
      ]);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleVerify = async (userId: string, status: 'APPROVED' | 'REJECTED') => {
    setLoadingId(userId);
    try {
      await api.verifyUser(userId, status);
      Alert.alert('Status Updated', `User has been ${status.toLowerCase()}`);
      setPendingUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update user');
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <FogBackground>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Top navigation */}
          <View style={styles.topRow}>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <ArrowLeft size={20} color="#111312" />
            </Pressable>
            <Text style={styles.screenLabel}>Security Access Control</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Headline */}
          <View style={styles.headlineBox}>
            <EditorialHeadline
              plainText="Review and"
              italicText="Verify Credentials"
              size="display-lg"
            />
          </View>

          {/* Gatekeeper Banner */}
          <GlassView radius="lg" style={styles.gateBanner}>
            <UserCheck size={20} color="#3E6B4B" />
            <Text style={styles.gateText}>
              Unverified drivers cannot broadcast emergency corridors. Unverified officers cannot receive siren alerts.
            </Text>
          </GlassView>

          {/* Pending Users List */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Pending Approvals ({pendingUsers.length})
            </Text>

            {pendingUsers.length === 0 ? (
              <GlassView radius="lg" style={styles.emptyCard}>
                <CheckCircle size={28} color="#4C9A6A" />
                <Text style={styles.emptyTitle}>All Clear</Text>
                <Text style={styles.emptySub}>
                  No pending registrations requiring verification
                </Text>
              </GlassView>
            ) : (
              pendingUsers.map((item) => {
                const isDriver = item.role === 'DRIVER';
                return (
                  <GlassView
                    key={item.id}
                    radius="lg"
                    elevation="2"
                    style={styles.userCard}
                  >
                    <View style={styles.userCardLeft}>
                      <View style={styles.avatarBox}>
                        {isDriver ? (
                          <Ambulance size={20} color="#1F3A2A" />
                        ) : (
                          <Shield size={20} color="#3E6B4B" />
                        )}
                      </View>

                      <View style={styles.userDetails}>
                        <Text style={styles.userName}>{item.name}</Text>
                        <Text style={styles.userPhone}>{item.phone}</Text>
                        <Text style={styles.userBadge}>
                          {isDriver
                            ? `Ambulance: ${item.vehicleNumber || 'Unassigned'}`
                            : `Badge: ${item.badgeNumber || 'N/A'}`}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.actionButtons}>
                      <Pressable
                        onPress={() => handleVerify(item.id, 'APPROVED')}
                        disabled={loadingId === item.id}
                        style={[styles.btn, styles.approveBtn]}
                      >
                        <CheckCircle size={16} color="#FFFFFF" />
                        <Text style={styles.btnText}>Approve</Text>
                      </Pressable>

                      <Pressable
                        onPress={() => handleVerify(item.id, 'REJECTED')}
                        disabled={loadingId === item.id}
                        style={[styles.btn, styles.rejectBtn]}
                      >
                        <XCircle size={16} color="#FFFFFF" />
                        <Text style={styles.btnText}>Reject</Text>
                      </Pressable>
                    </View>
                  </GlassView>
                );
              })
            )}
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
    marginBottom: 14,
  },
  gateBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    backgroundColor: 'rgba(111, 154, 120, 0.18)',
    marginBottom: 20,
  },
  gateText: {
    flex: 1,
    fontSize: 12,
    color: '#1F3A2A',
    lineHeight: 18,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2B2F2D',
  },
  emptyCard: {
    padding: 24,
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111312',
  },
  emptySub: {
    fontSize: 12,
    color: '#5E6661',
  },
  userCard: {
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    gap: 14,
  },
  userCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(111, 154, 120, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userDetails: {
    flex: 1,
    gap: 2,
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111312',
  },
  userPhone: {
    fontSize: 12,
    color: '#5E6661',
  },
  userBadge: {
    fontSize: 11,
    color: '#3E6B4B',
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  btn: {
    flex: 1,
    height: 40,
    borderRadius: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  approveBtn: {
    backgroundColor: '#4C9A6A',
  },
  rejectBtn: {
    backgroundColor: '#C8503F',
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});
