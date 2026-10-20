import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma';
import { SOCKET_EVENTS, DriverLocationUpdate, OfficerLocationUpdate, AlertAckInput } from '@raahat/shared';
import { corridorService } from '../services/corridor.service';
import { alertService } from '../services/alert.service';

const JWT_SECRET = process.env.JWT_SECRET || 'raahat_jwt_secret_change_in_production_key_123456789';

interface SocketWithUser extends Socket {
  user?: {
    id: string;
    phone: string;
    role: string;
    verified: boolean;
  };
}

export function setupSockets(io: Server) {
  // Give AlertService access to the socket server
  alertService.setSocketServer(io);

  // Handshake authentication
  io.use(async (socket: SocketWithUser, next) => {
    try {
      const token =
        socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { id: true, phone: true, role: true, verified: true },
      });

      if (!user) {
        return next(new Error('User not found'));
      }

      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Unauthorized socket connection'));
    }
  });

  io.on('connection', (socket: SocketWithUser) => {
    const user = socket.user!;
    console.log(`[Socket] User connected: ${user.id} (${user.role})`);

    // Join personal room and role room
    socket.join(`user:${user.id}`);
    socket.join(`role:${user.role}`);

    // DRIVER: streams location every 3-5s
    socket.on(SOCKET_EVENTS.DRIVER_LOCATION, async (data: DriverLocationUpdate) => {
      try {
        if (user.role !== 'DRIVER') return;

        const { tripId, lat, lng, speed, heading } = data;

        // 1. Fetch trip and route
        const trip = await prisma.trip.findUnique({
          where: { id: tripId },
          select: {
            id: true,
            driverId: true,
            status: true,
            routeGeoJson: true,
            vehicleNumber: true,
          },
        });

        if (!trip || trip.status !== 'ACTIVE' || trip.driverId !== user.id) {
          return;
        }

        // 2. Update trip in database
        await prisma.trip.update({
          where: { id: tripId },
          data: {
            currentLat: lat,
            currentLng: lng,
            currentSpeed: speed ?? null,
            currentHeading: heading ?? null,
          },
        });

        // 3. Broadcast trip update to admin & anyone watching this trip
        io.to('role:ADMIN').emit(SOCKET_EVENTS.TRIP_UPDATE, {
          tripId,
          lat,
          lng,
          speed,
          heading,
          vehicleNumber: trip.vehicleNumber,
        });

        // 4. Run Corridor Engine
        const evaluation = await corridorService.evaluateCorridor(
          tripId,
          trip.routeGeoJson,
          lat,
          lng,
          speed
        );

        // 5. Dispatch alerts to newly eligible officers
        for (const alertInfo of evaluation.newAlerts) {
          await alertService.dispatchAlert(
            tripId,
            alertInfo.officerId,
            alertInfo.userId,
            alertInfo.etaSec,
            alertInfo.distanceAheadM,
            trip.vehicleNumber ?? undefined,
            lat,
            lng
          );
        }

        // 6. Dismiss alerts for officers whom the vehicle has passed
        for (const dismissal of evaluation.dismissals) {
          await alertService.dismissAlert(dismissal.alertId, dismissal.userId);
        }
      } catch (err) {
        console.error('[Socket] Error handling driver location:', err);
      }
    });

    // OFFICER: streams location every ~10s while on duty
    socket.on(SOCKET_EVENTS.OFFICER_LOCATION, async (data: OfficerLocationUpdate) => {
      try {
        if (user.role !== 'OFFICER') return;

        const { lat, lng } = data;

        await prisma.officer.update({
          where: { userId: user.id },
          data: {
            currentLat: lat,
            currentLng: lng,
            lastLocationAt: new Date(),
          },
        });

        // Notify admin of officer location update
        io.to('role:ADMIN').emit('officer:update', {
          userId: user.id,
          lat,
          lng,
        });
      } catch (err) {
        console.error('[Socket] Error handling officer location:', err);
      }
    });

    // OFFICER: acknowledges alert
    socket.on(SOCKET_EVENTS.ALERT_ACK, async (data: AlertAckInput) => {
      try {
        if (user.role !== 'OFFICER') return;
        await alertService.acknowledgeAlert(data.alertId, user.id);
      } catch (err) {
        console.error('[Socket] Error acknowledging alert:', err);
      }
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] User disconnected: ${user.id}`);
    });
  });
}
