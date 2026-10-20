export interface RouteResult {
  geoJson: {
    type: 'LineString';
    coordinates: [number, number][]; // [lng, lat]
  };
  distanceMeters: number;
  durationSeconds: number;
}

export class RoutingService {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || process.env.OSRM_BASE_URL || 'https://router.project-osrm.org';
  }

  /**
   * Calculates route between pickup [lat, lng] and drop [lat, lng]
   */
  async getRoute(
    pickup: { lat: number; lng: number },
    drop: { lat: number; lng: number }
  ): Promise<RouteResult> {
    try {
      // OSRM expects {lon},{lat};{lon},{lat}
      const coordinatesString = `${pickup.lng},${pickup.lat};${drop.lng},${drop.lat}`;
      const url = `${this.baseUrl}/route/v1/driving/${coordinatesString}?overview=full&geometries=geojson`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = (await response.json()) as any;
        if (data.routes && data.routes.length > 0) {
          const primary = data.routes[0];
          return {
            geoJson: primary.geometry,
            distanceMeters: primary.distance,
            durationSeconds: primary.duration,
          };
        }
      }
    } catch (err) {
      console.warn('OSRM route fetch failed, using fallback route interpolation:', err);
    }

    // Fallback: Interpolate 10 points between pickup and drop
    const coords: [number, number][] = [];
    const steps = 10;
    for (let i = 0; i <= steps; i++) {
      const ratio = i / steps;
      const lng = pickup.lng + (drop.lng - pickup.lng) * ratio;
      const lat = pickup.lat + (drop.lat - pickup.lat) * ratio;
      coords.push([lng, lat]);
    }

    return {
      geoJson: {
        type: 'LineString',
        coordinates: coords,
      },
      distanceMeters: 5000,
      durationSeconds: 600,
    };
  }
}

export const routingService = new RoutingService();
