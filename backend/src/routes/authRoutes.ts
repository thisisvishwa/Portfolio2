import { Router } from 'express';
import {
  register,
  login,
  refresh,
  logout,
  logoutAllDevices,
  getMe,
  verifyMfa,
  forgotPassword,
  resetPassword,
  enable2FA,
  verifyAndEnable2FA,
  disable2FA,
  getActiveSessions,
  revokeSession,
  verifyEmail,
  updateProfile,
  getUsersList,
  updateUserRole,
  deleteUser,
} from '../controllers/authController';
import { protect, restrictTo } from '../middlewares/auth';
import { Role } from '@prisma/client';
import { authLimiter } from '../middlewares/rateLimiter';

const router = Router();

// ==========================================
// PUBLIC ENDPOINTS (Guarded by auth rate limiter)
// ==========================================

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/refresh', refresh);

// Secure Security Verification Loops
router.post('/verify-mfa', authLimiter, verifyMfa);
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password', authLimiter, resetPassword);
router.get('/verify-email/:token', authLimiter, verifyEmail);

// ==========================================
// PROTECTED ENDPOINTS (Session required)
// ==========================================

router.post('/logout', protect, logout);
router.post('/logout-all', protect, logoutAllDevices);
router.get('/me', protect, getMe);
router.patch('/profile', protect, updateProfile);

// Two-Factor Activation Steps
router.post('/mfa/enable', protect, enable2FA);
router.post('/mfa/verify-enable', protect, verifyAndEnable2FA);
router.post('/mfa/disable', protect, disable2FA);

// Remote Session Monitors
router.get('/sessions', protect, getActiveSessions);
router.delete('/sessions/:sessionId', protect, revokeSession);

// User & Role Management (Restricted to Super-Admins and Admins)
router.get('/users', protect, restrictTo(Role.SUPER_ADMIN, Role.ADMIN), getUsersList);
router.patch('/users/:id/role', protect, restrictTo(Role.SUPER_ADMIN), updateUserRole);
router.delete('/users/:id', protect, restrictTo(Role.SUPER_ADMIN), deleteUser);

export default router;
