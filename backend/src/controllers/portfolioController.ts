import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { AppError } from '../utils/appError';
import { z } from 'zod';
import { syncGitHubRepoStats } from '../services/githubService';

// ==========================================
// ZOD VALIDATION SCHEMAS
// ==========================================

const serviceSchema = z.object({
  name: z.string().min(1, 'Service name is required'),
  slug: z.string().min(1, 'Slug is required'),
  icon: z.string().min(1, 'Icon name is required'),
  description: z.string().min(1, 'Description is required'),
  startingPrice: z.number().min(0, 'Starting price cannot be negative'),
  features: z.array(z.string()).default([]),
  timeline: z.string().optional().nullable(),
  deliverables: z.array(z.string()).default([]),
  faq: z.string().optional().nullable(), // Question-Answers JSON
  portfolioLink: z.string().url().optional().nullable(),
  ctaText: z.string().default('Book a Call'),
  visibility: z.boolean().default(true),
  displayOrder: z.number().int().default(0),
});

const educationSchema = z.object({
  institution: z.string().min(1, 'Institution is required'),
  logoUrl: z.string().url().optional().nullable(),
  degree: z.string().min(1, 'Degree title is required'),
  field: z.string().min(1, 'Field of study is required'),
  startDate: z.string().datetime('Invalid start date format'),
  endDate: z.string().datetime('Invalid end date format').optional().nullable(),
  description: z.string().optional().nullable(),
  achievements: z.array(z.string()).default([]),
  certificates: z.array(z.string()).default([]),
});

const certificationSchema = z.object({
  name: z.string().min(1, 'Certificate name is required'),
  issuer: z.string().min(1, 'Issuer is required'),
  credentialId: z.string().optional().nullable(),
  issueDate: z.string().datetime('Invalid issue date format'),
  expiryDate: z.string().datetime('Invalid expiry date format').optional().nullable(),
  certificateUrl: z.string().url().optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  verificationUrl: z.string().url().optional().nullable(),
});

const testimonialSchema = z.object({
  clientName: z.string().min(1, 'Client name is required'),
  clientPhoto: z.string().url().optional().nullable(),
  company: z.string().optional().nullable(),
  role: z.string().optional().nullable(),
  rating: z.number().int().min(1).max(5).default(5),
  feedback: z.string().min(1, 'Feedback body is required'),
  videoUrl: z.string().url().optional().nullable(),
  featured: z.boolean().default(false),
  visibility: z.boolean().default(true),
  displayOrder: z.number().int().default(0),
});

const awardSchema = z.object({
  title: z.string().min(1, 'Award title is required'),
  issuer: z.string().min(1, 'Issuer is required'),
  date: z.string().datetime('Invalid date format'),
  description: z.string().optional().nullable(),
  icon: z.string().optional().nullable(),
  displayOrder: z.number().int().default(0),
});

// ==========================================
// 1. SERVICES CMS CONTROLLERS
// ==========================================

export const createService = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validated = serviceSchema.parse(req.body);
    const collision = await prisma.service.findUnique({ where: { slug: validated.slug } });
    if (collision) return next(new AppError('A service with this slug already exists.', 409));

    const service = await prisma.service.create({ data: validated });
    res.status(201).json({ status: 'success', data: { service } });
  } catch (err) { next(err); }
};

export const getServices = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const services = await prisma.service.findMany({
      where: { visibility: true },
      orderBy: { displayOrder: 'asc' },
    });
    res.status(200).json({ status: 'success', results: services.length, data: { services } });
  } catch (err) { next(err); }
};

export const updateService = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const validated = serviceSchema.partial().parse(req.body);
    const exists = await prisma.service.findUnique({ where: { id } });
    if (!exists) return next(new AppError('Service not found.', 404));

    const updated = await prisma.service.update({ where: { id }, data: validated });
    res.status(200).json({ status: 'success', data: { service: updated } });
  } catch (err) { next(err); }
};

export const deleteService = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const exists = await prisma.service.findUnique({ where: { id } });
    if (!exists) return next(new AppError('Service not found.', 404));

    await prisma.service.delete({ where: { id } });
    res.status(204).json({ status: 'success', data: null });
  } catch (err) { next(err); }
};

// ==========================================
// 2. EDUCATION CMS CONTROLLERS
// ==========================================

export const createEducation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validated = educationSchema.parse(req.body);
    const education = await prisma.education.create({
      data: {
        ...validated,
        startDate: new Date(validated.startDate),
        endDate: validated.endDate ? new Date(validated.endDate) : null,
      },
    });
    res.status(201).json({ status: 'success', data: { education } });
  } catch (err) { next(err); }
};

export const getEducationList = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const education = await prisma.education.findMany({ orderBy: { startDate: 'desc' } });
    res.status(200).json({ status: 'success', results: education.length, data: { education } });
  } catch (err) { next(err); }
};

export const deleteEducation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.education.delete({ where: { id } });
    res.status(204).json({ status: 'success', data: null });
  } catch (err) { next(err); }
};

// ==========================================
// 3. CERTIFICATIONS CMS CONTROLLERS
// ==========================================

export const createCertification = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validated = certificationSchema.parse(req.body);
    const certification = await prisma.certification.create({
      data: {
        ...validated,
        issueDate: new Date(validated.issueDate),
        expiryDate: validated.expiryDate ? new Date(validated.expiryDate) : null,
      },
    });
    res.status(201).json({ status: 'success', data: { certification } });
  } catch (err) { next(err); }
};

export const getCertifications = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const certifications = await prisma.certification.findMany({ orderBy: { issueDate: 'desc' } });
    res.status(200).json({ status: 'success', results: certifications.length, data: { certifications } });
  } catch (err) { next(err); }
};

export const deleteCertification = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.certification.delete({ where: { id } });
    res.status(204).json({ status: 'success', data: null });
  } catch (err) { next(err); }
};

// ==========================================
// 4. TESTIMONIALS CMS CONTROLLERS
// ==========================================

export const createTestimonial = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validated = testimonialSchema.parse(req.body);
    const testimonial = await prisma.testimonial.create({ data: validated });
    res.status(201).json({ status: 'success', data: { testimonial } });
  } catch (err) { next(err); }
};

export const getTestimonials = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const testimonials = await prisma.testimonial.findMany({
      where: { visibility: true },
      orderBy: [{ featured: 'desc' }, { displayOrder: 'asc' }],
    });
    res.status(200).json({ status: 'success', results: testimonials.length, data: { testimonials } });
  } catch (err) { next(err); }
};

export const deleteTestimonial = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.testimonial.delete({ where: { id } });
    res.status(204).json({ status: 'success', data: null });
  } catch (err) { next(err); }
};

// ==========================================
// 5. AWARDS CMS CONTROLLERS
// ==========================================

export const createAward = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validated = awardSchema.parse(req.body);
    const award = await prisma.award.create({
      data: {
        ...validated,
        date: new Date(validated.date),
      },
    });
    res.status(201).json({ status: 'success', data: { award } });
  } catch (err) { next(err); }
};

export const getAwards = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const awards = await prisma.award.findMany({ orderBy: { displayOrder: 'asc' } });
    res.status(200).json({ status: 'success', results: awards.length, data: { awards } });
  } catch (err) { next(err); }
};

export const deleteAward = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.award.delete({ where: { id } });
    res.status(204).json({ status: 'success', data: null });
  } catch (err) { next(err); }
};

// ==========================================
// 6. GITHUB REPOS PUBLIC READ & SYNC CONTROLLERS
// ==========================================

export const syncGithubRepos = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { repos } = req.body;
    if (!Array.isArray(repos)) return next(new AppError('Please provide an array of repository names (e.g. ["owner/repo"]).', 400));

    const result = await syncGitHubRepoStats(repos);
    if (!result) return next(new AppError('Failed to synchronize some repositories with GitHub.', 500));

    res.status(200).json({ status: 'success', message: 'GitHub repositories statistics synced successfully.' });
  } catch (err) { next(err); }
};

export const getOpenSourceReposList = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const repos = await prisma.openSourceRepo.findMany({ orderBy: { stars: 'desc' } });
    res.status(200).json({ status: 'success', results: repos.length, data: { repos } });
  } catch (err) { next(err); }
};
