import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { AppError } from '../utils/appError';
import { logger } from '../utils/logger';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// ==========================================
// MULTER FILE INGESTION GATEWAY
// ==========================================

// Auto-detect serverless environment (Vercel provides /tmp as the only writable scratchpath)
const uploadDir = process.env.VERCEL
  ? '/tmp/uploads'
  : path.join(__dirname, '../../uploads');

// Wrap directory creation in a try-catch to ensure serverless boots smoothly regardless of FS limits
try {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
} catch (err: any) {
  logger.warn(`Media uploads folder bypassed or restricted: ${err.message}`);
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

export const multerUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max limit
});

// ==========================================
// MAGIC-NUMBER BYTE VALIDATION
// ==========================================

const validateMagicBytes = (filePath: string, claimedMime: string): boolean => {
  try {
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(4);
    fs.readSync(fd, buffer, 0, 4, 0);
    fs.closeSync(fd);

    const hex = buffer.toString('hex').toUpperCase();

    const signatures: Record<string, string[]> = {
      'image/png': ['89504E47'],
      'image/jpeg': ['FFD8FF'],
      'image/gif': ['47494638'],
      'application/pdf': ['25504446'],
    };

    const allowedHexes = signatures[claimedMime];
    if (!allowedHexes) {
      return true;
    }

    return allowedHexes.some((sig) => hex.startsWith(sig));
  } catch (error) {
    logger.error('Magic bytes validation error:', error);
    return false;
  }
};

// ==========================================
// CONTROLLER HANDLERS
// ==========================================

/**
 * Handle new asset upload
 */
export const uploadFile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.file) {
      return next(new AppError('Please provide a file to upload.', 400));
    }

    const filePath = req.file.path;
    const fileMime = req.file.mimetype;
    const { altText, folderId } = req.body;

    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    if (req.file.size > MAX_SIZE) {
      try { fs.unlinkSync(filePath); } catch {}
      return next(new AppError('File size exceeds the maximum limit of 5MB.', 400));
    }

    const isSignatureValid = validateMagicBytes(filePath, fileMime);
    if (!isSignatureValid) {
      try { fs.unlinkSync(filePath); } catch {}
      return next(new AppError('Security check failed: File header signature mismatch.', 400));
    }

    if (folderId) {
      const folderExists = await prisma.mediaFolder.findUnique({ where: { id: folderId } });
      if (!folderExists) {
        try { fs.unlinkSync(filePath); } catch {}
        return next(new AppError('The specified target folder does not exist.', 400));
      }
    }

    const relativeUrl = `/uploads/${req.file.filename}`;

    const mediaFile = await prisma.mediaFile.create({
      data: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimeType: fileMime,
        size: req.file.size,
        url: relativeUrl,
        altText: altText || null,
        folderId: folderId || null,
      },
    });

    logger.info(`New file written to Media Library: ${mediaFile.originalName}`);

    res.status(201).json({
      status: 'success',
      data: { file: mediaFile },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk Ingestion: Handles multiple file uploads simultaneously (Zod & Magic Bytes validated)
 */
export const uploadFilesBulk = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return next(new AppError('Please provide files for bulk upload.', 400));
    }

    const { folderId } = req.body;
    if (folderId) {
      const folderExists = await prisma.mediaFolder.findUnique({ where: { id: folderId } });
      if (!folderExists) {
        files.forEach((f) => { try { fs.unlinkSync(f.path); } catch {} });
        return next(new AppError('Target folder does not exist.', 400));
      }
    }

    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    const savedFiles: any[] = [];

    for (const file of files) {
      if (file.size > MAX_SIZE) {
        try { fs.unlinkSync(file.path); } catch {}
        continue;
      }

      const isSignatureValid = validateMagicBytes(file.path, file.mimetype);
      if (!isSignatureValid) {
        try { fs.unlinkSync(file.path); } catch {}
        continue;
      }

      const relativeUrl = `/uploads/${file.filename}`;

      const mediaFile = await prisma.mediaFile.create({
        data: {
          filename: file.filename,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          url: relativeUrl,
          folderId: folderId || null,
        },
      });

      savedFiles.push(mediaFile);
    }

    logger.info(`Bulk uploaded ${savedFiles.length} files successfully.`);

    res.status(201).json({
      status: 'success',
      results: savedFiles.length,
      data: { files: savedFiles },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new folder
 */
export const createFolder = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name } = req.body;
    if (!name || name.trim().length === 0) {
      return next(new AppError('Folder name is required.', 400));
    }

    const collision = await prisma.mediaFolder.findUnique({ where: { name } });
    if (collision) {
      return next(new AppError('A folder with this name already exists.', 409));
    }

    const folder = await prisma.mediaFolder.create({
      data: { name: name.trim() },
    });

    res.status(201).json({
      status: 'success',
      data: { folder },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List files
 */
export const getFiles = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { folderId, search, type } = req.query;

    const whereClause: any = {};

    if (folderId) {
      whereClause.folderId = folderId === 'null' ? null : (folderId as string);
    }

    if (search) {
      whereClause.OR = [
        { originalName: { contains: search as string, mode: 'insensitive' } },
        { altText: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    if (type) {
      whereClause.mimeType = { contains: type as string };
    }

    const files = await prisma.mediaFile.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      status: 'success',
      results: files.length,
      data: { files },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List all folders
 */
export const getFolders = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const folders = await prisma.mediaFolder.findMany({
      include: {
        _count: {
          select: { files: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    res.status(200).json({
      status: 'success',
      data: { folders },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update alt tag or rename file
 */
export const updateFileDetails = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { altText, folderId } = req.body;

    const file = await prisma.mediaFile.findUnique({ where: { id } });
    if (!file) {
      return next(new AppError('File not found.', 404));
    }

    const updated = await prisma.mediaFile.update({
      where: { id },
      data: {
        ...(altText !== undefined && { altText }),
        ...(folderId !== undefined && { folderId: folderId === 'null' ? null : folderId }),
      },
    });

    res.status(200).json({
      status: 'success',
      data: { file: updated },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Physically delete file
 */
export const deleteFile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const file = await prisma.mediaFile.findUnique({ where: { id } });
    if (!file) {
      return next(new AppError('File not found.', 404));
    }

    const filePath = path.join(uploadDir, file.filename);
    if (fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch {}
    }

    await prisma.mediaFile.delete({ where: { id } });

    logger.info(`File permanently removed: ${file.originalName}`);

    res.status(204).json({
      status: 'success',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk Eraser: Unlinks and deletes multiple file assets inside an atomic sweep
 */
export const deleteFilesBulk = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { fileIds } = req.body;
    if (!Array.isArray(fileIds) || fileIds.length === 0) {
      return next(new AppError('Please provide an array of file IDs to bulk delete.', 400));
    }

    const files = await prisma.mediaFile.findMany({
      where: { id: { in: fileIds } },
    });

    if (files.length === 0) {
      return next(new AppError('No files found matching the provided IDs.', 404));
    }

    // Unlink physical assets from server disk
    files.forEach((file: any) => {
      const filePath = path.join(uploadDir, file.filename);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (err: any) {
          logger.error(`Failed to physically delete bulk file ${file.filename}:`, err.message);
        }
      }
    });

    await prisma.mediaFile.deleteMany({
      where: { id: { in: fileIds } },
    });

    logger.info(`Bulk deleted ${files.length} file assets permanently.`);

    res.status(204).json({
      status: 'success',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Fetch storage analytics
 */
export const getStorageStats = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const aggregations = await prisma.mediaFile.aggregate({
      _sum: {
        size: true,
      },
      _count: {
        id: true,
      },
    });

    const totalBytes = aggregations._sum.size || 0;
    const fileCount = aggregations._count.id || 0;

    const QUOTA_BYTES = 100 * 1024 * 1024; // 100MB Total limit
    const percentUsed = parseFloat(((totalBytes / QUOTA_BYTES) * 100).toFixed(2));

    res.status(200).json({
      status: 'success',
      data: {
        totalBytesUsed: totalBytes,
        totalFiles: fileCount,
        quotaBytesLimit: QUOTA_BYTES,
        percentUsed,
        remainingBytes: Math.max(0, QUOTA_BYTES - totalBytes),
      },
    });
  } catch (error) {
    next(error);
  }
};
