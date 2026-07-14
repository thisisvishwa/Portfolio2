import { Router } from 'express';
import { trackPageView, getDashboardAnalytics } from '../controllers/analyticsController';
import { protect, restrictTo } from '../middlewares/auth';
import { Role } from '@prisma/client';
import { apiLimiter } from '../middlewares/rateLimiter';

const router = Router();

// ==========================================
// PUBLIC GUEST TRACKER SUBMISSION
// ==========================================

router.post('/track', apiLimiter, trackPageView);

// ==========================================
// PROTECTED ADMINISTRATIVE RETRIEVALS
// ==========================================

router.get(
  '/dashboard',
  protect,
  restrictTo(Role.SUPER_ADMIN, Role.ADMIN),
  getDashboardAnalytics
);

export default router;
