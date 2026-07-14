import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../config/db';
import { AppError } from '../utils/appError';
import { logger } from '../utils/logger';
import {
  generateAccessToken,
  generateRefreshToken,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
  verifyRefreshToken,
} from '../utils/jwt';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { generateTOTPSecret, verifyTOTP } from '../utils/totp';
import { sendPasswordResetEmail, sendVerificationEmail } from '../services/emailService';

// ==========================================
// VALIDATION SCHEMAS
// ==========================================

const registerSchema = z.object({
  email: z.string().email('Invalid email formatting'),
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  displayName: z.string().min(2, 'Display name must be at least 2 characters'),
});

const loginSchema = z.object({
  emailOrUsername: z.string().min(1, 'Email or username is required'),
  password: z.string().min(1, 'Password is required'),
});

const mfaVerifySchema = z.object({
  mfaToken: z.string().min(1, 'MFA Token is required'),
  totpCode: z.string().length(6, 'TOTP code must be exactly 6 digits'),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

// Profile Editing Schema
const profileUpdateSchema = z.object({
  displayName: z.string().min(2).optional(),
  headline: z.string().optional().nullable(),
  shortBio: z.string().optional().nullable(),
  longBio: z.string().optional().nullable(),
  avatarUrl: z.string().url().optional().nullable(),
  bannerUrl: z.string().url().optional().nullable(),
  location: z.string().optional().nullable(),
  availability: z.string().optional().nullable(),
  timezone: z.string().optional(),
  languages: z.array(z.string()).optional(),
  resumeUrl: z.string().url().optional().nullable(),
  cvUrl: z.string().url().optional().nullable(),
  profileVisibility: z.boolean().optional(),
  openToWork: z.boolean().optional(),
  hireMeStatus: z.boolean().optional(),
  freelanceStatus: z.boolean().optional(),
});

// ==========================================
// CONTROLLER FUNCTIONS
// ==========================================

/**
 * Register user / Bootstrap first administrator
 */
export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const validatedData = registerSchema.parse(req.body);

    const existingEmail = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });
    if (existingEmail) {
      return next(new AppError('An account with this email address already exists.', 409));
    }

    const existingUsername = await prisma.user.findUnique({
      where: { username: validatedData.username },
    });
    if (existingUsername) {
      return next(new AppError('This username is already taken.', 409));
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(validatedData.password, salt);

    const totalUsers = await prisma.user.count();
    const assignedRole = totalUsers === 0 ? Role.SUPER_ADMIN : Role.WRITER;

    const userSlug = validatedData.displayName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const hashedVerificationToken = crypto.createHash('sha256').update(verificationToken).digest('hex');

    const newUser = await prisma.user.create({
      data: {
        email: validatedData.email,
        username: validatedData.username,
        passwordHash,
        displayName: validatedData.displayName,
        role: assignedRole,
        slug: userSlug,
        avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${validatedData.username}`,
        timezone: 'UTC',
        verificationToken: hashedVerificationToken,
        emailVerified: false,
      },
    });

    logger.info(`New user registered: ${newUser.email} (Assigned Role: ${newUser.role})`);

    await sendVerificationEmail(newUser.email, verificationToken)
      .catch((err) => logger.error('Async account verification email failure:', err));

    const { passwordHash: _, ...userResponse } = newUser;

    res.status(201).json({
      status: 'success',
      message: assignedRole === Role.SUPER_ADMIN
        ? 'Super Admin initialized successfully. Please verify your email account.'
        : 'User account created successfully. Please verify your email to activate your access.',
      data: { user: userResponse },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Login administrator / user
 */
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const validatedData = loginSchema.parse(req.body);

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: validatedData.emailOrUsername },
          { username: validatedData.emailOrUsername },
        ],
        deletedAt: null,
      },
    });

    if (!user) {
      return next(new AppError('Invalid credentials or account disabled.', 401));
    }

    if (user.lockoutExpires && user.lockoutExpires > new Date()) {
      return next(new AppError('Account is temporarily locked due to repeated failures. Try again later.', 403));
    }

    const isPasswordValid = await bcrypt.compare(validatedData.password, user.passwordHash);
    if (!isPasswordValid) {
      const updatedAttempts = user.loginAttempts + 1;
      const lockoutExpires = updatedAttempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          loginAttempts: updatedAttempts,
          ...(lockoutExpires && { lockoutExpires }),
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'USER_LOGIN_FAILED',
          details: JSON.stringify({ ip: req.ip, attempts: updatedAttempts }),
          ipAddress: req.ip || '0.0.0.0',
          userAgent: req.headers['user-agent'] || 'unknown',
          status: 'FAILED',
        },
      });

      return next(new AppError('Invalid credentials.', 401));
    }

    if (!user.emailVerified) {
      return next(new AppError('Please verify your email address to activate your account access.', 403));
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        loginAttempts: 0,
        lockoutExpires: null,
      },
    });

    if (user.twoFactorEnabled) {
      const mfaToken = crypto.randomBytes(32).toString('hex');
      const hashedMfaToken = crypto.createHash('sha256').update(mfaToken).digest('hex');
      
      await prisma.user.update({
        where: { id: user.id },
        data: { verificationToken: hashedMfaToken },
      });

      res.status(200).json({
        status: 'success',
        mfaRequired: true,
        message: 'Two-Factor Authentication is active. Input verification code.',
        data: { mfaToken },
      });
      return;
    }

    await completeUserLoginSession(req, res, user);
  } catch (error) {
    next(error);
  }
};

/**
 * Verify account email activation link
 */
export const verifyEmail = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { token } = req.params;
    if (!token) return next(new AppError('Verification token is required.', 400));

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await prisma.user.findFirst({
      where: { verificationToken: hashedToken, emailVerified: false, deletedAt: null },
    });

    if (!user) {
      return next(new AppError('Invalid, expired, or already-validated verification link.', 400));
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationToken: null,
      },
    });

    res.status(200).json({
      status: 'success',
      message: 'Email successfully verified! Your account is now fully active. You may login.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify 2FA TOTP code and issue final cookies
 */
export const verifyMfa = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const validated = mfaVerifySchema.parse(req.body);
    const hashedMfaToken = crypto.createHash('sha256').update(validated.mfaToken).digest('hex');

    const user = await prisma.user.findFirst({
      where: { verificationToken: hashedMfaToken, deletedAt: null },
    });

    if (!user || !user.twoFactorSecret) {
      return next(new AppError('Invalid or expired MFA validation context.', 401));
    }

    const isCodeValid = verifyTOTP(user.twoFactorSecret, validated.totpCode);
    if (!isCodeValid) {
      return next(new AppError('Incorrect 2FA authenticator pin.', 401));
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { verificationToken: null },
    });

    await completeUserLoginSession(req, res, user);
  } catch (error) {
    next(error);
  }
};

/**
 * Update Profile Settings (Protected)
 */
export const updateProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) return next(new AppError('Unauthorized.', 401));

    const validated = profileUpdateSchema.parse(req.body);

    let userSlug: string | undefined;
    if (validated.displayName) {
      userSlug = validated.displayName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');

      const collision = await prisma.user.findFirst({
        where: { slug: userSlug, NOT: { id: req.user.id } },
      });
      if (collision) {
        userSlug = `${userSlug}-${Math.floor(Math.random() * 1000)}`;
      }
    }

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...validated,
        ...(userSlug && { slug: userSlug }),
      },
    });

    logger.info(`Profile settings updated for user: ${updated.email}`);

    const { passwordHash: _, ...profileResponse } = updated;

    res.status(200).json({
      status: 'success',
      message: 'Profile settings updated successfully.',
      data: { user: profileResponse },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Helper session generator to centralize login responses
 */
const completeUserLoginSession = async (
  req: Request,
  res: Response,
  user: any
): Promise<void> => {
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const fingerprint = crypto.randomBytes(32).toString('hex');
  const tokenPayload = {
    userId: user.id,
    role: user.role,
    fingerprint,
  };

  const accessToken = generateAccessToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload);

  const hashedAccessToken = crypto.createHash('sha256').update(accessToken).digest('hex');
  const hashedRefreshToken = crypto.createHash('sha256').update(refreshToken).digest('hex');

  await prisma.session.create({
    data: {
      userId: user.id,
      token: hashedAccessToken,
      refreshToken: hashedRefreshToken,
      ipAddress: req.ip || '0.0.0.0',
      userAgent: req.headers['user-agent'] || 'unknown',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: 'USER_LOGIN_SUCCESS',
      details: JSON.stringify({ ip: req.ip, mfaUsed: user.twoFactorEnabled }),
      ipAddress: req.ip || '0.0.0.0',
      userAgent: req.headers['user-agent'] || 'unknown',
      status: 'SUCCESS',
    },
  });

  setRefreshTokenCookie(res, refreshToken);

  const { passwordHash: _, ...profileResponse } = user;

  res.status(200).json({
    status: 'success',
    message: 'Logged in successfully.',
    data: {
      accessToken,
      user: profileResponse,
    },
  });
};

/**
 * Initiate password reset request
 */
export const forgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email) return next(new AppError('Please provide an email address.', 400));

    const user = await prisma.user.findUnique({
      where: { email, deletedAt: null },
    });

    if (!user) {
      res.status(200).json({
        status: 'success',
        message: 'If an account exists, a password reset link has been dispatched.',
      });
      return;
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: hashedResetToken,
        resetTokenExpires: new Date(Date.now() + 1 * 60 * 60 * 1000), // 1 hour
      },
    });

    await sendPasswordResetEmail(user.email, resetToken)
      .catch((err) => logger.error('Password reset email dispatch failure:', err));

    res.status(200).json({
      status: 'success',
      message: 'If an account exists, a password reset link has been dispatched.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reset password via secure token
 */
export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const validated = resetPasswordSchema.parse(req.body);
    const hashedToken = crypto.createHash('sha256').update(validated.token).digest('hex');

    const user = await prisma.user.findFirst({
      where: {
        resetToken: hashedToken,
        resetTokenExpires: { gt: new Date() },
        deletedAt: null,
      },
    });

    if (!user) {
      return next(new AppError('Reset token is invalid or has expired.', 400));
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(validated.password, salt);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExpires: null,
        loginAttempts: 0,
        lockoutExpires: null,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'PASSWORD_RESET_SUCCESS',
        details: JSON.stringify({ ip: req.ip }),
        ipAddress: req.ip || '0.0.0.0',
        userAgent: req.headers['user-agent'] || 'unknown',
        status: 'SUCCESS',
      },
    });

    res.status(200).json({
      status: 'success',
      message: 'Password reset completed. You may now login.',
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// TWO-FACTOR AUTHENTICATION CONTROLLERS
// ==========================================

export const enable2FA = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) return next(new AppError('Unauthorized.', 401));

    const secret = generateTOTPSecret();
    const qrCodePayload = `otpauth://totp/${process.env.TOTP_ISSUER || 'PortfolioCMS'}:${req.user.email}?secret=${secret}&issuer=${process.env.TOTP_ISSUER || 'PortfolioCMS'}`;

    await prisma.user.update({
      where: { id: req.user.id },
      data: { twoFactorSecret: secret },
    });

    res.status(200).json({
      status: 'success',
      data: {
        secret,
        otpauthUrl: qrCodePayload,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const verifyAndEnable2FA = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) return next(new AppError('Unauthorized.', 401));
    const { totpCode } = req.body;

    if (!totpCode || totpCode.length !== 6) {
      return next(new AppError('6-digit verification pin is required.', 400));
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user || !user.twoFactorSecret) {
      return next(new AppError('Two Factor registration flow not initialized.', 400));
    }

    const isCodeValid = verifyTOTP(user.twoFactorSecret, totpCode);
    if (!isCodeValid) {
      return next(new AppError('Invalid authenticator verification code.', 400));
    }

    await prisma.user.update({
      where: { id: req.user.id },
      data: { twoFactorEnabled: true },
    });

    res.status(200).json({
      status: 'success',
      message: 'Two-Factor Authentication activated and locked successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const disable2FA = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) return next(new AppError('Unauthorized.', 401));
    const { totpCode } = req.body;

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      return next(new AppError('Two-Factor is not currently enabled.', 400));
    }

    const isCodeValid = verifyTOTP(user.twoFactorSecret, totpCode);
    if (!isCodeValid) {
      return next(new AppError('Invalid authenticator verification code.', 400));
    }

    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
      },
    });

    res.status(200).json({
      status: 'success',
      message: 'Two-Factor Authentication deactivated.',
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// SESSION MANAGEMENT CONTROLLERS
// ==========================================

export const getActiveSessions = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) return next(new AppError('Unauthorized.', 401));

    const sessions = await prisma.session.findMany({
      where: { userId: req.user.id, isRevoked: false, expiresAt: { gt: new Date() } },
      select: {
        id: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
      },
    });

    res.status(200).json({
      status: 'success',
      results: sessions.length,
      data: { sessions },
    });
  } catch (error) {
    next(error);
  }
};

export const revokeSession = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) return next(new AppError('Unauthorized.', 401));
    const { sessionId } = req.params;

    const session = await prisma.session.findUnique({ where: { id: sessionId } });
    if (!session || session.userId !== req.user.id) {
      return next(new AppError('Target session not found.', 404));
    }

    await prisma.session.update({
      where: { id: sessionId },
      data: { isRevoked: true },
    });

    res.status(200).json({
      status: 'success',
      message: 'Session revoked successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// NEW: USER & ROLE MANAGEMENT CONTROLLERS
// ==========================================

/**
 * List all users / operators (Super-Admin / Admin Only)
 */
export const getUsersList = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        displayName: true,
        emailVerified: true,
        twoFactorEnabled: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    res.status(200).json({
      status: 'success',
      results: users.length,
      data: { users },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Promote / Change operator roles (Super-Admin Exclusive)
 */
export const updateUserRole = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role || !Object.values(Role).includes(role)) {
      return next(new AppError('Please provide a valid system role.', 400));
    }

    const targetUser = await prisma.user.findUnique({ where: { id, deletedAt: null } });
    if (!targetUser) return next(new AppError('Target user account not found.', 404));

    // Prevent Super-Admin from demoting themselves (failsafe security)
    if (targetUser.id === req.user?.id) {
      return next(new AppError('You cannot alter your own system role permissions.', 400));
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { role: role as Role },
    });

    logger.info(`User role promoted/changed: ${updated.email} is now ${updated.role}`);

    res.status(200).json({
      status: 'success',
      message: `Successfully updated user role to ${updated.role}.`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Soft Delete other operators (Super-Admin Exclusive)
 */
export const deleteUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const targetUser = await prisma.user.findUnique({ where: { id, deletedAt: null } });
    if (!targetUser) return next(new AppError('User account not found.', 404));

    if (targetUser.id === req.user?.id) {
      return next(new AppError('You cannot delete your own active administrator session.', 400));
    }

    await prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    logger.warn(`User account disabled/deleted by Super Admin: ${targetUser.email}`);

    res.status(204).json({
      status: 'success',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Session refresh / Token Rotation (RTR)
 */
export const refresh = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tokenFromCookie = req.signedCookies.refreshToken || req.cookies.refreshToken;
    
    if (!tokenFromCookie) {
      return next(new AppError('Refresh token missing. Authentication failed.', 401));
    }

    const incomingHash = crypto.createHash('sha256').update(tokenFromCookie).digest('hex');

    const session = await prisma.session.findUnique({
      where: { refreshToken: incomingHash },
      include: { user: true },
    });

    if (!session || session.isRevoked || session.expiresAt < new Date()) {
      try {
        const decoded = verifyRefreshToken(tokenFromCookie);
        logger.error(`BREACH DETECTED! Reused/revoked refresh token for userId: ${decoded.userId}. Revoking all current active sessions.`);
        
        await prisma.session.updateMany({
          where: { userId: decoded.userId },
          data: { isRevoked: true },
        });

        clearRefreshTokenCookie(res);
        return next(new AppError('Compromised session detected. All active tokens revoked.', 401));
      } catch {
        clearRefreshTokenCookie(res);
        return next(new AppError('Expired or invalid session token.', 401));
      }
    }

    const decoded = verifyRefreshToken(tokenFromCookie);
    logger.debug(`Refreshing credentials for User ID: ${decoded.userId}`);

    const newFingerprint = crypto.randomBytes(32).toString('hex');
    const tokenPayload = {
      userId: session.userId,
      role: session.user.role,
      fingerprint: newFingerprint,
    };

    const newAccessToken = generateAccessToken(tokenPayload);
    const newRefreshToken = generateRefreshToken(tokenPayload);

    const newHashedAccessToken = crypto.createHash('sha256').update(newAccessToken).digest('hex');
    const newHashedRefreshToken = crypto.createHash('sha256').update(newRefreshToken).digest('hex');

    await prisma.session.update({
      where: { id: session.id },
      data: {
        isRevoked: true,
      },
    });

    await prisma.session.create({
      data: {
        userId: session.userId,
        token: newHashedAccessToken,
        refreshToken: newHashedRefreshToken,
        ipAddress: req.ip || '0.0.0.0',
        userAgent: req.headers['user-agent'] || 'unknown',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    setRefreshTokenCookie(res, newRefreshToken);

    res.status(200).json({
      status: 'success',
      data: {
        accessToken: newAccessToken,
      },
    });
  } catch (error) {
    clearRefreshTokenCookie(res);
    next(error);
  }
};

/**
 * Logout single device / session
 */
export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (req.sessionToken) {
      await prisma.session.updateMany({
        where: { token: req.sessionToken },
        data: { isRevoked: true },
      });
      
      if (req.user) {
        await prisma.auditLog.create({
          data: {
            userId: req.user.id,
            action: 'USER_LOGOUT_SUCCESS',
            details: JSON.stringify({ ip: req.ip }),
            ipAddress: req.ip || '0.0.0.0',
            userAgent: req.headers['user-agent'] || 'unknown',
            status: 'SUCCESS',
          },
        });
      }
    }

    clearRefreshTokenCookie(res);

    res.status(200).json({
      status: 'success',
      message: 'Logged out successfully from this device.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Remote logout on all active devices
 */
export const logoutAllDevices = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError('Context user missing.', 401));
    }

    await prisma.session.updateMany({
      where: { userId: req.user.id },
      data: { isRevoked: true },
    });

    clearRefreshTokenCookie(res);

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'USER_LOGOUT_ALL_DEVICES',
        details: JSON.stringify({ ip: req.ip }),
        ipAddress: req.ip || '0.0.0.0',
        userAgent: req.headers['user-agent'] || 'unknown',
        status: 'SUCCESS',
      },
    });

    res.status(200).json({
      status: 'success',
      message: 'Logged out successfully from all active devices.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get active user details
 */
export const getMe = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError('Session expired.', 401));
    }

    const userProfile = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        sessions: {
          where: { isRevoked: false, expiresAt: { gt: new Date() } },
          select: {
            id: true,
            ipAddress: true,
            userAgent: true,
            deviceType: true,
            createdAt: true,
          },
        },
      },
    });

    if (!userProfile) {
      return next(new AppError('User profile not found.', 404));
    }

    const { passwordHash: _, ...profileData } = userProfile;

    res.status(200).json({
      status: 'success',
      data: { user: profileData },
    });
  } catch (error) {
    next(error);
  }
};
