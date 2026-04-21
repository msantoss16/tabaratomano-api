import { Worker, Job } from "bullmq";
import axios from "axios";
import { Redis } from "ioredis";
import { sendTweet } from "./twitter.js";

const API_URL = process.env.API_URL ?? "http://tabaratomano-api:3000";
const REDIS_URL = process.env.REDIS_URL ?? "redis://127.0.0.1:6379";

const connection = new Redis(REDIS_URL, {
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

export function startWorker() {
  console.log(`[Queue X] Worker BullMQ iniciado. Aguardando mensagens no Redis...`);

  const worker = new Worker<ApiMessage>(
    "messages",
    async (job: Job<ApiMessage>) => {
      const msg = job.data;
      
      // Ignore if not meant for X
      if (msg.channel !== "x" && msg.channel !== "all") {
        console.log(`[Queue X] Ignorando job ${job.id} (channel = ${msg.channel})`);
        return;
      }

      console.log(`[Queue X] Processando job ${job.id} (Mensagem: ${msg.id})...`);

      await sendTweet({
        title: msg.title,
        body: msg.body,
        link: msg.link,
        image_url: msg.image_url
      });

      // Avoid rate-limiting with Twitter API
      await new Promise((r) => setTimeout(r, 2000));
    },
    {
      connection,
      concurrency: 1, // Max 1 tweet at a time to avoid issues
      limiter: {
        max: 1,
        duration: 5000, 
      },
    }
  );

  worker.on("completed", async (job) => {
    const msg = job.data;
    // se o job pertencer ao X ou 'all', a gente atualiza. 
    // se for 'all', isso pode conflitar se whatsapp disparar 'completed' tbm
    // no momento os dois farão update sem problema mudando pro mesmo status.
    if (msg.channel !== "x" && msg.channel !== "all") return;
    
    console.log(`[Queue X] Job ${job.id} completado com sucesso! (${msg.id})`);
    try {
      await axios.patch(`${API_URL}/api/messenger/queue/${msg.id}/status`, {
        status: "sent",
      });
    } catch (patchErr) {
      console.error(`[Queue X] Falha ao atualizar status para sent na API:`, patchErr);
    }
  });

  worker.on("failed", async (job, err) => {
    const msg = job?.data;
    if (msg?.channel !== "x" && msg?.channel !== "all") return;

    console.error(`[Queue X] Job ${job?.id} falhou:`, err);
    if (msg?.id) {
      try {
        await axios.patch(`${API_URL}/api/messenger/queue/${msg.id}/status`, {
          status: "failed",
        });
      } catch (patchErr) {
        console.error(`[Queue X] Falha ao atualizar status para failed na API:`, patchErr);
      }
    }
  });

  worker.on("error", err => {
    console.error('[Queue X] Worker error:', err);
  });
}
