import fastify from 'fastify';
import dotenv from 'dotenv';
import { scrapeUrl } from './index.js';

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
    await app.listen({ port, host: '0.0.0.0' });
    console.log(`Scraper service running on port ${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
