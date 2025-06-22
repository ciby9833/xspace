// 清理所有公司数据  node src/database/cleanup-companies.js
require('dotenv').config();

const pool = require('./connection');

const cleanupCompanies = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🔄 开始清理公司数据...');
    
    // 开始事务
    await client.query('BEGIN');
    
    // 1. 获取当前公司数量
    const countResult = await client.query('SELECT COUNT(*) FROM company');
    const companyCount = parseInt(countResult.rows[0].count);
    console.log(`📊 当前共有 ${companyCount} 家公司`);
    
    if (companyCount === 0) {
      console.log('💡 没有需要清理的公司数据');
      await client.query('COMMIT');
      return;
    }
    
    // 2. 删除关联数据（由于设置了 CASCADE，这些表的数据会自动删除）
    console.log('🗑️  删除关联数据...');
    
    // 2.1 删除用户-门店关联
    await client.query('DELETE FROM user_stores');
    console.log('✅ 已删除用户-门店关联数据');
    
    // 2.2 删除门店-剧本关联
    await client.query('DELETE FROM store_scripts');
    console.log('✅ 已删除门店-剧本关联数据');
    
    // 2.3 删除门店数据
    await client.query('DELETE FROM store');
    console.log('✅ 已删除门店数据');
    
    // 2.4 删除部门数据
    await client.query('DELETE FROM departments');
    console.log('✅ 已删除部门数据');
    
    // 2.5 删除用户数据
    await client.query('DELETE FROM users');
    console.log('✅ 已删除用户数据');
    
    // 2.6 删除剧本数据
    await client.query('DELETE FROM scripts');
    console.log('✅ 已删除剧本数据');
    
    // 3. 最后删除公司数据
    await client.query('DELETE FROM company');
    console.log('✅ 已删除公司数据');
    
    // 提交事务
    await client.query('COMMIT');
    
    // 4. 重置序列（如果有的话）
    try {
      await client.query(`
        DO $$ 
        DECLARE
          r RECORD;
        BEGIN
          FOR r IN (SELECT tablename, pg_get_serial_sequence(tablename, 'id') as seq_name
                   FROM pg_tables 
                   WHERE schemaname = 'public' 
                   AND pg_get_serial_sequence(tablename, 'id') IS NOT NULL)
          LOOP
            EXECUTE 'ALTER SEQUENCE ' || r.seq_name || ' RESTART WITH 1';
          END LOOP;
        END $$;
      `);
      console.log('✅ 已重置所有序列');
    } catch (error) {
      console.log('⚠️  重置序列失败:', error.message);
    }
    
    console.log('🎉 公司数据清理完成');
    
  } catch (error) {
    // 如果出错，回滚事务
    await client.query('ROLLBACK');
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
      await cleanupCompanies();
      process.exit(0);
    } catch (error) {
      console.error('💥 清理失败:', error);
      process.exit(1);
    }
  })();
}

module.exports = { cleanupCompanies }; 