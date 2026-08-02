export default {
  name: "dashboard",
  aliases: ["dash"],
  execute: async (sock, m) => {
    try {
      const jid = m.key?.remoteJid || m.chat;
      const usedMem = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
      const totalMem = (process.memoryUsage().rss / 1024 / 1024).toFixed(2);
      const uptime = Math.floor(process.uptime());
      const hours = Math.floor(uptime / 3600);
      const minutes = Math.floor((uptime % 3600) / 60);
      const seconds = uptime % 60;
      
      const text = "📊 *Fiktator Bot Dashboard*\n\n" +
                   "🟢 *Status:* Online\n" +
                   "🧠 *Memory:* " + usedMem + " MB / " + totalMem + " MB\n" +
                   "⏱️ *Uptime:* " + hours + "h " + minutes + "m " + seconds + "s\n" +
                   "👑 *Brand:* 𝕱ɪᴋᴛᴀᴛᴜʀ⁸⁶";
                   
      await sock.sendMessage(jid, { text }, { quoted: m });
      console.log("✅ Dashboard sent successfully!");
    } catch (err) {
      console.error("❌ Error in dashboard plugin:", err);
    }
  }
};
