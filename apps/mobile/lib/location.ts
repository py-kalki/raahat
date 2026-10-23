import * as Location from 'expo-location';

export interface UserLocation {
  lat: number;
  lng: number;
  accuracy?: number | null;
  address?: string;
}

export async function requestAndGetCurrentLocation(): Promise<UserLocation> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== 'granted') {
    throw new Error('Location permission denied. Allow Precise location in Android Settings → Apps → Raah → Permissions. No new location was saved.');
  }
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const location = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest }),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('GPS timed out. Turn on device Location and retry outdoors. No new location was saved.')), 25000); }),
    ]);
    const { latitude: lat, longitude: lng, accuracy } = location.coords;
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180 ||
      accuracy == null || !Number.isFinite(accuracy) || accuracy < 0 || accuracy > 100 ||
      !Number.isFinite(location.timestamp) || Date.now() - location.timestamp > 30000) {
      throw new Error('GPS is too imprecise. Allow Precise location and retry near a window or outdoors. No new location was saved.');
    }
    return { lat, lng, accuracy, address: `Current location (${lat.toFixed(5)}, ${lng.toFixed(5)})` };
  } finally { if (timer) clearTimeout(timer); }
}
