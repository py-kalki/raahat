import webpush from 'web-push';
import { z } from 'zod';
import { prisma } from '../prisma';

// Push endpoints are browser-issued capabilities, never arbitrary fetch URLs.
export const WebPushSubscriptionSchema = z.object({
  endpoint: z.string().url().max(2048).refine(value => {
    try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && (!url.port || url.port === '443') &&
      (url.hostname === 'fcm.googleapis.com' || url.hostname === 'updates.push.services.mozilla.com' ||
       url.hostname.endsWith('.push.services.mozilla.com') || url.hostname === 'web.push.apple.com');
    } catch { return false; }
  }, 'Unsupported browser push service'),
  expirationTime: z.number().nullable().optional(),
  keys: z.object({ p256dh: z.string().regex(/^[A-Za-z0-9_-]{87}={0,1}$/), auth: z.string().regex(/^[A-Za-z0-9_-]{22}={0,2}$/) }),
});

export function webPushPublicKey() {
  return process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT
    ? process.env.VAPID_PUBLIC_KEY : null;
}

export async function sendWebPush(token: string, payload: { title: string; body: string; alertId?: string }) {
  const publicKey = webPushPublicKey();
  if (!publicKey) return false;
  try {
    const subscription = WebPushSubscriptionSchema.parse(JSON.parse(token.slice('webpush:'.length)));
    await webpush.sendNotification(subscription, JSON.stringify(payload), {
      TTL: 240, urgency: 'high', timeout: 10000,
      vapidDetails: { subject: process.env.VAPID_SUBJECT!, publicKey, privateKey: process.env.VAPID_PRIVATE_KEY! },
    });
    return true;
  } catch (error: any) {
    if (error.statusCode === 404 || error.statusCode === 410) {
      await prisma.user.updateMany({ where: { pushToken: token }, data: { pushToken: null } });
    }
    console.warn('[WebPush] Delivery failed:', error.statusCode || error.name);
    return false;
  }
}
