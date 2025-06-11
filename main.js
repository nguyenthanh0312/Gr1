import { crawlCurrencyData } from './crawl/crawler.js';
import { saveToDatabase } from './storage/database.js';
import { exec } from 'child_process';
import fs from 'fs';

const main = async () => {
  console.log('🚀 Bắt đầu thu thập dữ liệu...');
  const data = await crawlCurrencyData();

  console.log('💾 Lưu dữ liệu vào MongoDB...');
  await saveToDatabase(data);

  console.log('📂 Lưu dữ liệu vào file JSON...');
  const filePath = './currency_data.json';
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

  console.log('⚙️ Xử lý dữ liệu bằng Python...');
  exec(`python process/processor.py ${filePath}`, (error, stdout, stderr) => {
    if (error) {
      console.error(`❌ Lỗi khi xử lý dữ liệu: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`⚠️ Cảnh báo: ${stderr}`);
      return;
    }
    console.log(stdout);
  });
};

main();