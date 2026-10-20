import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
} from 'react-native';
import { Siren, CheckCircle, Navigation } from 'lucide-react-native';
import { EmergencyAlertPayload } from '@raahat/shared';

export interface OfficerAlertModalProps {
  visible: boolean;
  alert: EmergencyAlertPayload | null;
  onAcknowledge: () => void;
  isAcknowledging?: boolean;
}

export const OfficerAlertModal: React.FC<OfficerAlertModalProps> = ({
  visible,
  alert,
  onAcknowledge,
  isAcknowledging = false,
}) => {
  const [remainingSec, setRemainingSec] = useState<number>(0);
  const [isAcked, setIsAcked] = useState<boolean>(false);
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (alert) {
      setRemainingSec(alert.etaSec);
      setIsAcked(false);
    }
  }, [alert]);

  // Countdown timer
  useEffect(() => {
    if (!visible || remainingSec <= 0) return;
    const interval = setInterval(() => {
      setRemainingSec((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [visible, remainingSec]);

  // Pulse animation for siren badge
  useEffect(() => {
    if (visible && !isAcked) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [visible, isAcked]);

  if (!alert) return null;

  const mins = Math.floor(remainingSec / 60);
  const secs = remainingSec % 60;
  const timeFormatted = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

  const handleAck = () => {
    setIsAcked(true);
    onAcknowledge();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Animated.View
            style={[
              styles.sirenBadge,
              { transform: [{ scale: pulseAnim }] },
              isAcked && styles.sirenBadgeAcked,
            ]}
          >
            {isAcked ? (
              <CheckCircle size={44} color="#FFFFFF" />
            ) : (
              <Siren size={44} color="#FFFFFF" />
            )}
          </Animated.View>
          <Text style={styles.emergencyTag}>
            {isAcked ? 'CORRIDOR ACKNOWLEDGED' : 'EMERGENCY CORRIDOR ALERT'}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.etaLabel}>ESTIMATED ARRIVAL IN</Text>
          <Text style={styles.etaTime}>{timeFormatted}</Text>

          <View style={styles.infoRow}>
            <Navigation size={18} color="#A9C4AE" />
            <Text style={styles.distanceText}>
              {alert.distanceAheadM} meters away
            </Text>
          </View>

          <View style={styles.vehiclePill}>
            <Text style={styles.vehicleText}>
              Vehicle: {alert.vehicleNumber || 'Emergency Ambulance'}
            </Text>
          </View>

          <Text style={styles.instruction}>
            {isAcked
              ? 'Thank you! Keep junction clear until ambulance passes.'
              : 'Clear lane immediately. Traffic signal manual override or manual clearance required.'}
          </Text>
        </View>

        <View style={styles.footer}>
          {!isAcked ? (
            <Pressable
              onPress={handleAck}
              disabled={isAcknowledging}
              style={styles.ackButton}
            >
              <Text style={styles.ackButtonText}>
                {isAcknowledging ? 'ACKNOWLEDGING...' : 'ACKNOWLEDGE & CLEAR'}
              </Text>
            </Pressable>
          ) : (
            <View style={styles.acknowledgedBox}>
              <CheckCircle size={20} color="#4C9A6A" />
              <Text style={styles.acknowledgedText}>
                Driver & Central Control Notified
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111312', // ink-900
    justifyContent: 'space-between',
    padding: 24,
    paddingTop: 64,
  },
  header: {
    alignItems: 'center',
  },
  sirenBadge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#C8503F', // semantic error/emergency red
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#C8503F',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
  sirenBadgeAcked: {
    backgroundColor: '#4C9A6A', // semantic success green
  },
  emergencyTag: {
    marginTop: 20,
    fontSize: 16,
    fontWeight: '700',
    color: '#EEF3F0',
    letterSpacing: 1.5,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 28,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  etaLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#A9C4AE',
    letterSpacing: 1,
    marginBottom: 8,
  },
  etaTime: {
    fontSize: 64,
    fontWeight: '300',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
    letterSpacing: -1,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  distanceText: {
    fontSize: 16,
    color: '#EEF3F0',
    fontWeight: '500',
  },
  vehiclePill: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 9999,
    marginTop: 16,
  },
  vehicleText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  instruction: {
    marginTop: 20,
    textAlign: 'center',
    color: '#B8C7BE',
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    marginBottom: 20,
  },
  ackButton: {
    height: 64,
    borderRadius: 9999,
    backgroundColor: '#4C9A6A',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4C9A6A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  ackButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  acknowledgedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 9999,
    backgroundColor: 'rgba(76, 154, 106, 0.2)',
    borderWidth: 1,
    borderColor: '#4C9A6A',
    gap: 10,
  },
  acknowledgedText: {
    color: '#4C9A6A',
    fontSize: 15,
    fontWeight: '600',
  },
});
