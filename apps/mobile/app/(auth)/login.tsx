import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FogBackground } from '../../components/ui/FogBackground';
import { GlassView } from '../../components/ui/GlassView';
import { EditorialHeadline } from '../../components/ui/EditorialHeadline';
import { PillButton } from '../../components/ui/PillButton';
import { CategoryChip } from '../../components/ui/CategoryChip';
import { useAuthStore } from '../../store/authStore';
import { Phone, Lock, ShieldCheck } from 'lucide-react-native';

export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoading, error } = useAuthStore();

  const [role, setRole] = useState<'DRIVER' | 'OFFICER' | 'ADMIN'>('DRIVER');
  const [phone, setPhone] = useState('9888888888');
  const [password, setPassword] = useState('password123');

  const selectDemoRole = (r: 'DRIVER' | 'OFFICER' | 'ADMIN') => {
    setRole(r);
    if (r === 'DRIVER') {
      setPhone('9888888888');
    } else if (r === 'OFFICER') {
      setPhone('9777777701');
    } else {
      setPhone('9999999999');
    }
  };

  const handleLogin = async () => {
    try {
      const user = await login(phone, password);
      if (user.role === 'DRIVER') {
        router.replace('/home');
      } else if (user.role === 'OFFICER') {
        router.replace('/officer');
      } else if (user.role === 'ADMIN') {
        router.replace('/admin/map');
      }
    } catch (err: any) {
      Alert.alert('Login Failed', err.message || 'Check your credentials');
    }
  };

  return (
    <FogBackground>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardContainer}
        >
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* Top Greeting */}
            <View style={styles.header}>
              <Text style={styles.subGreeting}>Raahat Security Gateway</Text>
              <EditorialHeadline
                plainText="Welcome to"
                italicText="Emergency Corridor."
                size="display-lg"
              />
            </View>

            {/* Role Switcher Chips */}
            <View style={styles.roleContainer}>
              <Text style={styles.sectionLabel}>Select Your Role</Text>
              <View style={styles.chipRow}>
                <CategoryChip
                  label="Ambulance Driver"
                  selected={role === 'DRIVER'}
                  onPress={() => selectDemoRole('DRIVER')}
                />
                <CategoryChip
                  label="Traffic Officer"
                  selected={role === 'OFFICER'}
                  onPress={() => selectDemoRole('OFFICER')}
                />
                <CategoryChip
                  label="Central Admin"
                  selected={role === 'ADMIN'}
                  onPress={() => selectDemoRole('ADMIN')}
                />
              </View>
            </View>

            {/* Glass Input Card */}
            <GlassView radius="lg" elevation="2" style={styles.glassCard}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone Number</Text>
                <View style={styles.inputBox}>
                  <Phone size={18} color="#5E6661" />
                  <TextInput
                    style={styles.input}
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    placeholder="Enter 10-digit number"
                    placeholderTextColor="#B8C7BE"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Password</Text>
                <View style={styles.inputBox}>
                  <Lock size={18} color="#5E6661" />
                  <TextInput
                    style={styles.input}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    placeholder="Enter password"
                    placeholderTextColor="#B8C7BE"
                  />
                </View>
              </View>

              <View style={styles.securityNote}>
                <ShieldCheck size={14} color="#6F9A78" />
                <Text style={styles.securityNoteText}>
                  Protected by end-to-end corridor telemetry
                </Text>
              </View>
            </GlassView>

            {/* Error banner */}
            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Primary Action Button */}
            <View style={styles.ctaWrapper}>
              <PillButton
                label="Sign In to Raahat"
                loading={isLoading}
                onPress={handleLogin}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </FogBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  header: {
    marginTop: 12,
    marginBottom: 20,
  },
  subGreeting: {
    fontSize: 12,
    color: '#5E6661',
    fontWeight: '500',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  roleContainer: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 13,
    color: '#5E6661',
    fontWeight: '500',
    marginBottom: 10,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  glassCard: {
    padding: 20,
    gap: 16,
    marginBottom: 20,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#2B2F2D',
  },
  inputBox: {
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.85)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#111312',
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  securityNoteText: {
    fontSize: 11,
    color: '#5E6661',
  },
  errorBox: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(200, 80, 63, 0.1)',
    marginBottom: 16,
  },
  errorText: {
    color: '#C8503F',
    fontSize: 13,
    textAlign: 'center',
  },
  ctaWrapper: {
    marginTop: 10,
    marginBottom: 16,
  },
});
