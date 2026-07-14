import { Router } from 'express';
import {
  createExperience,
  getAllExperiences,
  updateExperience,
  deleteExperience,
} from '../controllers/experienceController';
import { protect, restrictTo } from '../middlewares/auth';
import { Role } from '@prisma/client';

const router = Router();

router.get('/', getAllExperiences);

router.post(
  '/',
  protect,
  restrictTo(Role.SUPER_ADMIN, Role.ADMIN, Role.EDITOR),
  createExperience
);

router.patch(
  '/:id',
  protect,
  restrictTo(Role.SUPER_ADMIN, Role.ADMIN, Role.EDITOR),
  updateExperience
);

router.delete(
  '/:id',
  protect,
  restrictTo(Role.SUPER_ADMIN, Role.ADMIN),
  deleteExperience
);

export default router;
