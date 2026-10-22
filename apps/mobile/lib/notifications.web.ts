import { api } from './api';
import { withBrowserTimeout } from './browser-timeout';

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || !window.isSecureContext) return null;
  await withBrowserTimeout(navigator.serviceWorker.register('/sw.js', { scope: '/' }), 'Notification worker did not register. Reload in Chrome or Edge.');
  return withBrowserTimeout(navigator.serviceWorker.ready, 'Notification worker did not start. Open the app in Chrome or Edge.', 10000);
}

const OPT_OUT = 'raah.push.disabled';
let confirmedToken: string | null = null;
let registrationTask: { token: string; promise: Promise<void> } | null = null;
function optedOut() { try { return localStorage.getItem(OPT_OUT) === 'true'; } catch { return false; } }
function setOptOut(disabled: boolean) { try { localStorage.setItem(OPT_OUT, String(disabled)); } catch { /* Storage may be restricted. */ } }
function changed() { window.dispatchEvent(new Event('raah-push-change')); }

// Android may already have granted permission. Create the missing browser subscription,
// rather than silently skipping registration on every login. Never prompt from login.
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!('serviceWorker' in navigator) || !('Notification' in window) || Notification.permission !== 'granted' || optedOut()) return null;
  await enableWebPush();
  return null;
}

export function enableWebPush(): Promise<void> {
  const token = api.getToken();
  if (!token) return Promise.reject(new Error('Sign in before enabling notifications.'));
  if (registrationTask?.token === token) return registrationTask.promise;
  const promise = subscribe(token).finally(() => {
    if (registrationTask?.promise === promise) registrationTask = null;
  });
  registrationTask = { token, promise };
  return promise;
}

async function subscribe(token: string) {
  if (!('PushManager' in window) || !('Notification' in window) || !window.isSecureContext) {
    throw new Error('Open this HTTPS website in Android Chrome to enable notifications.');
  }
  const permission = Notification.permission === 'granted' ? 'granted' : await withBrowserTimeout(Notification.requestPermission(), 'The browser did not answer the notification permission request. Open this address in Chrome or Edge and allow notifications.');
  if (permission !== 'granted') throw new Error('Notifications are not allowed. In Android Settings → Apps → Raah → Notifications, allow alerts. In Chrome, also check this website’s notification permission, then return and enable again.');
  const { publicKey } = await api.request<{ publicKey: string }>('/devices/web-push/config');
  const registration = await registerServiceWorker();
  if (!registration) throw new Error('Service workers are unavailable in this browser.');
  const padded = publicKey + '='.repeat((4 - publicKey.length % 4) % 4);
  const bytes = Uint8Array.from(atob(padded.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
  let subscription = await registration.pushManager.getSubscription();
  if (subscription && subscription.options.applicationServerKey &&
      Array.from(new Uint8Array(subscription.options.applicationServerKey)).join() !== Array.from(bytes).join()) {
    await subscription.unsubscribe();
    subscription = null;
  }
  subscription ||= await withBrowserTimeout(registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: bytes }), 'The browser could not connect to its push service. Try Chrome or Edge and check notification permissions.');
  if (api.getToken() !== token) throw new Error('Account changed. Enable notifications again for the signed-in account.');
  await api.request('/devices/web-push', { method: 'POST', body: JSON.stringify(subscription.toJSON()) });
  confirmedToken = token;
  setOptOut(false);
  changed();
}

export async function webPushReady() {
  if (!api.getToken() || !('Notification' in window) || Notification.permission !== 'granted' || optedOut() || confirmedToken !== api.getToken()) return false;
  const registration = await navigator.serviceWorker?.getRegistration('/');
  return !!await registration?.pushManager.getSubscription();
}

export async function disableWebPush() {
  setOptOut(true);
  confirmedToken = null;
  changed();
  const registration = await navigator.serviceWorker?.getRegistration('/');
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;
  await api.request('/devices/web-push', { method: 'DELETE', body: JSON.stringify({ endpoint: subscription.endpoint }) });
  await subscription.unsubscribe();
}

export async function testWebPush() {
  if (!await webPushReady()) throw new Error('Enable notifications for this account first.');
  await api.request('/devices/web-push/test', { method: 'POST' });
}

// Capture the old credentials before an account switch or logout.
export async function unregisterPushNotificationsAsync() {
  confirmedToken = null;
  const token = api.getToken();
  const registration = await navigator.serviceWorker?.getRegistration('/');
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;
  try {
    if (token) await fetch('/api/devices/web-push', { method: 'DELETE', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify({ endpoint: subscription.endpoint }) });
  } finally { await subscription.unsubscribe(); }
}
