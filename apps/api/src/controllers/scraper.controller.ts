import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '@tabaratomano/database';

const SCRAPER_URL = process.env.SCRAPER_URL || 'http://localhost:3001';
export const scraperController = {
  async scrapeAndSave(request: FastifyRequest, reply: FastifyReply) {
    const { url } = request.body as { url?: string };
    
    if (!url) {
      return reply.code(400).send({ error: 'Você precisa enviar uma "url" válida no corpo da requisição.' });
    }

    try {
      // Chama o scraper service na rede interna docker
      const scraperRes = await fetch(`${SCRAPER_URL}/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });

      if (!scraperRes.ok) {
        const errData = await scraperRes.json().catch(() => ({}));
        throw new Error(errData.message || 'Erro na requisição para o scraper service');
      }
      
      const resData = await scraperRes.json();
      const product = resData.product;
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

      // ─── Auto-generate message for the queue ──────────────────────────────────
      try {
        const config = await prisma.autoSendConfig.findUnique({ where: { id: 'singleton' } });
        
        if (config?.enabled && config.auto_generate_from_deals) {
          const priceFormatted = (product.price_cents / 100).toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
          });

          await prisma.messageQueue.create({
            data: {
              channel: (config.channels as 'whatsapp' | 'telegram' | 'both') || 'both',
              title: `🔥 OFERTA: ${product.title}`,
              body: `*${product.title}*\n\n💰 Por apenas: *${priceFormatted}*\n\n🛒 Compre aqui: ${product.url_affiliate || product.url_canonical}\n\n#oferta #promo`,
              image_url: product.images && product.images.length > 0 ? product.images[0] : '',
              link: product.url_affiliate || product.url_canonical,
              status: 'pending',
              deal_id: savedDeal.id,
            },
          });
          request.log.info(`[Auto-Messenger] Mensagem gerada automaticamente para o deal ${savedDeal.id}`);
        }
      } catch (autoErr) {
        request.log.error({ err: autoErr }, 'Erro ao gerar mensagem automática');
        // Não falhamos a requisição principal se a automação falhar
      }

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
