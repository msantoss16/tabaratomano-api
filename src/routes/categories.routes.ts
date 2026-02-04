import { FastifyInstance } from 'fastify';
import { categoriesController } from '../controllers/categories.controller';

export default async function categoriesRoutes(fastify: FastifyInstance) {
  fastify.get('/', categoriesController.getAllCategories);
  fastify.get('/:slug', categoriesController.getCategoryBySlug);
}
