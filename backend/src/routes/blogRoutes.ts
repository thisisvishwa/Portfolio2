import { Router } from 'express';
import {
  createBlog,
  updateBlog,
  getAllBlogs,
  getBlogBySlug,
  deleteBlog,
  addComment,
  getCommentsForBlog,
  approveComment,
} from '../controllers/blogController';
import { protect, restrictTo } from '../middlewares/auth';
import { Role } from '@prisma/client';
import { apiLimiter } from '../middlewares/rateLimiter';

const router = Router();

// ==========================================
// PUBLIC & CLIENT-SIDE READ ENDPOINTS
// ==========================================

router.get('/', getAllBlogs);
router.get('/slug/:slug', getBlogBySlug);
router.get('/:blogId/comments', getCommentsForBlog);

// Optional authentication comment submission (handled inside controller)
// We mount apiLimiter to prevent comment flooding/spam.
router.post('/:blogId/comments', apiLimiter, (req, res, next) => {
  // If request contains Bearer Auth token, protect it first to extract user context.
  // Otherwise, fallback directly to anonymous guest comment path.
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    protect(req, res, next);
    return;
  }
  next();
}, addComment);

// ==========================================
// PROTECTED ADMINISTRATIVE ENDPOINTS
// ==========================================

router.post(
  '/',
  protect,
  restrictTo(Role.SUPER_ADMIN, Role.ADMIN, Role.EDITOR, Role.WRITER),
  createBlog
);

router.patch(
  '/:id',
  protect,
  restrictTo(Role.SUPER_ADMIN, Role.ADMIN, Role.EDITOR, Role.WRITER),
  updateBlog
);

router.delete(
  '/:id',
  protect,
  restrictTo(Role.SUPER_ADMIN, Role.ADMIN, Role.EDITOR),
  deleteBlog
);

// Comment Moderation Queue Handlers
router.patch(
  '/comments/:id/approve',
  protect,
  restrictTo(Role.SUPER_ADMIN, Role.ADMIN, Role.EDITOR),
  approveComment
);

export default router;
