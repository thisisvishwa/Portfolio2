import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { AppError } from '../utils/appError';
import { z } from 'zod';
import { PublicationStatus, Role } from '@prisma/client';
import { logger } from '../utils/logger';

// ==========================================
// ZOD VALIDATION SCHEMAS
// ==========================================

const projectCreateSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  slug: z.string().min(1, 'Slug is required'),
  category: z.string().min(1, 'Category is required'),
  tags: z.array(z.string()).default([]),
  status: z.nativeEnum(PublicationStatus).default(PublicationStatus.DRAFT),
  featured: z.boolean().default(false),
  thumbnailUrl: z.string().url('Thumbnail must be a valid URL'),
  galleryUrls: z.array(z.string().url()).default([]),
  videoUrl: z.string().url().optional().nullable(),
  liveUrl: z.string().url().optional().nullable(),
  githubUrl: z.string().url().optional().nullable(),
  docsUrl: z.string().url().optional().nullable(),
  techStack: z.array(z.string()).default([]),
  problem: z.string().optional().nullable(),
  solution: z.string().optional().nullable(),
  architecture: z.string().optional().nullable(),
  features: z.string().optional().nullable(),
  challenges: z.string().optional().nullable(),
  lessonsLearned: z.string().optional().nullable(),
  seoTitle: z.string().optional().nullable(),
  seoDescription: z.string().optional().nullable(),
  seoOgImage: z.string().url().optional().nullable(),
  seoSchemaMarkup: z.string().optional().nullable(),
  displayOrder: z.number().int().default(0),
});

const projectUpdateSchema = projectCreateSchema.partial();

// ==========================================
// CONTROLLER HANDLERS
// ==========================================

/**
 * Create a new portfolio project
 */
export const createProject = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) return next(new AppError('Unauthorized.', 401));

    const validated = projectCreateSchema.parse(req.body);

    // Verify slug uniqueness
    const slugCollision = await prisma.project.findUnique({
      where: { slug: validated.slug },
    });
    if (slugCollision) {
      return next(new AppError('A project with this slug already exists.', 409));
    }

    const project = await prisma.project.create({
      data: {
        ...validated,
        authorId: req.user.id,
      },
    });

    logger.info(`Project created: ${project.title} by user ${req.user.email}`);

    res.status(201).json({
      status: 'success',
      data: { project },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update an existing project
 */
export const updateProject = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const validated = projectUpdateSchema.parse(req.body);

    const projectExists = await prisma.project.findUnique({
      where: { id, deletedAt: null },
    });
    if (!projectExists) {
      return next(new AppError('Project not found.', 404));
    }

    // Slug update collision check
    if (validated.slug && validated.slug !== projectExists.slug) {
      const slugCollision = await prisma.project.findUnique({
        where: { slug: validated.slug },
      });
      if (slugCollision) {
        return next(new AppError('A project with this slug already exists.', 409));
      }
    }

    const updatedProject = await prisma.project.update({
      where: { id },
      data: validated,
    });

    logger.info(`Project updated: ${updatedProject.title}`);

    res.status(200).json({
      status: 'success',
      data: { project: updatedProject },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all projects (supports filtering, sorting, pagination, draft/published view states)
 */
export const getAllProjects = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { category, tag, featured, status, page = '1', limit = '10', search } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skipNum = (pageNum - 1) * limitNum;

    // Build Prisma query clauses
    const whereClause: any = { deletedAt: null };

    // Enforce publication filtering for guests
    const userRole = req.user?.role;
    const writeRoles: Role[] = [Role.SUPER_ADMIN, Role.ADMIN, Role.EDITOR];
    const hasWriteAccess = userRole && writeRoles.includes(userRole);

    if (!hasWriteAccess) {
      // Guests and Writers (not editor+) can only query PUBLISHED items
      whereClause.status = PublicationStatus.PUBLISHED;
    } else if (status) {
      // Admins/Editors can request specific statuses
      whereClause.status = status as PublicationStatus;
    }

    if (category) {
      whereClause.category = category as string;
    }

    if (tag) {
      whereClause.tags = { has: tag as string };
    }

    if (featured) {
      whereClause.featured = featured === 'true';
    }

    if (search) {
      whereClause.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { category: { contains: search as string, mode: 'insensitive' } },
        { techStack: { has: search as string } },
      ];
    }

    const [projects, totalCount] = await Promise.all([
      prisma.project.findMany({
        where: whereClause,
        orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
        skip: skipNum,
        take: limitNum,
        include: {
          author: {
            select: {
              displayName: true,
              avatarUrl: true,
            },
          },
        },
      }),
      prisma.project.count({ where: whereClause }),
    ]);

    res.status(200).json({
      status: 'success',
      results: projects.length,
      total: totalCount,
      page: pageNum,
      totalPages: Math.ceil(totalCount / limitNum),
      data: { projects },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single project by slug (Increments view count)
 */
export const getProjectBySlug = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { slug } = req.params;

    const project = await prisma.project.findUnique({
      where: { slug },
      include: {
        author: {
          select: {
            displayName: true,
            avatarUrl: true,
            location: true,
            headline: true,
          },
        },
      },
    });

    if (!project || project.deletedAt) {
      return next(new AppError('Project not found.', 404));
    }

    // Restrict unpublished projects to authors/admins/editors
    const userRole = req.user?.role;
    const writeRoles: Role[] = [Role.SUPER_ADMIN, Role.ADMIN, Role.EDITOR];
    const hasWriteAccess = userRole && writeRoles.includes(userRole);

    if (project.status !== PublicationStatus.PUBLISHED && !hasWriteAccess) {
      return next(new AppError('You do not have permission to view this draft project.', 403));
    }

    // Increment view count asynchronously
    await prisma.project.update({
      where: { id: project.id },
      data: { views: { increment: 1 } },
    });

    res.status(200).json({
      status: 'success',
      data: { project },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Soft delete a project
 */
export const deleteProject = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const project = await prisma.project.findUnique({
      where: { id, deletedAt: null },
    });

    if (!project) {
      return next(new AppError('Project not found or already deleted.', 404));
    }

    // Perform soft delete
    await prisma.project.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    logger.info(`Project soft-deleted: ${project.title}`);

    res.status(204).json({
      status: 'success',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Interact: Like a project
 */
export const likeProject = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const updated = await prisma.project.update({
      where: { id, deletedAt: null },
      data: { likes: { increment: 1 } },
    });

    res.status(200).json({
      status: 'success',
      likes: updated.likes,
    });
  } catch (error) {
    next(error);
  }
};
