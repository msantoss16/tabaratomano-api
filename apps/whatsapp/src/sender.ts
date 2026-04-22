import type { WASocket } from '@whiskeysockets/baileys';

interface MessageData {
  body: string;
  image_url?: string;
  link?: string;
}

import axios from 'axios';
import sharp from 'sharp';

export async function sendWhatsAppMessage(sock: WASocket, msg: MessageData): Promise<void> {
  const groupsStr = process.env.WHATSAPP_GROUP_JIDS;
  if (!groupsStr) {
    throw new Error('WHATSAPP_GROUP_JIDS env var not set!');
  }

  // JIDs look like "12345678@g.us"
  const groups = groupsStr.split(',').map((g) => g.trim()).filter((g) => g.length > 0);

  if (groups.length === 0) {
    throw new Error('No WhatsApp groups configured.');
  }

  // Format the text
  let text = msg.body;
  if (msg.link) {
    if (!text.includes(msg.link)) {
        text += `\n\nLink: ${msg.link}`;
    }
  }

  let imageBuffer: Buffer | null = null;

  if (msg.image_url) {
    try {
      const response = await axios.get(msg.image_url, { responseType: 'arraybuffer' });
      // Reduce the image size (width 800px) and convert to JPEG
      imageBuffer = await sharp(response.data)
        .resize({ width: 800, withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();
    } catch (err) {
      console.error(`[Sender] Erro ao processar/baixar imagem:`, err);
      // If downloading fails, we'll just fall back to text automatically
    }
  }

  for (const jid of groups) {
    try {
      let sentImage = false;
      if (imageBuffer) {
        try {
          await sock.sendMessage(jid, {
            image: imageBuffer,
            caption: text,
          });
          sentImage = true;
        } catch (mediaErr: any) {
          console.error(`[Sender] Falha ao enviar mídia para ${jid}, tentando enviar apenas como texto. Erro:`, mediaErr.message || mediaErr);
          // Falha no envio da mídia, continua para enviar apenas texto
        }
      }

      if (!imageBuffer || !sentImage) {
        // Send text only
        await sock.sendMessage(jid, { text: text });
      }
      
      console.log(`[Sender] Enviado para ${jid}`);
    } catch (err) {
      console.error(`[Sender] Falha fatal ao enviar para ${jid}:`, err);
      throw err; // Re-throw to cause BullMQ to retry the job
    }
    
    // Short delay between groups
    await new Promise(r => setTimeout(r, 1000));
  }
}
