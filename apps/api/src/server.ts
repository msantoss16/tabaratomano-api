import dotenv from 'dotenv';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import dealsRoutes from './routes/deals.routes.js';
import categoriesRoutes from './routes/categories.routes.js';
import couponsRoutes from './routes/coupons.routes.js';
import blogRoutes from './routes/blog.routes.js';

dotenv.config();

const fastify = Fastify({ logger: true });

// Register Swagger
fastify.register(fastifySwagger, {
  swagger: {
    info: {
      title: 'Tabaratomano API',
      description: 'API documentation for Tabaratomano',
      version: '1.0.0',
    },
    host: 'localhost:3000',
    schemes: ['http'],
    consumes: ['application/json'],
    produces: ['application/json'],
  },
});

fastify.register(fastifySwaggerUi, {
  routePrefix: '/documentation',
  uiConfig: {
    docExpansion: 'full',
    deepLinking: false,
  },
});

// Register CORS
fastify.register(cors, {
  origin: '*', // Allow all origins for now (dev mode)
});

// Register routes
fastify.register(dealsRoutes, { prefix: '/api/deals' });
fastify.register(categoriesRoutes, { prefix: '/api/categories' });
fastify.register(couponsRoutes, { prefix: '/api/coupons' });
fastify.register(blogRoutes, { prefix: '/api/blog' });

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
