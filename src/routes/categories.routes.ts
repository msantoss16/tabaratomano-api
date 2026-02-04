import { FastifyInstance } from 'fastify';
import { categoriesController } from '../controllers/categories.controller';

export default async function categoriesRoutes(fastify: FastifyInstance) {
  fastify.get('/', {
    schema: {
      tags: ['Categories'],
      summary: 'List all categories',
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              slug: { type: 'string' },
              icon: { type: 'string' },
              description: { type: 'string' },
              count: { type: 'number' },
              type: { type: 'string', enum: ['niche', 'profile'] }
            }
          }
        }
      }
    }
  }, categoriesController.getAllCategories);

  fastify.get('/:slug', {
    schema: {
      tags: ['Categories'],
      summary: 'Get category by slug',
      params: {
        type: 'object',
        properties: {
          slug: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            slug: { type: 'string' },
            icon: { type: 'string' },
            description: { type: 'string' },
            count: { type: 'number' },
            type: { type: 'string', enum: ['niche', 'profile'] }
          }
        }
      }
    }
  }, categoriesController.getCategoryBySlug);
}
