import { FastifyRequest, FastifyReply } from 'fastify';
import { supabase } from '../config/supabase';

export const blogController = {
  // Get all blog posts
  getAllPosts: async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*');
        
      if (error) throw error;
      
      return data;
    } catch (err) {
      request.log.error(err);
      reply.code(500).send({ error: 'Failed to fetch blog posts' });
    }
  },

  // Get post by slug
  getPostBySlug: async (request: FastifyRequest<{ Params: { slug: string } }>, reply: FastifyReply) => {
    try {
      const { slug } = request.params;
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('slug', slug)
        .single();
        
      if (error) {
         if (error.code === 'PGRST116') {
          return reply.code(404).send({ error: 'Post not found' });
        }
        throw error;
      }
      
      return data;
    } catch (err) {
      request.log.error(err);
      reply.code(500).send({ error: 'Failed to fetch post' });
    }
  }
};
