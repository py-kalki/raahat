import React, { useMemo } from 'react';
import { View, StyleSheet, Platform, Dimensions } from 'react-native';

export interface CorridorMapProps {
  ambulanceLat?: number;
  ambulanceLng?: number;
  routeCoordinates?: [number, number][]; // [lng, lat]
  officers?: Array<{ lat: number; lng: number; name?: string; acked?: boolean }>;
  height?: number;
}

export const CorridorMap: React.FC<CorridorMapProps> = ({
  ambulanceLat = 28.5672,
  ambulanceLng = 77.2100,
  routeCoordinates = [],
  officers = [],
  height = 280,
}) => {
  // Center map on ambulance or fallback
  const centerLat = ambulanceLat;
  const centerLng = ambulanceLng;

  // Build route polyline string for Leaflet: [[lat, lng], [lat, lng], ...]
  const polylineLatLngs = useMemo(() => {
    if (routeCoordinates && routeCoordinates.length > 0) {
      return routeCoordinates.map(([lng, lat]) => [lat, lng]);
    }
    // Default Delhi corridor polyline if not provided
    return [
      [28.5355, 77.2882],
      [28.5420, 77.2750],
      [28.5510, 77.2550],
      [28.5600, 77.2350],
      [28.5672, 77.2100],
    ];
  }, [routeCoordinates]);

  // Leaflet HTML template with CartoDB Positron (high-res muted real road map)
  const mapHtml = useMemo(() => {
    const polylineJson = JSON.stringify(polylineLatLngs);
    const officersJson = JSON.stringify(
      officers.length > 0
        ? officers
        : [
            { lat: 28.5450, lng: 77.2700, name: 'Ring Road Post 1', acked: true },
            { lat: 28.5550, lng: 77.2450, name: 'Junction 2 (Flyover)', acked: false },
          ]
    );

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <style>
          html, body, #map { height: 100%; width: 100%; margin: 0; padding: 0; background: #e5ede8; }
          .ambulance-pulse {
            width: 22px;
            height: 22px;
            border-radius: 50%;
            background: #C8503F;
            border: 3px solid #FFFFFF;
            box-shadow: 0 0 0 6px rgba(200, 80, 63, 0.4);
            animation: pulse 1.4s infinite;
          }
          @keyframes pulse {
            0% { box-shadow: 0 0 0 0 rgba(200, 80, 63, 0.7); }
            70% { box-shadow: 0 0 0 14px rgba(200, 80, 63, 0); }
            100% { box-shadow: 0 0 0 0 rgba(200, 80, 63, 0); }
          }
          .police-pin {
            width: 14px;
            height: 14px;
            border-radius: 50%;
            background: #4C9A6A;
            border: 2px solid #FFFFFF;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          }
          .police-pin.pending {
            background: #E3A93B;
          }
          .hospital-pin {
            width: 18px;
            height: 18px;
            border-radius: 4px;
            background: #111312;
            color: #FFFFFF;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 11px;
            font-weight: bold;
            border: 2px solid #FFFFFF;
          }
          .leaflet-control-attribution { display: none !important; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <script>
          const map = L.map('map', {
            zoomControl: false,
            attributionControl: false
          }).setView([${centerLat}, ${centerLng}], 13);

          // 100% free, clean OpenStreetMap tiles (No API key, No watermark)
          L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19
          }).addTo(map);

          // Route polyline
          const polylineCoords = ${polylineJson};
          const polyline = L.polyline(polylineCoords, {
            color: '#1F3A2A',
            weight: 5,
            opacity: 0.85,
            lineJoin: 'round'
          }).addTo(map);

          // Fit bounds
          if (polylineCoords.length > 0) {
            map.fitBounds(polyline.getBounds(), { padding: [30, 30] });
          }

          // Ambulance Marker
          const ambIcon = L.divIcon({
            className: 'ambulance-icon-container',
            html: '<div class="ambulance-pulse"></div>',
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          });
          L.marker([${centerLat}, ${centerLng}], { icon: ambIcon }).addTo(map);

          // Police Officers
          const officers = ${officersJson};
          officers.forEach(off => {
            const isAcked = off.acked !== false;
            const icon = L.divIcon({
              className: 'officer-marker',
              html: '<div class="police-pin ' + (isAcked ? '' : 'pending') + '" title="' + (off.name || 'Officer') + '"></div>',
              iconSize: [16, 16],
              iconAnchor: [8, 8]
            });
            L.marker([off.lat, off.lng], { icon: icon }).addTo(map);
          });
        </script>
      </body>
      </html>
    `;
  }, [centerLat, centerLng, polylineLatLngs, officers]);

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.container, { height }]}>
        <iframe
          srcDoc={mapHtml}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            borderRadius: 20,
          }}
          title="Raahat Emergency Corridor Map"
        />
      </View>
    );
  }

  // Fallback for native view if webview not available
  return (
    <View style={[styles.container, { height }]}>
      <View style={styles.nativeMockMap}>
        <View style={styles.roadLine} />
        <View style={styles.mockAmbulance} />
        <View style={[styles.mockOfficer, { top: '30%', left: '48%' }]} />
        <View style={[styles.mockOfficer, { top: '65%', left: '52%' }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#DCE6E0',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.7)',
  },
  nativeMockMap: {
    flex: 1,
    backgroundColor: '#E3ECE6',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  roadLine: {
    width: 8,
    height: '90%',
    backgroundColor: '#1F3A2A',
    borderRadius: 4,
  },
  mockAmbulance: {
    position: 'absolute',
    top: '20%',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#C8503F',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  mockOfficer: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#4C9A6A',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});
