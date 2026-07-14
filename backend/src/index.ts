import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';

import { apiLimiter } from './middlewares/rateLimiter';
import { errorHandler } from './middlewares/errorHandler';
import { logger } from './utils/logger';
import { AppError } from './utils/appError';

// Load environmental variables
dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 5000;

// ==========================================
// 1. SECURITY & UTILITY MIDDLEWARES
// ==========================================

// Parse cookies securely
app.use(cookieParser(process.env.COOKIE_SIGNING_SECRET || 'cookie_secret_signing_key_256_bits'));

// Enable Helmet to set security headers (CSP, HSTS, X-Frame-Options, etc.)
app.use(helmet());

// Configure CORS white-listing
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};
app.use(cors(corsOptions));

// HTTP Request logging with Morgan integrated into Winston logger
const morganFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(
  morgan(morganFormat, {
    stream: { write: (message: string) => logger.http(message.trim()) },
  })
);

// Payload size limits (prevent massive JSON overflows)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply rate limits to all API calls
app.use('/api/', apiLimiter);

// Serve static assets if any
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ==========================================
// 2. ROOT & HEALTHCHECK ENDPOINTS
// ==========================================

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'success',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    server: 'Active',
  });
});

// Root check
app.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'success',
    message: 'Welcome to the Enterprise PMS API platform. Version 1.0.0 is online.',
    documentation: '/api/docs',
  });
});

// ==========================================
// 3. SEEDING / BOOTSTRAP GATE
// ==========================================
import authRoutes from './routes/authRoutes';
import projectRoutes from './routes/projectRoutes';
import blogRoutes from './routes/blogRoutes';
import skillRoutes from './routes/skillRoutes';
import experienceRoutes from './routes/experienceRoutes';
import contactRoutes from './routes/contactRoutes';
import settingRoutes from './routes/settingRoutes';
import mediaRoutes from './routes/mediaRoutes';
import formRoutes from './routes/formRoutes';
import swaggerRoutes from './routes/swaggerRoutes';
import portfolioRoutes from './routes/portfolioRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import newsletterRoutes from './routes/newsletterRoutes';

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/projects', projectRoutes);
app.use('/api/v1/blogs', blogRoutes);
app.use('/api/v1/skills', skillRoutes);
app.use('/api/v1/experiences', experienceRoutes);
app.use('/api/v1/contacts', contactRoutes);
app.use('/api/v1/settings', settingRoutes);
app.use('/api/v1/media', mediaRoutes);
app.use('/api/v1/forms', formRoutes);
app.use('/api/v1/portfolio', portfolioRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/newsletter', newsletterRoutes);
app.use('/api/docs', swaggerRoutes);

// ==========================================
// 4. ERROR & 404 ROUTING FALLBACKS
// ==========================================

// Handle non-existent endpoints
app.all('*', (req: Request, _res: Response, next: NextFunction) => {
  next(new AppError(`Cannot find endpoint ${req.originalUrl} on this server`, 404));
});

// Global Central Error Interceptor Middleware
app.use(errorHandler);

// ==========================================
// 5. SERVER LAUNCHER
// ==========================================
import { initScheduler } from './utils/scheduler';

const server = app.listen(PORT, () => {
  logger.info(`=======================================================`);
  logger.info(`  PMS SERVER RUNNING IN [${process.env.NODE_ENV}] MODE`);
  logger.info(`  PORT: ${PORT}`);
  logger.info(`  CORS WHITELIST: ${process.env.CORS_ORIGIN}`);
  logger.info(`=======================================================`);
  
  // Boot automated background scheduler (Runs sweeps every 5 minutes)
  initScheduler(5);
});

// Graceful shutdowns
process.on('unhandledRejection', (reason: Error) => {
  logger.error('UNHANDLED PROMISE REJECTION! Shutting down server safely...', reason);
  server.close(() => {
    process.exit(1);
  });
});

process.on('uncaughtException', (err: Error) => {
  logger.error('UNCAUGHT EXCEPTION! Shutting down server safely...', err);
  server.close(() => {
    process.exit(1);
  });
});

export default app;
