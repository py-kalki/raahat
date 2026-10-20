import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';
import { authenticateJwt, requireRoles } from '../middleware/auth.middleware';

export const adminRouter = Router();

adminRouter.use(authenticateJwt);
adminRouter.use(requireRoles(['ADMIN']));

/**
 * List users with verification filter
 */
adminRouter.get('/users', async (req: Request, res: Response): Promise<void> => {
  try {
    const status = req.query.status as string | undefined;

    const users = await prisma.user.findMany({
      where: status ? { verificationStatus: status as any } : undefined,
      select: {
        id: true,
        phone: true,
        name: true,
        role: true,
        verified: true,
        verificationStatus: true,
        badgeNumber: true,
        vehicleNumber: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve users' });
  }
});

/**
 * Verify or reject user
 */
adminRouter.patch('/users/:id/verify', async (req: Request, res: Response): Promise<void> => {
  try {
    const { status } = req.body; // 'APPROVED' | 'REJECTED'

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      res.status(400).json({ error: 'Status must be APPROVED or REJECTED' });
      return;
    }

    const verified = status === 'APPROVED';

    const userId = req.params.id as string;
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        verified,
        verificationStatus: status,
      },
      select: {
        id: true,
        phone: true,
        name: true,
        role: true,
        verified: true,
        verificationStatus: true,
      },
    });

    res.json({
      message: `User ${status.toLowerCase()} successfully`,
      user: updatedUser,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update verification status' });
  }
});

/**
 * Live overview for Admin Map
 */
adminRouter.get('/overview', async (req: Request, res: Response): Promise<void> => {
  try {
    const activeTrips = await prisma.trip.findMany({
      where: { status: 'ACTIVE' },
      include: {
        driver: { select: { name: true, phone: true } },
        alerts: {
          select: {
            id: true,
            officerId: true,
            status: true,
            etaSec: true,
          },
        },
      },
    });

    const onDutyOfficers = await prisma.officer.findMany({
      where: { onDuty: true },
      include: {
        user: { select: { name: true, phone: true, badgeNumber: true } },
      },
    });

    res.json({
      activeTrips: activeTrips.map((t) => ({
        ...t,
        route: JSON.parse(t.routeGeoJson),
      })),
      onDutyOfficers,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get live overview' });
  }
});

/**
 * Trip history & statistics
 */
adminRouter.get('/trips', async (req: Request, res: Response): Promise<void> => {
  try {
    const trips = await prisma.trip.findMany({
      include: {
        driver: { select: { name: true, phone: true } },
        alerts: {
          include: {
            officer: {
              include: { user: { select: { name: true, badgeNumber: true } } },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json(trips);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch trip history' });
  }
});
