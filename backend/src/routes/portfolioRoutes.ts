import { Router } from 'express';
import {
  createService,
  getServices,
  updateService,
  deleteService,
  createEducation,
  getEducationList,
  deleteEducation,
  createCertification,
  getCertifications,
  deleteCertification,
  createTestimonial,
  getTestimonials,
  deleteTestimonial,
  createAward,
  getAwards,
  deleteAward,
  syncGithubRepos,
  getOpenSourceReposList,
} from '../controllers/portfolioController';
import { protect, restrictTo } from '../middlewares/auth';
import { Role } from '@prisma/client';

const router = Router();

// ==========================================
// PUBLIC GUEST READ-ONLY ENDPOINTS
// ==========================================

router.get('/services', getServices);
router.get('/education', getEducationList);
router.get('/certifications', getCertifications);
router.get('/testimonials', getTestimonials);
router.get('/awards', getAwards);
router.get('/opensource', getOpenSourceReposList);

// ==========================================
// PROTECTED ADMINISTRATIVE CRUD ENDPOINTS
// ==========================================

router.use(protect);
router.use(restrictTo(Role.SUPER_ADMIN, Role.ADMIN, Role.EDITOR));

// Service Admin Endpoints
router.post('/services', createService);
router.patch('/services/:id', updateService);
router.delete('/services/:id', deleteService);

// Education Admin Endpoints
router.post('/education', createEducation);
router.delete('/education/:id', deleteEducation);

// Certification Admin Endpoints
router.post('/certifications', createCertification);
router.delete('/certifications/:id', deleteCertification);

// Testimonial Admin Endpoints
router.post('/testimonials', createTestimonial);
router.delete('/testimonials/:id', deleteTestimonial);

// Award Admin Endpoints
router.post('/awards', createAward);
router.delete('/awards/:id', deleteAward);

// Github Syncing Admin Endpoint
router.post('/github/sync', syncGithubRepos);

export default router;
