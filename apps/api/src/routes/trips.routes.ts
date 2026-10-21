import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';
import { authenticateJwt, requireRoles, requireVerified } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validate.middleware';
import { CreateTripInputSchema } from '@raahat/shared';
import { routingService } from '../services/routing.service';
import { corridorService } from '../services/corridor.service';
import { alertService } from '../services/alert.service';

export const tripsRouter = Router();

tripsRouter.use(authenticateJwt);

/**
 * Create a new emergency trip
 */
tripsRouter.post(
  '/',
  requireRoles(['DRIVER']),
  requireVerified,
  validateBody(CreateTripInputSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const driverId = req.user!.id;
      const { pickup, drop, vehicleNumber } = req.body;

      // 1. Check if driver already has an ACTIVE trip
      const existingTrip = await prisma.trip.findFirst({
        where: { driverId, status: 'ACTIVE' },
      });

      if (existingTrip) {
        res.status(409).json({
          error: 'An active trip is already in progress. End or cancel it first.',
          tripId: existingTrip.id,
        });
        return;
      }

      // 2. Compute route via routing service
      const routeResult = await routingService.getRoute(
        { lat: pickup.lat, lng: pickup.lng },
        { lat: drop.lat, lng: drop.lng }
      );

      // 3. Save trip in database
      const trip = await prisma.trip.create({
        data: {
          driverId,
          vehicleNumber: vehicleNumber || 'AMBULANCE-01',
          pickupLat: pickup.lat,
          pickupLng: pickup.lng,
          pickupAddress: pickup.address,
          dropLat: drop.lat,
          dropLng: drop.lng,
          dropAddress: drop.address,
          routeGeoJson: JSON.stringify(routeResult.geoJson),
          currentLat: pickup.lat,
          currentLng: pickup.lng,
          status: 'ACTIVE',
        },
      });

      // 4. Trigger initial corridor evaluation for on-duty officers along the corridor
      try {
        const evaluation = await corridorService.evaluateCorridor(
          trip.id,
          JSON.stringify(routeResult.geoJson),
          pickup.lat,
          pickup.lng,
          15
        );
        await Promise.all(evaluation.newAlerts.map(alertInfo => alertService.dispatchAlert(
            trip.id,
            alertInfo.officerId,
            alertInfo.userId,
            alertInfo.etaSec,
            alertInfo.distanceAheadM,
            trip.vehicleNumber ?? undefined,
            pickup.lat,
            pickup.lng
          )));
      } catch (alertErr) {
        console.warn('[TripsRouter] Immediate corridor evaluation warning:', alertErr);
      }

      res.status(201).json({
        message: 'Trip created successfully',
        trip: {
          ...trip,
          route: routeResult.geoJson,
          distanceMeters: routeResult.distanceMeters,
          durationSeconds: routeResult.durationSeconds,
        },
      });
    } catch (error) {
      console.error('Error creating trip:', error);
      res.status(500).json({ error: 'Failed to create trip' });
    }
  }
);

/**
 * Get active trip for current driver
 */
tripsRouter.get(
  '/active',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const trip = await prisma.trip.findFirst({
        where: {
          driverId: req.user!.id,
          status: 'ACTIVE',
        },
        include: {
          alerts: {
            include: {
              officer: {
                include: {
                  user: { select: { name: true, badgeNumber: true } },
                },
              },
            },
          },
        },
      });

      if (!trip) {
        res.status(404).json({ error: 'No active trip found' });
        return;
      }

      res.json({
        ...trip,
        route: JSON.parse(trip.routeGeoJson),
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to retrieve active trip' });
    }
  }
);

/**
 * Get trip details by ID
 */
tripsRouter.get(
  '/:id',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const tripId = req.params.id as string;
      const trip = await prisma.trip.findUnique({
        where: { id: tripId },
        include: {
          driver: { select: { name: true, phone: true } },
          alerts: {
            include: {
              officer: {
                include: {
                  user: { select: { name: true, badgeNumber: true } },
                },
              },
            },
          },
        },
      });

      if (!trip) {
        res.status(404).json({ error: 'Trip not found' });
        return;
      }

      const alertsList = (trip as any).alerts || [];
      const ackCount = alertsList.filter((a: any) => a.status === 'ACKNOWLEDGED').length;

      res.json({
        ...trip,
        route: JSON.parse(trip.routeGeoJson),
        acknowledgedOfficersCount: ackCount,
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to retrieve trip' });
    }
  }
);

/**
 * End an active trip
 */
tripsRouter.patch(
  '/:id/end',
  requireRoles(['DRIVER', 'ADMIN']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const tripId = req.params.id as string;
      const trip = await prisma.trip.findUnique({ where: { id: tripId } });
      if (!trip) {
        res.status(404).json({ error: 'Trip not found' });
        return;
      }

      if (req.user!.role === 'DRIVER' && trip.driverId !== req.user!.id) {
        res.status(403).json({ error: 'Unauthorized to end this trip' });
        return;
      }

      const updated = await prisma.trip.update({
        where: { id: tripId },
        data: {
          status: 'COMPLETED',
          endedAt: new Date(),
        },
      });

      res.json({ message: 'Trip completed successfully', trip: updated });
    } catch (error) {
      res.status(500).json({ error: 'Failed to complete trip' });
    }
  }
);

/**
 * Cancel an active trip
 */
tripsRouter.patch(
  '/:id/cancel',
  requireRoles(['DRIVER', 'ADMIN']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const tripId = req.params.id as string;
      const trip = await prisma.trip.findUnique({ where: { id: tripId } });
      if (!trip) {
        res.status(404).json({ error: 'Trip not found' });
        return;
      }

      if (req.user!.role === 'DRIVER' && trip.driverId !== req.user!.id) {
        res.status(403).json({ error: 'Unauthorized to cancel this trip' });
        return;
      }

      const updated = await prisma.trip.update({
        where: { id: tripId },
        data: {
          status: 'CANCELLED',
          endedAt: new Date(),
        },
      });

      res.json({ message: 'Trip cancelled', trip: updated });
    } catch (error) {
      res.status(500).json({ error: 'Failed to cancel trip' });
    }
  }
);
