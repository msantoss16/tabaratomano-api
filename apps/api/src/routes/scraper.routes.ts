import { FastifyInstance } from 'fastify';

const SCRAPER_URL = process.env.SCRAPER_URL || 'http://127.0.0.1:3001';

export default async function scraperRoutes(fastify: FastifyInstance) {

  // GET /api/scraper/session/status
  fastify.get('/session/status', {
    onRequest: [(fastify as any).authenticate],
    schema: { tags: ['Scraper'], summary: 'Status da sessão do scraper ML' },
  }, async (_request, reply) => {
    const res = await fetch(`${SCRAPER_URL}/session/status`);
    const data = await res.json();
    return reply.code(res.status).send(data);
  });

  // POST /api/scraper/session/validate — verifica se a sessão está autenticada
  fastify.post('/session/validate', {
    onRequest: [(fastify as any).authenticate],
    schema: { tags: ['Scraper'], summary: 'Verifica se a sessão ML ainda é válida (está logada)' },
  }, async (_request, reply) => {
    const res = await fetch(`${SCRAPER_URL}/session/validate`, { method: 'POST' });
    const data = await res.json();
    return reply.code(res.status).send(data);
  });

  // POST /api/scraper/session/warm — força re-warm
  fastify.post('/session/warm', {
    onRequest: [(fastify as any).authenticate],
    schema: { tags: ['Scraper'], summary: 'Força re-warm da sessão ML' },
  }, async (_request, reply) => {
    const res = await fetch(`${SCRAPER_URL}/session/warm`, { method: 'POST' });
    const data = await res.json();
    return reply.code(res.status).send(data);
  });
}
