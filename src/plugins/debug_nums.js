let handler = async (m, { conn, text, args, command, usedPrefix }) => {
  console.log("--- [DEBUG BOT] تم رصد رسالة جديدة ---");
  console.log("Command:", command);
  console.log("Text:", text);
  console.log("UsedPrefix:", usedPrefix);
  console.log("Message Structure:", JSON.stringify(m, null, 2));

  const jid = m.chat || m.key.remoteJid;
  const replyText = `🛠️ *فحص البوت الناجح*\n- الأمر المستلم: ${command || 'لا يوجد'}\n- النص: ${text || 'فارغ'}\n- البادئة: ${usedPrefix || 'لا توجد'}`;
  
  return conn.sendMessage(jid, { text: replyText }, { quoted: m });
};

handler.customPrefix = /^(فك|مميز|قص|فحص|خلاص)$/i;
handler.command = new RegExp;

export default handler;
