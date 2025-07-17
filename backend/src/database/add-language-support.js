// 7月15号 为密室和剧本表添加语言支持字段 node src/database/add-language-support.js
require('dotenv').config();

const pool = require('./connection');

const addLanguageSupport = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🔄 开始为密室和剧本表添加语言支持字段...');
    
    await client.query('BEGIN');

    // 1. 为 escape_rooms 表添加 supported_languages 字段
    console.log('📝 为 escape_rooms 表添加 supported_languages 字段...');
    
    // 检查字段是否已存在
    const escapeRoomColumnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'escape_rooms' AND column_name = 'supported_languages'
    `);
    
    if (escapeRoomColumnCheck.rows.length === 0) {
      await client.query(`
        ALTER TABLE escape_rooms 
        ADD COLUMN supported_languages JSONB DEFAULT '["CN"]'::jsonb
      `);
      console.log('✅ escape_rooms 表成功添加 supported_languages 字段');
      
      // 为现有数据设置默认值
      await client.query(`
        UPDATE escape_rooms 
        SET supported_languages = '["CN"]'::jsonb 
        WHERE supported_languages IS NULL
      `);
      console.log('✅ 已为现有密室数据设置默认语言支持');
    } else {
      console.log('⚠️  escape_rooms 表的 supported_languages 字段已存在，跳过创建');
    }

    // 2. 为 scripts 表添加 supported_languages 字段
    console.log('📝 为 scripts 表添加 supported_languages 字段...');
    
    // 检查字段是否已存在
    const scriptColumnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'scripts' AND column_name = 'supported_languages'
    `);
    
    if (scriptColumnCheck.rows.length === 0) {
      await client.query(`
        ALTER TABLE scripts 
        ADD COLUMN supported_languages JSONB DEFAULT '["CN"]'::jsonb
      `);
      console.log('✅ scripts 表成功添加 supported_languages 字段');
      
      // 为现有数据设置默认值
      await client.query(`
        UPDATE scripts 
        SET supported_languages = '["CN"]'::jsonb 
        WHERE supported_languages IS NULL
      `);
      console.log('✅ 已为现有剧本数据设置默认语言支持');
    } else {
      console.log('⚠️  scripts 表的 supported_languages 字段已存在，跳过创建');
    }

    // 3. 创建相关索引以提高查询性能
    console.log('📝 创建语言支持相关索引...');
    
    const indexes = [
      {
        name: 'idx_escape_rooms_supported_languages',
        sql: 'CREATE INDEX IF NOT EXISTS idx_escape_rooms_supported_languages ON escape_rooms USING GIN (supported_languages)',
        description: 'escape_rooms 表语言支持字段索引'
      },
      {
        name: 'idx_scripts_supported_languages', 
        sql: 'CREATE INDEX IF NOT EXISTS idx_scripts_supported_languages ON scripts USING GIN (supported_languages)',
        description: 'scripts 表语言支持字段索引'
      }
    ];

    for (const index of indexes) {
      try {
        await client.query(index.sql);
        console.log(`✅ 创建索引: ${index.description}`);
      } catch (error) {
        console.log(`⚠️  索引创建失败 (${index.name}):`, error.message);
      }
    }

    // 4. 验证字段创建结果
    console.log('📝 验证字段创建结果...');
    
    const escapeRoomResult = await client.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'escape_rooms' AND column_name = 'supported_languages'
    `);
    
    const scriptResult = await client.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'scripts' AND column_name = 'supported_languages'
    `);

    if (escapeRoomResult.rows.length > 0) {
      console.log('✅ escape_rooms.supported_languages 字段验证成功:', escapeRoomResult.rows[0]);
    }
    
    if (scriptResult.rows.length > 0) {
      console.log('✅ scripts.supported_languages 字段验证成功:', scriptResult.rows[0]);
    }

    // 5. 显示统计信息
    console.log('📊 统计信息:');
    
    const escapeRoomCount = await client.query('SELECT COUNT(*) FROM escape_rooms');
    const scriptCount = await client.query('SELECT COUNT(*) FROM scripts');
    
    console.log(`   - 密室总数: ${escapeRoomCount.rows[0].count}`);
    console.log(`   - 剧本总数: ${scriptCount.rows[0].count}`);

    await client.query('COMMIT');
    console.log('🎉 语言支持字段添加完成！');
    
    console.log('\n📋 字段说明:');
    console.log('   - supported_languages: JSONB 类型，存储支持的语言数组');
    console.log('   - 可选值: ["CN", "EN", "IND"] 或其组合');
    console.log('   - 默认值: ["CN"] (中文)');
    console.log('   - 示例: ["CN", "EN"] 表示支持中文和英文');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ 添加语言支持字段失败:', error);
    throw error;
  } finally {
    client.release();
  }
};

// 如果直接运行此脚本
if (require.main === module) {
  addLanguageSupport()
    .then(() => {
      console.log('✅ 脚本执行完成');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ 脚本执行失败:', error);
      process.exit(1);
    });
}

module.exports = addLanguageSupport; 