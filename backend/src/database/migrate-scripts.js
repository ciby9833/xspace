// 完整的剧本模块迁移   node src/database/migrate-scripts.js
require('dotenv').config();

const pool = require('./connection');

const migrateScriptModule = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🔄 开始剧本模块完整迁移...');
    
    // 1. 创建剧本基础表
    console.log('📝 创建剧本表...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS scripts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID REFERENCES company(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL CHECK (type IN ('欢乐', '惊悚', '推理', '恐怖', '情感', '策略', '血染钟楼', '桌游')),
        background VARCHAR(50) CHECK (background IN ('现代', '中国古代', '欧式', '日式', '架空')),
        description TEXT,
        min_players INTEGER NOT NULL,
        max_players INTEGER NOT NULL,
        duration INTEGER NOT NULL, -- 时长（分钟）
        difficulty VARCHAR(20) CHECK (difficulty IN ('新手', '进阶', '硬核')),
        price DECIMAL(10,2), -- 建议价格
        cover_image VARCHAR(500), -- 封面图片URL
        tags JSONB, -- 标签 ["推理", "6人", "2小时"]
        props TEXT, -- 剧本道具说明
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // 2. 创建门店剧本配置表（多对多关系）
    console.log('📝 创建门店剧本配置表...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS store_scripts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        store_id UUID REFERENCES store(id) ON DELETE CASCADE,
        script_id UUID REFERENCES scripts(id) ON DELETE CASCADE,
        store_price DECIMAL(10,2), -- 门店自定义价格
        is_available BOOLEAN DEFAULT true, -- 门店是否启用此剧本
        sort_order INTEGER DEFAULT 0, -- 排序
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(store_id, script_id)
      )
    `);

    // 3. 创建索引
    console.log('📝 创建索引...');
    await client.query(`CREATE INDEX IF NOT EXISTS idx_scripts_company_id ON scripts(company_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_scripts_type ON scripts(type)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_scripts_background ON scripts(background)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_store_scripts_store_id ON store_scripts(store_id)`);

    // 4. 添加权限
    console.log('🔐 添加剧本管理权限...');
    
    // 检查是否需要添加唯一约束（如果还没有的话）
    try {
      await client.query(`
        ALTER TABLE role_permissions 
        ADD CONSTRAINT unique_role_permission 
        UNIQUE (role, permission_key)
      `);
      console.log('✅ 添加权限唯一约束');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('💡 权限唯一约束已存在');
      } else {
        console.log('⚠️  权限约束添加失败，但继续执行:', error.message);
      }
    }
    
    const scriptPermissions = [
      // 主账号权限
      { role: '主账号', key: 'script.manage', name: '剧本管理', desc: '完整的剧本CRUD权限' },
      { role: '主账号', key: 'script.store_config', name: '门店剧本配置', desc: '配置剧本在门店的上架情况' },
      
      // 店长权限  
      { role: '店长', key: 'script.view', name: '查看剧本', desc: '查看门店可用剧本' },
      { role: '店长', key: 'script.store_config', name: '门店剧本配置', desc: '配置本门店剧本' },
      
      // 客服权限
      { role: '客服', key: 'script.view', name: '查看剧本', desc: '查看门店可用剧本' },
      
      // 主持人权限
      { role: '主持人', key: 'script.view', name: '查看剧本', desc: '查看分配给自己的剧本' }
    ];
    
    for (const perm of scriptPermissions) {
      await client.query(`
        INSERT INTO role_permissions (role, permission_key, permission_name, description)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (role, permission_key) DO NOTHING
      `, [perm.role, perm.key, perm.name, perm.desc]);
    }
    
    console.log('✅ 剧本模块迁移完成');
    
  } catch (error) {
    console.error('❌ 剧本模块迁移失败:', error);
    throw error;
  } finally {
    client.release();
  }
};

// 如果直接运行此文件，执行迁移
if (require.main === module) {
  (async () => {
    try {
      await migrateScriptModule();
      console.log('🎉 剧本模块完整迁移成功');
      process.exit(0);
    } catch (error) {
      console.error('💥 剧本模块迁移失败:', error);
      process.exit(1);
    }
  })();
}

module.exports = { migrateScriptModule }; 