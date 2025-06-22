// 清理用户数据 node src/database/cleanup-users.js
require('dotenv').config();
const pool = require('./connection');

const cleanupUsers = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🧹 开始清理用户数据...');
    
    // 1. 先删除所有用户
    const result = await client.query('DELETE FROM users');
    console.log(`✅ 已删除 ${result.rowCount} 个用户`);
    
    // 2. 重置序列（如果有的话）
    try {
      await client.query('ALTER SEQUENCE IF EXISTS users_id_seq RESTART WITH 1');
      console.log('✅ 重置用户ID序列');
    } catch (error) {
      console.log('⚠️  重置序列失败（可能不存在）:', error.message);
    }
    
    console.log('🎉 用户数据清理完成');
    
  } catch (error) {
    console.error('❌ 清理失败:', error);
    throw error;
  } finally {
    client.release();
  }
};

// 如果直接运行此文件，执行清理
if (require.main === module) {
  (async () => {
    try {
      await cleanupUsers();
      process.exit(0);
    } catch (error) {
      console.error('💥 清理失败:', error);
      process.exit(1);
    }
  })();
}

module.exports = { cleanupUsers }; 