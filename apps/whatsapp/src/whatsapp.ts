import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  type WASocket,
} from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';
import pino from 'pino';
import { Boom } from '@hapi/boom';

// ─── Session persistence ──────────────────────────────────────────────────────
// The auth folder is mounted as a Docker volume so the session survives restarts.
const AUTH_FOLDER = process.env.WHATSAPP_AUTH_FOLDER ?? './auth_info_baileys';

let sock: WASocket | null = null;

export function getSocket(): WASocket {
  if (!sock) throw new Error('WhatsApp socket not initialised yet');
  return sock;
}

// ─── Connection ───────────────────────────────────────────────────────────────

export async function connectWhatsApp(): Promise<void> {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);
  const { version } = await fetchLatestBaileysVersion();

  const logger = pino({ level: 'silent' }); // suppress Baileys internal logs

  sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    logger,
    printQRInTerminal: false, // we handle it ourselves below
    browser: ['Tabaratomano Bot', 'Chrome', '1.0.0'],
  });

  // Persist credentials whenever they change
  sock.ev.on('creds.update', saveCreds);

  // Handle QR code — displayed in the container logs
  sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      console.log('\n[WhatsApp Bot] Escaneie o QR code abaixo com seu WhatsApp:\n');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'close') {
      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      console.log(
        `[WhatsApp Bot] Conexão encerrada (código: ${statusCode}). Reconectando: ${shouldReconnect}`,
      );

      if (shouldReconnect) {
        // Re-connect after a short delay
        setTimeout(() => connectWhatsApp(), 5_000);
      } else {
        console.warn('[WhatsApp Bot] Sessão encerrada. Delete a pasta de autenticação e reinicie.');
      }
    }

    if (connection === 'open') {
      console.log('[WhatsApp Bot] ✅ Conectado ao WhatsApp!');
    }
  });
}
