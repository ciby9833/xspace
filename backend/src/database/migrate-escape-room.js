// 密室数据库迁移脚本 node src/database/migrate-escape-room.js
require('dotenv').config();

const pool = require('./connection');

const escapeRoomMigration = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🔄 开始密室数据库迁移...');
    
    // 确保UUID扩展存在
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    
    // 1. 创建密室表
    console.log('📝 创建密室表...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS escape_rooms (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        company_id UUID REFERENCES company(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        horror_level VARCHAR(20) CHECK (horror_level IN ('非恐', '微恐', '中恐', '重恐')) NOT NULL,
        price DECIMAL(10,2),
        cover_images JSONB DEFAULT '[]',
        min_players INTEGER NOT NULL CHECK (min_players >= 1),
        max_players INTEGER NOT NULL CHECK (max_players >= min_players),
        duration INTEGER NOT NULL CHECK (duration > 0),
        npc_count INTEGER DEFAULT 0 CHECK (npc_count >= 0),
        npc_roles TEXT,
        description TEXT,
        props TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT valid_player_range CHECK (max_players >= min_players)
      )
    `);
    
    // 2. 创建密室-门店关联表
    console.log('📝 创建密室-门店关联表...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS store_escape_rooms (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        store_id UUID REFERENCES store(id) ON DELETE CASCADE,
        escape_room_id UUID REFERENCES escape_rooms(id) ON DELETE CASCADE,
        store_price DECIMAL(10,2),
        is_available BOOLEAN DEFAULT true,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(store_id, escape_room_id)
      )
    `);
    
    // 3. 创建索引
    console.log('📝 创建索引...');
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_escape_rooms_company_id ON escape_rooms(company_id)',
      'CREATE INDEX IF NOT EXISTS idx_escape_rooms_horror_level ON escape_rooms(horror_level)',
      'CREATE INDEX IF NOT EXISTS idx_escape_rooms_is_active ON escape_rooms(is_active)',
      'CREATE INDEX IF NOT EXISTS idx_escape_rooms_created_at ON escape_rooms(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_store_escape_rooms_store_id ON store_escape_rooms(store_id)',
      'CREATE INDEX IF NOT EXISTS idx_store_escape_rooms_escape_room_id ON store_escape_rooms(escape_room_id)',
      'CREATE INDEX IF NOT EXISTS idx_store_escape_rooms_is_available ON store_escape_rooms(is_available)'
    ];
    
    for (const indexSQL of indexes) {
      try {
        await client.query(indexSQL);
      } catch (error) {
        console.log(`⚠️  索引创建失败:`, error.message);
      }
    }
    
    // 4. 添加注释
    console.log('📝 添加表注释...');
    await client.query(`
      COMMENT ON TABLE escape_rooms IS '密室表';
      COMMENT ON COLUMN escape_rooms.horror_level IS '恐怖等级：非恐、微恐、中恐、重恐';
      COMMENT ON COLUMN escape_rooms.cover_images IS '封面图片数组，JSON格式存储';
      COMMENT ON COLUMN escape_rooms.npc_count IS 'NPC数量';
      COMMENT ON COLUMN escape_rooms.npc_roles IS 'NPC角色描述';
      
      COMMENT ON TABLE store_escape_rooms IS '门店-密室关联表';
      COMMENT ON COLUMN store_escape_rooms.store_price IS '门店特定价格，可覆盖密室默认价格';
      COMMENT ON COLUMN store_escape_rooms.sort_order IS '在门店中的排序';
    `);
    
    // 5. 显示统计信息
    const stats = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM escape_rooms) as total_escape_rooms,
        (SELECT COUNT(*) FROM store_escape_rooms) as total_store_associations
    `);
    
    console.log('📊 迁移结果统计:');
    console.log(`   密室总数: ${stats.rows[0].total_escape_rooms}`);
    console.log(`   门店关联总数: ${stats.rows[0].total_store_associations}`);
    
    console.log('✅ 密室数据库迁移完成');
    
  } catch (error) {
    console.error('❌ 密室迁移失败:', error);
    throw error;
  } finally {
    client.release();
  }
};

// 如果直接运行此文件，执行迁移
if (require.main === module) {
  (async () => {
    try {
      await escapeRoomMigration();
      console.log('🎉 密室数据库迁移成功');
      process.exit(0);
    } catch (error) {
      console.error('💥 密室数据库迁移失败:', error);
      process.exit(1);
    }
  })();
}

module.exports = { escapeRoomMigration }; 