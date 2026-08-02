export default {
  name: "ping",
  aliases: ["p", "speed"],
  execute: async (sock, m) => {
    await sock.sendMessage(m.key.remoteJid, { text: "Pong! 🏓 البوت يعمل بنجاح" }, { quoted: m });
  }
};
