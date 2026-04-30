import dotenv from "dotenv";
import Fastify from "fastify";
import cors from "@fastify/cors";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";
import fastifyJwt from "@fastify/jwt";
import fastifyHelmet from "@fastify/helmet";
import fastifyRateLimit from "@fastify/rate-limit";

import dealsRoutes from "./routes/deals.routes.js";
import categoriesRoutes from "./routes/categories.routes.js";
import couponsRoutes from "./routes/coupons.routes.js";
import blogRoutes from "./routes/blog.routes.js";
import authRoutes from "./routes/auth.routes.js";
import messengerRoutes from "./routes/messenger.routes.js";
import scraperRoutes from "./routes/scraper.routes.js";

dotenv.config();

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret || jwtSecret.trim() === "") {
  if (process.env.NODE_ENV === "production") {
    console.error(
      "FATAL: JWT_SECRET environment variable is not set. Refusing to start in production without a secure secret.",
    );
    process.exit(1);
  }
  console.warn(
    "WARNING: JWT_SECRET is not set. Using an insecure default. Do NOT use this configuration in production.",
  );
}

const fastify = Fastify({ logger: true });

// Register Security Plugins
fastify.register(fastifyHelmet);
fastify.register(fastifyRateLimit, {
  max: 100,
  timeWindow: "1 minute",
});

// Register JWT
fastify.register(fastifyJwt, {
  secret: jwtSecret && jwtSecret.trim() ? jwtSecret : "supersecret-dev-only",
});

// Decorate fastify with authenticate hook
fastify.decorate("authenticate", async function (request: any, reply: any) {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.send(err);
  }
});

// Register Swagger
fastify.register(fastifySwagger, {
  swagger: {
    info: {
      title: "Tabaratomano API",
      description: "API documentation for Tabaratomano",
      version: "1.0.0",
    },
    host: "localhost:3000",
    schemes: ["http"],
    consumes: ["application/json"],
    produces: ["application/json"],
    securityDefinitions: {
      bearerAuth: {
        type: "apiKey",
        name: "Authorization",
        in: "header",
        description: 'Format: "Bearer [token]"',
      },
    },
  },
});

fastify.register(fastifySwaggerUi, {
  routePrefix: "/documentation",
  uiConfig: {
    docExpansion: "full",
    deepLinking: false,
  },
});

// Register CORS
fastify.register(cors, {
  origin: [
    "https://tabaratomano.com.br",
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:8080",
  ],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
});

// Register routes
fastify.register(authRoutes, { prefix: "/api/auth" });
fastify.register(dealsRoutes, { prefix: "/api/deals" });
fastify.register(categoriesRoutes, { prefix: "/api/categories" });
fastify.register(couponsRoutes, { prefix: "/api/coupons" });
fastify.register(blogRoutes, { prefix: "/api/blog" });
fastify.register(messengerRoutes, { prefix: "/api/messenger" });
fastify.register(scraperRoutes, { prefix: "/api/scraper" });

// Health check route
fastify.get("/", async (request, reply) => {
  return { status: "ok", message: "Tabaratomano API is running (TypeScript)" };
});

const start = async () => {
  try {
    const port = parseInt(process.env.PORT || "3000");
    await fastify.listen({ port, host: "0.0.0.0" });
    console.log(`Server running on port ${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
