import dotenv from "dotenv";
dotenv.config();

import { connectWhatsApp, getSocket } from "./whatsapp.js";
import { startWorker } from "./queue.js";

async function main() {
  console.log("[WhatsApp Bot] Iniciando...");

  // Conecta ao WhatsApp e aguarda QR scan / restauração de sessão
  await connectWhatsApp();

  const sock = getSocket();

  // Aguarda conexão ficar pronta antes de começar o worker
  sock.ev.on("connection.update", ({ connection }) => {
    if (connection === "open") {
      console.log("[WhatsApp Bot] Conectado! Iniciando worker da fila...");
      startWorker(sock);
    }
  });
}

main().catch((err) => {
  console.error("[WhatsApp Bot] Erro fatal:", err);
  process.exit(1);
});
