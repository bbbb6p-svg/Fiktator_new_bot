import { getCommand } from "./registry.js";

export async function dispatcher(sock, m) {
  if (!m || !m.message) return;
  try {
    const body = m.message.conversation || m.message.extendedTextMessage?.text || m.message.imageMessage?.caption || "";
    if (!body) return;

    console.log("📥 رسالة مستلمة:", body);

    const prefix = ".";
    if (!body.startsWith(prefix)) return;

    const args = body.slice(prefix.length).trim().split(/ +/);
    const command = args.shift()?.toLowerCase();
    if (!command) return;

    console.log("🔍 البحث عن الأمر في التسجيل:", command);
    const plugin = getCommand(command);
    
    if (!plugin) {
      console.log("❌ الأمر غير مسجل:", command);
      return;
    }

    if (typeof plugin.execute !== "function") {
      console.log("❌ دالة التنفيذ غير موجودة للأمر:", command);
      return;
    }

    console.log("🚀 تنفيذ البلجن بنجاح:", command);
    await plugin.execute(sock, m, { args, text: args.join(" ") });
  } catch (e) {
    console.error("❌ خطأ في الـ Dispatcher:", e);
  }
}
