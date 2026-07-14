import { Router } from 'express';
import {
  getSubscribers,
  importSubscribersJSON,
  exportSubscribersCSV,
  sendNewsletterCampaign,
} from '../controllers/newsletterController';
import { protect, restrictTo } from '../middlewares/auth';
import { Role } from '@prisma/client';

const router = Router();

// ==========================================
// ALL NEWSLETTER MANAGEMENTS SECURED (ADMINS ONLY)
// ==========================================

router.use(protect);
router.use(restrictTo(Role.SUPER_ADMIN, Role.ADMIN));

router.get('/subscribers', getSubscribers);
router.post('/subscribers/import', importSubscribersJSON);
router.get('/subscribers/export', exportSubscribersCSV);
router.post('/campaign/send', sendNewsletterCampaign);

export default router;
