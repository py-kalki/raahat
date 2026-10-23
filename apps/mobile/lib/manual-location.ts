import type { UserLocation } from './location';

export function parseManualLocation(latitude: string, longitude: string): UserLocation {
  if (!latitude.trim() || !longitude.trim()) throw new Error('Enter both latitude and longitude.');
  const lat = Number(latitude), lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180)
    throw new Error('Latitude must be between -90 and 90; longitude between -180 and 180.');
  return { lat, lng, accuracy: null, address: `Manually confirmed (${lat.toFixed(5)}, ${lng.toFixed(5)})` };
}
