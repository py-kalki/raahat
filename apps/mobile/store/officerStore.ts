import { create } from 'zustand';
import { api } from '../lib/api';
import { EmergencyAlertPayload } from '@raahat/shared';

export interface OfficerState {
  onDuty: boolean;
  locationRecordedAt: string | null;
  activeAlert: EmergencyAlertPayload | null;
  isAcknowledging: boolean;
  setOnDuty: (onDuty: boolean) => Promise<void>;
  setActiveAlert: (alert: EmergencyAlertPayload | null) => void;
  acknowledgeActiveAlert: () => Promise<void>;
}

export const useOfficerStore = create<OfficerState>((set, get) => ({
  onDuty: false,
  locationRecordedAt: null,
  activeAlert: null,
  isAcknowledging: false,

  setOnDuty: async (onDuty: boolean) => {
    try {
      await api.setDutyStatus(onDuty);
      set(onDuty ? { onDuty } : { onDuty, locationRecordedAt: null });
    } catch (err) {
      console.error('Failed to toggle duty:', err);
      throw err;
    }
  },

  setActiveAlert: (alert) => set({ activeAlert: alert }),

  acknowledgeActiveAlert: async () => {
    const alert = get().activeAlert;
    if (!alert) return;
    if (alert.alertId.startsWith('demo-')) return;

    set({ isAcknowledging: true });
    try {
      await api.acknowledgeAlert(alert.alertId);
      // Keep alert visible but marked acknowledged or clear countdown
      set({ isAcknowledging: false });
    } catch (err) {
      set({ isAcknowledging: false });
      throw err;
    }
  },
}));
