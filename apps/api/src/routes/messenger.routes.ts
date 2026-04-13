import { FastifyInstance } from 'fastify';
import { messengerController } from '../controllers/messenger.controller.js';

const messageQueueSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    channel: { type: 'string' },
    title: { type: 'string' },
    body: { type: 'string' },
    image_url: { type: 'string' },
    link: { type: 'string' },
    status: { type: 'string' },
    scheduled_at: { type: 'string', nullable: true },
    sent_at: { type: 'string', nullable: true },
    deal_id: { type: 'string', nullable: true },
    created_at: { type: 'string' },
    updated_at: { type: 'string' },
  },
};

const autoSendConfigSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    enabled: { type: 'boolean' },
    interval_minutes: { type: 'number' },
    channels: { type: 'string' },
    auto_generate_from_deals: { type: 'boolean' },
  },
};

export default async function messengerRoutes(fastify: FastifyInstance) {
  // ─── Queue — public read (bot workers need this without auth) ──────────────

  fastify.get('/queue', {
    schema: {
      tags: ['Messenger'],
      summary: 'List all queued messages (admin)',
      security: [{ bearerAuth: [] }],
      response: { 200: { type: 'array', items: messageQueueSchema } },
    },
    onRequest: [(fastify as any).authenticate],
  }, messengerController.getQueue);

  fastify.get('/queue/pending', {
    schema: {
      tags: ['Messenger'],
      summary: 'Get pending messages — consumed by bot workers',
      response: { 200: { type: 'array', items: messageQueueSchema } },
    },
    // No auth: bots need this endpoint without a JWT
  }, messengerController.getPending);

  fastify.get('/queue/:id', {
    schema: {
      tags: ['Messenger'],
      summary: 'Get a single queued message by ID',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
      },
      response: { 200: messageQueueSchema },
    },
    onRequest: [(fastify as any).authenticate],
  }, messengerController.getMessageById);

  // ─── Queue — protected writes ──────────────────────────────────────────────

  fastify.post('/queue', {
    schema: {
      tags: ['Messenger'],
      summary: 'Add a message to the queue',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['body', 'channel'],
        properties: {
          channel: { type: 'string', enum: ['whatsapp', 'telegram', 'both'] },
          title: { type: 'string' },
          body: { type: 'string' },
          imageUrl: { type: 'string' },
          link: { type: 'string' },
          scheduledAt: { type: 'string' },
          dealId: { type: 'string' },
        },
      },
      response: { 201: messageQueueSchema },
    },
    onRequest: [(fastify as any).authenticate],
  }, messengerController.createMessage);

  fastify.patch('/queue/:id', {
    schema: {
      tags: ['Messenger'],
      summary: 'Update a queued message',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
      },
      body: {
        type: 'object',
        properties: {
          channel: { type: 'string', enum: ['whatsapp', 'telegram', 'both'] },
          title: { type: 'string' },
          body: { type: 'string' },
          imageUrl: { type: 'string' },
          link: { type: 'string' },
          scheduledAt: { type: 'string' },
          status: { type: 'string', enum: ['pending', 'scheduled', 'sent', 'failed', 'cancelled'] },
          sentAt: { type: 'string' },
          dealId: { type: 'string' },
        },
      },
      response: { 200: messageQueueSchema },
    },
    onRequest: [(fastify as any).authenticate],
  }, messengerController.updateMessage);

  // PATCH /queue/:id/status — lightweight endpoint for bots
  fastify.patch('/queue/:id/status', {
    schema: {
      tags: ['Messenger'],
      summary: 'Update only the status of a message (used by bots)',
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
      },
      body: {
        type: 'object',
        required: ['status'],
        properties: {
          status: { type: 'string', enum: ['pending', 'scheduled', 'sent', 'failed', 'cancelled'] },
          sentAt: { type: 'string' },
        },
      },
      response: { 200: messageQueueSchema },
    },
    // No auth: bots may not have a user JWT; use a shared secret at the
    // infra level (e.g. nginx restrict by IP) instead.
  }, messengerController.updateStatus);

  fastify.delete('/queue/:id', {
    schema: {
      tags: ['Messenger'],
      summary: 'Delete a queued message',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
      },
      response: { 204: { type: 'null' } },
    },
    onRequest: [(fastify as any).authenticate],
  }, messengerController.deleteMessage);

  // ─── Auto-send config ──────────────────────────────────────────────────────

  fastify.get('/config', {
    schema: {
      tags: ['Messenger'],
      summary: 'Get auto-send configuration',
      security: [{ bearerAuth: [] }],
      response: { 200: autoSendConfigSchema },
    },
    onRequest: [(fastify as any).authenticate],
  }, messengerController.getConfig);

  fastify.patch('/config', {
    schema: {
      tags: ['Messenger'],
      summary: 'Update auto-send configuration',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          enabled: { type: 'boolean' },
          intervalMinutes: { type: 'number' },
          channels: { type: 'string', enum: ['whatsapp', 'telegram', 'both'] },
          autoGenerateFromDeals: { type: 'boolean' },
        },
      },
      response: { 200: autoSendConfigSchema },
    },
    onRequest: [(fastify as any).authenticate],
  }, messengerController.updateConfig);
}
