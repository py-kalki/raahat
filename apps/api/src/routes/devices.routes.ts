import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';
import { authenticateJwt } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validate.middleware';
import { RegisterPushTokenSchema } from '@raahat/shared';

export const devicesRouter = Router();

devicesRouter.use(authenticateJwt);

devicesRouter.post(
  '/push-token',
  validateBody(RegisterPushTokenSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { token } = req.body;
      const userId = req.user!.id;

      await prisma.user.update({
        where: { id: userId },
        data: { pushToken: token },
      });

      res.json({ success: true, message: 'Push token registered' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to register push token' });
    }
  }
);
