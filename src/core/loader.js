import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { registerCommand } from './registry.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function loader() {
  try {
    const pluginsDir = path.join(__dirname, '..', 'plugins');

    if (!fs.existsSync(pluginsDir)) {
      fs.mkdirSync(pluginsDir, { recursive: true });
      return;
    }

    function walkDir(dir) {
      let results = [];
      const list = fs.readdirSync(dir);
      list.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
          results = results.concat(walkDir(filePath));
        } else if (file.endsWith('.js')) {
          results.push(filePath);
        }
      });
      return results;
    }

    const files = walkDir(pluginsDir);
    for (const fullPath of files) {
      try {
        const fileUrl = `${pathToFileURL(fullPath).href}?t=${Date.now()}`;
        const pluginModule = await import(fileUrl);
        const plugin = pluginModule.default || pluginModule;

        if (plugin && plugin.name && typeof plugin.execute === 'function') {
          registerCommand(plugin.name, plugin);
          console.log(`📦 أمر رئيسي: [ ${plugin.name} ]`);
          if (plugin.aliases && Array.isArray(plugin.aliases)) {
            for (const alias of plugin.aliases) {
              registerCommand(alias, plugin);
              console.log(`  ↪ مرادف (Alias): [ ${alias} ]`);
            }
          }
        }
      } catch (err) {
        console.error(`❌ خطأ في استيراد الملف ${fullPath}:`, err.message);
      }
    }
    console.log('✅ تم الانتهاء من تحميل جميع البلجنات بنجاح.');
  } catch (error) {
    console.error('❌ خطأ رئيسي داخل الـ loader:', error);
  }
}
