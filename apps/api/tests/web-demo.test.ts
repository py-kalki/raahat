import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import express from 'express';
import webpush from 'web-push';
import { serveWebApp, legacyApi } from '../src/web';
import { WebPushSubscriptionSchema, sendWebPush } from '../src/services/web-push.service';
import { prisma } from '../src/prisma';
import { sampleRoute } from '../../mobile/lib/demo-route';
import http from 'node:http';
import { createRequire } from 'node:module';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { setupSockets } from '../src/sockets';
import { alertService } from '../src/services/alert.service';
import { pushService } from '../src/services/push.service';
import { getBrowserPosition } from '../../mobile/lib/browser-location';
import { withBrowserTimeout } from '../../mobile/lib/browser-timeout';
import { parseManualLocation } from '../../mobile/lib/manual-location';
const { io: connectSocket } = createRequire(path.resolve(__dirname, '../../mobile/package.json'))('socket.io-client');

test('unresponsive browser permission promises fail visibly instead of hanging', async () => {
  assert.equal(await withBrowserTimeout(Promise.resolve('granted'), 'Timed out', 10), 'granted');
  await assert.rejects(withBrowserTimeout(new Promise(() => {}), 'Use Chrome or Edge', 5), /Use Chrome or Edge/);
});

test('GPS accepts the first fresh fix and clears the foreground watch', async () => {
  const cleared: number[] = [];
  const fix = (accuracy: number, age = 0) => ({ timestamp: Date.now() - age,
    coords: { latitude: 28, longitude: 77, accuracy } }) as GeolocationPosition;
  const position = fix(20);
  const provider = { watchPosition(success: any, _failure: any, options: any) {
    assert.equal(options.enableHighAccuracy, true);
    assert.equal(options.maximumAge, 0);
    success(fix(10, 60000)); // Ignore an accurate-looking cached fix.
    success(position);
    return 7;
  }, clearWatch(id: number) { cleared.push(id); } };
  assert.equal(await getBrowserPosition(provider), position);
  assert.deepEqual(cleared, [7]);
});

test('denied GPS is not retried and the watch is stopped', async () => {
  let calls = 0, cleared = 0;
  await assert.rejects(getBrowserPosition({ watchPosition(_success: any, failure: any) {
    calls++; failure({ code: 1 }); return 4;
  }, clearWatch() { cleared++; } }), /permission denied/);
  assert.equal(calls, 1);
  assert.equal(cleared, 1);
});

test('silent or invalid GPS fails visibly without saving a fabricated location', async () => {
  let cleared = 0;
  await assert.rejects(getBrowserPosition({ watchPosition() { return 3; }, clearWatch() { cleared++; } }, 5), /No new location was saved/);
  await assert.rejects(getBrowserPosition({ watchPosition(success: any) {
    success({ timestamp: Date.now(), coords: { latitude: 999, longitude: 77, accuracy: 4500 } }); return 4;
  }, clearWatch() { cleared++; } }, 5), /No new location was saved/);
  assert.equal(cleared, 2);
});

test('GPS returns immediately without an accuracy cutoff', async () => {
  let cleared = false;
  const position = await getBrowserPosition({ watchPosition(success: any) {
    for (const accuracy of [500, 80, 150]) success({ timestamp: Date.now(), coords: { latitude: 28, longitude: 77, accuracy } });
    return 1;
  }, clearWatch() { cleared = true; } }, 5);
  assert.equal(position.coords.accuracy, 500);
  assert.equal(cleared, true);
});

test('network provider rescues a stalled watch', async () => {
  let cleared = 0, fallbackCalls = 0;
  const provider = { watchPosition() { return 5; }, clearWatch() { cleared++; },
    getCurrentPosition(success: any, _failure: any, options: any) {
      fallbackCalls++;
      assert.equal(options.enableHighAccuracy, false);
      assert.equal(options.maximumAge, 0);
      success({ timestamp: Date.now(), coords: { latitude: 28, longitude: 77, accuracy: 30 } });
    } };
  assert.equal((await getBrowserPosition(provider, 30)).coords.accuracy, 30);
  assert.equal(cleared, 1);
  assert.equal(fallbackCalls, 1);
});

test('114 m and coarse locations are accepted for both driver and officer capture', async () => {
  for (const accuracy of [114, 2500, 50000]) {
    const provider = { watchPosition(success: any) {
      success({ timestamp: Date.now(), coords: { latitude: 28, longitude: 77, accuracy } }); return 1;
    }, clearWatch() {} };
    assert.equal((await getBrowserPosition(provider, 5)).coords.accuracy, accuracy);
  }
});

test('denied location does not fall back to another provider', async () => {
  let calls = 0;
  await assert.rejects(getBrowserPosition({ watchPosition(_success: any, error: any) { error({ code: 1 }); return 1; },
    clearWatch() {}, getCurrentPosition() { calls++; } }, 5), /permission denied/);
  assert.equal(calls, 0);
});

test('manual coordinates require valid explicit input and never claim GPS accuracy', () => {
  for (const [lat, lng] of [['', '77'], ['28', ''], ['91', '0'], ['0', '181'], ['NaN', '0']])
    assert.throws(() => parseManualLocation(lat, lng));
  const location = parseManualLocation('0', '0');
  assert.equal(location.lat, 0);
  assert.equal(location.accuracy, null);
  assert.match(location.address!, /Manually confirmed/);
});

test('slow push cannot block the next officer live alert or driver loop', async t => {
  const originalUpsert = prisma.alert.upsert, originalFind = prisma.user.findUnique;
  const originalPush = pushService.sendEmergencyPush;
  const emissions: any[] = [];
  let release!: (value: boolean) => void;
  const blocked = new Promise<boolean>(resolve => { release = resolve; });
  t.after(() => { release(true); prisma.alert.upsert = originalUpsert; prisma.user.findUnique = originalFind; pushService.sendEmergencyPush = originalPush; });
  prisma.alert.upsert = (async ({ create }: any) => ({ ...create, id: create.officerId })) as any;
  prisma.user.findUnique = (async () => ({ pushToken: 'test-only' })) as any;
  pushService.sendEmergencyPush = () => blocked;
  alertService.setSocketServer({ to: (room: string) => ({ emit: (_event: string, payload: any) => emissions.push({ room, payload }) }) } as any);
  let timeout: ReturnType<typeof setTimeout>;
  try {
    await Promise.race([
      (async () => {
        await alertService.dispatchAlert('trip', 'post1', 'officer1', 30, 450);
        await alertService.dispatchAlert('trip', 'post2', 'officer2', 35, 500);
      })(),
      new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error('Live dispatch waited for push')), 1000); }),
    ]);
    assert.ok(emissions.some(item => item.room === 'user:officer1'));
    assert.ok(emissions.some(item => item.room === 'user:officer2'));
  } finally { clearTimeout(timeout!); release(true); }
});

test('simulation follows route endpoints and rejects missing routes', () => {
  const points = sampleRoute([[77, 28], [77.1, 28.1], [77.2, 28.1]]);
  assert.equal(points.length, 61);
  assert.deepEqual(points[0], [77, 28]);
  assert.deepEqual(points.at(-1), [77.2, 28.1]);
  assert.ok(points.every(([lng, lat]) => lng >= 77 && lng <= 77.2 && lat >= 28 && lat <= 28.1));
  assert.throws(() => sampleRoute([]));
  assert.throws(() => sampleRoute([[1, 1], [1, 1]]));
  assert.throws(() => sampleRoute([[NaN, 1], [2, 3]]));
});

const subscription = { endpoint: 'https://fcm.googleapis.com/fcm/send/test', keys: { p256dh: 'A'.repeat(87), auth: 'B'.repeat(22) } };
test('push accepts browser endpoints and rejects arbitrary network destinations', () => {
  assert.equal(WebPushSubscriptionSchema.safeParse(subscription).success, true);
  for (const endpoint of ['invalid URL', 'http://fcm.googleapis.com/test', 'https://127.0.0.1/test', 'https://fcm.googleapis.com.attacker.example/test', 'https://user:pass@fcm.googleapis.com/test', 'https://fcm.googleapis.com:444/test']) {
    assert.equal(WebPushSubscriptionSchema.safeParse({ ...subscription, endpoint }).success, false);
  }
});

test('push delivery reports failures and clears expired subscriptions only', async t => {
  const keys = webpush.generateVAPIDKeys();
  const old = { ...process.env };
  process.env.VAPID_PUBLIC_KEY = keys.publicKey;
  process.env.VAPID_PRIVATE_KEY = keys.privateKey;
  process.env.VAPID_SUBJECT = 'mailto:demo@example.com';
  t.after(() => { process.env = old; });
  const token = `webpush:${JSON.stringify(subscription)}`;
  const send = t.mock.method(webpush, 'sendNotification', async () => ({}));
  const originalUpdate = prisma.user.updateMany;
  const cleared: any[] = [];
  prisma.user.updateMany = (async (args: any) => { cleared.push(args); return { count: 1 }; }) as any;
  t.after(() => { prisma.user.updateMany = originalUpdate; });
  assert.equal(await sendWebPush(token, { title: 'Test', body: 'Test' }), true);
  send.mock.mockImplementation(async () => { throw { statusCode: 503 }; });
  assert.equal(await sendWebPush(token, { title: 'Test', body: 'Test' }), false);
  assert.equal(cleared.length, 0);
  send.mock.mockImplementation(async () => { throw { statusCode: 410 }; });
  assert.equal(await sendWebPush(token, { title: 'Test', body: 'Test' }), false);
  assert.deepEqual(cleared[0], { where: { pushToken: token }, data: { pushToken: null } });
});

test('SPA deep links do not shadow JSON APIs or missing assets', async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'raahat-web-test-'));
  fs.writeFileSync(path.join(directory, 'index.html'), '<html>Raahat demo</html>');
  fs.writeFileSync(path.join(directory, 'sw.js'), '// worker');
  fs.mkdirSync(path.join(directory, '.well-known'));
  fs.writeFileSync(path.join(directory, '.well-known/assetlinks.json'), '[{"relation":["delegate_permission/common.handle_all_urls"]}]');
  fs.writeFileSync(path.join(directory, '.well-known/private.txt'), 'hidden');
  const app = express(), router = express.Router();
  router.get('/', (_req, res) => { res.status(401).json({ error: 'Authentication required' }); });
  app.use('/api/trips', router);
  app.use('/trips', legacyApi(router));
  serveWebApp(app, directory);
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  t.after(async () => { await new Promise<void>(resolve => server.close(() => resolve())); fs.rmSync(directory, { recursive: true }); });
  const base = `http://127.0.0.1:${(server.address() as any).port}`;
  for (const route of ['/demo', '/trips', '/admin/map', '/driver/trip-setup']) {
    const response = await fetch(base + route, { headers: { Accept: 'text/html' } });
    assert.equal(response.status, 200);
    assert.match(await response.text(), /Raahat demo/);
  }
  assert.equal((await fetch(base + '/api/trips')).status, 401);
  assert.equal((await fetch(base + '/trips', { headers: { Accept: 'application/json' } })).status, 401);
  assert.equal((await fetch(base + '/missing.js')).status, 404);
  const trust = await fetch(base + '/.well-known/assetlinks.json');
  assert.equal(trust.status, 200);
  assert.match(trust.headers.get('content-type') || '', /application\/json/);
  assert.equal((await trust.json())[0].relation[0], 'delegate_permission/common.handle_all_urls');
  assert.equal((await fetch(base + '/.well-known/private.txt')).status, 404);
  const worker = await fetch(base + '/sw.js');
  assert.equal(worker.headers.get('cache-control'), 'no-cache');
  assert.equal(worker.headers.get('service-worker-allowed'), '/');
});

test('service worker displays push and focuses the app without trusting payload URLs', async () => {
  const handlers: Record<string, Function> = {}, notifications: any[] = [];
  let focused = false, waited: Promise<any> = Promise.resolve();
  const self = { addEventListener: (name: string, fn: Function) => { handlers[name] = fn; }, location: { origin: 'https://demo.example' }, registration: { showNotification: async (...args: any[]) => notifications.push(args) }, clients: { matchAll: async () => [{ url: 'https://demo.example/officer', focus: async () => { focused = true; } }] } };
  vm.runInNewContext(fs.readFileSync(path.resolve(__dirname, '../../mobile/public/sw.js'), 'utf8'), { self, URL });
  handlers.push({ data: { json: () => ({ title: 'Corridor test', body: 'Approaching', url: 'https://untrusted.example' }) }, waitUntil: (p: Promise<any>) => { waited = p; } });
  await waited;
  assert.equal(notifications[0][0], 'Corridor test');
  assert.equal(notifications[0][1].data.url, '/');
  handlers.notificationclick({ notification: { close() {} }, waitUntil: (p: Promise<any>) => { waited = p; } });
  await waited;
  assert.equal(focused, true);
  assert.equal(handlers.fetch, undefined, 'Private data must not enter an offline cache');
});

test('simulated driver update reaches officer and acknowledgement reaches driver', { timeout: 15000 }, async t => {
  // In-memory database doubles; the actual socket, corridor and alert services run.
  const patch = (target: any, name: string, fn: any) => { const original = target[name]; target[name] = fn; t.after(() => { target[name] = original; }); };
  const users = [{ id: 'driver', role: 'DRIVER', verified: true }, { id: 'officer', role: 'OFFICER', verified: true }];
  const trip = { id: 'trip', driverId: 'driver', status: 'ACTIVE', routeGeoJson: JSON.stringify({ type: 'LineString', coordinates: [[77.21, 28.56], [77.21, 28.58]] }), vehicleNumber: 'DEMO' };
  let alert: any = null, updates = 0;
  patch(prisma.user, 'findUnique', async ({ where }: any) => users.find(user => user.id === where.id));
  patch(prisma.trip, 'findUnique', async () => trip);
  patch(prisma.trip, 'update', async () => { updates++; return trip; });
  patch(prisma.officer, 'findMany', async () => [{ id: 'post', userId: 'officer', currentLat: 28.57, currentLng: 77.21, onDuty: true }]);
  patch(prisma.alert, 'findMany', async () => alert ? [alert] : []);
  patch(prisma.alert, 'upsert', async ({ create }: any) => { alert = { id: 'alert', ...create }; return alert; });
  patch(prisma.alert, 'findUnique', async () => ({ ...alert, officer: { userId: 'officer' }, trip: { id: 'trip', driverId: 'driver' } }));
  patch(prisma.alert, 'update', async ({ data }: any) => Object.assign(alert, data));
  patch(prisma.alert, 'count', async () => alert?.status === 'ACKNOWLEDGED' ? 1 : 0);
  const server = http.createServer(), io = new Server(server);
  setupSockets(io);
  server.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${(server.address() as any).port}`;
  const clients: any[] = [];
  t.after(async () => { clients.forEach(client => client.disconnect()); await new Promise<void>(resolve => io.close(() => resolve())); });
  const connect = async (id: string) => {
    const token = jwt.sign({ id }, process.env.JWT_SECRET || 'raahat_jwt_secret_change_in_production_key_123456789');
    const socket = connectSocket(base, { auth: { token }, transports: ['websocket'], reconnection: false });
    clients.push(socket);
    await new Promise<void>((resolve, reject) => { socket.once('connect', resolve); socket.once('connect_error', reject); });
    return socket;
  };
  const driver = await connect('driver'), officer = await connect('officer');
  assert.equal((await officer.timeout(2000).emitWithAck('driver:location', { tripId: 'trip', lat: 28.56, lng: 77.21 })).success, false);
  assert.equal((await driver.timeout(2000).emitWithAck('driver:location', { tripId: 'trip', lat: 999, lng: 77.21 })).success, false);
  assert.equal(updates, 0);
  const incoming = new Promise<any>(resolve => officer.once('emergency:alert', resolve));
  assert.equal((await driver.timeout(3000).emitWithAck('driver:location', { tripId: 'trip', lat: 28.56, lng: 77.21, speed: 18 })).success, true);
  assert.equal((await incoming).alertId, 'alert');
  const ack = new Promise<any>(resolve => driver.once('alert:acked', resolve));
  officer.emit('alert:ack', { alertId: 'alert' });
  assert.equal((await ack).count, 1);
});
