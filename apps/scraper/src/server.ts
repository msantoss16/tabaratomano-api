import fastify from 'fastify';
import dotenv from 'dotenv';
import { scrapeUrl } from './index.js';
import {
  initBrowser,
  warmSession,
  closeBrowser,
  getSessionStatus,
  isSessionValid,
  cleanupScreenshots,
} from './session.js';

dotenv.config();

const app = fastify({ logger: true });

// ── Scrape ────────────────────────────────────────────────────────────────────

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

// ── Session endpoints (consumidos internamente pela API) ───────────────────────

app.get('/session/status', async (_request, reply) => {
  return reply.send(getSessionStatus());
});

app.post('/session/validate', async (_request, reply) => {
  try {
    const context = await initBrowser();
    const valid = await isSessionValid(context);
    return reply.send({
      valid,
      message: valid
        ? 'Sessão autenticada e válida.'
        : 'Sessão inválida ou expirada. Renove via bootstrap-session.ts.',
    });
  } catch (error: any) {
    return reply.status(500).send({ error: 'Falha ao validar sessão.', message: error.message });
  }
});

app.post('/session/warm', async (_request, reply) => {
  try {
    const context = await initBrowser();
    await warmSession(context);
    return reply.send({ success: true, message: 'Sessão aquecida.' });
  } catch (error: any) {
    return reply.status(500).send({ error: 'Falha ao aquecer sessão.', message: error.message });
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────

const start = async () => {
  try {
    const port = parseInt(process.env.SCRAPER_PORT || '3001');

    app.log.info('🔥 Iniciando browser e aquecendo sessão...');
    const context = await initBrowser();
    await warmSession(context);
    app.log.info('✅ Browser pronto.');

    // Agenda limpeza diária de screenshots (mantém os últimos 3 dias)
    cleanupScreenshots(3);
    setInterval(() => cleanupScreenshots(3), 24 * 60 * 60 * 1000);

    await app.listen({ port, host: '0.0.0.0' });
    app.log.info(`Scraper service running on port ${port}`);

    const shutdown = async (signal: string) => {
      app.log.info(`${signal} — shutting down gracefully...`);
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
