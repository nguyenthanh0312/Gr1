import { MongoClient } from 'mongodb';

const mongoUri = 'mongodb://localhost:27017';
const dbName = 'currencyPrediction';

export const saveToDatabase = async (data) => {
  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    console.log('✅ Kết nối MongoDB thành công!');
    const db = client.db(dbName);
    const collection = db.collection('currencyData');

    await collection.insertMany(data);
    console.log('✅ Dữ liệu đã được lưu vào MongoDB.');
  } catch (err) {
    console.error('❌ Lỗi khi lưu dữ liệu:', err.message);
  } finally {
    await client.close();
  }
};