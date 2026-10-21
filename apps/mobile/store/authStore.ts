import { create } from 'zustand';
import { api } from '../lib/api';
import { socketManager } from '../lib/socket';
import { registerForPushNotificationsAsync, unregisterPushNotificationsAsync } from '../lib/notifications';

import { useOfficerStore } from './officerStore';
import { useTripStore } from './tripStore';

function resetRoleState() {
  useOfficerStore.setState({ onDuty: false, locationRecordedAt: null, activeAlert: null, isAcknowledging: false });
  useTripStore.getState().resetTrip();
}

export interface User {
  id: string;
  phone: string;
  name: string;
  role: 'DRIVER' | 'OFFICER' | 'ADMIN';
  verified: boolean;
  verificationStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  badgeNumber?: string;
  vehicleNumber?: string;
  onDuty?: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  login: (phone: string, pass: string) => Promise<User>;
  register: (data: any) => Promise<void>;
  logout: () => void;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: false,
  error: null,

  login: async (phone, password) => {
    set({ isLoading: true, error: null });
    try {
      const data = await api.login(phone, password);
      resetRoleState();
      set({ user: data.user, token: data.token, isLoading: false });
      socketManager.connect(data.token);
      registerForPushNotificationsAsync().catch(() => {});
      return data.user;
    } catch (err: any) {
      set({ error: err.message || 'Login failed', isLoading: false });
      throw err;
    }
  },

  register: async (formData) => {
    set({ isLoading: true, error: null });
    try {
      const data = await api.register(formData);
      resetRoleState();
      set({ user: data.user, token: data.token, isLoading: false });
      socketManager.connect(data.token);
      registerForPushNotificationsAsync().catch(() => {});
    } catch (err: any) {
      set({ error: err.message || 'Registration failed', isLoading: false });
      throw err;
    }
  },

  logout: () => {
    unregisterPushNotificationsAsync().catch(() => {});
    resetRoleState();
    api.setToken(null);
    socketManager.disconnect();
    set({ user: null, token: null, error: null });
  },

  setUser: (user) => set({ user }),
}));
