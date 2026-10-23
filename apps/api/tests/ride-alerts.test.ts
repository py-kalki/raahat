import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../src/prisma';
import { corridorService } from '../src/services/corridor.service';
import { alertService } from '../src/services/alert.service';
import { pushService } from '../src/services/push.service';
import { routingService } from '../src/services/routing.service';
import { tripsRouter } from '../src/routes/trips.routes';
import { officersRouter } from '../src/routes/officers.routes';

async function fixture(t: any) {
  const patch = (target: any, name: string, fn: any) => {
    const original = target[name]; target[name] = fn;
    t.after(() => { target[name] = original; });
  };
  const route = { type: 'LineString', coordinates: [[77.21, 28.56], [77.21, 28.61]] };
  const officer = { id: 'post', userId: 'officer', onDuty: true, currentLat: 28.56,
    currentLng: 77.21, lastLocationAt: new Date(), verified: true };
  const officers = [officer];
  const trip = { id: 'trip', driverId: 'driver', status: 'ACTIVE', routeGeoJson: JSON.stringify(route),
    pickupLat: 28.56, pickupLng: 77.21, currentLat: 28.56, currentLng: 77.21, vehicleNumber: 'DEMO' };
  const alerts: any[] = [], emitted: any[] = [], pushed: any[] = [];
  patch(prisma.officer, 'findMany', async ({ where }: any) => {
    assert.equal(where.user.verified, true);
    assert.equal(where.user.role, 'OFFICER');
    assert.equal(where.onDuty, undefined);
    assert.equal(where.lastLocationAt, undefined);
    return officers.filter(o => o.verified && (!where.userId || where.userId === o.userId));
  });
  patch(prisma.officer, 'update', async ({ data }: any) => Object.assign(officer, data));
  patch(prisma.user, 'findUnique', async ({ where }: any) => ({ id: where.id,
    role: where.id === 'driver' ? 'DRIVER' : 'OFFICER', verified: true, pushToken: 'test-token' }));
  patch(prisma.trip, 'findFirst', async () => null);
  patch(prisma.trip, 'create', async () => trip);
  patch(prisma.trip, 'findMany', async ({ where }: any) => { assert.equal(where.status, 'ACTIVE'); return [trip]; });
  patch(prisma.alert, 'findMany', async () => alerts);
  patch(prisma.alert, 'upsert', async ({ create }: any) => { const alert = { id: 'alert', ...create }; alerts.push(alert); return alert; });
  patch(routingService, 'getRoute', async () => ({ geoJson: route, distanceMeters: 5500, durationSeconds: 400 }));
  patch(pushService, 'sendEmergencyPush', async (...args: any[]) => { pushed.push(args); return true; });
  alertService.setSocketServer({ to: (room: string) => ({ emit: (event: string, payload: any) => emitted.push({ room, event, payload }) }) } as any);
  const app = express(); app.use(express.json()); app.use('/trips', tripsRouter); app.use('/officers', officersRouter);
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  t.after(() => new Promise<void>(resolve => server.close(() => resolve())));
  const request = async (path: string, id: string, body: any) => fetch(`http://127.0.0.1:${(server.address() as any).port}${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt.sign({ id }, process.env.JWT_SECRET || 'raahat_jwt_secret_change_in_production_key_123456789')}` }, body: JSON.stringify(body),
  });
  const evaluate = () => corridorService.evaluateCorridor(trip.id, trip.routeGeoJson, trip.currentLat, trip.currentLng);
  return { officer, officers, trip, alerts, emitted, pushed, request, evaluate };
}

test('starting a ride beside an officer sends both the red-screen event and push', async t => {
  const f = await fixture(t);
  const response = await f.request('/trips', 'driver', { pickup: { lat: 28.56, lng: 77.21 }, drop: { lat: 28.61, lng: 77.21 } });
  assert.equal(response.status, 201);
  assert.equal(f.alerts.length, 1);
  assert.equal(f.emitted.filter(e => e.room === 'user:officer' && e.event === 'emergency:alert').length, 1);
  assert.equal(f.pushed.length, 1);
  assert.equal(f.alerts[0].etaSec, -1);
});

test('GPS refresh during an existing ride immediately dispatches both channels once', async t => {
  const f = await fixture(t);
  f.officer.lastLocationAt = new Date(Date.now() - 86400000);
  f.officer.currentLng = 79;
  assert.equal((await f.evaluate()).newAlerts.length, 1);
  const response = await f.request('/officers/me/location', 'officer', { lat: 28.565, lng: 77.21 });
  assert.equal(response.status, 200);
  assert.equal(f.alerts.length, 1);
  assert.ok(f.emitted.some(e => e.room === 'user:officer' && e.event === 'emergency:alert'));
  assert.equal(f.pushed.length, 1);
  assert.equal((await f.request('/officers/me/location', 'officer', { lat: 28.565, lng: 77.21 })).status, 200);
  assert.equal(f.pushed.length, 1, 'Refreshing again must not repeat the alarm');
});

test('new ride broadcasts to every verified officer including distant, off-duty and missing GPS', async t => {
  const f = await fixture(t);
  f.officer.onDuty = false;
  f.officer.lastLocationAt = new Date(0);
  f.officer.currentLng = 120;
  f.officers.push({ ...f.officer, id: 'post2', userId: 'officer2', currentLat: null, currentLng: null } as any);
  f.officers.push({ ...f.officer, id: 'post3', userId: 'officer3', currentLat: -30 });
  f.officers.push({ ...f.officer, id: 'unverified', userId: 'unverified', verified: false });
  const response = await f.request('/trips', 'driver', { pickup: { lat: 28.56, lng: 77.21 }, drop: { lat: 28.61, lng: 77.21 } });
  assert.equal(response.status, 201);
  assert.equal(f.alerts.length, 3);
  assert.equal(f.pushed.length, 3);
  for (const id of ['officer', 'officer2', 'officer3'])
    assert.ok(f.emitted.some(e => e.room === `user:${id}` && e.event === 'emergency:alert'));
  assert.ok(f.pushed.every(p => p[1].message.includes('DEMO BROADCAST')));
  assert.equal((await f.evaluate()).newAlerts.length, 0, 'Driver updates must not repeat notifications');
  assert.equal((await f.evaluate()).dismissals.length, 0, 'Distance must not dismiss a broadcast');
});
