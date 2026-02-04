import { FastifyInstance } from 'fastify';
import { dealsController } from '../controllers/deals.controller';

export default async function dealsRoutes(fastify: FastifyInstance) {
  fastify.get('/', dealsController.getAllDeals);
  fastify.get('/:id', dealsController.getDealById);
}
