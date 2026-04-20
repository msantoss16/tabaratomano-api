import dotenv from 'dotenv';
dotenv.config();

import { connectWhatsApp, getSocket } from './whatsapp.js';

async function listGroups() {
  console.log('[WhatsApp Bot] Conectando para listar grupos...');

  try {
    // Inicia a conexão
    await connectWhatsApp();
    const sock = getSocket();

    // Aguarda a conexão ficar pronta
    sock.ev.on('connection.update', async ({ connection }) => {
      if (connection === 'open') {
        console.log('[WhatsApp Bot] ✅ Conectado! Buscando grupos...\n');

        try {
          const groups = await sock.groupFetchAllParticipating();
          const groupsList = Object.values(groups);

          if (groupsList.length === 0) {
            console.log('Nenhum grupo encontrado.');
          } else {
            console.log('--- GRUPOS ENCONTRADOS ---');
            groupsList.forEach((group) => {
              console.log(`Nome: ${group.subject}`);
              console.log(`JID: ${group.id}`);
              console.log('--------------------------');
            });
            console.log(`\nTotal de grupos: ${groupsList.length}`);
          }
        } catch (error) {
          console.error('Erro ao buscar grupos:', error);
        } finally {
          // Pequeno delay para garantir que os logs sejam impressos
          setTimeout(() => {
            console.log('\nFinalizando script...');
            process.exit(0);
          }, 1000);
        }
      }
    });

    // Tratamento de erro na conexão inicial
    sock.ev.on('connection.update', ({ lastDisconnect }) => {
      if (lastDisconnect?.error) {
        console.error('Erro na conexão:', lastDisconnect.error);
        process.exit(1);
      }
    });

  } catch (err) {
    console.error('Erro fatal:', err);
    process.exit(1);
  }
}

listGroups();
