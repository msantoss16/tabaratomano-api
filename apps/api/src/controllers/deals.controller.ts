import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '@tabaratomano/database';

export const dealsController = {
  // Get all deals found
  getAllDeals: async (request: FastifyRequest<{ Querystring: { category?: string } }>, reply: FastifyReply) => {
    try {
      const { category } = request.query;
      
      const where: any = {};
      
      if (category && category !== 'todos') {
        // Profile-based filtering logic
        const profiles: Record<string, any> = {
          'economizar': {
            // Future: filter by discount percentage
          },
          'custo-beneficio': {
            rating: { gte: 4.5 },
            review_count: { gte: 10 }
          },
          'gamers': {
            category: { contains: 'Games', mode: 'insensitive' }
          },
          'tech': {
            OR: [
              { category: { contains: 'Eletrônicos', mode: 'insensitive' } },
              { category: { contains: 'Informática', mode: 'insensitive' } },
              { category: { contains: 'Tech', mode: 'insensitive' } }
            ]
          },
          'casa-nova': {
            category: { contains: 'Casa', mode: 'insensitive' }
          },
          'fitness': {
            OR: [
              { category: { contains: 'Fitness', mode: 'insensitive' } },
              { category: { contains: 'Esportes', mode: 'insensitive' } }
            ]
          }
        };

        if (profiles[category]) {
          Object.assign(where, profiles[category]);
        } else {
          where.category = {
            contains: category,
            mode: 'insensitive'
          };
        }
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
  },

  // Create manual deal
  createDeal: async (request: FastifyRequest<{ Body: any }>, reply: FastifyReply) => {
    try {
      const body = request.body as any;
      const newDeal = await prisma.deal.create({
        data: {
          title: body.title,
          category: body.category || null,
          price_cents: body.price_cents,
          marketplace: body.marketplace || '',
          url_affiliate: body.url_affiliate || '',
          url_canonical: body.url_canonical || null,
          images: body.images || [],
          rating: body.rating || null,
          review_count: body.review_count || null,
          seller_name: body.seller_name || null,
        }
      });
      return reply.code(201).send(newDeal);
    } catch (err) {
      request.log.error(err);
      reply.code(500).send({ error: 'Failed to create deal' });
    }
  },

  // Update a deal
  updateDeal: async (request: FastifyRequest<{ Params: { id: string }, Body: any }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;
      const body = request.body as any;
      
      const updatedDeal = await prisma.deal.update({
        where: { id },
        data: {
          title: body.title,
          category: body.category,
          price_cents: body.price_cents,
          marketplace: body.marketplace,
          url_affiliate: body.url_affiliate,
          url_canonical: body.url_canonical,
        }
      });
      return updatedDeal;
    } catch (err) {
      request.log.error(err);
      reply.code(500).send({ error: 'Failed to update deal' });
    }
  },

  // Delete a deal
  deleteDeal: async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;
      await prisma.deal.delete({
        where: { id }
      });
      return reply.code(204).send();
    } catch (err) {
      request.log.error(err);
      reply.code(500).send({ error: 'Failed to delete deal' });
    }
  }
};
