require('dotenv').config();
const pool = require('./connection');

async function addScriptsImagesColumn() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 开始为scripts表添加images字段...');
    
    // 检查images字段是否已存在
    const columnExists = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'scripts' AND column_name = 'images'
      );
    `);
    
    if (columnExists.rows[0].exists) {
      console.log('✅ images字段已存在，跳过添加');
      return;
    }
    
    // 添加images字段
    await client.query(`
      ALTER TABLE scripts 
      ADD COLUMN images JSONB DEFAULT '[]'::jsonb
    `);
    
    console.log('✅ 成功为scripts表添加images字段');
    
    // 验证字段添加
    const verifyColumn = await client.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'scripts' AND column_name = 'images'
    `);
    
    if (verifyColumn.rows.length > 0) {
      console.log('📋 images字段信息:');
      console.log(`   字段名: ${verifyColumn.rows[0].column_name}`);
      console.log(`   数据类型: ${verifyColumn.rows[0].data_type}`);
      console.log(`   默认值: ${verifyColumn.rows[0].column_default}`);
    }
    
  } catch (error) {
    console.error('❌ 添加images字段失败:', error);
    throw error;
  } finally {
    client.release();
  }
}

// 执行脚本
(async () => {
  try {
    await addScriptsImagesColumn();
    console.log('🎉 scripts表images字段添加成功');
    process.exit(0);
  } catch (error) {
    console.error('💥 scripts表images字段添加失败:', error);
    process.exit(1);
  }
})(); 