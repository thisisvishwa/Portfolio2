import { Router } from 'express';
import {
  getPublicSettings,
  getAllSettings,
  updateSettings,
  getAuditLogs,
  getActiveTheme,
  createTheme,
  updateTheme,
  exportSystemStateJSON,
  importSystemStateJSON,
  createMenu,
  getMenusList,
  deleteMenu,
  createDynamicPage,
  getDynamicPagesList,
  getPageBySlugPath,
  deleteDynamicPage,
  createFooterSection,
  getFooterSectionsList,
  deleteFooterSection,
} from '../controllers/settingController';
import { protect, restrictTo } from '../middlewares/auth';
import { Role } from '@prisma/client';

const router = Router();

// ==========================================
// PUBLIC STYLING, SEO & SLUG RESOLVERS
// ==========================================

router.get('/public', getPublicSettings);
router.get('/theme', getActiveTheme);
router.get('/pages/:slug', getPageBySlugPath);
router.get('/footer', getFooterSectionsList); // Public footer sections lookup

// ==========================================
// PROTECTED ADMINISTRATIVE CONFIGS
// ==========================================

router.use(protect);

router.get(
  '/',
  restrictTo(Role.SUPER_ADMIN, Role.ADMIN),
  getAllSettings
);

router.post(
  '/',
  restrictTo(Role.SUPER_ADMIN),
  updateSettings
);

router.get(
  '/audit-logs',
  restrictTo(Role.SUPER_ADMIN, Role.ADMIN),
  getAuditLogs
);

// Theme customizers
router.post(
  '/theme',
  restrictTo(Role.SUPER_ADMIN, Role.ADMIN),
  createTheme
);

router.patch(
  '/theme/:id',
  restrictTo(Role.SUPER_ADMIN, Role.ADMIN),
  updateTheme
);

// System Portability Backups
router.get(
  '/backup/export',
  restrictTo(Role.SUPER_ADMIN),
  exportSystemStateJSON
);

router.post(
  '/backup/import',
  restrictTo(Role.SUPER_ADMIN),
  importSystemStateJSON
);

// Menu Builder Endpoints
router.get('/menu', getMenusList);
router.post('/menu', restrictTo(Role.SUPER_ADMIN, Role.ADMIN), createMenu);
router.delete('/menu/:id', restrictTo(Role.SUPER_ADMIN, Role.ADMIN), deleteMenu);

// Custom Page Builder Endpoints
router.get('/pages', restrictTo(Role.SUPER_ADMIN, Role.ADMIN), getDynamicPagesList);
router.post('/pages', restrictTo(Role.SUPER_ADMIN, Role.ADMIN), createDynamicPage);
router.delete('/pages/:id', restrictTo(Role.SUPER_ADMIN, Role.ADMIN), deleteDynamicPage);

// Footer Section Builder Endpoints
router.post('/footer', restrictTo(Role.SUPER_ADMIN, Role.ADMIN), createFooterSection);
router.delete('/footer/:id', restrictTo(Role.SUPER_ADMIN, Role.ADMIN), deleteFooterSection);

export default router;
