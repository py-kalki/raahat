import fs from 'fs';
import path from 'path';
import * as admin from 'firebase-admin';
import { sendWebPush } from './web-push.service';

export class PushService {
  private initialized = false;

  constructor() {
    this.initFirebase();
  }

  private initFirebase() {
    try {
      let serviceAccount: any = null;

      // 1. Direct JSON string from environment variable (ideal for Render/Cloud)
      if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        try {
          serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        } catch {
          console.warn('[PushService] FIREBASE_SERVICE_ACCOUNT env var is not valid JSON string, falling back to file');
        }
      }

      // 2. Base64 encoded JSON
      if (!serviceAccount && process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
        try {
          const decoded = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8');
          serviceAccount = JSON.parse(decoded);
        } catch {}
      }

      // 3. File path on disk
      if (!serviceAccount) {
        const serviceAccountPath =
          process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
          path.join(__dirname, '../../firebase-service-account.json');

        const resolvedPath = path.isAbsolute(serviceAccountPath)
          ? serviceAccountPath
          : path.resolve(process.cwd(), serviceAccountPath);

        if (fs.existsSync(resolvedPath)) {
          serviceAccount = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
        }
      }

      if (serviceAccount) {
        if (!admin.apps.length) {
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
          });
        }
        this.initialized = true;
        console.log(`[PushService] Firebase Admin initialized for project: ${serviceAccount.project_id}`);
      } else {
        console.warn('[PushService] Firebase service account credentials not found. Provide FIREBASE_SERVICE_ACCOUNT env var or firebase-service-account.json file.');
      }
    } catch (error) {
      console.error('[PushService] Failed to initialize Firebase Admin:', error);
    }
  }

  /**
   * Sends high-priority emergency push notification to officer device
   */
  async sendEmergencyPush(
    pushToken: string,
    payload: {
      tripId: string;
      alertId: string;
      etaSec: number;
      distanceAheadM: number;
      message: string;
    }
  ): Promise<boolean> {
    if (!pushToken) return false;
    if (pushToken.startsWith('webpush:')) {
      return sendWebPush(pushToken, { title: 'Raahat — corridor approaching', body: payload.message, alertId: payload.alertId });
    }

    // 1. If it's an Expo push token (ExponentPushToken[...]), deliver via Expo Push API
    if (pushToken.startsWith('ExponentPushToken') || pushToken.startsWith('ExpoPushToken')) {
      try {
        const response = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            to: pushToken,
            title: '🚨 EMERGENCY GREEN CORRIDOR',
            body: payload.message,
            priority: 'high',
            channelId: 'emergency_siren_channel',
            sound: 'default',
            data: {
              tripId: payload.tripId,
              alertId: payload.alertId,
              etaSec: String(payload.etaSec),
              distanceAheadM: String(payload.distanceAheadM),
            },
          }),
        });

        const result = (await response.json()) as any;
        console.log('[PushService] Expo push notification sent:', result);
        return true;
      } catch (err) {
        console.error('[PushService] Expo push delivery error:', err);
      }
    }

    // 2. Direct FCM delivery via Firebase Admin SDK
    if (this.initialized) {
      try {
        const message: admin.messaging.Message = {
          token: pushToken,
          notification: {
            title: '🚨 EMERGENCY GREEN CORRIDOR',
            body: payload.message,
          },
          data: {
            tripId: payload.tripId,
            alertId: payload.alertId,
            etaSec: String(payload.etaSec),
            distanceAheadM: String(payload.distanceAheadM),
          },
          android: {
            priority: 'high',
            notification: {
              channelId: 'emergency_siren_channel',
              sound: 'default',
              priority: 'max',
              visibility: 'public',
            },
          },
        };

        const response = await admin.messaging().send(message);
        console.log(`[PushService] FCM push notification delivered successfully (ID: ${response})`);
        return true;
      } catch (error) {
        console.error('[PushService] FCM send error:', error);
        return false;
      }
    }

    console.warn('[PushService] No delivery provider configured for this token.');
    return false;
  }
}

export const pushService = new PushService();
