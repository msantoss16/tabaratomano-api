import dotenv from "dotenv";
dotenv.config();

import { connectWhatsApp, getSocket } from "./whatsapp.js";
import { startWorker } from "./queue.js";

let workerStarted = false;

async function main() {
  console.log("[WhatsApp Bot] Iniciando...");

  // Conecta ao WhatsApp e aguarda QR scan / restauração de sessão
  await connectWhatsApp();

  // Aguarda conexão ficar pronta antes de começar o worker
  const sock = getSocket();
  sock.ev.on("connection.update", ({ connection }) => {
    if (connection === "open") {
      console.log("[WhatsApp Bot] Conectado!");
      if (!workerStarted) {
        console.log("[WhatsApp Bot] Iniciando worker da fila...");
        startWorker();
        workerStarted = true;
      }
    }
  });
}

main().catch((err) => {
  console.error("[WhatsApp Bot] Erro fatal:", err);
  process.exit(1);
});
