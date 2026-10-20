import { create } from 'zustand';
import { api } from '../lib/api';

export interface TripState {
  currentTrip: any | null;
  acknowledgedCount: number;
  isLoading: boolean;
  error: string | null;
  createTrip: (pickup: any, drop: any, vehicleNumber?: string) => Promise<any>;
  fetchActiveTrip: () => Promise<void>;
  endTrip: (tripId: string) => Promise<void>;
  cancelTrip: (tripId: string) => Promise<void>;
  setAcknowledgedCount: (count: number) => void;
  resetTrip: () => void;
}

export const useTripStore = create<TripState>((set, get) => ({
  currentTrip: null,
  acknowledgedCount: 0,
  isLoading: false,
  error: null,

  createTrip: async (pickup, drop, vehicleNumber) => {
    set({ isLoading: true, error: null });
    try {
      const data = await api.createTrip(pickup, drop, vehicleNumber);
      set({ currentTrip: data.trip, acknowledgedCount: 0, isLoading: false });
      return data.trip;
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  fetchActiveTrip: async () => {
    try {
      const trip = await api.getActiveTrip();
      const ackCount = trip.alerts?.filter((a: any) => a.status === 'ACKNOWLEDGED').length || 0;
      set({ currentTrip: trip, acknowledgedCount: ackCount });
    } catch {
      set({ currentTrip: null, acknowledgedCount: 0 });
    }
  },

  endTrip: async (tripId: string) => {
    set({ isLoading: true });
    try {
      await api.endTrip(tripId);
      set({ currentTrip: null, acknowledgedCount: 0, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  cancelTrip: async (tripId: string) => {
    set({ isLoading: true });
    try {
      await api.cancelTrip(tripId);
      set({ currentTrip: null, acknowledgedCount: 0, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  setAcknowledgedCount: (count: number) => set({ acknowledgedCount: count }),
  resetTrip: () => set({ currentTrip: null, acknowledgedCount: 0, error: null }),
}));
