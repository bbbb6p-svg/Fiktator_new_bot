import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason
} from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';
import pino from 'pino';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loader } from './loader.js';
import { dispatcher } from './dispatcher.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SESSION_DIR = path.join(__dirname, '..', '..', 'session');

let botStarted = false;

export async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
  const { version } = await fetchLatestBaileysVersion();
  const logger = pino({ level: 'silent' });

  // إنشاء اتصال واحد مستمر
  const sock = makeWASocket({
    auth: state,
    version,
    logger,
    printQRInTerminal: false,
    browser: ['Fiktatur', 'Chrome', '1.0.0']
  });

  // طلب الكود إذا لم يكن مسجلاً (بدون إغلاق الاتصال)
  if (!state.creds.registered) {
    const phoneNumber = process.env.PAIRING_NUMBER || '';
    if (phoneNumber) {
      setTimeout(async () => {
        try {
          const code = await sock.requestPairingCode(phoneNumber.replace(/\D/g, ''));
          console.log(`\n✅ PAIRING CODE: ${code}\n`);
        } catch (err) {
          console.error('❌ خطأ في طلب الكود:', err.message);
        }
      }, 3000); // ننتظر 3 ثواني ليتم تجهيز الاتصال
    } else {
      console.log('⚠️ ضع رقمك في متغير PAIRING_NUMBER');
    }
  }

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, qr, lastDisconnect } = update;

    if (qr && !state.creds.registered && !process.env.PAIRING_NUMBER) {
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'open' && !botStarted) {
      botStarted = true;
      await loader();
      sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;
        for (const msg of messages) {
          if (!msg.message) continue;
          await dispatcher(sock, msg);
        }
      });
      console.log('✅ Bot connected');
    }

    if (connection === 'close') {
      botStarted = false;
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) {
        console.log('♻️ Reconnecting...');
        startBot();
      }
    }
  });

  return sock;
}
