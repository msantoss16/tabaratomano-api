import { FastifyRequest, FastifyReply } from 'fastify';
import { supabase } from '../config/supabase';

export const couponsController = {
  // Get all coupons
  getAllCoupons: async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*');
        
      if (error) throw error;
      
      return data;
    } catch (err) {
      request.log.error(err);
      reply.code(500).send({ error: 'Failed to fetch coupons' });
    }
  }
};
