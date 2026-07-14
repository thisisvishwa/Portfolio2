import { prisma } from '../config/db';
import { logger } from './logger';
import { PublicationStatus } from '@prisma/client';

/**
 * Sweeps the database for articles scheduled for publication whose target date has passed,
 * automatically promoting them to PUBLISHED.
 */
export const publishScheduledBlogsSweep = async (): Promise<void> => {
  try {
    const now = new Date();

    // Find scheduled blogs past publication threshold
    const scheduledBlogs = await prisma.blog.findMany({
      where: {
        status: PublicationStatus.SCHEDULED,
        scheduledAt: { lte: now },
        deletedAt: null,
      },
      select: { id: true, title: true },
    });

    if (scheduledBlogs.length === 0) {
      return;
    }

    logger.info(`Scheduler: Discovered ${scheduledBlogs.length} scheduled articles ready for release.`);

    const updateOperations = scheduledBlogs.map((blog) => {
      return prisma.blog.update({
        where: { id: blog.id },
        data: {
          status: PublicationStatus.PUBLISHED,
          scheduledAt: null, // Clear schedule flag
        },
      });
    });

    await prisma.$transaction(updateOperations);

    scheduledBlogs.forEach((blog) => {
      logger.info(`Scheduler: Successfully promoted article "${blog.title}" to PUBLISHED state.`);
    });
  } catch (error: any) {
    logger.error('Scheduler: Error running scheduled publishing sweep:', error.message);
  }
};

/**
 * Initializes the background scheduler thread
 */
export const initScheduler = (intervalMinutes = 5): void => {
  const msInterval = intervalMinutes * 60 * 1000;
  
  logger.info(`Scheduler: Background cron sweeps activated (Interval: every ${intervalMinutes} minutes).`);

  // Run initial sweep on boot
  publishScheduledBlogsSweep();

  setInterval(() => {
    publishScheduledBlogsSweep();
  }, msInterval);
};
