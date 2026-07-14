import { Router } from 'express';
import {
  createSkill,
  getAllSkills,
  updateSkill,
  deleteSkill,
} from '../controllers/skillController';
import { protect, restrictTo } from '../middlewares/auth';
import { Role } from '@prisma/client';

const router = Router();

router.get('/', getAllSkills);

router.post(
  '/',
  protect,
  restrictTo(Role.SUPER_ADMIN, Role.ADMIN, Role.EDITOR),
  createSkill
);

router.patch(
  '/:id',
  protect,
  restrictTo(Role.SUPER_ADMIN, Role.ADMIN, Role.EDITOR),
  updateSkill
);

router.delete(
  '/:id',
  protect,
  restrictTo(Role.SUPER_ADMIN, Role.ADMIN),
  deleteSkill
);

export default router;
