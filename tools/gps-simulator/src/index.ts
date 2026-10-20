import { io } from 'socket.io-client';
import { SOCKET_EVENTS } from '@raahat/shared';

const API_BASE = process.env.API_BASE || 'http://localhost:4000';

async function runSimulator() {
  console.log('--- Raahat GPS Simulator Starting ---');
  console.log(`Connecting to API at: ${API_BASE}`);

  // 1. Login as driver
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone: '9888888888',
      password: 'password123',
    }),
  });

  if (!loginRes.ok) {
    throw new Error(`Driver login failed: ${await loginRes.text()}`);
  }

  const { token } = (await loginRes.json()) as any;
  console.log('Driver authenticated successfully.');

  // 2. Create emergency trip
  const tripRes = await fetch(`${API_BASE}/trips`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      pickup: { lat: 28.6100, lng: 77.2050, address: 'Central Emergency Center' },
      drop: { lat: 28.6500, lng: 77.2400, address: 'City Specialty Hospital' },
      vehicleNumber: 'DL-01-AMB-108',
    }),
  });

  let tripData: any;
  if (tripRes.status === 409) {
    console.log('Active trip already exists, fetching current active trip...');
    const activeRes = await fetch(`${API_BASE}/trips/active`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    tripData = await activeRes.json();
  } else if (!tripRes.ok) {
    throw new Error(`Failed to create trip: ${await tripRes.text()}`);
  } else {
    const res = (await tripRes.json()) as any;
    tripData = res.trip;
  }

  const tripId = tripData.id;
  const coordinates = tripData.route?.coordinates || [
    [77.2050, 28.6100],
    [77.2100, 28.6150],
    [77.2150, 28.6210],
    [77.2210, 28.6280],
    [77.2270, 28.6350],
    [77.2330, 28.6420],
    [77.2400, 28.6500],
  ];

  console.log(`Trip ID: ${tripId} with ${coordinates.length} route coordinates.`);

  // 3. Connect to Socket.IO
  const socket = io(API_BASE, {
    auth: { token },
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected as Driver');
  });

  socket.on(SOCKET_EVENTS.ALERT_ACKED, (data) => {
    console.log(`🚨 [ALERT ACKNOWLEDGED] Officer ID: ${data.officerId} acknowledged! Total acks: ${data.count}`);
  });

  // 4. Simulate moving along route
  let index = 0;
  const interval = setInterval(async () => {
    if (index >= coordinates.length) {
      clearInterval(interval);
      console.log('Route completed! Ending trip...');

      await fetch(`${API_BASE}/trips/${tripId}/end`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log('Trip ended. Simulator finished.');
      socket.disconnect();
      process.exit(0);
    }

    const [lng, lat] = coordinates[index];
    console.log(`[${index + 1}/${coordinates.length}] Ambulance moving: Lat ${lat.toFixed(4)}, Lng ${lng.toFixed(4)} (Speed: 18 m/s)`);

    socket.emit(SOCKET_EVENTS.DRIVER_LOCATION, {
      tripId,
      lat,
      lng,
      speed: 18,
      heading: 45,
      timestamp: Date.now(),
    });

    index++;
  }, 2500);
}

runSimulator().catch((err) => {
  console.error('Simulator error:', err);
  process.exit(1);
});
