import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/appError';
import { logger } from '../utils/logger';

interface RecaptchaResponse {
  success: boolean;
  score?: number;
  action?: string;
  'error-codes'?: string[];
}

/**
 * Express middleware to validate client-side ReCAPTCHA tokens.
 * Gracefully bypassed during local testing or development if secrets are unconfigured.
 */
export const validateCaptcha = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (res) {
      // satisfy unused express signature check
    }

    const token = req.body.captchaToken || req.headers['x-captcha-token'];
    const secretKey = process.env.RECAPTCHA_SECRET_KEY;

    // Bypass verification if recaptcha is not configured or we are in development / test environments
    if (!secretKey || process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development') {
      logger.debug('ReCAPTCHA bypass: Environment mode or secret unconfigured.');
      return next();
    }

    if (!token) {
      return next(new AppError('Security bot check failed: Captcha token missing.', 400));
    }

    const verificationUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${token}`;
    
    const response = await fetch(verificationUrl, { method: 'POST' });
    if (!response.ok) {
      return next(new AppError('Failed to communicate with ReCAPTCHA verification servers.', 500));
    }

    const data = (await response.json()) as RecaptchaResponse;

    if (!data.success) {
      logger.warn(`Failed bot capture attempt from IP: ${req.ip} - Errors: ${data['error-codes']?.join(', ')}`);
      return next(new AppError('Automated bot request blocked. Please try again.', 400));
    }

    // If using reCAPTCHA v3, check the score threshold
    if (data.score !== undefined && data.score < 0.5) {
      logger.warn(`Low bot-score captured: ${data.score} from IP: ${req.ip}`);
      return next(new AppError('Automated request blocked: High bot probability.', 400));
    }

    logger.debug('ReCAPTCHA security check passed successfully.');
    next();
  } catch (error) {
    next(error);
  }
};
