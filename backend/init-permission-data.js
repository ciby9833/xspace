const pool = require('./src/database/connection');

async function initPermissionData() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 开始初始化权限数据...');
    
    // 1. 检查并初始化权限模块
    const modules = [
      { name: 'system', display_name: '系统管理', description: '系统设置和配置', sort_order: 1 },
      { name: 'company', display_name: '公司管理', description: '公司相关功能管理', sort_order: 2 },
      { name: 'user', display_name: '用户管理', description: '用户相关功能管理', sort_order: 3 },
      { name: 'store', display_name: '门店管理', description: '门店相关功能管理', sort_order: 4 },
      { name: 'script', display_name: '剧本管理', description: '剧本相关功能管理', sort_order: 5 },
      { name: 'escape_room', display_name: '密室管理', description: '密室相关功能管理', sort_order: 6 },
      { name: 'room', display_name: '房间管理', description: '房间相关功能管理', sort_order: 7 },
      { name: 'order', display_name: '订单管理', description: '订单相关功能管理', sort_order: 8 },
      { name: 'game_host', display_name: 'Game Host', description: 'Game Host相关功能管理', sort_order: 9 }
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

    console.log('✅ 权限模块初始化完成');

    // 2. 初始化权限项
    const permissions = [
      // 系统管理
      { module: 'system', name: 'view', display_name: '查看系统设置', key: 'system.view', sort_order: 1 },
      { module: 'system', name: 'manage', display_name: '系统管理', key: 'system.manage', sort_order: 2 },
      { module: 'system', name: 'permission', display_name: '权限管理', key: 'system.permission', sort_order: 3 },
      { module: 'system', name: 'role', display_name: '角色管理', key: 'system.role', sort_order: 4 },

      // 公司管理
      { module: 'company', name: 'view', display_name: '查看公司', key: 'company.view', sort_order: 1 },
      { module: 'company', name: 'create', display_name: '创建公司', key: 'company.create', sort_order: 2 },
      { module: 'company', name: 'edit', display_name: '编辑公司', key: 'company.edit', sort_order: 3 },
      { module: 'company', name: 'delete', display_name: '删除公司', key: 'company.delete', sort_order: 4 },
      { module: 'company', name: 'manage', display_name: '公司管理', key: 'company.manage', sort_order: 5 },

      // 用户管理
      { module: 'user', name: 'view', display_name: '查看用户', key: 'user.view', sort_order: 1 },
      { module: 'user', name: 'create', display_name: '创建用户', key: 'user.create', sort_order: 2 },
      { module: 'user', name: 'edit', display_name: '编辑用户', key: 'user.edit', sort_order: 3 },
      { module: 'user', name: 'delete', display_name: '删除用户', key: 'user.delete', sort_order: 4 },
      { module: 'user', name: 'manage', display_name: '用户管理', key: 'user.manage', sort_order: 5 },

      // 门店管理
      { module: 'store', name: 'view', display_name: '查看门店', key: 'store.view', sort_order: 1 },
      { module: 'store', name: 'create', display_name: '创建门店', key: 'store.create', sort_order: 2 },
      { module: 'store', name: 'edit', display_name: '编辑门店', key: 'store.edit', sort_order: 3 },
      { module: 'store', name: 'delete', display_name: '删除门店', key: 'store.delete', sort_order: 4 },
      { module: 'store', name: 'manage', display_name: '门店管理', key: 'store.manage', sort_order: 5 },

      // 剧本管理
      { module: 'script', name: 'view', display_name: '查看剧本', key: 'script.view', sort_order: 1 },
      { module: 'script', name: 'create', display_name: '创建剧本', key: 'script.create', sort_order: 2 },
      { module: 'script', name: 'edit', display_name: '编辑剧本', key: 'script.edit', sort_order: 3 },
      { module: 'script', name: 'delete', display_name: '删除剧本', key: 'script.delete', sort_order: 4 },
      { module: 'script', name: 'manage', display_name: '剧本管理', key: 'script.manage', sort_order: 5 },

      // 密室管理
      { module: 'escape_room', name: 'view', display_name: '查看密室', key: 'escape_room.view', sort_order: 1 },
      { module: 'escape_room', name: 'create', display_name: '创建密室', key: 'escape_room.create', sort_order: 2 },
      { module: 'escape_room', name: 'edit', display_name: '编辑密室', key: 'escape_room.edit', sort_order: 3 },
      { module: 'escape_room', name: 'delete', display_name: '删除密室', key: 'escape_room.delete', sort_order: 4 },
      { module: 'escape_room', name: 'manage', display_name: '密室管理', key: 'escape_room.manage', sort_order: 5 },

      // 房间管理
      { module: 'room', name: 'view', display_name: '查看房间', key: 'room.view', sort_order: 1 },
      { module: 'room', name: 'create', display_name: '创建房间', key: 'room.create', sort_order: 2 },
      { module: 'room', name: 'edit', display_name: '编辑房间', key: 'room.edit', sort_order: 3 },
      { module: 'room', name: 'delete', display_name: '删除房间', key: 'room.delete', sort_order: 4 },
      { module: 'room', name: 'manage', display_name: '房间管理', key: 'room.manage', sort_order: 5 },

      // 订单管理
      { module: 'order', name: 'view', display_name: '查看订单', key: 'order.view', sort_order: 1 },
      { module: 'order', name: 'create', display_name: '创建订单', key: 'order.create', sort_order: 2 },
      { module: 'order', name: 'edit', display_name: '编辑订单', key: 'order.edit', sort_order: 3 },
      { module: 'order', name: 'delete', display_name: '删除订单', key: 'order.delete', sort_order: 4 },
      { module: 'order', name: 'manage', display_name: '订单管理', key: 'order.manage', sort_order: 5 },

      // Game Host
      { module: 'game_host', name: 'view', display_name: '查看Game Host订单', key: 'game_host.view', sort_order: 1 },
      { module: 'game_host', name: 'start', display_name: '开始游戏', key: 'game_host.start', sort_order: 2 },
      { module: 'game_host', name: 'complete', display_name: '完成游戏', key: 'game_host.complete', sort_order: 3 },
      { module: 'game_host', name: 'update', display_name: '更新订单信息', key: 'game_host.update', sort_order: 4 },
      { module: 'game_host', name: 'manage', display_name: 'Game Host管理', key: 'game_host.manage', sort_order: 5 }
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
          INSERT INTO permissions (module_id, name, display_name, permission_key, sort_order)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (permission_key) DO UPDATE SET
            display_name = EXCLUDED.display_name,
            sort_order = EXCLUDED.sort_order
        `, [moduleId, perm.name, perm.display_name, perm.key, perm.sort_order]);
      }
    }

    console.log('✅ 权限项初始化完成');

    // 3. 确保超级管理员角色有所有权限
    const superadminRole = await client.query(`
      SELECT id FROM roles WHERE name = 'superadmin' AND is_system_role = true
    `);

    if (superadminRole.rows.length > 0) {
      const roleId = superadminRole.rows[0].id;
      
      // 清除现有权限分配
      await client.query('DELETE FROM role_permission_assignments WHERE role_id = $1', [roleId]);
      
      // 分配所有权限
      const allPermissions = await client.query('SELECT id FROM permissions WHERE is_active = true');
      for (const perm of allPermissions.rows) {
        await client.query(`
          INSERT INTO role_permission_assignments (role_id, permission_id, granted)
          VALUES ($1, $2, true)
        `, [roleId, perm.id]);
      }
      
      console.log(`✅ 为超级管理员角色分配了 ${allPermissions.rows.length} 个权限`);
    }

    // 4. 显示统计信息
    const moduleCount = await client.query('SELECT COUNT(*) as count FROM permission_modules WHERE is_active = true');
    const permissionCount = await client.query('SELECT COUNT(*) as count FROM permissions WHERE is_active = true');
    const roleCount = await client.query('SELECT COUNT(*) as count FROM roles WHERE is_active = true');
    
    console.log('📊 权限数据统计:');
    console.log(`   权限模块: ${moduleCount.rows[0].count}`);
    console.log(`   权限项: ${permissionCount.rows[0].count}`);
    console.log(`   角色: ${roleCount.rows[0].count}`);
    
    console.log('✅ 权限数据初始化完成');
    
  } catch (error) {
    console.error('❌ 权限数据初始化失败:', error);
    throw error;
  } finally {
    client.release();
  }
}

// 如果直接运行此文件，执行初始化
if (require.main === module) {
  (async () => {
    try {
      await initPermissionData();
      console.log('🎉 权限数据初始化成功');
      process.exit(0);
    } catch (error) {
      console.error('💥 权限数据初始化失败:', error);
      process.exit(1);
    }
  })();
}

module.exports = { initPermissionData }; 