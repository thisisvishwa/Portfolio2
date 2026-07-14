import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { AppError } from '../utils/appError';
import { z } from 'zod';
import { logger } from '../utils/logger';

// ==========================================
// ZOD VALIDATION SCHEMAS
// ==========================================

const skillSchema = z.object({
  name: z.string().min(1, 'Skill name is required'),
  category: z.string().min(1, 'Category is required'), // e.g. Frontend, DevOps
  level: z.number().int().min(0).max(100, 'Level must be between 0 and 100'),
  yearsExperience: z.number().min(0, 'Years of experience cannot be negative'),
  icon: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  featured: z.boolean().default(false),
  displayOrder: z.number().int().default(0),
  certificationLink: z.string().url('Must be a valid URL').optional().nullable(),
});

// ==========================================
// CONTROLLER HANDLERS
// ==========================================

export const createSkill = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const validated = skillSchema.parse(req.body);

    const collision = await prisma.skill.findUnique({
      where: { name: validated.name },
    });
    if (collision) {
      return next(new AppError('A skill with this name already exists.', 409));
    }

    const skill = await prisma.skill.create({ data: validated });
    logger.info(`Skill registered: ${skill.name}`);

    res.status(201).json({
      status: 'success',
      data: { skill },
    });
  } catch (error) {
    next(error);
  }
};

export const getAllSkills = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { category, featured } = req.query;

    const whereClause: any = {};
    if (category) {
      whereClause.category = category as string;
    }
    if (featured) {
      whereClause.featured = featured === 'true';
    }

    const skills = await prisma.skill.findMany({
      where: whereClause,
      orderBy: [
        { category: 'asc' },
        { displayOrder: 'asc' },
      ],
    });

    res.status(200).json({
      status: 'success',
      results: skills.length,
      data: { skills },
    });
  } catch (error) {
    next(error);
  }
};

export const updateSkill = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const validated = skillSchema.partial().parse(req.body);

    const exists = await prisma.skill.findUnique({ where: { id } });
    if (!exists) {
      return next(new AppError('Skill record not found.', 404));
    }

    const updated = await prisma.skill.update({
      where: { id },
      data: validated,
    });

    res.status(200).json({
      status: 'success',
      data: { skill: updated },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteSkill = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const exists = await prisma.skill.findUnique({ where: { id } });
    if (!exists) {
      return next(new AppError('Skill record not found.', 404));
    }

    await prisma.skill.delete({ where: { id } });
    logger.info(`Skill record deleted: ${exists.name}`);

    res.status(204).json({
      status: 'success',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};
