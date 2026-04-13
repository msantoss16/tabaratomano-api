import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '@tabaratomano/database';

// ─── Types ────────────────────────────────────────────────────────────────────

type MessageChannel = 'whatsapp' | 'telegram' | 'both';
type MessageStatus = 'pending' | 'scheduled' | 'sent' | 'failed' | 'cancelled';

interface CreateMessageBody {
  channel: MessageChannel;
  title?: string;
  body: string;
  imageUrl?: string;
  link?: string;
  scheduledAt?: string; // ISO datetime string or empty
  dealId?: string;
}

interface UpdateMessageBody extends Partial<CreateMessageBody> {
  status?: MessageStatus;
  sentAt?: string;
}

interface UpdateAutoConfigBody {
  enabled?: boolean;
  intervalMinutes?: number;
  channels?: MessageChannel;
  autoGenerateFromDeals?: boolean;
}

// ─── Message Queue Controller ─────────────────────────────────────────────────

export const messengerController = {
  // GET /api/messenger/queue
  getQueue: async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const messages = await prisma.messageQueue.findMany({
        orderBy: { created_at: 'desc' },
      });
      return reply.send(messages);
    } catch (err) {
      request.log.error(err);
      return reply.code(500).send({ error: 'Failed to fetch message queue' });
    }
  },

  // GET /api/messenger/queue/pending  — endpoint consumed by bot workers
  getPending: async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const messages = await prisma.messageQueue.findMany({
        where: { status: 'pending' },
        orderBy: { created_at: 'asc' },
      });
      return reply.send(messages);
    } catch (err) {
      request.log.error(err);
      return reply.code(500).send({ error: 'Failed to fetch pending messages' });
    }
  },

  // GET /api/messenger/queue/:id
  getMessageById: async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    try {
      const { id } = request.params;
      const message = await prisma.messageQueue.findUnique({ where: { id } });
      if (!message) return reply.code(404).send({ error: 'Message not found' });
      return reply.send(message);
    } catch (err) {
      request.log.error(err);
      return reply.code(500).send({ error: 'Failed to fetch message' });
    }
  },

  // POST /api/messenger/queue
  createMessage: async (
    request: FastifyRequest<{ Body: CreateMessageBody }>,
    reply: FastifyReply,
  ) => {
    try {
      const { channel, title, body, imageUrl, link, scheduledAt, dealId } = request.body;

      if (!body) return reply.code(400).send({ error: 'body is required' });

      const scheduledDate = scheduledAt ? new Date(scheduledAt) : null;
      const status: MessageStatus = scheduledDate ? 'scheduled' : 'pending';

      const message = await prisma.messageQueue.create({
        data: {
          channel: channel ?? 'both',
          title: title ?? '',
          body,
          image_url: imageUrl ?? '',
          link: link ?? '',
          status,
          scheduled_at: scheduledDate,
          deal_id: dealId ?? null,
        },
      });

      return reply.code(201).send(message);
    } catch (err) {
      request.log.error(err);
      return reply.code(500).send({ error: 'Failed to create message' });
    }
  },

  // PATCH /api/messenger/queue/:id
  updateMessage: async (
    request: FastifyRequest<{ Params: { id: string }; Body: UpdateMessageBody }>,
    reply: FastifyReply,
  ) => {
    try {
      const { id } = request.params;
      const { channel, title, body, imageUrl, link, scheduledAt, dealId, status, sentAt } =
        request.body;

      const existing = await prisma.messageQueue.findUnique({ where: { id } });
      if (!existing) return reply.code(404).send({ error: 'Message not found' });

      const scheduledDate =
        scheduledAt !== undefined ? (scheduledAt ? new Date(scheduledAt) : null) : undefined;
      const sentDate = sentAt !== undefined ? (sentAt ? new Date(sentAt) : null) : undefined;

      // Derive status from scheduledAt if not explicitly provided
      let resolvedStatus: MessageStatus | undefined = status;
      if (!resolvedStatus && scheduledDate !== undefined) {
        resolvedStatus = scheduledDate ? 'scheduled' : 'pending';
      }

      const updated = await prisma.messageQueue.update({
        where: { id },
        data: {
          ...(channel !== undefined && { channel }),
          ...(title !== undefined && { title }),
          ...(body !== undefined && { body }),
          ...(imageUrl !== undefined && { image_url: imageUrl }),
          ...(link !== undefined && { link }),
          ...(scheduledDate !== undefined && { scheduled_at: scheduledDate }),
          ...(sentDate !== undefined && { sent_at: sentDate }),
          ...(resolvedStatus !== undefined && { status: resolvedStatus }),
          ...(dealId !== undefined && { deal_id: dealId }),
        },
      });

      return reply.send(updated);
    } catch (err) {
      request.log.error(err);
      return reply.code(500).send({ error: 'Failed to update message' });
    }
  },

  // PATCH /api/messenger/queue/:id/status  — shortcut for bots
  updateStatus: async (
    request: FastifyRequest<{ Params: { id: string }; Body: { status: MessageStatus; sentAt?: string } }>,
    reply: FastifyReply,
  ) => {
    try {
      const { id } = request.params;
      const { status, sentAt } = request.body;

      if (!status) return reply.code(400).send({ error: 'status is required' });

      const existing = await prisma.messageQueue.findUnique({ where: { id } });
      if (!existing) return reply.code(404).send({ error: 'Message not found' });

      const updated = await prisma.messageQueue.update({
        where: { id },
        data: {
          status,
          ...(sentAt && { sent_at: new Date(sentAt) }),
          ...(status === 'sent' && !sentAt && { sent_at: new Date() }),
        },
      });

      return reply.send(updated);
    } catch (err) {
      request.log.error(err);
      return reply.code(500).send({ error: 'Failed to update message status' });
    }
  },

  // DELETE /api/messenger/queue/:id
  deleteMessage: async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    try {
      const { id } = request.params;
      const existing = await prisma.messageQueue.findUnique({ where: { id } });
      if (!existing) return reply.code(404).send({ error: 'Message not found' });
      await prisma.messageQueue.delete({ where: { id } });
      return reply.code(204).send();
    } catch (err) {
      request.log.error(err);
      return reply.code(500).send({ error: 'Failed to delete message' });
    }
  },

  // ─── Auto-send config ───────────────────────────────────────────────────────

  // GET /api/messenger/config
  getConfig: async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      let config = await prisma.autoSendConfig.findUnique({ where: { id: 'singleton' } });
      if (!config) {
        // Create default config on first access
        config = await prisma.autoSendConfig.create({
          data: { id: 'singleton' },
        });
      }
      return reply.send(config);
    } catch (err) {
      request.log.error(err);
      return reply.code(500).send({ error: 'Failed to fetch auto-send config' });
    }
  },

  // PATCH /api/messenger/config
  updateConfig: async (
    request: FastifyRequest<{ Body: UpdateAutoConfigBody }>,
    reply: FastifyReply,
  ) => {
    try {
      const { enabled, intervalMinutes, channels, autoGenerateFromDeals } = request.body;

      const config = await prisma.autoSendConfig.upsert({
        where: { id: 'singleton' },
        create: {
          id: 'singleton',
          ...(enabled !== undefined && { enabled }),
          ...(intervalMinutes !== undefined && { interval_minutes: intervalMinutes }),
          ...(channels !== undefined && { channels }),
          ...(autoGenerateFromDeals !== undefined && {
            auto_generate_from_deals: autoGenerateFromDeals,
          }),
        },
        update: {
          ...(enabled !== undefined && { enabled }),
          ...(intervalMinutes !== undefined && { interval_minutes: intervalMinutes }),
          ...(channels !== undefined && { channels }),
          ...(autoGenerateFromDeals !== undefined && {
            auto_generate_from_deals: autoGenerateFromDeals,
          }),
        },
      });

      return reply.send(config);
    } catch (err) {
      request.log.error(err);
      return reply.code(500).send({ error: 'Failed to update auto-send config' });
    }
  },
};
