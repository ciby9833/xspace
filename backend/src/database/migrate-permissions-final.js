// 权限系统最终迁移 - 支持完全自定义角色管理
require('dotenv').config();

const pool = require('./connection');

const migratePermissionsFinal = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🔄 开始权限系统最终迁移...');
    
    // 1. 确保UUID扩展存在
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    
    // 2. 创建权限模块表 已创建权限模块
    await client.query(`
      CREATE TABLE IF NOT EXISTS permission_modules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL UNIQUE,
        display_name VARCHAR(100) NOT NULL,
        description TEXT,
        sort_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // 3. 创建权限项表 已创建权限项
    await client.query(`
      CREATE TABLE IF NOT EXISTS permissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        module_id UUID REFERENCES permission_modules(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        display_name VARCHAR(100) NOT NULL,
        description TEXT,
        permission_key VARCHAR(100) NOT NULL UNIQUE,
        sort_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // 4. 创建/更新角色表（支持层级和归属） 已创建角色
    await client.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID REFERENCES company(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        display_name VARCHAR(100) NOT NULL,
        description TEXT,
        is_system_role BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // 添加新字段（如果不存在）
    await client.query(`
      ALTER TABLE roles ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL
    `);

    await client.query(`
      ALTER TABLE roles ADD COLUMN IF NOT EXISTS role_level VARCHAR(20) 
      CHECK (role_level IN ('platform', 'company', 'store')) DEFAULT 'store'
    `);

    // 删除旧的唯一约束
    await client.query(`
      ALTER TABLE roles DROP CONSTRAINT IF EXISTS roles_company_id_name_key
    `);

    // 添加新的唯一约束（如果不存在）
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'roles_company_level_name_unique'
        ) THEN
          ALTER TABLE roles ADD CONSTRAINT roles_company_level_name_unique 
          UNIQUE (company_id, role_level, name);
        END IF;
      END $$;
    `);

    // 5. 创建角色权限关联表 已创建角色权限关联
    await client.query(`
      CREATE TABLE IF NOT EXISTS role_permission_assignments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
        permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
        granted BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(role_id, permission_id)
      )
    `);

    // 6. 更新用户表，添加role_id字段 已更新用户表
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES roles(id) ON DELETE SET NULL
    `);

    console.log('✅ 权限系统表结构创建完成');

    // 7. 初始化权限模块 已初始化权限模块
    const modules = [
      { name: 'user', display_name: '用户管理', description: '用户相关功能管理', sort_order: 1 },
      { name: 'script', display_name: '剧本管理', description: '剧本相关功能管理', sort_order: 2 },
      { name: 'order', display_name: '订单管理', description: '订单相关功能管理', sort_order: 3 },
      { name: 'store', display_name: '门店管理', description: '门店相关功能管理', sort_order: 4 },
      { name: 'company', display_name: '公司管理', description: '公司相关功能管理', sort_order: 5 },
      { name: 'system', display_name: '系统管理', description: '系统设置和配置', sort_order: 6 }
    ];

    for (const module of modules) {
      await client.query(`
        INSERT INTO permission_modules (name, display_name, description, sort_order)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (name) DO UPDATE SET
          display_name = EXCLUDED.display_name,
          description = EXCLUDED.description,
          sort_order = EXCLUDED.sort_order
      `, [module.name, module.display_name, module.description, module.sort_order]);
    }

    // 8. 初始化权限项 已初始化权限项
    const permissions = [
      // 用户管理
      { module: 'user', name: 'view', display_name: '查看用户', key: 'user.view' },
      { module: 'user', name: 'create', display_name: '创建用户', key: 'user.create' },
      { module: 'user', name: 'edit', display_name: '编辑用户', key: 'user.edit' },
      { module: 'user', name: 'delete', display_name: '删除用户', key: 'user.delete' },
      { module: 'user', name: 'manage', display_name: '用户管理', key: 'user.manage' },

      // 剧本管理
      { module: 'script', name: 'view', display_name: '查看剧本', key: 'script.view' },
      { module: 'script', name: 'create', display_name: '创建剧本', key: 'script.create' },
      { module: 'script', name: 'edit', display_name: '编辑剧本', key: 'script.edit' },
      { module: 'script', name: 'delete', display_name: '删除剧本', key: 'script.delete' },
      { module: 'script', name: 'manage', display_name: '剧本管理', key: 'script.manage' },

      // 订单管理
      { module: 'order', name: 'view', display_name: '查看订单', key: 'order.view' },
      { module: 'order', name: 'create', display_name: '创建订单', key: 'order.create' },
      { module: 'order', name: 'edit', display_name: '编辑订单', key: 'order.edit' },
      { module: 'order', name: 'delete', display_name: '删除订单', key: 'order.delete' },
      { module: 'order', name: 'manage', display_name: '订单管理', key: 'order.manage' },

      // 门店管理
      { module: 'store', name: 'view', display_name: '查看门店', key: 'store.view' },
      { module: 'store', name: 'create', display_name: '创建门店', key: 'store.create' },
      { module: 'store', name: 'edit', display_name: '编辑门店', key: 'store.edit' },
      { module: 'store', name: 'delete', display_name: '删除门店', key: 'store.delete' },
      { module: 'store', name: 'manage', display_name: '门店管理', key: 'store.manage' },

      // 公司管理
      { module: 'company', name: 'view', display_name: '查看公司', key: 'company.view' },
      { module: 'company', name: 'create', display_name: '创建公司', key: 'company.create' },
      { module: 'company', name: 'edit', display_name: '编辑公司', key: 'company.edit' },
      { module: 'company', name: 'delete', display_name: '删除公司', key: 'company.delete' },
      { module: 'company', name: 'manage', display_name: '公司管理', key: 'company.manage' },

      // 系统管理
      { module: 'system', name: 'view', display_name: '查看系统设置', key: 'system.view' },
      { module: 'system', name: 'manage', display_name: '系统管理', key: 'system.manage' },
      { module: 'system', name: 'permission', display_name: '权限管理', key: 'system.permission' },
      { module: 'system', name: 'role', display_name: '角色管理', key: 'system.role' }
    ];

    for (const perm of permissions) {
      // 获取模块ID
      const moduleResult = await client.query(
        'SELECT id FROM permission_modules WHERE name = $1',
        [perm.module]
      );
      
      if (moduleResult.rows.length > 0) {
        const moduleId = moduleResult.rows[0].id;
        
        await client.query(`
          INSERT INTO permissions (module_id, name, display_name, permission_key)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (permission_key) DO UPDATE SET
            display_name = EXCLUDED.display_name
        `, [moduleId, perm.name, perm.display_name, perm.key]);
      }
    }

    console.log('✅ 权限模块和权限项初始化完成');

    // 9. 清理现有角色数据（移除所有预设角色） 已清理现有角色数据
    console.log('🗑️ 清理现有角色数据...');
    await client.query('DELETE FROM role_permission_assignments');
    await client.query('DELETE FROM roles');
    await client.query('UPDATE users SET role_id = NULL');

    // 10. 只创建一个超级管理员角色（用于系统初始化） 已创建超级管理员角色
    console.log('📝 创建超级管理员角色...');
    const superadminRoleResult = await client.query(`
      INSERT INTO roles (company_id, name, display_name, description, role_level, is_system_role)
      VALUES (NULL, 'superadmin', '超级管理员', '系统超级管理员，拥有所有权限', 'platform', true)
      RETURNING id
    `);

    const superadminRoleId = superadminRoleResult.rows[0].id;

    // 为超级管理员分配所有权限
    const allPermissions = await client.query('SELECT id FROM permissions');
    for (const perm of allPermissions.rows) {
      await client.query(`
        INSERT INTO role_permission_assignments (role_id, permission_id, granted)
        VALUES ($1, $2, true)
      `, [superadminRoleId, perm.id]);
    }

    // 11. 为现有的平台级用户分配超级管理员角色 已为现有的平台级用户分配超级管理员角色
    await client.query(`
      UPDATE users SET role_id = $1 
      WHERE account_level = 'platform' AND role = 'superadmin'
    `, [superadminRoleId]);

    // 12. 创建索引 已创建索引  
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_permissions_module_id ON permissions(module_id)',
      'CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permission_assignments(role_id)',
      'CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permission_assignments(permission_id)',
      'CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id)',
      'CREATE INDEX IF NOT EXISTS idx_roles_company_id ON roles(company_id)',
      'CREATE INDEX IF NOT EXISTS idx_roles_level ON roles(role_level)',
      'CREATE INDEX IF NOT EXISTS idx_roles_company_level ON roles(company_id, role_level)'
    ];

    for (const indexSQL of indexes) {
      await client.query(indexSQL);
    }

    // 创建 created_by 索引（如果字段存在）
    try {
      await client.query('CREATE INDEX IF NOT EXISTS idx_roles_created_by ON roles(created_by)');
    } catch (error) {
      console.log('⚠️ 跳过 created_by 索引创建');
    }

    // 13. 显示统计信息
    const stats = await client.query(`
      SELECT 
        role_level,
        COUNT(*) as role_count,
        COUNT(DISTINCT company_id) as company_count
      FROM roles 
      GROUP BY role_level
      ORDER BY 
        CASE role_level 
          WHEN 'platform' THEN 1 
          WHEN 'company' THEN 2 
          WHEN 'store' THEN 3 
        END
    `);

    console.log('📊 角色层级统计:');
    for (const stat of stats.rows) {
      console.log(`   ${stat.role_level}级: ${stat.role_count}个角色, ${stat.company_count || 0}个公司`);
    }

    console.log('✅ 权限系统最终迁移完成');
    console.log('💡 提示：所有预设角色已清理，请管理员根据实际需求创建角色');
    
  } catch (error) {
    console.error('❌ 权限系统最终迁移失败:', error);
    throw error;
  } finally {
    client.release();
  }
};

// 如果直接运行此文件，执行迁移
if (require.main === module) {
  (async () => {
    try {
      await migratePermissionsFinal();
      console.log('🎉 权限系统最终迁移成功');
      process.exit(0);
    } catch (error) {
      console.error('💥 权限系统最终迁移失败:', error);
      process.exit(1);
    }
  })();
}

module.exports = { migratePermissionsFinal }; 