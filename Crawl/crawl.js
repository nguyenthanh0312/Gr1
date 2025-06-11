import puppeteer from 'puppeteer';

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
      await this.page.goto(this.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      return true;
    } catch (err) {
      this.errors.push('Lỗi gửi yêu cầu: ' + err.message);
      return false;
    }
  }

  async receiveData() {
    try {
      const data = await this.page.evaluate((dataType) => {
        if (dataType === 'currency') {
          const table = document.querySelector('table');
          if (!table) return [];
          const rows = Array.from(table.querySelectorAll('tr'));
          return rows.slice(1, 11).map(row => {
            const cols = Array.from(row.querySelectorAll('td')).map(td => td.innerText.trim());
            return {
              currency_pair: cols[0] || 'N/A',
              bid: parseFloat(cols[1]?.replace(/,/g, '')) || null,
              ask: parseFloat(cols[2]?.replace(/,/g, '')) || null,
              high: parseFloat(cols[3]?.replace(/,/g, '')) || null,
              low: parseFloat(cols[4]?.replace(/,/g, '')) || null,
              change: cols[5] || 'N/A',
              date: new Date().toISOString().slice(0, 10),
            };
          });
        }
        if (dataType === 'gold' || dataType === 'oil') {
          const price = document.querySelector('.instrument-price_last__KQzyA');
          const change = document.querySelector('.instrument-price_change-value__jkuml');
          return [{
            type: dataType,
            price: price ? parseFloat(price.innerText.replace(/,/g, '')) : null,
            change: change ? change.innerText : 'N/A',
            date: new Date().toISOString().slice(0, 10),
          }];
        }
        if (dataType === 'stock') {
          const table = document.querySelector('table');
          if (!table) return [];
          const rows = Array.from(table.querySelectorAll('tr'));
          return rows.slice(1, 11).map(row => {
            const cols = Array.from(row.querySelectorAll('td')).map(td => td.innerText.trim());
            return {
              index_name: cols[0] || 'N/A',
              last: parseFloat(cols[1]?.replace(/,/g, '')) || null,
              high: parseFloat(cols[2]?.replace(/,/g, '')) || null,
              low: parseFloat(cols[3]?.replace(/,/g, '')) || null,
              change: cols[4] || 'N/A',
              date: new Date().toISOString().slice(0, 10),
            };
          });
        }
        return [];
      }, this.dataType);
      this.rawData = data;
      return true;
    } catch (err) {
      this.errors.push('Lỗi nhận dữ liệu: ' + err.message);
      return false;
    }
  }

  validateData() {
    if (!Array.isArray(this.rawData) || this.rawData.length === 0) {
      this.errors.push('Dữ liệu rỗng hoặc không hợp lệ');
      return false;
    }
    return true;
  }

  saveRawData() {
    console.log(`Ghi dữ liệu thô (${this.dataType}):`);
    console.table(this.rawData);
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
  { url: 'https://www.investing.com/currencies/', type: 'currency' },
  { url: 'https://www.investing.com/commodities/gold', type: 'gold' },
  { url: 'https://www.investing.com/commodities/crude-oil', type: 'oil' },
  { url: 'https://www.investing.com/indices/', type: 'stock' }
];

(async () => {
  for (const task of tasks) {
    const collector = new DataCollector(task.url, task.type);
    await collector.run();
  }
})();