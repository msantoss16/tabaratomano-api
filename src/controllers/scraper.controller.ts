import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../config/prisma';
import { scrapeUrl } from '../scraper';

export const scraperController = {
  async scrapeAndSave(request: FastifyRequest, reply: FastifyReply) {
    const { url } = request.body as { url?: string };
    
    if (!url) {
      return reply.code(400).send({ error: 'Você precisa enviar uma "url" válida no corpo da requisição.' });
    }

    try {
      // Chama o scraper orquestrador para extrair os dados
      const product = await scrapeUrl(url);

      // Usamos upsert para evitar duplicações se batermos na mesma URL
      const savedDeal = await prisma.deal.create({
        data: {
          title: product.title,
          price_cents: product.price_cents,
          marketplace: product.marketplace,
          url_affiliate: product.url_affiliate,
          rating: product.rating,
          review_count: product.review_count,
          seller_name: product.seller_name,
          category: product.category,
          images: product.images,
          url_canonical: product.url_canonical,
        }
      });

      return reply.code(201).send({
        message: 'Produto minerado e salvo com sucesso!',
        data: savedDeal
      });

    } catch (error: any) {
      request.log.error(error);
      return reply.code(500).send({ 
        error: 'Falha na extração ou gravação do banco de dados.',
        details: error.message 
      });
    }
  }
};
