import { FastifyInstance } from 'fastify';
import { dealsController } from '../controllers/deals.controller.js';
import { scraperController } from '../controllers/scraper.controller.js';

export default async function dealsRoutes(fastify: FastifyInstance) {
  fastify.get('/', {
    schema: {
      tags: ['Deals'],
      summary: 'List all deals',
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              description: { type: 'string' },
              original_price: { type: 'number' },
              current_price: { type: 'number' },
              discount: { type: 'number' },
              store: { type: 'string' },
              image_url: { type: 'string' },
              link: { type: 'string' },
              category: { type: 'string' },
              is_hot: { type: 'boolean' }
            }
          }
        }
      }
    }
  }, dealsController.getAllDeals);

  fastify.get('/:id', {
    schema: {
      tags: ['Deals'],
      summary: 'Get deal by ID',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            original_price: { type: 'number' },
            current_price: { type: 'number' },
            discount: { type: 'number' },
            store: { type: 'string' },
            image_url: { type: 'string' },
            link: { type: 'string' },
            category: { type: 'string' },
            is_hot: { type: 'boolean' },
            specs: { type: 'array', items: { type: 'string' } }
          }
        }
      }
    }
  }, dealsController.getDealById);

  fastify.post('/scrape', {
    schema: {
      tags: ['Deals'],
      summary: 'Extract a product via Affiliate URL and sync with DB',
      body: {
        type: 'object',
        required: ['url'],
        properties: {
          url: { type: 'string' }
        }
      }
    }
  }, scraperController.scrapeAndSave);
}
