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
      await this.page.goto(this.url, { waitUntil: 'networkidle2', timeout: 90000 });
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
          const tables = Array.from(document.querySelectorAll('table'));
          const allData = [];

          tables.forEach(table => {
            // Tìm tên quốc gia ngay phía trên bảng (element trước đó)
            const countryElem = table.previousElementSibling;
            const countryName = countryElem?.textContent.trim().replace('»', '') || 'Unknown';

            const rows = Array.from(table.querySelectorAll('tr')).slice(1); // bỏ dòng tiêu đề
            rows.forEach(row => {
              const cols = Array.from(row.querySelectorAll('td'));
              let index = 'N/A';

              if (cols[1]) {
                const a = cols[1].querySelector('a');
                index = a ? a.textContent.trim() : cols[1].textContent.trim();
              }

              allData.push({
                country: countryName,
                index_name: index,
                last: parseFloat(cols[2]?.innerText.replace(/,/g, '')) || null,
                high: parseFloat(cols[3]?.innerText.replace(/,/g, '')) || null,
                low: parseFloat(cols[4]?.innerText.replace(/,/g, '')) || null,
                change: parseFloat(cols[5]?.innerText.replace(/,/g, '')) || null,
                percent_change: cols[6]?.innerText.trim() || 'N/A',
                date: new Date().toISOString().slice(0, 10)
              });
            });
          });

          return allData;
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
  { url: 'https://vn.investing.com/currencies/', type: 'currency' },
  { url: 'https://vn.investing.com/commodities/gold', type: 'gold' },
  { url: 'https://vn.investing.com/commodities/crude-oil', type: 'oil' },
  { url: 'https://vn.investing.com/indices/world-indices', type: 'stock' }
];

(async () => {
  for (const task of tasks) {
    const collector = new DataCollector(task.url, task.type);
    await collector.run();
  }
})();