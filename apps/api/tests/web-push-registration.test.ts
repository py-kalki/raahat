import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

// Exercise the shipped browser module with browser/HTTP boundaries controlled.
function browser(permission = 'granted', existingKey?: number[]) {
  const state = { token: 'officer-one', permissionRequests: 0, subscribed: 0, posted: 0, unsubscribed: 0, failPost: false, switchDuringConfig: false };
  const storage = new Map<string, string>();
  let subscription: any = null;
  const makeSubscription = (key: number[]) => ({
    options: { applicationServerKey: Uint8Array.from(key).buffer },
    endpoint: 'https://fcm.googleapis.com/mock-subscription',
    toJSON: () => ({ endpoint: 'https://fcm.googleapis.com/mock-subscription', keys: { p256dh: 'key', auth: 'auth' } }),
    unsubscribe: async () => { state.unsubscribed++; subscription = null; return true; },
  });
  if (existingKey) subscription = makeSubscription(existingKey);
  const registration = { pushManager: {
    getSubscription: async () => subscription,
    subscribe: async (options: any) => { state.subscribed++; subscription = makeSubscription(Array.from(options.applicationServerKey)); return subscription; },
  } };
  const notification = { permission, requestPermission: async () => { state.permissionRequests++; return notification.permission; } };
  const api = { getToken: () => state.token, request: async (route: string, options?: any) => {
    if (route.endsWith('/config')) {
      if (state.switchDuringConfig) state.token = 'officer-two';
      return { publicKey: 'AQID' };
    }
    if (options?.method === 'POST') { if (state.failPost) throw new Error('Server unavailable'); state.posted++; }
    return { success: true };
  } };
  const context: any = {
    exports: {}, Uint8Array, Array, atob, Event,
    navigator: { serviceWorker: { register: async () => registration, ready: Promise.resolve(registration), getRegistration: async () => registration } },
    Notification: notification,
    window: { isSecureContext: true, Notification: notification, PushManager: {}, dispatchEvent: () => true },
    localStorage: { getItem: (key: string) => storage.get(key), setItem: (key: string, value: string) => storage.set(key, value) },
    require: (name: string) => name === './api' ? { api } : { withBrowserTimeout: (promise: Promise<any>) => promise },
  };
  const source = fs.readFileSync(path.resolve(__dirname, '../../mobile/lib/notifications.web.ts'), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInNewContext(code, context);
  return { state, notifications: context.exports, notification };
}

test('already-granted Android permission creates and registers a missing subscription on login', async () => {
  const { state, notifications } = browser();
  await notifications.registerForPushNotificationsAsync();
  assert.equal(state.permissionRequests, 0);
  assert.equal(state.subscribed, 1);
  assert.equal(state.posted, 1);
  assert.equal(await notifications.webPushReady(), true);
});

test('login never prompts; explicit denied permission cannot report readiness', async () => {
  const { state, notifications, notification } = browser('default');
  await notifications.registerForPushNotificationsAsync();
  assert.equal(state.permissionRequests, 0);
  notification.permission = 'denied';
  await assert.rejects(notifications.enableWebPush(), /not allowed/);
  assert.equal(state.permissionRequests, 1);
  assert.equal(state.subscribed, 0);
  assert.equal(state.posted, 0);
  assert.equal(await notifications.webPushReady(), false);
});

test('registration failure remains visible and can be retried without duplicate subscription', async () => {
  const { state, notifications } = browser();
  state.failPost = true;
  await assert.rejects(notifications.enableWebPush(), /Server unavailable/);
  assert.equal(await notifications.webPushReady(), false);
  state.failPost = false;
  await notifications.enableWebPush();
  assert.equal(state.subscribed, 1);
  assert.equal(await notifications.webPushReady(), true);
});

test('concurrent login and dashboard setup share one registration', async () => {
  const { state, notifications } = browser();
  await Promise.all([notifications.enableWebPush(), notifications.enableWebPush()]);
  assert.equal(state.subscribed, 1);
  assert.equal(state.posted, 1);
});

test('a changed VAPID key replaces the stale subscription', async () => {
  const { state, notifications } = browser('granted', [9, 9, 9]);
  await notifications.enableWebPush();
  assert.equal(state.unsubscribed, 1);
  assert.equal(state.subscribed, 1);
  assert.equal(await notifications.webPushReady(), true);
});

test('explicit opt-out is respected during automatic login registration', async () => {
  const { state, notifications } = browser();
  await notifications.enableWebPush();
  await notifications.disableWebPush();
  await notifications.registerForPushNotificationsAsync();
  assert.equal(state.subscribed, 1);
  assert.equal(await notifications.webPushReady(), false);
  await notifications.enableWebPush();
  assert.equal(state.subscribed, 2);
});

test('account switches cannot register the old in-flight request to a new account', async () => {
  const { state, notifications } = browser();
  state.switchDuringConfig = true;
  await assert.rejects(notifications.enableWebPush(), /Account changed/);
  assert.equal(state.posted, 0);
  assert.equal(await notifications.webPushReady(), false);
});
