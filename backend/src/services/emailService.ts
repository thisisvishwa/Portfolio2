import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';

// Create a transporter singleton
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
  port: parseInt(process.env.SMTP_PORT || '2525', 10),
  secure: false, // true for port 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASSWORD || '',
  },
});

// Verify connection configuration
transporter.verify((error, _success) => {
  if (error) {
    logger.warn('SMTP connection validation failed. Operational mailer deactivated.', error.message);
  } else {
    logger.info('SMTP Mailer connected and ready to transmit notifications.');
  }
});

/**
 * Sends a HTML transactional email
 */
export const sendEmail = async (
  to: string,
  subject: string,
  html: string
): Promise<boolean> => {
  try {
    const mailOptions = {
      from: `"${process.env.SMTP_FROM_NAME || 'Portfolio Admin'}" <${process.env.SMTP_FROM_EMAIL || 'noreply@portfolio.dev'}>`,
      to,
      subject,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    logger.debug(`Email sent successfully: ${info.messageId}`);
    return true;
  } catch (error) {
    logger.error('SMTP email transmission failure:', error);
    return false;
  }
};

/**
 * Sends a dynamic contact submission replication copy to the Admin and Client
 */
export const sendContactNotification = async (
  clientName: string,
  clientEmail: string,
  subject: string,
  message: string
): Promise<void> => {
  const adminTemplate = `
    <div style="font-family: sans-serif; padding: 20px; background-color: #0f172a; color: #f8fafc; border-radius: 10px;">
      <h2 style="color: #6366f1;">New Guest Message Received</h2>
      <hr style="border-color: #334155;" />
      <p><strong>Name:</strong> ${clientName}</p>
      <p><strong>Email:</strong> ${clientEmail}</p>
      <p><strong>Subject:</strong> ${subject}</p>
      <div style="background-color: #1e293b; padding: 15px; border-radius: 8px; font-style: italic; color: #cbd5e1; border-left: 4px solid #6366f1;">
        "${message}"
      </div>
      <p style="font-size: 11px; color: #64748b; margin-top: 20px;">Sent from Nexus Portfolio CMS System</p>
    </div>
  `;

  const clientTemplate = `
    <div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
      <h2 style="color: #4f46e5;">Message Received Successfully</h2>
      <p>Hi ${clientName},</p>
      <p>Thank you for reaching out! This is an automated receipt confirming that your contact request has been securely written to our systems.</p>
      <p>I will review your message regarding "<strong>${subject}</strong>" and respond within 24-48 business hours.</p>
      <br/>
      <p>Best regards,</p>
      <p><strong>Portfolio Management CMS Team</strong></p>
    </div>
  `;

  // Send copy to admin mailbox and client receipt asynchronously
  const adminEmail = process.env.SMTP_FROM_EMAIL || 'admin@portfolio.dev';
  await Promise.all([
    sendEmail(adminEmail, `[Inbox Notice] ${subject}`, adminTemplate),
    sendEmail(clientEmail, `Receipt: ${subject}`, clientTemplate),
  ]);
};

/**
 * Sends a Double Opt-In confirmation key to prospective subscribers
 */
export const sendNewsletterVerification = async (
  email: string,
  token: string
): Promise<void> => {
  const verificationLink = `${process.env.CORS_ORIGIN || 'http://localhost:3000'}/newsletter/verify/${token}`;
  
  const template = `
    <div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
      <h2 style="color: #4f46e5;">Confirm Your Newsletter Subscription</h2>
      <p>Hi,</p>
      <p>Thank you for signing up to receive my technical insights, project releases, and engineering articles!</p>
      <p>To verify your email address and activate your subscription, please click the button below:</p>
      <div style="margin: 25px 0;">
        <a href="${verificationLink}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 6px; display: inline-block;">
          Verify Subscription
        </a>
      </div>
      <p style="font-size: 11px; color: #64748b;">If you did not initiate this subscription request, you can safely ignore this email.</p>
    </div>
  `;

  await sendEmail(email, 'Verify Your Subscription - Portfolio CMS', template);
};

/**
 * Sends a password reset link to administrators
 */
export const sendPasswordResetEmail = async (
  email: string,
  token: string
): Promise<void> => {
  const resetLink = `${process.env.CORS_ORIGIN || 'http://localhost:3000'}/admin/reset-password?token=${token}`;
  
  const template = `
    <div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
      <h2 style="color: #6366f1;">Reset Your Admin Password</h2>
      <p>A password reset request was received for your portfolio admin account.</p>
      <p>To set a new password, click the button below:</p>
      <div style="margin: 25px 0;">
        <a href="${resetLink}" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 6px; display: inline-block;">
          Reset Password
        </a>
      </div>
      <p style="font-size: 11px; color: #64748b;">This link is valid for 1 hour. If you did not trigger this request, you can safely ignore this email.</p>
    </div>
  `;

  await sendEmail(email, 'Reset Your Password - Portfolio CMS', template);
};

/**
 * Sends an email account verification link to new registrants
 */
export const sendVerificationEmail = async (
  email: string,
  token: string
): Promise<void> => {
  const verifyLink = `${process.env.CORS_ORIGIN || 'http://localhost:3000'}/admin/verify-email?token=${token}`;
  
  const template = `
    <div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
      <h2 style="color: #4f46e5;">Verify Your Portfolio Admin Account</h2>
      <p>Thank you for registering an account on Nexus Portfolio CMS.</p>
      <p>To verify your email address and activate your account, please click the button below:</p>
      <div style="margin: 25px 0;">
        <a href="${verifyLink}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 6px; display: inline-block;">
          Verify Email Account
        </a>
      </div>
      <p style="font-size: 11px; color: #64748b;">This link is valid for 24 hours.</p>
    </div>
  `;

  await sendEmail(email, 'Verify Your Email - Portfolio CMS', template);
};
