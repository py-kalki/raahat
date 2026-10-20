import fs from 'fs';
import path from 'path';
import * as admin from 'firebase-admin';

export class PushService {
  private initialized = false;

  constructor() {
    this.initFirebase();
  }

  private initFirebase() {
    try {
      const serviceAccountPath =
        process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
        path.join(__dirname, '../../firebase-service-account.json');

      const resolvedPath = path.isAbsolute(serviceAccountPath)
        ? serviceAccountPath
        : path.resolve(process.cwd(), serviceAccountPath);

      if (fs.existsSync(resolvedPath)) {
        const serviceAccount = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));

        if (!admin.apps.length) {
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
          });
        }
        this.initialized = true;
        console.log(`[PushService] Firebase Admin initialized for project: ${serviceAccount.project_id}`);
      } else {
        console.warn(`[PushService] Firebase service account file not found at: ${resolvedPath}`);
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

    console.log(`[PushService] Telemetry simulated for token: ${pushToken}`);
    return true;
  }
}

export const pushService = new PushService();
