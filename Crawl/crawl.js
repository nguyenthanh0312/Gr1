import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
class DataCollector {
  constructor(url, dataType = 'currency') {
    this.url = url;
    this.dataType = dataType;
    this.rawData = [];
    this.errors = [];
    this.history = [];
  }

  async sendRequest() {
    try {
      this.browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
      this.page = await this.browser.newPage();
      await this.page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      );
      await this.page.goto(this.url, { waitUntil: 'networkidle2', timeout: 90000 });
      if (this.dataType === 'stock') {
      await this.page.waitForSelector('table', { timeout: 20000 });
      }
      if (this.dataType === 'crypto') {
        await this.page.waitForSelector('h2.inlineblock', { timeout: 20000 });
      }
      return true;
    } catch (err) {
      this.errors.push('Lỗi gửi yêu cầu: ' + err.message);
      return false;
    }
  }
  
  async receiveData() {
    try {
      if (this.dataType === 'stock') {
      await this.page.waitForSelector('table', { timeout: 30000 });  // ✅ CHỜ TABLE XUẤT HIỆN
      }
      const data = await this.page.evaluate((dataType) => {
        if (dataType === 'currency') {
          const table = document.querySelector('table');
          if (!table) return [];
          const rows = Array.from(table.querySelectorAll('tr'));
          return rows.slice(1, 11).map(row => {
            const cols = Array.from(row.querySelectorAll('td'));
            // Lấy text trong thẻ <a> nếu có, nếu không thì lấy innerText của td
            let currencyPair = 'N/A';
            if (cols[1]) {
              const a = cols[1].querySelector('a');
              currencyPair = a ? a.textContent.trim() : cols[1].textContent.trim();
            }
            return {
              currency_pair: currencyPair,
              bid: parseFloat(cols[2]?.innerText.replace(/,/g, '')) || null,
              ask: parseFloat(cols[3]?.innerText.replace(/,/g, '')) || null,
              high: parseFloat(cols[4]?.innerText.replace(/,/g, '')) || null,
              low: parseFloat(cols[5]?.innerText.replace(/,/g, '')) || null,
              change: cols[6]?.innerText.trim() || 'N/A',
              percent_change: cols[7]?.innerText.trim() || 'N/A',
              date: new Date().toISOString().slice(0, 10),
            };
          });
        }
        if ( dataType === 'gold') {
          const price = document.querySelector('[data-test="instrument-price-last"]');
          const change = document.querySelector('[data-test="instrument-price-change-percent"]');
          return [{
            type: dataType,
            price: price ? parseFloat(price.innerText.replace(/,/g, '')) : null,
            change: change ? change.innerText : 'N/A',
            date: new Date().toISOString().slice(0, 10),
          }];
        }
        if ( dataType === 'oil') {
          const price = document.querySelector('[data-test="instrument-price-last"]');
          const change = document.querySelector('[data-test="instrument-price-change-percent"]');
          return [{
            type: dataType,
            price: price ? parseFloat(price.innerText.replace(/,/g, '')) : null,
            change: change ? change.innerText : 'N/A',
            date: new Date().toISOString().slice(0, 10),
          }];
        }
        
        if (dataType === 'stock') {
          
          const countryHeaders = Array.from(document.querySelectorAll('h2.h3LikeTitle.linkTitle'));
          const dataByCountry = {};
          countryHeaders.forEach(header => {
            // Tìm tên quốc gia ngay phía trên bảng (element trước đó)
            const countryName = header.querySelector('a')?.innerText.trim() || header.innerText.trim() || 'Unknown';
            let table = header.nextElementSibling;
            while (table && table.tagName !== 'TABLE') {
              table = table.nextElementSibling;
            }
            if (!table) return;
            const rows = Array.from(table.querySelectorAll('tbody tr'));
            const indices = [];
            rows.forEach(row => {
              const cols = Array.from(row.querySelectorAll('td')); 
              const index = cols[1]?.querySelector('a')?.innerText.trim() || cols[0]?.innerText.trim() || 'N/A';
              const last = parseFloat(cols[2]?.innerText.replace(/,/g, '')) || null;
              const high = parseFloat(cols[3]?.innerText.replace(/,/g, '')) || null;
              const low = parseFloat(cols[4]?.innerText.replace(/,/g, '')) || null;
              const change = cols[5]?.innerText.trim() || 'N/A';
              const percent_change = cols[6]?.innerText.trim() || 'N/A';
              const time = cols[7]?.innerText.trim() || 'N/A';
              indices.push({
                index_name: index,
                last,
                high,
                low,
                change,
                percent_change,
                time,
                date: new Date().toISOString().slice(0, 10)
              });
            });
            if (indices.length > 0) {
              dataByCountry[countryName] = indices;
            }
          });
          return dataByCountry;
        }
        if (dataType === 'crypto') {
          const cryptoHeaders = Array.from(document.querySelectorAll('h2.inlineblock'));
          const dataByName = {};
          cryptoHeaders.forEach(header => {
            const cryptoName = header.querySelector('a')?.innerText.trim() || header.innerText.trim() || 'Unknown';
            let table = header.nextElementSibling;
            while (table && table.tagName !== 'TABLE') {
              table = table.nextElementSibling;
            }
            if (!table) return;
            const rows = Array.from(table.querySelectorAll('tbody tr'));
            const indices = [];
            rows.forEach(row => {
              const cols = Array.from(row.querySelectorAll('td'));
              const index = cols[1]?.querySelector('a')?.innerText.trim() || cols[0]?.innerText.trim() || 'N/A';
              const exchange_rate = cols[2]?.innerText.trim() || 'N/A';
              const last = parseFloat(cols[3]?.innerText.replace(/,/g, '')) || null;
              const high = parseFloat(cols[4]?.innerText.replace(/,/g, '')) || null;
              const low = parseFloat(cols[5]?.innerText.replace(/,/g, '')) || null;
              const change = cols[6]?.innerText.trim() || 'N/A';
              const percent_change = cols[7]?.innerText.trim() || 'N/A';
              const volume = cols[8]?.innerText.trim() || 'N/A';
              const time = cols[9]?.innerText.trim() || 'N/A';
              indices.push({
                index_name: index,
                exchange_rate,
                last,
                high,
                low,
                change,
                percent_change,
                volume,
                time,
                date: new Date().toISOString().slice(0, 10)
              });
            });
            if (indices.length > 0) {
              dataByName[cryptoName] = indices;
            }
          });
          return dataByName;
        }
      }, this.dataType);
      this.rawData = data;
      return true;
    } catch (err) {
      this.errors.push('Lỗi nhận dữ liệu: ' + err.message);
      return false;
      }
  }

 validateData() {
  if (this.dataType === 'stock') {
    return this.rawData && typeof this.rawData === 'object' && Object.keys(this.rawData).length > 0;
  }
  if (this.dataType === 'crypto') {
    return this.rawData && typeof this.rawData === 'object' && Object.keys(this.rawData).length > 0;
  }
  if (!Array.isArray(this.rawData) || this.rawData.length === 0) {
    this.errors.push('Dữ liệu rỗng hoặc không hợp lệ');
    return false;
  }

  return true;
}

  saveRawData() {
    console.log(`Ghi dữ liệu thô (${this.dataType}):`);
    let outPath;
    if (this.dataType === 'stock') {
      outPath = './Crawl/Crawl/stock_data.json';
    } else if (this.dataType === 'crypto') {
      outPath = './Crawl/Crawl/crypto_data.json';
    } else {
      outPath = `./Crawl/Crawl/${this.dataType}_data.json`;
    }

    // Đảm bảo thư mục tồn tại
    const dir = path.dirname(outPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (this.dataType === 'stock') {
      for (const [country, indices] of Object.entries(this.rawData)) {
        console.log(`--- ${country} ---`);
        console.table(indices); // in từng mảng object
      }
      fs.writeFileSync(
      outPath,
      JSON.stringify(this.rawData, null, 2),
      'utf-8'
      );
    } else if (this.dataType === 'crypto') {
      for (const [cryptos, indices] of Object.entries(this.rawData)) {
        console.log(`--- ${cryptos} ---`);
        console.table(indices); // in từng mảng object
      }
      fs.writeFileSync(
      outPath,
      JSON.stringify(this.rawData, null, 2),
      'utf-8'
      );
    }else {
      console.table(this.rawData);
      fs.writeFileSync(
      outPath,
      JSON.stringify(this.rawData, null, 2),
      'utf-8'
      );
    }
    this.history.push({
      data_type: this.dataType,
      status: this.errors.length === 0 ? 'success' : 'fail',
      timed_at: new Date().toISOString(),
      note: this.errors.join('; ') || 'Thu thập thành công'
    });
    console.log('Lịch sử crawl:');
    console.table(this.history);
  }

  logErrors() {
    console.error(`Ghi nhận lỗi thu thập (${this.dataType}):`);
    this.errors.forEach(e => console.error(e));
    this.history.push({
      data_type: this.dataType,
      status: 'fail',
      timed_at: new Date().toISOString(),
      note: this.errors.join('; ')
    });
    console.log('Lịch sử crawl:');
    console.table(this.history);
  }

  async close() {
    if (this.browser) await this.browser.close();
  }

  async run() {
    if (!(await this.sendRequest())) {
      this.logErrors();
      await this.close();
      return;
    }
    if (!(await this.receiveData())) {
      this.logErrors();
      await this.close();
      return;
    }
    if (this.validateData()) {
      this.saveRawData();
    } else {
      this.logErrors();
    }
    await this.close();
  }
}

// Crawl nhiều loại dữ liệu
const tasks = [
  { url: 'https://vn.investing.com/currencies/', type: 'currency' },
  { url: 'https://vn.investing.com/commodities/gold', type: 'gold' },
  { url: 'https://vn.investing.com/commodities/crude-oil', type: 'oil' },
  { url: 'https://vn.investing.com/indices/world-indices?&majorIndices=on&primarySectors=on', type: 'stock' },
  { url: 'https://vn.investing.com/crypto/currency-pairs', type: 'crypto' }
];

(async () => {
  for (const task of tasks) {
    const collector = new DataCollector(task.url, task.type);
    await collector.run();
  }
})();