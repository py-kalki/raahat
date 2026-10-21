import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';
import { authenticateJwt, requireRoles, requireVerified } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validate.middleware';
import { OfficerDutyUpdateSchema, OfficerLocationUpdateSchema } from '@raahat/shared';
import { alertService } from '../services/alert.service';

export const officersRouter = Router();

// Protect all officer routes
officersRouter.use(authenticateJwt);

officersRouter.get('/alerts/active', requireRoles(['OFFICER']), requireVerified, async (req, res) => {
  try {
    const alerts = await prisma.alert.findMany({
      where: { officer: { userId: req.user!.id }, status: 'PENDING', trip: { status: 'ACTIVE' } },
      include: { trip: true }, orderBy: { alertedAt: 'desc' }, take: 20,
    });
    res.json(alerts.map(alert => ({
      alertId: alert.id, tripId: alert.tripId, officerId: alert.officerId,
      etaSec: Math.max(0, alert.etaSec - (Date.now() - alert.alertedAt.getTime()) / 1000),
      distanceAheadM: alert.distanceAheadM, vehicleNumber: alert.trip.vehicleNumber || 'Ambulance',
      message: 'Pending corridor alert — check the approaching ambulance.',
      ambulanceLat: alert.trip.currentLat ?? alert.trip.pickupLat,
      ambulanceLng: alert.trip.currentLng ?? alert.trip.pickupLng,
    })));
  } catch { res.status(500).json({ error: 'Could not load pending alerts.' }); }
});

/**
 * Toggle On/Off Duty
 */
officersRouter.patch(
  '/me/duty',
  requireRoles(['OFFICER']),
  requireVerified,
  validateBody(OfficerDutyUpdateSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { onDuty } = req.body;
      const userId = req.user!.id;

      const officer = await prisma.officer.upsert({
        where: { userId },
        create: {
          userId,
          onDuty,
          // Nullify location if going off duty for privacy
          currentLat: onDuty ? undefined : null,
          currentLng: onDuty ? undefined : null,
        },
        update: {
          onDuty,
          currentLat: onDuty ? undefined : null,
          currentLng: onDuty ? undefined : null,
        },
      });

      res.json({
        message: onDuty ? 'Status set to ON DUTY' : 'Status set to OFF DUTY',
        onDuty: officer.onDuty,
      });
    } catch (error) {
      console.error('Error toggling duty:', error);
      res.status(500).json({ error: 'Failed to update duty status' });
    }
  }
);

/**
 * Location update (HTTP fallback)
 */
officersRouter.post(
  '/me/location',
  requireRoles(['OFFICER']),
  requireVerified,
  validateBody(OfficerLocationUpdateSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { lat, lng } = req.body;
      const userId = req.user!.id;

      await prisma.officer.update({
        where: { userId },
        data: {
          currentLat: lat,
          currentLng: lng,
          lastLocationAt: new Date(),
        },
      });

      res.json({ success: true, timestamp: Date.now() });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update officer location' });
    }
  }
);

/**
 * Acknowledge an emergency alert
 */
officersRouter.post(
  '/alerts/:id/ack',
  requireRoles(['OFFICER']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const alertId = req.params.id as string;
      const userId = req.user!.id;

      const result = await alertService.acknowledgeAlert(alertId, userId);
      res.json({
        success: true,
        message: 'Alert acknowledged successfully',
        ...result,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to acknowledge alert' });
    }
  }
);

/**
 * List active on-duty officers
 */
officersRouter.get(
  '/active',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const officers = await prisma.officer.findMany({
        where: { onDuty: true },
        include: {
          user: {
            select: { id: true, name: true, badgeNumber: true, phone: true },
          },
        },
      });

      res.json(officers);
    } catch (error) {
      res.status(500).json({ error: 'Failed to list active officers' });
    }
  }
);
