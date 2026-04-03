import { FastifyRequest, FastifyReply } from 'fastify';

export const couponsController = {
  getAllCoupons: async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      return [];
    } catch (err) {
      request.log.error(err);
      reply.code(500).send({ error: 'Failed to fetch coupons' });
    }
  },
};
