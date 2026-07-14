import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { verifyAccessToken } from '../utils/jwt';
import { AppError } from '../utils/appError';
import { Role } from '@prisma/client';
import { logger } from '../utils/logger';

// Extend Express Request object to hold current user & session details
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: Role;
        displayName: string;
      };
      sessionToken?: string;
    }
  }
}

/**
 * Authentication guard middleware.
 * Verifies the validity of the JWT Access Token provided in the Authorization header.
 */
export const protect = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let accessToken: string | undefined;

    // Universal bypass for unused parameters under strict tsconfig
    if (res) {
      // res is required in express middleware signatures
    }

    // 1. Extract Bearer Token from Authorization Header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      accessToken = req.headers.authorization.split(' ')[1];
    }

    if (!accessToken) {
      return next(new AppError('Authentication failed. Access Token missing.', 401));
    }

    // 2. Cryptographically Verify Access Token
    const decoded = verifyAccessToken(accessToken);

    // 3. Verify Session is active and hasn't been revoked in database (RTR protection)
    const activeSession = await prisma.session.findFirst({
      where: {
        userId: decoded.userId,
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (!activeSession) {
      return next(new AppError('Your session has been terminated or revoked. Please login again.', 401));
    }

    // 4. Retrieve User Profile & status
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId, deletedAt: null },
      select: {
        id: true,
        email: true,
        role: true,
        displayName: true,
        lockoutExpires: true,
      },
    });

    if (!user) {
      return next(new AppError('Account does not exist or has been disabled.', 401));
    }

    // Check account lockout
    if (user.lockoutExpires && user.lockoutExpires > new Date()) {
      return next(new AppError('Account is currently locked out.', 403));
    }

    // 5. Append User details to request context
    req.user = user;
    req.sessionToken = activeSession.token;
    
    logger.debug(`Authenticated user ${user.email} (Role: ${user.role})`);
    next();
  } catch (error) {
    logger.debug('Token verification failed:', error);
    next(new AppError('Invalid token signature or expired session.', 401));
  }
};

/**
 * Role-Based Access Control (RBAC) Guard.
 * Restricts access to users containing specific authorized permission roles.
 */
export const restrictTo = (...allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (res) {
      // res is required in express middleware signatures
    }

    if (!req.user) {
      return next(new AppError('User session context missing. Authentication required.', 401));
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn(`Permission denied: User ${req.user.email} (Role: ${req.user.role}) tried to access resource requiring [${allowedRoles.join(', ')}]`);
      return next(
        new AppError('Permission Denied. You do not possess clearance for this action.', 403)
      );
    }

    next();
  };
};
