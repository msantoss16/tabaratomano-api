import type { WASocket } from '@whiskeysockets/baileys';

interface MessageData {
  body: string;
  image_url?: string;
  link?: string;
}

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
    // Ensuring the link is at the end if provided, though typically
    // it's already inside msg.body via the frontend generator.
    if (!text.includes(msg.link)) {
        text += `\n\nLink: ${msg.link}`;
    }
  }

  for (const jid of groups) {
    if (msg.image_url) {
      // Send image with caption
      await sock.sendMessage(jid, {
        image: { url: msg.image_url },
        caption: text,
      });
    } else {
      // Send text only
      await sock.sendMessage(jid, { text: text });
    }
    console.log(`[Sender] Enviado para ${jid}`);
    
    // Tiny delay between group sends
    await new Promise(r => setTimeout(r, 500));
  }
}
