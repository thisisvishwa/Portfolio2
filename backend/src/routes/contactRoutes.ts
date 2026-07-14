import { Router } from 'express';
import {
  submitContactRequest,
  getContactRequests,
  updateMessageStatus,
  subscribeNewsletter,
  verifySubscription,
  unsubscribeNewsletter,
} from '../controllers/contactController';
import { protect, restrictTo } from '../middlewares/auth';
import { Role } from '@prisma/client';
import { apiLimiter } from '../middlewares/rateLimiter';

const router = Router();

// ==========================================
// PUBLIC GUEST HANDLERS (Protected by general rate limiters)
// ==========================================

router.post('/submit', apiLimiter, submitContactRequest);
router.post('/newsletter/subscribe', apiLimiter, subscribeNewsletter);
router.get('/newsletter/verify/:token', verifySubscription);
router.post('/newsletter/unsubscribe', apiLimiter, unsubscribeNewsletter);

// ==========================================
// PROTECTED ADMINISTRATIVE HANDLERS
// ==========================================

router.get(
  '/',
  protect,
  restrictTo(Role.SUPER_ADMIN, Role.ADMIN, Role.EDITOR),
  getContactRequests
);

router.patch(
  '/:id',
  protect,
  restrictTo(Role.SUPER_ADMIN, Role.ADMIN, Role.EDITOR),
  updateMessageStatus
);

export default router;
