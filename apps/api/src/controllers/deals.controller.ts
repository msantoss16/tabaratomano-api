import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '@tabaratomano/database';

export const dealsController = {
  // Get all deals found
  getAllDeals: async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = await prisma.deal.findMany();
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
