import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { AppError } from '../utils/appError';
import { logger } from '../utils/logger';
import { sendEmail } from '../services/emailService';
import { SubscriptionStatus } from '@prisma/client';

// ==========================================
// CONTROLLER HANDLERS
// ==========================================

/**
 * List all subscribers (Protected)
 */
export const getSubscribers = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const subscribers = await prisma.newsletterSubscriber.findMany({
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      status: 'success',
      results: subscribers.length,
      data: { subscribers },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk Import Subscribers from parsed JSON emails list (Protected)
 */
export const importSubscribersJSON = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { emails } = req.body;
    if (!Array.isArray(emails)) {
      return next(new AppError('Please provide an array of email strings.', 400));
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const validEmails = emails.filter((email) => emailRegex.test(String(email)));

    if (validEmails.length === 0) {
      return next(new AppError('No valid email formatting found inside payload.', 400));
    }

    const operations = validEmails.map((email) =>
      prisma.newsletterSubscriber.upsert({
        where: { email },
        update: { status: SubscriptionStatus.SUBSCRIBED },
        create: { email, status: SubscriptionStatus.SUBSCRIBED },
      })
    );

    // Save in database inside an atomic transaction
    await prisma.$transaction(operations);

    logger.info(`Bulk imported ${validEmails.length} newsletter subscribers.`);

    res.status(201).json({
      status: 'success',
      message: `Bulk import completed. Successfully registered ${validEmails.length} subscribers.`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Export Subscribers to Excel CSV Spreadsheet (Protected)
 */
export const exportSubscribersCSV = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const subscribers = await prisma.newsletterSubscriber.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const headers = ['ID', 'Email Address', 'Status', 'Registered At'];
    const rows = subscribers.map((sub) => [
      `"${sub.id}"`,
      `"${sub.email}"`,
      `"${sub.status}"`,
      `"${sub.createdAt.toISOString()}"`,
    ].join(','));

    const csvContent = [headers.join(','), ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="newsletter_subscribers.csv"');
    res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
};

/**
 * Broadcast an HTML Email Campaign to all active subscribers (Protected)
 */
export const sendNewsletterCampaign = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { subject, htmlContent } = req.body;

    if (!subject || !htmlContent) {
      return next(new AppError('Subject and HTML content are required to dispatch a campaign.', 400));
    }

    // Locate active verified subscribers only
    const activeSubscribers = await prisma.newsletterSubscriber.findMany({
      where: { status: SubscriptionStatus.SUBSCRIBED },
    });

    if (activeSubscribers.length === 0) {
      return next(new AppError('There are no active, verified subscribers to mail.', 400));
    }

    logger.info(`Starting broadcast campaign: "${subject}" to ${activeSubscribers.length} subscribers...`);

    // Loop and transmit emails asynchronously
    const mailOperations = activeSubscribers.map(async (sub) => {
      try {
        const unsubscribeLink = `${process.env.CORS_ORIGIN || 'http://localhost:3000'}/newsletter/unsubscribe?email=${sub.email}`;
        
        const styledContent = `
          <div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
            ${htmlContent}
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
            <p style="font-size: 10px; color: #94a3b8; text-align: center;">
              You are receiving this because you subscribed to our news insights. <br/>
              <a href="${unsubscribeLink}" style="color: #4f46e5; text-decoration: underline;">Unsubscribe from lists</a>
            </p>
          </div>
        `;

        await sendEmail(sub.email, subject, styledContent);
      } catch (err: any) {
        logger.error(`Failed mailing campaign item to ${sub.email}:`, err.message);
      }
    });

    // Run parallel dispatches
    await Promise.all(mailOperations);
    logger.info(`Newsletter Campaign broadcast successfully dispatched.`);

    res.status(200).json({
      status: 'success',
      message: `Campaign broadcast dispatched successfully to ${activeSubscribers.length} subscribers.`,
    });
  } catch (error) {
    next(error);
  }
};
