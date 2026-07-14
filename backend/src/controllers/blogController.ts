import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { AppError } from '../utils/appError';
import { z } from 'zod';
import { PublicationStatus, Role } from '@prisma/client';
import { logger } from '../utils/logger';

// ==========================================
// ZOD VALIDATION SCHEMAS
// ==========================================

const blogCreateSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  slug: z.string().min(1, 'Slug is required'),
  content: z.string().min(1, 'Content is required'),
  htmlContent: z.string().min(1, 'HTML Content is required'),
  status: z.nativeEnum(PublicationStatus).default(PublicationStatus.DRAFT),
  scheduledAt: z.string().datetime().optional().nullable(),
  featuredImage: z.string().url('Featured image must be a valid URL'),
  readingTime: z.number().int().min(1).default(1),
  categories: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  seoTitle: z.string().optional().nullable(),
  seoDescription: z.string().optional().nullable(),
  seoOgImage: z.string().url().optional().nullable(),
  seoCanonicalUrl: z.string().url().optional().nullable(),
  seoTwitterCard: z.string().default('summary_large_image'),
  seoSchemaMarkup: z.string().optional().nullable(),
});

const blogUpdateSchema = blogCreateSchema.partial();

const commentCreateSchema = z.object({
  content: z.string().min(1, 'Comment body is required'),
  guestName: z.string().optional().nullable(),
  guestEmail: z.string().email('Invalid email formatting').optional().nullable(),
  parentId: z.string().uuid().optional().nullable(),
});

// ==========================================
// CONTROLLER HANDLERS (BLOG OPERATIONS)
// ==========================================

/**
 * Create a new Blog post
 */
export const createBlog = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) return next(new AppError('Unauthorized.', 401));

    const validated = blogCreateSchema.parse(req.body);

    const slugCollision = await prisma.blog.findUnique({
      where: { slug: validated.slug },
    });
    if (slugCollision) {
      return next(new AppError('An article with this slug already exists.', 409));
    }

    const blog = await prisma.blog.create({
      data: {
        ...validated,
        scheduledAt: validated.scheduledAt ? new Date(validated.scheduledAt) : null,
        authorId: req.user.id,
      },
    });

    logger.info(`Blog post created: ${blog.title} by writer ${req.user.email}`);

    res.status(201).json({
      status: 'success',
      data: { blog },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update an existing Blog post
 */
export const updateBlog = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const validated = blogUpdateSchema.parse(req.body);

    const blogExists = await prisma.blog.findUnique({
      where: { id, deletedAt: null },
    });
    if (!blogExists) {
      return next(new AppError('Blog article not found.', 404));
    }

    // Slug update collision check
    if (validated.slug && validated.slug !== blogExists.slug) {
      const slugCollision = await prisma.blog.findUnique({
        where: { slug: validated.slug },
      });
      if (slugCollision) {
        return next(new AppError('An article with this slug already exists.', 409));
      }
    }

    const updatedBlog = await prisma.blog.update({
      where: { id },
      data: {
        ...validated,
        scheduledAt: validated.scheduledAt ? new Date(validated.scheduledAt) : undefined,
      },
    });

    logger.info(`Blog post updated: ${updatedBlog.title}`);

    res.status(200).json({
      status: 'success',
      data: { blog: updatedBlog },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all blog articles
 */
export const getAllBlogs = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { category, tag, status, page = '1', limit = '10', search } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skipNum = (pageNum - 1) * limitNum;

    const whereClause: any = { deletedAt: null };

    // Strict guest checks (guests only read published)
    const userRole = req.user?.role;
    const writeRoles: Role[] = [Role.SUPER_ADMIN, Role.ADMIN, Role.EDITOR, Role.WRITER];
    const hasWriteAccess = userRole && writeRoles.includes(userRole);

    if (!hasWriteAccess) {
      whereClause.status = PublicationStatus.PUBLISHED;
    } else if (status) {
      whereClause.status = status as PublicationStatus;
    }

    if (category) {
      whereClause.categories = { has: category as string };
    }

    if (tag) {
      whereClause.tags = { has: tag as string };
    }

    if (search) {
      whereClause.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { content: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const [blogs, totalCount] = await Promise.all([
      prisma.blog.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip: skipNum,
        take: limitNum,
        include: {
          author: {
            select: {
              displayName: true,
              avatarUrl: true,
            },
          },
          _count: {
            select: { comments: { where: { approved: true } } },
          },
        },
      }),
      prisma.blog.count({ where: whereClause }),
    ]);

    res.status(200).json({
      status: 'success',
      results: blogs.length,
      total: totalCount,
      page: pageNum,
      totalPages: Math.ceil(totalCount / limitNum),
      data: { blogs },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single blog post by slug (Increments view count)
 */
export const getBlogBySlug = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { slug } = req.params;

    const blog = await prisma.blog.findUnique({
      where: { slug },
      include: {
        author: {
          select: {
            displayName: true,
            avatarUrl: true,
            shortBio: true,
            longBio: true,
          },
        },
      },
    });

    if (!blog || blog.deletedAt) {
      return next(new AppError('Blog article not found.', 404));
    }

    // Role restrictions for Drafts
    const userRole = req.user?.role;
    const writeRoles: Role[] = [Role.SUPER_ADMIN, Role.ADMIN, Role.EDITOR, Role.WRITER];
    const hasWriteAccess = userRole && writeRoles.includes(userRole);

    if (blog.status !== PublicationStatus.PUBLISHED && !hasWriteAccess) {
      return next(new AppError('Draft article is inaccessible to guests.', 403));
    }

    // Async increment views count
    await prisma.blog.update({
      where: { id: blog.id },
      data: { views: { increment: 1 } },
    });

    res.status(200).json({
      status: 'success',
      data: { blog },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Soft delete an article
 */
export const deleteBlog = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const blog = await prisma.blog.findUnique({
      where: { id, deletedAt: null },
    });

    if (!blog) {
      return next(new AppError('Article not found or already deleted.', 404));
    }

    await prisma.blog.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    logger.info(`Blog post soft-deleted: ${blog.title}`);

    res.status(204).json({
      status: 'success',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// CONTROLLER HANDLERS (COMMENT OPERATIONS)
// ==========================================

/**
 * Add a comment to an article (Supports guest or user, nesting via parentId)
 */
export const addComment = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { blogId } = req.params;
    const validated = commentCreateSchema.parse(req.body);

    const blog = await prisma.blog.findUnique({
      where: { id: blogId, deletedAt: null },
    });
    if (!blog) {
      return next(new AppError('The target blog article was not found.', 404));
    }

    let createdComment;

    // Check if user is logged in
    if (req.user) {
      createdComment = await prisma.comment.create({
        data: {
          blogId,
          content: validated.content,
          userId: req.user.id,
          approved: true, // Logged in developers bypass moderation filters
          parentId: validated.parentId || null,
        },
      });
    } else {
      // Guests require guest credentials and are marked as unapproved
      if (!validated.guestName || !validated.guestEmail) {
        return next(new AppError('Guest comments require a name and valid email address.', 400));
      }

      createdComment = await prisma.comment.create({
        data: {
          blogId,
          content: validated.content,
          guestName: validated.guestName,
          guestEmail: validated.guestEmail,
          approved: false, // Default to moderation queue
          parentId: validated.parentId || null,
        },
      });
    }

    res.status(201).json({
      status: 'success',
      message: createdComment.approved
        ? 'Comment posted successfully.'
        : 'Comment submitted. It is currently in the moderation queue.',
      data: { comment: createdComment },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieve approved, threaded comments for a blog article
 */
export const getCommentsForBlog = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { blogId } = req.params;

    const comments = await prisma.comment.findMany({
      where: {
        blogId,
        approved: true,
        isSpam: false,
        parentId: null, // Only fetch parent comments first
      },
      include: {
        user: {
          select: { displayName: true, avatarUrl: true, role: true },
        },
        replies: {
          where: { approved: true, isSpam: false },
          include: {
            user: { select: { displayName: true, avatarUrl: true, role: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      status: 'success',
      results: comments.length,
      data: { comments },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Approve / Moderate a comment (Admin/Editor exclusive)
 */
export const approveComment = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const comment = await prisma.comment.findUnique({ where: { id } });
    if (!comment) {
      return next(new AppError('Comment not found.', 404));
    }

    const updated = await prisma.comment.update({
      where: { id },
      data: { approved: true, isSpam: false },
    });

    res.status(200).json({
      status: 'success',
      message: 'Comment approved successfully.',
      data: { comment: updated },
    });
  } catch (error) {
    next(error);
  }
};
