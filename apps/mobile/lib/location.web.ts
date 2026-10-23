import type { UserLocation } from './location';
import { getBrowserPosition } from './browser-location';
export type { UserLocation } from './location';

export async function requestAndGetCurrentLocation(options?: { preview?: boolean }): Promise<UserLocation> {
    if (!window.isSecureContext || !navigator.geolocation) {
      throw new Error('Location requires HTTPS (or localhost). Open the HTTPS app address in Android Chrome, not a phone connection to an HTTP LAN address.');
    }
    const { coords } = await getBrowserPosition(navigator.geolocation, options?.preview ? 8000 : 12000, options?.preview ? Infinity : 100);
    return {
        lat: coords.latitude, lng: coords.longitude, accuracy: coords.accuracy,
        address: `Current location (${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)})`,
    };
}
