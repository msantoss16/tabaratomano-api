import type { WASocket } from "@whiskeysockets/baileys";
import { sendWhatsAppMessage } from "./sender.js";
import axios from "axios";
import { Worker, Job } from "bullmq";
import IORedis from "ioredis";

const API_URL = process.env.API_URL ?? "http://tabaratomano-api:3000";
const REDIS_URL = process.env.REDIS_URL ?? "redis://127.0.0.1:6379";

const connection = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null,
});

interface ApiMessage {
  id: string;
  channel: "whatsapp" | "telegram" | "x" | "both" | "all";
  title: string;
  body: string;
  image_url: string;
  link: string;
  status: string;
  scheduled_at: string | null;
}

export function startWorker(sock: WASocket) {
  console.log(`[Queue] Worker BullMQ iniciado. Aguardando mensagens no Redis...`);

  const worker = new Worker<ApiMessage>(
    "messages_whatsapp",
    async (job: Job<ApiMessage>) => {
      const msg = job.data;
      console.log(`[Queue] Processando job ${job.id} (Mensagem: ${msg.id})...`);

      await sendWhatsAppMessage(sock, msg);

      // Add a small delay between messages to avoid ban (in addition to limiter)
      await new Promise((r) => setTimeout(r, 2000));
    },
    {
      connection,
      concurrency: 1, // Avoid parallelism for a single WhatsApp session
      limiter: {
        max: 1,
        duration: 3000, // max 1 message every 3 seconds
      },
    }
  );

  worker.on("completed", async (job) => {
    const msg = job.data;
    console.log(`[Queue] Job ${job.id} completado com sucesso! (${msg.id})`);
    try {
      await axios.patch(`${API_URL}/api/messenger/queue/${msg.id}/status`, {
        status: "sent",
      });
    } catch (patchErr) {
      console.error(`[Queue] Falha ao atualizar status para sent na API:`, patchErr);
    }
  });

  worker.on("failed", async (job, err) => {
    const msg = job?.data;
    console.error(`[Queue] Job ${job?.id} falhou:`, err);
    if (msg?.id) {
      try {
        await axios.patch(`${API_URL}/api/messenger/queue/${msg.id}/status`, {
          status: "failed",
        });
      } catch (patchErr) {
        console.error(`[Queue] Falha ao atualizar status para failed na API:`, patchErr);
      }
    }
  });

  worker.on("error", err => {
    console.error('[Queue] Worker error:', err);
  });
}
