// 时区迁移 - 需要先运行 npm run migrate 创建表，然后运行   node src/database/migrate-timezone.js   
require('dotenv').config();
const pool = require('./connection');

const addTimezoneFields = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🕒 开始添加时区字段...');
    
    // 1. 为用户表添加时区字段
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'Asia/Jakarta'
    `);
    
    // 2. 为公司表添加时区字段
    await client.query(`
      ALTER TABLE company 
      ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'Asia/Jakarta'
    `);
    
    // 3. 为门店表添加时区字段
    await client.query(`
      ALTER TABLE store 
      ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'Asia/Jakarta'
    `);
    
    // 4. 更新现有数据的时区（根据印尼不同地区）
    await client.query(`
      UPDATE users SET timezone = 'Asia/Jakarta' WHERE timezone IS NULL
    `);
    
    await client.query(`
      UPDATE company SET timezone = 'Asia/Jakarta' WHERE timezone IS NULL
    `);
    
    await client.query(`
      UPDATE store SET timezone = 'Asia/Jakarta' WHERE timezone IS NULL
    `);
    
    console.log('✅ 时区字段添加完成');
    
  } catch (error) {
    console.error('❌ 添加时区字段失败:', error);
    throw error;
  } finally {
    client.release();
  }
};

// 运行迁移
if (require.main === module) {
  addTimezoneFields()
    .then(() => {
      console.log('🎉 时区迁移完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 时区迁移失败:', error);
      process.exit(1);
    });
}

module.exports = { addTimezoneFields }; 