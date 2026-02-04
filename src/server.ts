import dotenv from 'dotenv';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import dealsRoutes from './routes/deals.routes';
import categoriesRoutes from './routes/categories.routes';

dotenv.config();

const fastify = Fastify({ logger: true });

// Register CORS
fastify.register(cors, {
  origin: '*', // Allow all origins for now (dev mode)
});

// Register routes
fastify.register(dealsRoutes, { prefix: '/api/deals' });
fastify.register(categoriesRoutes, { prefix: '/api/categories' });

// Health check route
fastify.get('/', async (request, reply) => {
  return { status: 'ok', message: 'Tabaratomano API is running (TypeScript)' };
});

const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3000');
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`Server running on port ${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
