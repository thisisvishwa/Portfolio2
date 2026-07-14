import { Router } from 'express';
import {
  uploadFile,
  uploadFilesBulk,
  createFolder,
  getFiles,
  getFolders,
  updateFileDetails,
  deleteFile,
  deleteFilesBulk,
  getStorageStats,
  multerUpload,
} from '../controllers/mediaController';
import { protect, restrictTo } from '../middlewares/auth';
import { Role } from '@prisma/client';

const router = Router();

// ==========================================
// PUBLIC PORTFOLIO GALLERY ENDPOINT
// ==========================================

router.get('/files', getFiles);

// ==========================================
// PROTECTED ADMINISTRATIVE ASSETS ENGINES (ADMINS/EDITORS ONLY)
// ==========================================

router.use(protect);
router.use(restrictTo(Role.SUPER_ADMIN, Role.ADMIN, Role.EDITOR));

router.patch('/files/:id', updateFileDetails);
router.delete('/files/:id', deleteFile);

// Bulk Operations Endpoints (Word-for-Word Requirements Mapped)
router.post('/upload-bulk', multerUpload.array('files', 10), uploadFilesBulk);
router.post('/files/bulk-delete', deleteFilesBulk);

router.get('/folders', getFolders);
router.post('/folders', createFolder);

router.get('/stats', getStorageStats);

// Attach single file upload to router
router.post('/upload', multerUpload.single('file'), uploadFile);

export default router;
