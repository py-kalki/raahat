import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma';
import { validateBody } from '../middleware/validate.middleware';
import { authenticateJwt } from '../middleware/auth.middleware';
import { RegisterInputSchema, LoginInputSchema } from '@raahat/shared';

export const authRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'raahat_jwt_secret_change_in_production_key_123456789';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Register new user (Driver, Officer, or Admin)
 */
authRouter.post(
  '/register',
  validateBody(RegisterInputSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { phone, password, name, role, badgeNumber, vehicleNumber } = req.body;

      // Check if user already exists
      const existing = await prisma.user.findUnique({ where: { phone } });
      if (existing) {
        res.status(409).json({ error: 'Phone number already registered' });
        return;
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      // Auto-verify ADMIN for development/first setup, DRIVER and OFFICER require approval
      const isAutoVerifyAdmin = role === 'ADMIN';

      const user = await prisma.user.create({
        data: {
          phone,
          password: hashedPassword,
          name,
          role,
          verified: isAutoVerifyAdmin,
          verificationStatus: isAutoVerifyAdmin ? 'APPROVED' : 'PENDING',
          badgeNumber,
          vehicleNumber,
          ...(role === 'OFFICER'
            ? {
                officerProfile: {
                  create: {
                    onDuty: false,
                  },
                },
              }
            : {}),
        },
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
      });

      const token = jwt.sign(
        { id: user.id, phone: user.phone, role: user.role, verified: user.verified },
        JWT_SECRET,
        { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any }
      );

      res.status(201).json({
        message: isAutoVerifyAdmin
          ? 'Registration successful'
          : 'Registration submitted. Awaiting administrator verification.',
        token,
        user,
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Failed to register user' });
    }
  }
);

/**
 * Login
 */
authRouter.post(
  '/login',
  validateBody(LoginInputSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { phone, password } = req.body;

      const user = await prisma.user.findUnique({
        where: { phone },
        include: { officerProfile: true },
      });

      if (!user) {
        res.status(401).json({ error: 'Invalid phone or password' });
        return;
      }

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        res.status(401).json({ error: 'Invalid phone or password' });
        return;
      }

      const token = jwt.sign(
        { id: user.id, phone: user.phone, role: user.role, verified: user.verified },
        JWT_SECRET,
        { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any }
      );

      res.json({
        token,
        user: {
          id: user.id,
          phone: user.phone,
          name: user.name,
          role: user.role,
          verified: user.verified,
          verificationStatus: user.verificationStatus,
          badgeNumber: user.badgeNumber,
          vehicleNumber: user.vehicleNumber,
          onDuty: user.officerProfile?.onDuty ?? false,
        lastLocationAt: user.officerProfile?.lastLocationAt ?? null,
          createdAt: user.createdAt,
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Failed to log in' });
    }
  }
);

/**
 * Get current authenticated user profile
 */
authRouter.get(
  '/me',
  authenticateJwt,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
        include: { officerProfile: true },
      });

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.json({
        id: user.id,
        phone: user.phone,
        name: user.name,
        role: user.role,
        verified: user.verified,
        verificationStatus: user.verificationStatus,
        badgeNumber: user.badgeNumber,
        vehicleNumber: user.vehicleNumber,
        onDuty: user.officerProfile?.onDuty ?? false,
        lastLocationAt: user.officerProfile?.lastLocationAt ?? null,
        createdAt: user.createdAt,
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to retrieve profile' });
    }
  }
);
