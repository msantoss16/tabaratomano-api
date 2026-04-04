import { FastifyInstance } from 'fastify';
import { authController } from '../controllers/auth.controller.js';

export default async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/login', {
    schema: {
      tags: ['Auth'],
      summary: 'Admin login',
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string' },
          password: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            token: { type: 'string' }
          }
        },
        401: {
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        }
      }
    }
  }, authController.login);
}
