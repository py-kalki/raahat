import { api } from './api';

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || !window.isSecureContext) return null;
  await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  return navigator.serviceWorker.ready;
}

// Permission is requested only from the explicit Enable notifications button.
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!('serviceWorker' in navigator) || !('Notification' in window) || Notification.permission !== 'granted') return null;
  const registration = await navigator.serviceWorker.getRegistration('/');
  const subscription = await registration?.pushManager.getSubscription();
  if (subscription) await api.request('/devices/web-push', { method: 'POST', body: JSON.stringify(subscription.toJSON()) });
  return null;
}

export async function enableWebPush() {
  if (!('PushManager' in window) || !('Notification' in window) || !window.isSecureContext) {
    throw new Error('Open this HTTPS website in Android Chrome to enable notifications.');
  }
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Notifications are blocked. Allow them in browser site settings.');
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
  subscription ||= await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: bytes });
  await api.request('/devices/web-push', { method: 'POST', body: JSON.stringify(subscription.toJSON()) });
}

export async function disableWebPush() {
  const registration = await navigator.serviceWorker?.getRegistration('/');
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;
  await api.request('/devices/web-push', { method: 'DELETE', body: JSON.stringify({ endpoint: subscription.endpoint }) });
  await subscription.unsubscribe();
}

export async function testWebPush() {
  await api.request('/devices/web-push/test', { method: 'POST' });
}

// Capture the old credentials before an account switch or logout.
export async function unregisterPushNotificationsAsync() {
  const token = api.getToken();
  const registration = await navigator.serviceWorker?.getRegistration('/');
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;
  try {
    if (token) await fetch('/api/devices/web-push', { method: 'DELETE', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify({ endpoint: subscription.endpoint }) });
  } finally { await subscription.unsubscribe(); }
}
