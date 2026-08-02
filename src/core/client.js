import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import qrcode from 'qrcode-terminal';

import { loader } from './loader.js';
import { dispatcher } from './dispatcher.js';
import { updateDashboard, markReconnect, setError } from '../ui/dashboard.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SESSION_DIR = path.join(__dirname, '..', '..', 'session');

let sockGlobal = null;
let loadingOnce = false;
let reconnecting = false;

function logSessionState({ connection, reason, code, error }) {
  updateDashboard({
    connection: connection || 'close',
    lastCode: code ?? null
  });
  if (error) {
    setError(error, code ?? null);
  }
  if (reason === 'reconnect') {
    markReconnect();
  }
}

export async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    auth: state,
    version,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    browser: ['Fiktatur', 'Chrome', '1.0.0']
  });

  sockGlobal = sock;

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) {
      console.log('\n امسح الـ QR للاتصال:\n');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'connecting') {
      logSessionState({ connection: 'connecting' });
    }

    if (connection === 'open') {
      reconnecting = false;
      logSessionState({ connection: 'open' });

      if (!loadingOnce) {
        loadingOnce = true;
        await loader();
      }

      console.log('✅ Fiktatur connected successfully');
    }

    if (connection === 'close') {
      const statusCode =
        lastDisconnect?.error instanceof Boom
          ? lastDisconnect.error.output?.statusCode
          : lastDisconnect?.error?.output?.statusCode;

      const reason = statusCode === DisconnectReason.loggedOut ? 'loggedOut' : 'reconnect';
      const errorMessage = lastDisconnect?.error?.message || String(lastDisconnect?.error || 'connection closed');

      logSessionState({
        connection: 'close',
        reason,
        code: statusCode,
        error: errorMessage
      });

      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      console.log(`⚠️ connection closed: ${statusCode || 'unknown'} | reconnect: ${shouldReconnect}`);

      if (shouldReconnect && !reconnecting) {
        reconnecting = true;
        markReconnect();
        setTimeout(() => {
          startBot().catch(err => {
            console.error('❌ reconnect failed:', err);
            setError(err);
          });
        }, 1500);
      } else if (!shouldReconnect) {
        console.log('🔒 logged out, pairing required again');
      }
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (!msg?.message) continue;
      
      // 💡 تم تعطيل هذا الشرط لكي يستجيب البوت لأوامرك من نفس الرقم!
      // if (msg.key?.fromMe) continue;

      try {
        await dispatcher(sock, msg);
      } catch (err) {
        console.error('❌ message handling error:', err);
        setError(err);
      }
    }
  });

  return sock;
}

export function getSock() {
  return sockGlobal;
}
