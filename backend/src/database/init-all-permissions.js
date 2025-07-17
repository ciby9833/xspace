// 统一权限初始化脚本 - node src/database/init-all-permissions.js
require('dotenv').config();
const pool = require('./connection');

async function initAllPermissions() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 开始初始化所有权限...');
    
    // 1. 添加权限模块
    const modules = [
      { name: 'system', display_name: '系统管理', description: '系统管理相关功能', sort_order: 1 },
      { name: 'company', display_name: '公司管理', description: '公司管理相关功能', sort_order: 2 },
      { name: 'user', display_name: '用户管理', description: '用户管理相关功能', sort_order: 3 },
      { name: 'store', display_name: '门店管理', description: '门店管理相关功能', sort_order: 4 },
      { name: 'script', display_name: '剧本管理', description: '剧本管理相关功能', sort_order: 5 },
      { name: 'escape_room', display_name: '密室管理', description: '密室管理相关功能', sort_order: 6 },
      { name: 'room', display_name: '房间管理', description: '房间管理相关功能', sort_order: 7 },
      { name: 'order', display_name: '订单管理', description: '订单管理相关功能', sort_order: 8 },
      { name: 'game_host', display_name: 'Game Host', description: 'Game Host相关功能', sort_order: 9 }
    ];
    
    const moduleIds = {};
    
    for (const module of modules) {
      const result = await client.query(`
        INSERT INTO permission_modules (name, display_name, description, sort_order)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (name) DO UPDATE SET
          display_name = EXCLUDED.display_name,
          description = EXCLUDED.description,
          sort_order = EXCLUDED.sort_order
        RETURNING id
      `, [module.name, module.display_name, module.description, module.sort_order]);
      
      moduleIds[module.name] = result.rows[0].id;
      console.log(`✅ 模块已添加: ${module.display_name}`);
    }
    
    // 2. 添加权限项
    const permissions = [
      // 系统管理
      { module: 'system', name: 'view', display_name: '查看系统信息', key: 'system.view' },
      { module: 'system', name: 'manage', display_name: '系统管理', key: 'system.manage' },
      { module: 'system', name: 'permission', display_name: '权限管理', key: 'system.permission' },
      { module: 'system', name: 'role', display_name: '角色管理', key: 'system.role' },
      
      // 公司管理
      { module: 'company', name: 'view', display_name: '查看公司', key: 'company.view' },
      { module: 'company', name: 'create', display_name: '创建公司', key: 'company.create' },
      { module: 'company', name: 'edit', display_name: '编辑公司', key: 'company.edit' },
      { module: 'company', name: 'delete', display_name: '删除公司', key: 'company.delete' },
      { module: 'company', name: 'manage', display_name: '公司管理', key: 'company.manage' },
      
      // 用户管理
      { module: 'user', name: 'view', display_name: '查看用户', key: 'user.view' },
      { module: 'user', name: 'create', display_name: '创建用户', key: 'user.create' },
      { module: 'user', name: 'edit', display_name: '编辑用户', key: 'user.edit' },
      { module: 'user', name: 'delete', display_name: '删除用户', key: 'user.delete' },
      { module: 'user', name: 'manage', display_name: '用户管理', key: 'user.manage' },
      
      // 门店管理
      { module: 'store', name: 'view', display_name: '查看门店', key: 'store.view' },
      { module: 'store', name: 'create', display_name: '创建门店', key: 'store.create' },
      { module: 'store', name: 'edit', display_name: '编辑门店', key: 'store.edit' },
      { module: 'store', name: 'delete', display_name: '删除门店', key: 'store.delete' },
      { module: 'store', name: 'manage', display_name: '门店管理', key: 'store.manage' },
      
      // 剧本管理
      { module: 'script', name: 'view', display_name: '查看剧本', key: 'script.view' },
      { module: 'script', name: 'create', display_name: '创建剧本', key: 'script.create' },
      { module: 'script', name: 'edit', display_name: '编辑剧本', key: 'script.edit' },
      { module: 'script', name: 'delete', display_name: '删除剧本', key: 'script.delete' },
      { module: 'script', name: 'manage', display_name: '剧本管理', key: 'script.manage' },
      
      // 密室管理
      { module: 'escape_room', name: 'view', display_name: '查看密室', key: 'escape_room.view' },
      { module: 'escape_room', name: 'create', display_name: '创建密室', key: 'escape_room.create' },
      { module: 'escape_room', name: 'edit', display_name: '编辑密室', key: 'escape_room.edit' },
      { module: 'escape_room', name: 'delete', display_name: '删除密室', key: 'escape_room.delete' },
      { module: 'escape_room', name: 'manage', display_name: '密室管理', key: 'escape_room.manage' },
      
      // 房间管理
      { module: 'room', name: 'view', display_name: '查看房间', key: 'room.view' },
      { module: 'room', name: 'create', display_name: '创建房间', key: 'room.create' },
      { module: 'room', name: 'edit', display_name: '编辑房间', key: 'room.edit' },
      { module: 'room', name: 'delete', display_name: '删除房间', key: 'room.delete' },
      { module: 'room', name: 'manage', display_name: '房间管理', key: 'room.manage' },
      
      // 订单管理
      { module: 'order', name: 'view', display_name: '查看订单', key: 'order.view' },
      { module: 'order', name: 'create', display_name: '创建订单', key: 'order.create' },
      { module: 'order', name: 'edit', display_name: '编辑订单', key: 'order.edit' },
      { module: 'order', name: 'delete', display_name: '删除订单', key: 'order.delete' },
      { module: 'order', name: 'assign', display_name: '分配订单', key: 'order.assign' },
      { module: 'order', name: 'manage', display_name: '订单管理', key: 'order.manage' },
      
      // Game Host
      { module: 'game_host', name: 'view', display_name: '查看Game Host订单', key: 'game_host.view' },
      { module: 'game_host', name: 'start', display_name: '开始游戏', key: 'game_host.start' },
      { module: 'game_host', name: 'complete', display_name: '完成游戏', key: 'game_host.complete' },
      { module: 'game_host', name: 'update', display_name: '更新订单信息', key: 'game_host.update' },
      { module: 'game_host', name: 'manage', display_name: 'Game Host管理', key: 'game_host.manage' }
    ];
    
    for (const perm of permissions) {
      await client.query(`
        INSERT INTO permissions (module_id, name, display_name, permission_key)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (permission_key) DO UPDATE SET
          display_name = EXCLUDED.display_name
      `, [moduleIds[perm.module], perm.name, perm.display_name, perm.key]);
      
      console.log(`✅ 权限已添加: ${perm.key} - ${perm.display_name}`);
    }
    
    // 3. 为超级管理员角色分配所有权限
    const superadminRoles = await client.query(`
      SELECT id FROM roles WHERE name = 'superadmin' OR role_level = 'platform'
    `);
    
    if (superadminRoles.rows.length > 0) {
      const allPermissions = await client.query(`
        SELECT id FROM permissions WHERE is_active = true
      `);
      
      for (const role of superadminRoles.rows) {
        for (const perm of allPermissions.rows) {
          await client.query(`
            INSERT INTO role_permission_assignments (role_id, permission_id, granted)
            VALUES ($1, $2, true)
            ON CONFLICT (role_id, permission_id) DO UPDATE SET
              granted = EXCLUDED.granted
          `, [role.id, perm.id]);
        }
      }
      
      console.log(`✅ 已为 ${superadminRoles.rows.length} 个超级管理员角色分配所有权限`);
    }
    
    // 4. 验证权限添加结果
    const stats = await client.query(`
      SELECT 
        pm.display_name as module_name,
        COUNT(p.id) as permission_count
      FROM permission_modules pm
      LEFT JOIN permissions p ON pm.id = p.module_id
      GROUP BY pm.id, pm.display_name
      ORDER BY pm.sort_order
    `);
    
    console.log('📊 权限统计:');
    for (const stat of stats.rows) {
      console.log(`   ${stat.module_name}: ${stat.permission_count}个权限`);
    }
    
    console.log('✅ 所有权限初始化完成');
    
  } catch (error) {
    console.error('❌ 权限初始化失败:', error);
    throw error;
  } finally {
    client.release();
  }
}

// 执行脚本
(async () => {
  try {
    await initAllPermissions();
    console.log('🎉 权限初始化成功');
    process.exit(0);
  } catch (error) {
    console.error('💥 权限初始化失败:', error);
    process.exit(1);
  }
})(); 