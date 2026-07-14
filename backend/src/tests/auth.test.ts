import request from 'supertest';
import app from '../index';
import { prisma } from '../config/db';
import bcrypt from 'bcryptjs';

// Mock Prisma Client methods to allow isolated testing without a running database
jest.mock('../config/db', () => ({
  prisma: {
    user: {
      count: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    session: {
      create: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    project: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

describe('🔒 Authentication Integration and Session Guard Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reinstate default resolutions wiped by resetMocks
    (prisma.project.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.project.count as jest.Mock).mockResolvedValue(0);
  });

  describe('POST /api/v1/auth/register', () => {
    it('should successfully bootstrap the first user as SUPER_ADMIN', async () => {
      // Mock database counts to 0, indicating first register
      (prisma.user.count as jest.Mock).mockResolvedValue(0);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: 'user-uuid-admin',
        email: 'ceo@portfolio.dev',
        username: 'ceo',
        displayName: 'Super Architect',
        role: 'SUPER_ADMIN',
        slug: 'super-architect',
      });

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'ceo@portfolio.dev',
          username: 'ceo',
          password: 'SecureAdminPassword123',
          displayName: 'Super Architect',
        });

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('success');
      expect(response.body.data.user.role).toBe('SUPER_ADMIN');
      expect(prisma.user.create).toHaveBeenCalled();
    });

    it('should fail registration if email already exists', async () => {
      // Mock existing email collision
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'existing-user' });

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'duplicate@portfolio.dev',
          username: 'newuser',
          password: 'SecurePassword123',
          displayName: 'New Dev',
        });

      expect(response.status).toBe(409);
      expect(response.body.message).toContain('already exists');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should verify password and return rotating cookie and access token', async () => {
      const hashedPassword = await bcrypt.hash('SecurePassword123', 12);
      
      // Mock finding user profile
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({
        id: 'user-uuid-1',
        email: 'dev@portfolio.dev',
        username: 'developer',
        displayName: 'Ahmad Developer',
        passwordHash: hashedPassword,
        role: 'WRITER',
        slug: 'ahmad-developer',
        loginAttempts: 0,
        lockoutExpires: null,
        emailVerified: true, // Activated account
      });

      (prisma.session.create as jest.Mock).mockResolvedValue({ id: 'session-uuid-1' });

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          emailOrUsername: 'dev@portfolio.dev',
          password: 'SecurePassword123',
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('accessToken');
      
      // Verify that the HttpOnly cookie is attached to the response headers
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toContain('refreshToken');
      expect(cookies[0]).toContain('HttpOnly');
      expect(cookies[0]).toContain('SameSite=Strict');
    });

    it('should reject login with wrong password and increment failed attempts', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({
        id: 'user-uuid-1',
        email: 'dev@portfolio.dev',
        username: 'developer',
        passwordHash: 'some_other_hashed_password',
        loginAttempts: 0,
        lockoutExpires: null,
      });

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          emailOrUsername: 'dev@portfolio.dev',
          password: 'WrongPasswordSecure',
        });

      expect(response.status).toBe(401);
      expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          loginAttempts: 1,
        }),
      }));
    });
  });

  describe('RBAC & Auth Middleware Verification', () => {
    it('should block requests to protected areas when token is missing', async () => {
      const response = await request(app).get('/api/v1/projects');
      
      // Accessing projects with GET should succeed since it is public
      expect(response.status).toBe(200);

      // Accessing settings with GET should block since it requires supervisor credentials
      const settingsResponse = await request(app).get('/api/v1/settings');
      expect(settingsResponse.status).toBe(401);
    });
  });
});
