async function fetchHospitalData(url: string, options: RequestInit) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return { ok: response.ok, data: response.ok ? await response.json() : [] };
  } finally { clearTimeout(timer); }
}

export interface Hospital {
  id?: string;
  name: string;
  lat: number;
  lng: number;
  distanceKm: number;
  distance: string;
  eta: string;
  address: string;
  emergencyPhone?: string;
}

// Fallback apex trauma centers with known emergency baselines
const APEX_TRAUMA_REGISTRY = [
  {
    name: 'AIIMS Apex Trauma Center',
    lat: 28.5672,
    lng: 77.2100,
    address: 'Ring Road, Safdarjung Enclave',
    emergencyPhone: '011-26593677',
  },
  {
    name: 'Safdarjung Emergency Hospital',
    lat: 28.5710,
    lng: 77.2075,
    address: 'Ansari Nagar West',
    emergencyPhone: '011-26165060',
  },
  {
    name: 'Indraprastha Apollo Emergency',
    lat: 28.5355,
    lng: 77.2882,
    address: 'Sarita Vihar, Delhi Mathura Road',
    emergencyPhone: '011-26925858',
  },
  {
    name: 'Fortis Escorts Heart Institute',
    lat: 28.5601,
    lng: 77.2764,
    address: 'Okhla Road, New Friends Colony',
    emergencyPhone: '011-47135000',
  },
  {
    name: 'Max Super Speciality Hospital',
    lat: 28.5283,
    lng: 77.2115,
    address: 'Saket Institutional Area',
    emergencyPhone: '011-26515050',
  },
];

/**
 * Calculates Great-Circle (Haversine) distance between two GPS coordinates in kilometers
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return 6371 * c;
}

/**
 * Automatically discovers nearest real hospitals around user's GPS coordinates
 * using OpenStreetMap POI search, with real distance and ETA calculations.
 */
export async function getNearestHospitals(
  userLat: number,
  userLng: number
): Promise<Hospital[]> {
  try {
    const delta = 0.25; // ~25km search window
    const url = `https://nominatim.openstreetmap.org/search?format=json&amenity=hospital&limit=20&viewbox=${userLng - delta},${userLat + delta},${userLng + delta},${userLat - delta}&bounded=1&addressdetails=1`;

    const response = await fetchHospitalData(url, {
      headers: {
        'User-Agent': 'Raahat-Emergency-Corridor/1.0 (Emergency Ambulance System)',
        Accept: 'application/json',
      },
    });

    if (response.ok) {
      const data = response.data;
      if (Array.isArray(data) && data.length > 0) {
        const liveHospitals: Hospital[] = data
          .filter((item: any) => {
            const isAmenity = item.class === 'amenity' || item.type === 'hospital';
            const isNotBusStop = item.type !== 'bus_stop' && item.class !== 'highway';
            return isAmenity && isNotBusStop;
          })
          .map((item: any, idx: number) => {
            const hLat = parseFloat(item.lat);
            const hLng = parseFloat(item.lon);
            const parts = (item.display_name || '').split(',');
            const rawName = item.name || parts[0]?.trim() || 'Emergency Hospital';
            
            // Clean up name if it's just 'Hospital'
            let name = rawName;
            if (rawName.toLowerCase() === 'hospital') {
              const roadOrSuburb = item.address?.road || item.address?.suburb || parts[1]?.trim() || 'City';
              name = `${roadOrSuburb} Hospital`;
            }

            const suburb = item.address?.suburb || item.address?.city_district || parts[1]?.trim() || '';
            const city = item.address?.city || item.address?.town || parts[2]?.trim() || '';
            const address = [suburb, city].filter(Boolean).join(', ') || parts.slice(1, 3).join(', ').trim() || 'Nearby Medical Center';

            const distKm = calculateHaversineDistanceKm(userLat, userLng, hLat, hLng);
            const etaMin = Math.max(2, Math.round((distKm / 45) * 60)); // ~45 km/h emergency corridor speed

            return {
              id: `live-hosp-${idx}-${item.place_id || idx}`,
              name,
              lat: hLat,
              lng: hLng,
              distanceKm: Number(distKm.toFixed(1)),
              distance: `${distKm.toFixed(1)} km`,
              eta: `${etaMin} mins`,
              address,
              emergencyPhone: '108 (Trauma Helpline)',
            };
          })
          .filter((h) => h.distanceKm > 0.05 && h.distanceKm <= 50)
          .sort((a, b) => a.distanceKm - b.distanceKm);

        if (liveHospitals.length > 0) {
          return liveHospitals.slice(0, 8);
        }
      }
    }
  } catch (error) {
    console.warn('[Hospitals] Dynamic search fallback to apex trauma registry:', error);
  }

  // Dynamic calculation for known apex trauma centers from user's live position
  return APEX_TRAUMA_REGISTRY.map((h, idx) => {
    const distKm = calculateHaversineDistanceKm(userLat, userLng, h.lat, h.lng);
    const etaMin = Math.max(2, Math.round((distKm / 45) * 60));
    return {
      id: `apex-hosp-${idx}`,
      name: h.name,
      lat: h.lat,
      lng: h.lng,
      distanceKm: Number(distKm.toFixed(1)),
      distance: `${distKm.toFixed(1)} km`,
      eta: `${etaMin} mins`,
      address: h.address,
      emergencyPhone: h.emergencyPhone,
    };
  }).sort((a, b) => a.distanceKm - b.distanceKm);
}

/**
 * Searches for a hospital by text query near user coordinates
 */
export async function searchHospitals(
  query: string,
  userLat?: number,
  userLng?: number
): Promise<Hospital[]> {
  if (!query || query.trim().length < 2) return [];

  try {
    let url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ' hospital')}&limit=8&addressdetails=1`;
    if (userLat !== undefined && userLng !== undefined) {
      const delta = 0.5;
      url += `&viewbox=${userLng - delta},${userLat + delta},${userLng + delta},${userLat - delta}`;
    }

    const response = await fetchHospitalData(url, {
      headers: {
        'User-Agent': 'Raahat-Emergency-Corridor/1.0',
        Accept: 'application/json',
      },
    });

    if (response.ok) {
      const data = response.data;
      return (data || [])
        .map((item: any, idx: number) => {
          const hLat = parseFloat(item.lat);
          const hLng = parseFloat(item.lon);
          const parts = (item.display_name || '').split(',');
          const name = item.name || parts[0]?.trim() || query;
          const address = parts.slice(1, 3).join(', ').trim() || 'Medical Facility';

          let distKm = 0;
          let distStr = '--';
          let etaStr = '--';

          if (userLat !== undefined && userLng !== undefined) {
            distKm = calculateHaversineDistanceKm(userLat, userLng, hLat, hLng);
            distStr = `${distKm.toFixed(1)} km`;
            etaStr = `${Math.max(2, Math.round((distKm / 45) * 60))} mins`;
          }

          return {
            id: `search-hosp-${idx}`,
            name,
            lat: hLat,
            lng: hLng,
            distanceKm: Number(distKm.toFixed(1)),
            distance: distStr,
            eta: etaStr,
            address,
          };
        })
        .sort((a: Hospital, b: Hospital) => a.distanceKm - b.distanceKm);
    }
  } catch (err) {
    console.warn('Hospital search failed:', err);
  }
  return [];
}
