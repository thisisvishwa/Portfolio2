import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { prisma } from '../config/db';
import { AppError } from '../utils/appError';
import { z } from 'zod';
import { MessageStatus, SubscriptionStatus } from '@prisma/client';
import { logger } from '../utils/logger';
import { sendContactNotification, sendNewsletterVerification } from '../services/emailService';

// ==========================================
// ZOD VALIDATION SCHEMAS
// ==========================================

const contactCreateSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email formatting'),
  subject: z.string().min(3, 'Subject must be at least 3 characters'),
  message: z.string().min(10, 'Message body must be at least 10 characters'),
  labels: z.array(z.string()).default([]),
});

const newsletterSubscribeSchema = z.object({
  email: z.string().email('Invalid email formatting'),
});

// ==========================================
// CONTROLLER HANDLERS (CONTACT MESSAGES)
// ==========================================

/**
 * Handle new guest contact request submissions
 */
export const submitContactRequest = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const validated = contactCreateSchema.parse(req.body);

    // Dynamic spam score heuristic calculation
    let spamScore = 0.0;
    const bodyWords = validated.message.toLowerCase();
    
    // Core check keywords for automated promotional bots
    const spamSignals = ['crypto', 'seo', 'promo', 'casino', 'viagra', 'earn fast', 'http://', 'https://'];
    spamSignals.forEach((signal) => {
      if (bodyWords.includes(signal)) {
        spamScore += 0.25;
      }
    });

    const isSpam = spamScore >= 0.75;
    const resolvedLabels = [...validated.labels];
    if (isSpam) {
      resolvedLabels.push('Potential Spam');
    }

    const contact = await prisma.contactRequest.create({
      data: {
        name: validated.name,
        email: validated.email,
        subject: validated.subject,
        message: validated.message,
        spamScore,
        ipAddress: req.ip || '0.0.0.0',
        userAgent: req.headers['user-agent'] || 'unknown',
        labels: resolvedLabels,
        status: isSpam ? MessageStatus.ARCHIVED : MessageStatus.UNREAD,
      },
    });

    logger.info(`New contact request received from ${contact.name} (${contact.email}) - Spam Score: ${spamScore}`);

    // Trigger transactional emails asynchronously (do not block the main response thread)
    if (!isSpam) {
      sendContactNotification(validated.name, validated.email, validated.subject, validated.message)
        .catch((err) => logger.error('Async contact notification mail failure:', err));
    }

    res.status(201).json({
      status: 'success',
      message: isSpam
        ? 'Your message was successfully received.'
        : 'Thank you. Your message has been securely submitted. I will get back to you shortly.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieve list of contact submissions (Protected)
 */
export const getContactRequests = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { status, label, search, page = '1', limit = '10' } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skipNum = (pageNum - 1) * limitNum;

    const whereClause: any = {};

    if (status) {
      whereClause.status = status as MessageStatus;
    }
    if (label) {
      whereClause.labels = { has: label as string };
    }
    if (search) {
      whereClause.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
        { subject: { contains: search as string, mode: 'insensitive' } },
        { message: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const [messages, totalCount] = await Promise.all([
      prisma.contactRequest.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip: skipNum,
        take: limitNum,
      }),
      prisma.contactRequest.count({ where: whereClause }),
    ]);

    res.status(200).json({
      status: 'success',
      total: totalCount,
      page: pageNum,
      totalPages: Math.ceil(totalCount / limitNum),
      data: { messages },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update message status (Unread -> Read, Archived, Replied)
 */
export const updateMessageStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, labels } = req.body;

    const exists = await prisma.contactRequest.findUnique({ where: { id } });
    if (!exists) {
      return next(new AppError('Contact request record not found.', 404));
    }

    const updated = await prisma.contactRequest.update({
      where: { id },
      data: {
        ...(status && { status: status as MessageStatus }),
        ...(labels && { labels: labels as string[] }),
      },
    });

    res.status(200).json({
      status: 'success',
      data: { message: updated },
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// CONTROLLER HANDLERS (NEWSLETTER ACTIONS)
// ==========================================

/**
 * Subscribe email to newsletter (Double opt-in token generated)
 */
export const subscribeNewsletter = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const validated = newsletterSubscribeSchema.parse(req.body);

    const subscriberExists = await prisma.newsletterSubscriber.findUnique({
      where: { email: validated.email },
    });

    if (subscriberExists) {
      if (subscriberExists.status === SubscriptionStatus.SUBSCRIBED) {
        return next(new AppError('This email is already subscribed to the newsletter.', 400));
      }
      
      // If pending or unsubscribed, re-trigger a verification token
      const token = crypto.randomUUID();
      const updated = await prisma.newsletterSubscriber.update({
        where: { email: validated.email },
        data: {
          status: SubscriptionStatus.PENDING,
          doubleOptInToken: token,
          optInTokenExpires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 Hours
        },
      });

      logger.info(`Newsletter signup re-triggered for: ${updated.email}`);
      
      // Dispatch verification email
      sendNewsletterVerification(updated.email, token)
        .catch((err) => logger.error('Async newsletter re-trigger mail failure:', err));

      res.status(200).json({
        status: 'success',
        message: 'A confirmation link has been sent to your email address.',
      });
      return;
    }

    const verificationToken = crypto.randomUUID();
    await prisma.newsletterSubscriber.create({
      data: {
        email: validated.email,
        status: SubscriptionStatus.PENDING,
        doubleOptInToken: verificationToken,
        optInTokenExpires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 Hours
      },
    });

    logger.info(`Newsletter pending subscription recorded: ${validated.email}`);

    // Dispatch verification email for fresh subscribers
    sendNewsletterVerification(validated.email, verificationToken)
      .catch((err) => logger.error('Async newsletter subscription mail failure:', err));

    res.status(201).json({
      status: 'success',
      message: 'Thank you for subscribing! Please check your email to verify your subscription.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify subscription via Double Opt-In token
 */
export const verifySubscription = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { token } = req.params;

    const subscriber = await prisma.newsletterSubscriber.findUnique({
      where: { doubleOptInToken: token },
    });

    if (!subscriber || (subscriber.optInTokenExpires && subscriber.optInTokenExpires < new Date())) {
      return next(new AppError('Invalid or expired subscription verification token.', 400));
    }

    await prisma.newsletterSubscriber.update({
      where: { id: subscriber.id },
      data: {
        status: SubscriptionStatus.SUBSCRIBED,
        doubleOptInToken: null,
        optInTokenExpires: null,
      },
    });

    logger.info(`Newsletter subscription confirmed for: ${subscriber.email}`);

    res.status(200).json({
      status: 'success',
      message: 'Your newsletter subscription has been successfully verified!',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Unsubscribe from newsletter
 */
export const unsubscribeNewsletter = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email } = req.body;

    const subscriber = await prisma.newsletterSubscriber.findUnique({
      where: { email },
    });

    if (!subscriber || subscriber.status === SubscriptionStatus.UNSUBSCRIBED) {
      return next(new AppError('Email address is not an active subscriber.', 400));
    }

    await prisma.newsletterSubscriber.update({
      where: { email },
      data: {
        status: SubscriptionStatus.UNSUBSCRIBED,
        doubleOptInToken: null,
        optInTokenExpires: null,
      },
    });

    logger.info(`Newsletter unsubscribe processed for: ${email}`);

    res.status(200).json({
      status: 'success',
      message: 'You have been successfully unsubscribed from the newsletter.',
    });
  } catch (error) {
    next(error);
  }
};
