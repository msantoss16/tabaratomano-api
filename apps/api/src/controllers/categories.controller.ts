import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '@tabaratomano/database';

export const categoriesController = {
  getAllCategories: async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const deals = await prisma.deal.findMany({
        distinct: ['category'],
        select: {
          category: true,
        },
        where: {
          category: { not: null }
        }
      });
      
      const categories = deals
        .map(d => d.category)
        .filter((c): c is string => !!c)
        .map(c => ({
          label: c,
          value: c.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-')
        }));

      return [{ label: "Todos", value: "todos" }, ...categories];
    } catch (err) {
      request.log.error(err);
      reply.code(500).send({ error: 'Failed to fetch categories' });
    }
  },
  getCategoryBySlug: async (request: FastifyRequest<{ Params: { slug: string } }>, reply: FastifyReply) => {
    return reply.code(404).send({ error: 'Not implemented yet' });
  }
};
