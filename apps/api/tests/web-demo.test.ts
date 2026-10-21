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
const { io: connectSocket } = createRequire(path.resolve(__dirname, '../../mobile/package.json'))('socket.io-client');

test('GPS falls back to network positioning without fabricating a position', async () => {
  const requested: boolean[] = [];
  const position = { coords: { latitude: 28, longitude: 77, accuracy: 40 } } as GeolocationPosition;
  const provider = { getCurrentPosition(success: any, failure: any, options: any) {
    requested.push(options.enableHighAccuracy);
    if (options.enableHighAccuracy) failure({ code: 2 }); else success(position);
  } };
  assert.equal(await getBrowserPosition(provider), position);
  assert.deepEqual(requested, [true, false]);
});

test('denied GPS is not retried; silent webviews time out', async () => {
  let calls = 0;
  await assert.rejects(getBrowserPosition({ getCurrentPosition(_success: any, failure: any) { calls++; failure({ code: 1 }); } }), /permission denied/);
  assert.equal(calls, 1);
  await assert.rejects(getBrowserPosition({ getCurrentPosition() {} }, 1), /No location was saved/);
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
