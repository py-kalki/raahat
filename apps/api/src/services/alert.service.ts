import { Server } from 'socket.io';
import { prisma } from '../prisma';
import { SOCKET_EVENTS, EmergencyAlertPayload } from '@raahat/shared';
import { pushService } from './push.service';

export class AlertService {
  private io?: Server;

  setSocketServer(io: Server) {
    this.io = io;
  }

  /**
   * Dispatches emergency alert to officer, saving uniquely to database
   */
  async dispatchAlert(
    tripId: string,
    officerId: string,
    userId: string,
    etaSec: number,
    distanceAheadM: number,
    vehicleNumber?: string,
    ambulanceLat?: number,
    ambulanceLng?: number
  ): Promise<void> {
    try {
      // 1. Create or ensure alert is saved uniquely
      const alert = await prisma.alert.upsert({
        where: {
          tripId_officerId: { tripId, officerId },
        },
        create: {
          tripId,
          officerId,
          etaSec,
          distanceAheadM,
          status: 'PENDING',
        },
        update: {
          etaSec,
          distanceAheadM,
        },
      });

      const etaMins = Math.max(1, Math.round(etaSec / 60));
      const message = `EMERGENCY CORRIDOR: Ambulance arriving in approx ${etaMins} min (${distanceAheadM}m ahead). Clear corridor immediately!`;

      const payload: EmergencyAlertPayload = {
        alertId: alert.id,
        tripId,
        officerId,
        etaSec,
        distanceAheadM,
        message,
        vehicleNumber: vehicleNumber || 'AMBULANCE-01',
        ambulanceLat: ambulanceLat || 0,
        ambulanceLng: ambulanceLng || 0,
      };

      // 2. Real-time emit to officer's personal socket room
      if (this.io) {
        this.io.to(`user:${userId}`).emit(SOCKET_EVENTS.EMERGENCY_ALERT, payload);
        // Also inform admin
        this.io.to('role:ADMIN').emit(SOCKET_EVENTS.EMERGENCY_ALERT, payload);
      }

      // 3. Trigger high-priority push notification if token exists
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { pushToken: true },
      });

      if (user?.pushToken) {
        await pushService.sendEmergencyPush(user.pushToken, {
          tripId,
          alertId: alert.id,
          etaSec,
          distanceAheadM,
          message,
        });
      }
    } catch (error) {
      console.error('[AlertService] Error dispatching alert:', error);
    }
  }

  /**
   * Officer acknowledges alert
   */
  async acknowledgeAlert(alertId: string, officerUserId: string) {
    const alert = await prisma.alert.findUnique({
      where: { id: alertId },
      include: {
        officer: true,
        trip: {
          select: { id: true, driverId: true },
        },
      },
    });

    if (!alert) {
      throw new Error('Alert not found');
    }

    if (alert.officer.userId !== officerUserId) {
      throw new Error('Unauthorized to acknowledge this alert');
    }

    const updated = await prisma.alert.update({
      where: { id: alertId },
      data: {
        status: 'ACKNOWLEDGED',
        acknowledgedAt: new Date(),
      },
    });

    // Count acknowledged officers for this trip
    const ackCount = await prisma.alert.count({
      where: {
        tripId: alert.tripId,
        status: 'ACKNOWLEDGED',
      },
    });

    // Notify driver and admin
    if (this.io) {
      const ackPayload = {
        tripId: alert.tripId,
        alertId: alert.id,
        officerId: alert.officerId,
        count: ackCount,
      };
      this.io.to(`trip:${alert.tripId}`).emit(SOCKET_EVENTS.ALERT_ACKED, ackPayload);
      this.io.to(`user:${alert.trip.driverId}`).emit(SOCKET_EVENTS.ALERT_ACKED, ackPayload);
      this.io.to('role:ADMIN').emit(SOCKET_EVENTS.ALERT_ACKED, ackPayload);
    }

    return { updated, ackCount };
  }

  /**
   * Dismiss alert after ambulance has passed
   */
  async dismissAlert(alertId: string, userId: string) {
    await prisma.alert.update({
      where: { id: alertId },
      data: {
        status: 'DISMISSED',
        dismissedAt: new Date(),
      },
    });

    if (this.io) {
      this.io.to(`user:${userId}`).emit(SOCKET_EVENTS.ALERT_DISMISS, { alertId });
    }
  }
}

export const alertService = new AlertService();
