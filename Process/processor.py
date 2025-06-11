class DataProcessor {
  constructor(rawData) {
    this.rawData = rawData;
    this.cleanedData = [];
    this.errors = [];
  }

  // Đọc dữ liệu thô (ở đây là nhận từ constructor)
  readRawData() {
    if (!Array.isArray(this.rawData) || this.rawData.length === 0) {
      this.errors.push('Không có dữ liệu thô để xử lý');
      return false;
    }
    return true;
  }

  // Làm sạch dữ liệu: loại bỏ dòng thiếu thông tin quan trọng
  cleanData() {
    this.cleanedData = this.rawData.filter(item =>
      item.currencyPair !== 'N/A' &&
      !isNaN(Number(item.bid)) &&
      !isNaN(Number(item.ask)) &&
      !isNaN(Number(item.high)) &&
      !isNaN(Number(item.low))
    );
    if (this.cleanedData.length === 0) {
      this.errors.push('Tất cả dữ liệu đều lỗi hoặc thiếu thông tin');
      return false;
    }
    return true;
  }

  // Chuẩn hóa dữ liệu: chuyển đổi kiểu dữ liệu về số, chuẩn hóa tên cặp tiền tệ
  normalizeData() {
    try {
      this.cleanedData = this.cleanedData.map(item => ({
        currencyPair: item.currencyPair.replace(/\s/g, ''),
        bid: Number(item.bid),
        ask: Number(item.ask),
        high: Number(item.high),
        low: Number(item.low),
        change: item.change,
        time: item.time,
      }));
      return true;
    } catch (err) {
      this.errors.push('Lỗi chuẩn hóa dữ liệu: ' + err.message);
      return false;
    }
  }

  // Phân tích dữ liệu phụ trợ: tính giá trung bình
  analyzeData() {
    try {
      this.cleanedData = this.cleanedData.map(item => ({
        ...item,
        average: (item.high + item.low) / 2,
      }));
      return true;
    } catch (err) {
      this.errors.push('Lỗi phân tích dữ liệu: ' + err.message);
      return false;
    }
  }

  // Ghi dữ liệu sạch tạm thời (ở đây là trả về, bạn có thể lưu vào file/DB)
  saveCleanData() {
    console.log('Dữ liệu sạch tạm thời:');
    console.log(this.cleanedData);
    return this.cleanedData;
  }

  // Ghi nhận lỗi xử lý
  logErrors() {
    console.error('Lỗi xử lý dữ liệu:');
    this.errors.forEach(e => console.error(e));
  }

  // Hàm tổng hợp xử lý
  process() {
    if (!this.readRawData()) {
      this.logErrors();
      return null;
    }
    if (!this.cleanData()) {
      this.logErrors();
      return null;
    }
    if (!this.normalizeData()) {
      this.logErrors();
      return null;
    }
    if (!this.analyzeData()) {
      this.logErrors();
      return null;
    }
    return this.saveCleanData();
  }
}

export default DataProcessor;
