import "dotenv/config";
import { startWorker } from "./queue.js";

async function main() {
  console.log("Iniciando worker do X (Twitter)...");
  
  if (!process.env.TWITTER_API_KEY || !process.env.TWITTER_API_SECRET) {
    console.warn("AVISO: Credenciais do Twitter (TWITTER_API_KEY, etc) não fornecidas. O envio poderá falhar.");
  }

  // Start the BullMQ worker
  startWorker();
}

main().catch((err) => {
  console.error("Erro fatal no worker do X:", err);
  process.exit(1);
});
