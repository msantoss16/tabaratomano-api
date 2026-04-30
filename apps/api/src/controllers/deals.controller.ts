import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '@tabaratomano/database';

export const dealsController = {
  // Get all deals found
  getAllDeals: async (request: FastifyRequest<{ Querystring: { category?: string } }>, reply: FastifyReply) => {
    try {
      const { category } = request.query;
      
      const where: any = {};
      
      if (category && category !== 'todos') {
        where.category = {
          contains: category,
          mode: 'insensitive'
        };
      }

      const data = await prisma.deal.findMany({
        where,
        orderBy: { created_at: 'desc' }
      });
      return data;
    } catch (err) {
      request.log.error(err);
      reply.code(500).send({ error: 'Failed to fetch deals' });
    }
  },

  // Get deal by ID
  getDealById: async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;
      const data = await prisma.deal.findUnique({
        where: { id }
      });
        
      if (!data) {
        return reply.code(404).send({ error: 'Deal not found' });
      }
      
      return data;
    } catch (err) {
      request.log.error(err);
      reply.code(500).send({ error: 'Failed to fetch deal' });
    }
  }
};
