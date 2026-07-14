import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { AppError } from '../utils/appError';
import { z } from 'zod';
import { logger } from '../utils/logger';
import { PublicationStatus } from '@prisma/client';

// ==========================================
// ZOD VALIDATION SCHEMAS
// ==========================================

const updateSettingsSchema = z.object({
  settings: z.array(
    z.object({
      key: z.string().min(1, 'Key is required'),
      value: z.string(),
      group: z.string().default('GENERAL'),
    })
  ),
});

const themeSchema = z.object({
  name: z.string().min(1, 'Theme name is required'),
  primaryColor: z.string().min(4).max(7), // Hex code
  secondaryColor: z.string().min(4).max(7),
  accentColor: z.string().min(4).max(7),
  fontFamily: z.string().default('Inter'),
  borderRadius: z.string().default('0.5rem'),
  boxShadow: z.string().optional().nullable(),
  cursorStyle: z.string().default('default'),
  layoutWidth: z.string().default('container-max'),
  navbarStyle: z.string().default('glassmorphic'),
  footerStyle: z.string().default('standard'),
  loaderType: z.string().default('skeleton'),
  isDark: z.boolean().default(true),
  isDefault: z.boolean().default(false),
});

const menuSchema = z.object({
  label: z.string().min(1, 'Label is required'),
  url: z.string().min(1, 'Target URL is required'),
  icon: z.string().optional().nullable(),
  displayOrder: z.number().int().default(0),
  target: z.string().default('_self'),
  parentId: z.string().uuid().optional().nullable(),
});

const dynamicPageSchema = z.object({
  title: z.string().min(1, 'Page title is required'),
  slug: z.string().min(1, 'URL path slug is required'),
  layout: z.string().min(1, 'JSON section layouts configuration is required'),
  status: z.nativeEnum(PublicationStatus).default(PublicationStatus.DRAFT),
  seoTitle: z.string().optional().nullable(),
  seoDescription: z.string().optional().nullable(),
  seoOgImage: z.string().url().optional().nullable(),
  seoSchema: z.string().optional().nullable(),
});

const footerSectionSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  type: z.string().min(1, 'Type is required'),
  links: z.string().min(1, 'Links JSON array string is required'),
  displayOrder: z.number().int().default(0),
});

// ==========================================
// CONTROLLER HANDLERS (SYSTEM SETTINGS)
// ==========================================

export const getPublicSettings = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const settings = await prisma.setting.findMany({
      where: {
        group: { in: ['GENERAL', 'SEO', 'SOCIAL'] },
      },
      select: { key: true, value: true, group: true },
    });

    const dictionary = settings.reduce((acc: any, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});

    res.status(200).json({
      status: 'success',
      data: { settings: dictionary },
    });
  } catch (error) {
    next(error);
  }
};

export const getAllSettings = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const settings = await prisma.setting.findMany({
      orderBy: [{ group: 'asc' }, { key: 'asc' }],
    });

    res.status(200).json({
      status: 'success',
      data: { settings },
    });
  } catch (error) {
    next(error);
  }
};

export const updateSettings = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const validated = updateSettingsSchema.parse(req.body);

    const operations = validated.settings.map((setting) => {
      return prisma.setting.upsert({
        where: { key: setting.key },
        update: { value: setting.value, group: setting.group },
        create: { key: setting.key, value: setting.value, group: setting.group },
      });
    });

    await prisma.$transaction(operations);

    logger.info(`System settings updated by user ${req.user?.email}`);

    res.status(200).json({
      status: 'success',
      message: 'System settings updated successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// CONTROLLER HANDLERS (AUDIT SECURITY LOGS)
// ==========================================

export const getAuditLogs = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { action, status, page = '1', limit = '20' } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skipNum = (pageNum - 1) * limitNum;

    const whereClause: any = {};
    if (action) {
      whereClause.action = action as string;
    }
    if (status) {
      whereClause.status = status as any;
    }

    const [logs, totalCount] = await Promise.all([
      prisma.auditLog.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip: skipNum,
        take: limitNum,
        include: {
          user: {
            select: { displayName: true, email: true, role: true },
          },
        },
      }),
      prisma.auditLog.count({ where: whereClause }),
    ]);

    res.status(200).json({
      status: 'success',
      total: totalCount,
      page: pageNum,
      totalPages: Math.ceil(totalCount / limitNum),
      data: { logs },
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// CONTROLLER HANDLERS (THEME STYLES)
// ==========================================

export const getActiveTheme = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let theme = await prisma.theme.findFirst({
      where: { isDefault: true },
    });

    if (!theme) {
      theme = await prisma.theme.findFirst();
    }

    if (!theme) {
      res.status(200).json({
        status: 'success',
        data: {
          theme: {
            name: 'Slate Midnight',
            primaryColor: '#6366f1',
            secondaryColor: '#4f46e5',
            accentColor: '#f43f5e',
            fontFamily: 'Inter',
            borderRadius: '0.5rem',
            isDark: true,
          },
        },
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: { theme },
    });
  } catch (error) {
    next(error);
  }
};

export const createTheme = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const validated = themeSchema.parse(req.body);

    const collision = await prisma.theme.findUnique({
      where: { name: validated.name },
    });
    if (collision) {
      return next(new AppError('A design theme with this name already exists.', 409));
    }

    if (validated.isDefault) {
      await prisma.theme.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const theme = await prisma.theme.create({ data: validated });

    res.status(201).json({
      status: 'success',
      data: { theme },
    });
  } catch (error) {
    next(error);
  }
};

export const updateTheme = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const validated = themeSchema.partial().parse(req.body);

    const exists = await prisma.theme.findUnique({ where: { id } });
    if (!exists) {
      return next(new AppError('Theme design not found.', 404));
    }

    if (validated.isDefault) {
      await prisma.theme.updateMany({
        where: { isDefault: true, NOT: { id } },
        data: { isDefault: false },
      });
    }

    const updated = await prisma.theme.update({
      where: { id },
      data: validated,
    });

    res.status(200).json({
      status: 'success',
      data: { theme: updated },
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// SYSTEM PORTABILITY: EXPORT / IMPORT JSON
// ==========================================

export const exportSystemStateJSON = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const [settings, themes, menus, footerSections] = await Promise.all([
      prisma.setting.findMany(),
      prisma.theme.findMany(),
      prisma.menu.findMany(),
      prisma.footerSection.findMany(),
    ]);

    const exportPayload = {
      backupVersion: '1.0.0',
      exportedAt: new Date().toISOString(),
      data: {
        settings,
        themes,
        menus,
        footerSections,
      },
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="nexus_pms_backup_state.json"');
    res.status(200).send(JSON.stringify(exportPayload, null, 2));
  } catch (error) {
    next(error);
  }
};

export const importSystemStateJSON = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { backupPayload } = req.body;
    if (!backupPayload) {
      return next(new AppError('Please provide a valid backup payload JSON string or object.', 400));
    }

    let parsed: any = backupPayload;
    if (typeof backupPayload === 'string') {
      try {
        parsed = JSON.parse(backupPayload);
      } catch {
        return next(new AppError('Backup payload contains invalid JSON formatting.', 400));
      }
    }

    if (!parsed.data || !parsed.data.settings || !parsed.data.themes) {
      return next(new AppError('Invalid backup payload file format: settings or themes definitions missing.', 400));
    }

    const { settings, themes, menus, footerSections } = parsed.data;

    const settingOperations = settings.map((s: any) =>
      prisma.setting.upsert({
        where: { key: s.key },
        update: { value: s.value, group: s.group },
        create: { key: s.key, value: s.value, group: s.group },
      })
    );

    const themeOperations = themes.map((t: any) =>
      prisma.theme.upsert({
        where: { name: t.name },
        update: {
          primaryColor: t.primaryColor,
          secondaryColor: t.secondaryColor,
          accentColor: t.accentColor,
          fontFamily: t.fontFamily,
          borderRadius: t.borderRadius,
          boxShadow: t.boxShadow,
          cursorStyle: t.cursorStyle,
          layoutWidth: t.layoutWidth,
          navbarStyle: t.navbarStyle,
          footerStyle: t.footerStyle,
          loaderType: t.loaderType,
          isDark: t.isDark,
          isDefault: t.isDefault,
        },
        create: {
          name: t.name,
          primaryColor: t.primaryColor,
          secondaryColor: t.secondaryColor,
          accentColor: t.accentColor,
          fontFamily: t.fontFamily,
          borderRadius: t.borderRadius,
          boxShadow: t.boxShadow,
          cursorStyle: t.cursorStyle,
          layoutWidth: t.layoutWidth,
          navbarStyle: t.navbarStyle,
          footerStyle: t.footerStyle,
          loaderType: t.loaderType,
          isDark: t.isDark,
          isDefault: t.isDefault,
        },
      })
    );

    await prisma.$transaction([...settingOperations, ...themeOperations]);

    if (Array.isArray(menus)) {
      for (const m of menus) {
        await prisma.menu.upsert({
          where: { id: m.id },
          update: {
            label: m.label,
            url: m.url,
            icon: m.icon,
            displayOrder: m.displayOrder,
            target: m.target,
          },
          create: {
            id: m.id,
            label: m.label,
            url: m.url,
            icon: m.icon,
            displayOrder: m.displayOrder,
            target: m.target,
          },
        });
      }
    }

    if (Array.isArray(footerSections)) {
      for (const fsItem of footerSections) {
        await prisma.footerSection.upsert({
          where: { id: fsItem.id },
          update: {
            title: fsItem.title,
            type: fsItem.type,
            links: fsItem.links,
            displayOrder: fsItem.displayOrder,
          },
          create: {
            id: fsItem.id,
            title: fsItem.title,
            type: fsItem.type,
            links: fsItem.links,
            displayOrder: fsItem.displayOrder,
          },
        });
      }
    }

    logger.info(`System backup restored successfully.`);

    res.status(200).json({
      status: 'success',
      message: 'System database state successfully restored and synchronized.',
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// MENU BUILDER CRUD ENDPOINTS
// ==========================================

export const createMenu = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validated = menuSchema.parse(req.body);
    const menu = await prisma.menu.create({ data: validated });
    res.status(201).json({ status: 'success', data: { menu } });
  } catch (err) { next(err); }
};

export const getMenusList = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const menus = await prisma.menu.findMany({
      where: { parentId: null },
      include: {
        subMenus: {
          orderBy: { displayOrder: 'asc' },
        },
      },
      orderBy: { displayOrder: 'asc' },
    });
    res.status(200).json({ status: 'success', results: menus.length, data: { menus } });
  } catch (err) { next(err); }
};

export const deleteMenu = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.menu.delete({ where: { id } });
    res.status(204).json({ status: 'success', data: null });
  } catch (err) { next(err); }
};

// ==========================================
// CUSTOM PAGE BUILDER CRUD ENDPOINTS
// ==========================================

export const createDynamicPage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validated = dynamicPageSchema.parse(req.body);
    const collision = await prisma.dynamicPage.findUnique({ where: { slug: validated.slug } });
    if (collision) return next(new AppError('A page with this URL slug already exists.', 409));

    const page = await prisma.dynamicPage.create({ data: validated });
    res.status(201).json({ status: 'success', data: { page } });
  } catch (err) { next(err); }
};

export const getDynamicPagesList = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const pages = await prisma.dynamicPage.findMany({ orderBy: { createdAt: 'desc' } });
    res.status(200).json({ status: 'success', results: pages.length, data: { pages } });
  } catch (err) { next(err); }
};

export const getPageBySlugPath = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { slug } = req.params;
    const page = await prisma.dynamicPage.findUnique({ where: { slug } });
    if (!page) return next(new AppError('Dynamic page not found.', 404));

    res.status(200).json({ status: 'success', data: { page } });
  } catch (err) { next(err); }
};

export const deleteDynamicPage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.dynamicPage.delete({ where: { id } });
    res.status(204).json({ status: 'success', data: null });
  } catch (err) { next(err); }
};

// ==========================================
// NEW: DYNAMIC FOOTER SECTION CRUD ENDPOINTS
// ==========================================

export const createFooterSection = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validated = footerSectionSchema.parse(req.body);
    const footerSection = await prisma.footerSection.create({ data: validated });
    res.status(201).json({ status: 'success', data: { footerSection } });
  } catch (err) { next(err); }
};

export const getFooterSectionsList = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const footerSections = await prisma.footerSection.findMany({ orderBy: { displayOrder: 'asc' } });
    res.status(200).json({ status: 'success', results: footerSections.length, data: { footerSections } });
  } catch (err) { next(err); }
};

export const deleteFooterSection = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.footerSection.delete({ where: { id } });
    res.status(204).json({ status: 'success', data: null });
  } catch (err) { next(err); }
};
export const getActiveThemeFallback = getActiveTheme;
