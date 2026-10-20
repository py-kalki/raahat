import * as Location from 'expo-location';

export interface UserLocation {
  lat: number;
  lng: number;
  accuracy?: number | null;
  address?: string;
}

export async function requestAndGetCurrentLocation(): Promise<UserLocation> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.warn('Location permission denied, using default base location');
      return {
        lat: 28.5355,
        lng: 77.2882,
        accuracy: null,
        address: 'Current Location (Permission Denied)',
      };
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const userLoc: UserLocation = {
      lat: location.coords.latitude,
      lng: location.coords.longitude,
      accuracy: location.coords.accuracy,
    };

    try {
      const [geocode] = await Location.reverseGeocodeAsync({
        latitude: userLoc.lat,
        longitude: userLoc.lng,
      });

      if (geocode) {
        const parts = [geocode.name, geocode.street, geocode.city, geocode.region].filter(Boolean);
        userLoc.address = parts.join(', ') || `${userLoc.lat.toFixed(4)}, ${userLoc.lng.toFixed(4)}`;
      }
    } catch {
      userLoc.address = `GPS Fix (${userLoc.lat.toFixed(4)}, ${userLoc.lng.toFixed(4)})`;
    }

    return userLoc;
  } catch (error) {
    console.error('Error fetching GPS location:', error);
    return {
      lat: 28.5355,
      lng: 77.2882,
      accuracy: null,
      address: 'Central Emergency Base',
    };
  }
}
