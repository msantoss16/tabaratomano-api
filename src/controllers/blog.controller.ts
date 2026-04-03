import { FastifyRequest, FastifyReply } from 'fastify';

export const blogController = {
  getAllPosts: async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      return [];
    } catch (err) {
      request.log.error(err);
      reply.code(500).send({ error: 'Failed to fetch blog posts' });
    }
  },
  getPostById: async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    return reply.code(404).send({ error: 'Not implemented yet' });
  },
  getPostBySlug: async (request: FastifyRequest<{ Params: { slug: string } }>, reply: FastifyReply) => {
    return reply.code(404).send({ error: 'Not implemented yet' });
  }
};
