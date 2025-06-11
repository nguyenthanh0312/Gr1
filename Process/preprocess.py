import DataProcessor from './dataProcessor.js';
import { DataCollector } from './crawl.js'; // Đảm bảo export DataCollector

const collector = new DataCollector('https://www.investing.com/currencies/');
collector.run = async function () {
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
    // Xử lý dữ liệu thô trước khi lưu
    const processor = new DataProcessor(this.rawData);
    const cleanData = processor.process();
    if (cleanData) {
      // Ở đây bạn có thể lưu cleanData vào database
      console.log('Sẵn sàng lưu vào database:', cleanData);
    }
  } else {
    this.logErrors();
  }
  await this.close();
};

collector.run();