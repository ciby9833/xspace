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
        images JSONB DEFAULT '[]'::jsonb, -- 剧本图片数组
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

    // 4. 检查新的权限系统表是否存在
    console.log('🔐 检查权限系统...');
    const permissionModulesExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'permission_modules'
      );
    `);

    if (permissionModulesExists.rows[0].exists) {
      console.log('✅ 新的权限系统已存在，添加剧本相关权限...');
      
      // 检查剧本模块是否存在
      const scriptModuleExists = await client.query(`
        SELECT id FROM permission_modules WHERE name = 'script'
      `);
      
      let scriptModuleId;
      if (scriptModuleExists.rows.length === 0) {
        // 创建剧本模块
        const moduleResult = await client.query(`
          INSERT INTO permission_modules (name, display_name, description, sort_order)
          VALUES ('script', '剧本管理', '剧本相关功能管理', 2)
          RETURNING id
        `);
        scriptModuleId = moduleResult.rows[0].id;
        console.log('✅ 创建剧本权限模块');
      } else {
        scriptModuleId = scriptModuleExists.rows[0].id;
        console.log('✅ 剧本权限模块已存在');
      }

      // 添加剧本相关权限
      const scriptPermissions = [
        { name: 'view', display_name: '查看剧本', key: 'script.view' },
        { name: 'create', display_name: '创建剧本', key: 'script.create' },
        { name: 'edit', display_name: '编辑剧本', key: 'script.edit' },
        { name: 'delete', display_name: '删除剧本', key: 'script.delete' },
        { name: 'manage', display_name: '剧本管理', key: 'script.manage' },
        { name: 'store_config', display_name: '门店剧本配置', key: 'script.store_config' }
      ];
      
      for (const perm of scriptPermissions) {
        await client.query(`
          INSERT INTO permissions (module_id, name, display_name, permission_key)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (permission_key) DO UPDATE SET
            display_name = EXCLUDED.display_name
        `, [scriptModuleId, perm.name, perm.display_name, perm.key]);
      }
      console.log('✅ 剧本权限添加完成');
    } else {
      console.log('⚠️  新的权限系统不存在，跳过权限配置');
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