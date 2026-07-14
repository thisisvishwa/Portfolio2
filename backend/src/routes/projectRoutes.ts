import { Router } from 'express';
import {
  createProject,
  updateProject,
  getAllProjects,
  getProjectBySlug,
  deleteProject,
  likeProject,
} from '../controllers/projectController';
import { protect, restrictTo } from '../middlewares/auth';
import { Role } from '@prisma/client';

const router = Router();

// ==========================================
// PUBLIC & CLIENT-SIDE ENDPOINTS
// ==========================================

router.get('/', getAllProjects);
router.get('/slug/:slug', getProjectBySlug);
router.post('/:id/like', likeProject);

// ==========================================
// PROTECTED ADMINISTRATIVE ENDPOINTS
// ==========================================

router.post(
  '/',
  protect,
  restrictTo(Role.SUPER_ADMIN, Role.ADMIN, Role.EDITOR),
  createProject
);

router.patch(
  '/:id',
  protect,
  restrictTo(Role.SUPER_ADMIN, Role.ADMIN, Role.EDITOR),
  updateProject
);

router.delete(
  '/:id',
  protect,
  restrictTo(Role.SUPER_ADMIN, Role.ADMIN),
  deleteProject
);

export default router;
