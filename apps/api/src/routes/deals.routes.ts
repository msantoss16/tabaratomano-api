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
              price_cents: { type: 'number' },
              marketplace: { type: 'string' },
              url_affiliate: { type: 'string' },
              rating: { type: 'number', nullable: true },
              review_count: { type: 'number', nullable: true },
              seller_name: { type: 'string', nullable: true },
              category: { type: 'string', nullable: true },
              images: { type: 'array', items: { type: 'string' } },
              url_canonical: { type: 'string', nullable: true },
              created_at: { type: 'string', format: 'date-time' },
              updated_at: { type: 'string', format: 'date-time' }
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
            price_cents: { type: 'number' },
            marketplace: { type: 'string' },
            url_affiliate: { type: 'string' },
            rating: { type: 'number', nullable: true },
            review_count: { type: 'number', nullable: true },
            seller_name: { type: 'string', nullable: true },
            category: { type: 'string', nullable: true },
            images: { type: 'array', items: { type: 'string' } },
            url_canonical: { type: 'string', nullable: true },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          }
        }
      }
    }
  }, dealsController.getDealById);

  fastify.post('/', {
    onRequest: [(fastify as any).authenticate],
    schema: {
      tags: ['Deals'],
      summary: 'Create a manual deal',
      body: {
        type: 'object',
        required: ['title', 'price_cents'],
        properties: {
          title: { type: 'string' },
          category: { type: 'string' },
          price_cents: { type: 'number' },
          marketplace: { type: 'string' },
          url_affiliate: { type: 'string' }
        }
      }
    }
  }, dealsController.createDeal);

  fastify.put('/:id', {
    onRequest: [(fastify as any).authenticate],
    schema: {
      tags: ['Deals'],
      summary: 'Update a deal',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        }
      },
      body: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          category: { type: 'string' },
          price_cents: { type: 'number' },
          marketplace: { type: 'string' },
          url_affiliate: { type: 'string' }
        }
      }
    }
  }, dealsController.updateDeal);

  fastify.delete('/:id', {
    onRequest: [(fastify as any).authenticate],
    schema: {
      tags: ['Deals'],
      summary: 'Delete a deal',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        }
      }
    }
  }, dealsController.deleteDeal);

  fastify.post('/scrape', {
    onRequest: [(fastify as any).authenticate],
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
