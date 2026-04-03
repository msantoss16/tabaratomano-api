import { FastifyInstance } from 'fastify';
import { couponsController } from '../controllers/coupons.controller.js';

export default async function couponsRoutes(fastify: FastifyInstance) {
  fastify.get('/', {
    schema: {
      tags: ['Coupons'],
      summary: 'List all coupons',
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              code: { type: 'string' },
              description: { type: 'string' },
              discount: { type: 'string' },
              store: { type: 'string' },
              link: { type: 'string' },
              expiration_date: { type: 'string', format: 'date-time' }
            }
          }
        }
      }
    }
  }, couponsController.getAllCoupons);
}
