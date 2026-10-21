import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';
import { authenticateJwt } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validate.middleware';
import { RegisterPushTokenSchema } from '@raahat/shared';
import { WebPushSubscriptionSchema, webPushPublicKey, sendWebPush } from '../services/web-push.service';

export const devicesRouter = Router();

devicesRouter.use(authenticateJwt);

devicesRouter.get('/web-push/config', (_req, res) => {
  const publicKey = webPushPublicKey();
  if (!publicKey) { res.status(503).json({ error: 'Browser push is not configured on the server yet.' }); return; }
  res.json({ publicKey });
});

devicesRouter.post('/web-push', validateBody(WebPushSubscriptionSchema), async (req, res) => {
  try {
    if (!webPushPublicKey()) { res.status(503).json({ error: 'Browser push is not configured on the server yet.' }); return; }
    const token = `webpush:${JSON.stringify(req.body)}`;
    // Transfer this browser's subscription on persona switch, instead of notifying the previous user.
    await prisma.$transaction([
      prisma.user.updateMany({ where: { pushToken: token, id: { not: req.user!.id } }, data: { pushToken: null } }),
      prisma.user.update({ where: { id: req.user!.id }, data: { pushToken: token } }),
    ]);
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Could not register browser notifications.' }); }
});

devicesRouter.delete('/web-push', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { pushToken: true } });
    if (user?.pushToken?.startsWith('webpush:') && JSON.parse(user.pushToken.slice(8)).endpoint === req.body.endpoint) {
      await prisma.user.updateMany({ where: { id: req.user!.id, pushToken: user.pushToken }, data: { pushToken: null } });
    }
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Could not disable browser notifications.' }); }
});

const lastTest = new Map<string, number>();
devicesRouter.post('/web-push/test', async (req, res) => {
  const id = req.user!.id;
  if (Date.now() - (lastTest.get(id) || 0) < 30000) { res.status(429).json({ error: 'Wait 30 seconds before sending another test.' }); return; }
  if (lastTest.size > 5000) lastTest.clear();
  lastTest.set(id, Date.now());
  try {
    const user = await prisma.user.findUnique({ where: { id }, select: { pushToken: true } });
    if (!user?.pushToken?.startsWith('webpush:')) { res.status(400).json({ error: 'Enable browser notifications first.' }); return; }
    const sent = await sendWebPush(user.pushToken, { title: 'Raahat demo notification', body: 'Browser notifications are connected. This is a test, not an emergency.' });
    res.status(sent ? 200 : 502).json(sent ? { success: true } : { error: 'Push delivery failed. Enable notifications again and check server configuration.' });
  } catch { res.status(500).json({ error: 'Could not send the test notification.' }); }
});

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
