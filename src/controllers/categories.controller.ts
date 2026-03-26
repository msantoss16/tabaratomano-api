import { FastifyRequest, FastifyReply } from 'fastify';
import { supabase } from '../config/supabase';

export const categoriesController = {
  // Get all categories
  getAllCategories: async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*');
        
      if (error) throw error;
      
      return data;
    } catch (err) {
      request.log.error(err);
      reply.code(500).send({ error: 'Failed to fetch categories' });
    }
  },

  // Get category by slug
  getCategoryBySlug: async (request: FastifyRequest<{ Params: { slug: string } }>, reply: FastifyReply) => {
    try {
      const { slug } = request.params;
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('slug', slug)
        .single();
        
      if (error) {
         if (error.code === 'PGRST116') {
          return reply.code(404).send({ error: 'Category not found' });
        }
        throw error;
      }
      
      return data;
    } catch (err) {
      request.log.error(err);
      reply.code(500).send({ error: 'Failed to fetch category' });
    }
  }
};
