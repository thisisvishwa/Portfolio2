import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { AppError } from '../utils/appError';
import { z } from 'zod';
import { logger } from '../utils/logger';

// ==========================================
// ZOD VALIDATION SCHEMAS
// ==========================================

const experienceSchema = z.object({
  company: z.string().min(1, 'Company is required'),
  companyLogo: z.string().url().optional().nullable(),
  role: z.string().min(1, 'Role title is required'),
  employmentType: z.string().min(1, 'Employment type is required'),
  location: z.string().optional().nullable(),
  startDate: z.string().datetime('Start date must be a valid ISO Date string'),
  endDate: z.string().datetime('End date must be a valid ISO Date string').optional().nullable(),
  currentlyWorking: z.boolean().default(false),
  responsibilities: z.array(z.string()).default([]),
  achievements: z.array(z.string()).default([]),
  technologiesUsed: z.array(z.string()).default([]),
  displayOrder: z.number().int().default(0),
});

// ==========================================
// CONTROLLER HANDLERS
// ==========================================

export const createExperience = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const validated = experienceSchema.parse(req.body);

    const experience = await prisma.workExperience.create({
      data: {
        ...validated,
        startDate: new Date(validated.startDate),
        endDate: validated.endDate ? new Date(validated.endDate) : null,
      },
    });

    logger.info(`Career experience created: ${experience.role} at ${experience.company}`);

    res.status(201).json({
      status: 'success',
      data: { experience },
    });
  } catch (error) {
    next(error);
  }
};

export const getAllExperiences = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const experiences = await prisma.workExperience.findMany({
      orderBy: [
        { startDate: 'desc' },
        { displayOrder: 'asc' },
      ],
    });

    res.status(200).json({
      status: 'success',
      results: experiences.length,
      data: { experiences },
    });
  } catch (error) {
    next(error);
  }
};

export const updateExperience = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const validated = experienceSchema.partial().parse(req.body);

    const exists = await prisma.workExperience.findUnique({ where: { id } });
    if (!exists) {
      return next(new AppError('Experience record not found.', 404));
    }

    const updated = await prisma.workExperience.update({
      where: { id },
      data: {
        ...validated,
        startDate: validated.startDate ? new Date(validated.startDate) : undefined,
        endDate: validated.endDate ? new Date(validated.endDate) : undefined,
      },
    });

    res.status(200).json({
      status: 'success',
      data: { experience: updated },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteExperience = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const exists = await prisma.workExperience.findUnique({ where: { id } });
    if (!exists) {
      return next(new AppError('Experience record not found.', 404));
    }

    await prisma.workExperience.delete({ where: { id } });
    logger.info(`Career experience deleted: ${exists.role} at ${exists.company}`);

    res.status(204).json({
      status: 'success',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};
