import { Router } from 'express';
import {
  createForm,
  getForms,
  getFormById,
  submitFormResponse,
  exportSubmissionsCSV,
} from '../controllers/formController';
import { protect, restrictTo } from '../middlewares/auth';
import { Role } from '@prisma/client';
import { apiLimiter } from '../middlewares/rateLimiter';

const router = Router();

// ==========================================
// PUBLIC GUEST SUBMISSION PIPELINE (Rate-limited)
// ==========================================

router.post('/:formId/submit', apiLimiter, submitFormResponse);

// ==========================================
// PROTECTED ADMINISTRATIVE CONFIGS
// ==========================================

router.use(protect);
router.use(restrictTo(Role.SUPER_ADMIN, Role.ADMIN));

router.post('/', createForm);
router.get('/', getForms);
router.get('/:id', getFormById);

// CSV spreadsheets exporter
router.get('/:formId/export', exportSubmissionsCSV);

export default router;
