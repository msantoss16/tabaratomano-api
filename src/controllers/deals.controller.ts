import { FastifyRequest, FastifyReply } from 'fastify';
import { supabase } from '../config/supabase';

export const dealsController = {
  // Get all deals found
  getAllDeals: async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { data, error } = await supabase
        .from('deals')
        .select('*');
        
      if (error) throw error;
      
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
      const { data, error } = await supabase
        .from('deals')
        .select('*')
        .eq('id', id)
        .single();
        
      if (error) {
        if (error.code === 'PGRST116') { // Not found code
          return reply.code(404).send({ error: 'Deal not found' });
        }
        throw error;
      }
      
      return data;
    } catch (err) {
      request.log.error(err);
      reply.code(500).send({ error: 'Failed to fetch deal' });
    }
  }
};
