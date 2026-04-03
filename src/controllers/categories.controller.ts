import { FastifyRequest, FastifyReply } from 'fastify';

export const categoriesController = {
  getAllCategories: async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Mock data until Prisma model is added
      return [];
    } catch (err) {
      request.log.error(err);
      reply.code(500).send({ error: 'Failed to fetch categories' });
    }
  },
  getCategoryBySlug: async (request: FastifyRequest<{ Params: { slug: string } }>, reply: FastifyReply) => {
    return reply.code(404).send({ error: 'Not implemented yet' });
  }
};
