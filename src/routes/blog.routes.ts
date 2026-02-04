import { FastifyInstance } from 'fastify';
import { blogController } from '../controllers/blog.controller';

export default async function blogRoutes(fastify: FastifyInstance) {
  fastify.get('/', {
    schema: {
      tags: ['Blog'],
      summary: 'List all blog posts',
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              slug: { type: 'string' },
              summary: { type: 'string' },
              content: { type: 'string' },
              author: { type: 'string' },
              image_url: { type: 'string' },
              created_at: { type: 'string', format: 'date-time' }
            }
          }
        }
      }
    }
  }, blogController.getAllPosts);

  fastify.get('/:slug', {
    schema: {
      tags: ['Blog'],
      summary: 'Get blog post by slug',
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
            title: { type: 'string' },
            slug: { type: 'string' },
            summary: { type: 'string' },
            content: { type: 'string' },
            author: { type: 'string' },
            image_url: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' }
          }
        }
      }
    }
  }, blogController.getPostBySlug);
}
