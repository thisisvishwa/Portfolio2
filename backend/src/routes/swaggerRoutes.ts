import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';

const router = Router();

const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'Nexus Portfolio CMS API Specs',
    description: 'Enterprise-grade, decoupled portfolio content management system dynamic API definitions.',
    version: '1.0.0',
  },
  servers: [
    {
      url: 'http://localhost:5000/api/v1',
      description: 'Local Development Server Gateway',
    },
  ],
  paths: {
    '/auth/register': {
      post: {
        summary: 'Bootstrap SUPER_ADMIN or write new authors',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string', example: 'ceo@portfolio.dev' },
                  username: { type: 'string', example: 'ceo' },
                  password: { type: 'string', example: 'SecureAdminPassword123' },
                  displayName: { type: 'string', example: 'Super Architect' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Super Admin or User initialized successfully.' },
        },
      },
    },
    '/auth/login': {
      post: {
        summary: 'Authenticate credentials and open session',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  emailOrUsername: { type: 'string', example: 'ceo@portfolio.dev' },
                  password: { type: 'string', example: 'SecureAdminPassword123' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Tokens issued and HttpOnly rotating cookies attached.' },
        },
      },
    },
    '/projects': {
      get: {
        summary: 'List dynamic projects from PostgreSQL',
        parameters: [
          { name: 'category', in: 'query', schema: { type: 'string' } },
          { name: 'tag', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Array of projects.' },
        },
      },
    },
    '/contacts/submit': {
      post: {
        summary: 'Process guest message with spam score evaluations',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string', example: 'Jane Doe' },
                  email: { type: 'string', example: 'jane@company.com' },
                  subject: { type: 'string', example: 'Freelance Offer' },
                  message: { type: 'string', example: 'I want to hire you to build an enterprise platform.' },
                },
              },
            },
          },
        },
        responses: {
          210: { description: 'Feedback captured.' },
        },
      },
    },
  },
};

// Serve interactive browser console docs at /api/docs
router.use('/', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

export default router;
