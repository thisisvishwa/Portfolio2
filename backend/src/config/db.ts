import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

// Prevent multiple instances of Prisma Client in development to prevent connection exhaustion
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'info', 'warn', 'error']
        : ['warn', 'error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Validate connection
prisma.$connect()
  .then(() => {
    logger.info('Successfully connected to the PostgreSQL database via Prisma ORM.');
  })
  .catch((err) => {
    logger.error('Database connection failure:', err);
    process.exit(1);
  });
