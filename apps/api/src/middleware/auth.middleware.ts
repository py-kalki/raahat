import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma';
import { UserRole } from '@raahat/shared';

export interface AuthenticatedUser {
  id: string;
  phone: string;
  role: UserRole;
  verified: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'raahat_jwt_secret_change_in_production_key_123456789';

export const authenticateJwt = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or malformed Authorization header' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedUser;

    // Check user in database
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, phone: true, role: true, verified: true },
    });

    if (!user) {
      res.status(401).json({ error: 'User no longer exists' });
      return;
    }

    req.user = {
      id: user.id,
      phone: user.phone,
      role: user.role as UserRole,
      verified: user.verified,
    };

    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export const requireRoles = (roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: `Forbidden: requires one of [${roles.join(', ')}]` });
      return;
    }

    next();
  };
};

export const requireVerified = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  // Admins are always authorized
  if (req.user.role === 'ADMIN') {
    return next();
  }

  if (!req.user.verified) {
    res.status(403).json({
      error: 'Account pending admin verification. You cannot perform this action until verified.',
    });
    return;
  }

  next();
};
