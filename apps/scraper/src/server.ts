import fastify from 'fastify';
import dotenv from 'dotenv';
import { scrapeUrl } from './index.js';
import { initBrowser, warmSession, closeBrowser } from './session.js';

dotenv.config();

const app = fastify({ logger: true });

app.post('/scrape', async (request, reply) => {
  const { url } = request.body as { url?: string };
  if (!url) {
    return reply.status(400).send({ error: 'URL is required' });
  }

  try {
    const product = await scrapeUrl(url);
    return reply.send({ success: true, product });
  } catch (error: any) {
    request.log.error(error);
    return reply.status(500).send({ error: 'Scraping failed', message: error.message });
  }
});

const start = async () => {
  try {
    const port = parseInt(process.env.SCRAPER_PORT || '3001');

    // ── Pre-warm the browser before accepting requests ────────────────────────
    // This ensures the first real scrape request is not a "cold start":
    // the browser is already running and the ML session is already warm.
    app.log.info('🔥 Iniciando browser e aquecendo sessão...');
    const context = await initBrowser();
    await warmSession(context);
    app.log.info('✅ Browser pronto. Servidor iniciando...');

    await app.listen({ port, host: '0.0.0.0' });
    app.log.info(`Scraper service running on port ${port}`);

    // ── Graceful shutdown ─────────────────────────────────────────────────────
    const shutdown = async (signal: string) => {
      app.log.info(`${signal} received — shutting down gracefully...`);
      await closeBrowser();
      await app.close();
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
