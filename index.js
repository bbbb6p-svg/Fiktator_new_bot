import 'dotenv/config';
import { startBot } from './src/core/client.js';
import { loader } from './src/core/loader.js';

let booted = false;

async function main() {
  if (booted) return;
  booted = true;

  try {
    console.log('🔄 جاري تحميل الأوامر والبلجنات...');
    await loader(); // 👈 هنا البوت سيقرأ الأوامر قبل أن يتصل
    
    console.log('✅ تم تحميل الأوامر، جاري الاتصال بالواتساب...');
    await startBot();
    
    // إجبار السيرفر على البقاء قيد العمل
    setInterval(() => {}, 1000 * 60 * 60);
    console.log('🔄 نظام إبقاء البوت (Keep-Alive) يعمل بنجاح.');
  } catch (error) {
    console.error('❌ Fatal startup error:', error);
    process.exit(1);
  }
}

process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
});

main();
