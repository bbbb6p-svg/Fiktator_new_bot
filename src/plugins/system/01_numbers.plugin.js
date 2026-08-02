import { downloadContentFromMessage } from '@whiskeysockets/baileys';

let activeScan = { running: false, stopRequested: false };

async function getFileContent(m) {
  try {
    const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    let docMsg = 
      quoted?.documentMessage || 
      quoted?.documentWithIgnoreReportMessage?.message?.documentMessage ||
      m.message?.documentMessage || 
      m.message?.documentWithIgnoreReportMessage?.message?.documentMessage;

    if (docMsg) {
      const stream = await downloadContentFromMessage(docMsg, 'document');
      let buffer = Buffer.from([]);
      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
      }
      return buffer.toString('utf-8');
    }

    if (quoted?.conversation) return quoted.conversation;
    if (quoted?.extendedTextMessage?.text) return quoted.extendedTextMessage.text;
    if (quoted?.imageMessage?.caption) return quoted.imageMessage.caption;
    if (m.message?.conversation) return m.message.conversation;
    if (m.message?.extendedTextMessage?.text) return m.message.extendedTextMessage.text;
  } catch (e) {
    console.error('❌ خطأ في تحميل الملف:', e);
  }
  return '';
}

function extractNumbersFromText(text = '') {
  if (!text) return [];
  // استخدام Regex سريع جداً لاستخراج الأرقام التي طولها 7 أرقام فأكثر
  const matches = text.match(/\d{7,}/g) || [];
  const unique = [...new Set(matches)];
  return unique.sort((a, b) => (BigInt(a) < BigInt(b) ? -1 : 1));
}

function isSpecialNumber(num) {
  const s = String(num);
  return /(.)\1{2,}/.test(s);
}

function sortMostSpecial(numbers = []) {
  const results = [];
  for (let i = 0; i < numbers.length; i++) {
    if (isSpecialNumber(numbers[i])) {
      results.push(numbers[i]);
    }
  }
  return results;
}

async function sendSingleMessage(sock, jid, header, items, m) {
  const body = items.map(item => `+${item}`).join('\n');
  const fullText = header + '\n' + '━━━━━━━━━━━━━━' + '\n\n' + body;
  await sock.sendMessage(jid, { text: fullText }, { quoted: m });
}

export default {
  name: 'ارقام',
  aliases: ['فك', 'مميز', 'قص', 'فحص', 'خلاص', 'فيكتاتورر', 'numbers'],
  category: 'system',
  desc: 'قسم الأرقام فائق السرعة',
  async execute(sock, m) {
    const jid = m.key?.remoteJid || m.chat;
    const reply = async (txt) => await sock.sendMessage(jid, { text: txt }, { quoted: m });

    const rawText = (
      m.message?.conversation ||
      m.message?.extendedTextMessage?.text ||
      ''
    ).trim();

    const cleanText = rawText.startsWith('.') ? rawText.slice(1) : rawText;
    const parts = cleanText.split(/\s+/);
    let sub = (parts[0] || '').toLowerCase();
    let queryBody = parts.slice(1).join(' ').trim();

    if (['ارقام', 'numbers'].includes(sub)) {
      sub = (parts[1] || '').toLowerCase();
      queryBody = parts.slice(2).join(' ').trim();
    }

    if (!['فك', 'مميز', 'قص', 'فحص', 'خلاص', 'فيكتاتورر'].includes(sub)) {
      return;
    }

    if (sub === 'خلاص') {
      if (activeScan.running) {
        activeScan.stopRequested = true;
        return await reply('🛑 جارٍ إيقاف الفحص...');
      }
      return await reply('⚠️ لا يوجد فحص نشط.');
    }

    const fileText = await getFileContent(m);
    if (!fileText) {
      return await reply('❌ يرجى الرد على ملف نصي (.txt) بالأمر مباشرة.');
    }

    const numbers = extractNumbersFromText(fileText);
    if (!numbers.length) {
      return await reply('❌ لم يتم العثور على أرقام أو الملف فارغ.');
    }

    if (sub === 'فيكتاتورر' || sub === 'فك') {
      const header = `🔥𝕏 الأرقام المصفاة والمرتبة (${numbers.length}) 𝕏🔥`;
      await sendSingleMessage(sock, jid, header, numbers, m);
      return;
    }

    if (sub === 'مميز') {
      const sorted = sortMostSpecial(numbers);
      if (!sorted.length) {
        return await reply('❌ لم يتم العثور على أرقام مميزة.');
      }
      const header = '🔥𝕏 أفضل الارقام المميزة 𝕏🔥';
      await sendSingleMessage(sock, jid, header, sorted, m);
      return;
    }

    if (sub === 'قص') {
      const want = queryBody.replace(/\D/g, '');
      if (!want) return await reply('❌ أرسل النمط المطلوب مثل: .قص 62888');

      const result = numbers.filter(n => n.includes(want));
      if (!result.length) return await reply('❌ لم يتم العثور على مطابقة.');

      const header = `✅ نتائج القص (${result.length}):`;
      await sendSingleMessage(sock, jid, header, result, m);
      return;
    }

    if (sub === 'فحص') {
      if (activeScan.running) return await reply('⚠️ الفحص يعمل بالفعل!');

      activeScan.running = true;
      activeScan.stopRequested = false;

      await reply(`⏳ بدأ فحص ${numbers.length} رقم بسرعة فائقة...\n🔻 للإيقاف أرسل: .خلاص`);

      const found = [];
      const notFound = [];
      let checked = 0;

      for (const raw of numbers) {
        if (activeScan.stopRequested) break;
        try {
          const res = await sock.onWhatsApp(raw + '@s.whatsapp.net');
          checked++;
          if (res?.[0]?.exists) found.push(raw);
          else notFound.push(raw);
          await new Promise(r => setTimeout(r, 30)); // سرعة عالية وآمنة
        } catch {
          checked++;
          notFound.push(raw);
        }
      }

      activeScan.running = false;
      const report = `📊 *تقرير الفحص*\n━━━━━━━━━━━━━━\n✅ تم فحص: ${checked}\n🟢 موجود: ${found.length}\n❌ غير موجود: ${notFound.length}`;
      
      if (notFound.length > 0) {
        await sendSingleMessage(sock, jid, report + '\n\n📌 الأرقام غير الموجودة:', notFound, m);
      } else {
        await reply(report);
      }
    }
  }
};
