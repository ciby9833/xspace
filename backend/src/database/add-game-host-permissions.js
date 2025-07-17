// Game Host权限添加 - node src/database/add-game-host-permissions.js
require('dotenv').config();
const pool = require('./connection');

async function addGameHostPermissions() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 开始添加Game Host权限...');
    
    // 1. 添加Game Host管理模块
    const moduleResult = await client.query(`
      INSERT INTO permission_modules (name, display_name, description, sort_order)
      VALUES ('game_host', 'Game Host订单处理', 'Game Host订单处理相关功能管理', 9)
      ON CONFLICT (name) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        description = EXCLUDED.description,
        sort_order = EXCLUDED.sort_order
      RETURNING id
    `);
    
    const moduleId = moduleResult.rows[0].id;
    console.log('✅ Game Host管理模块已添加，ID:', moduleId);
    
    // 2. 添加Game Host权限项（与permissions.js配置保持一致）
    const permissions = [
      { name: 'view', display_name: '查看Game Host订单', key: 'game_host.view' },
      { name: 'start', display_name: '开始游戏', key: 'game_host.start' },
      { name: 'complete', display_name: '完成游戏', key: 'game_host.complete' },
      { name: 'update', display_name: '更新订单信息', key: 'game_host.update' },
      { name: 'manage', display_name: 'Game Host管理', key: 'game_host.manage' }
    ];
    
    for (const perm of permissions) {
      await client.query(`
        INSERT INTO permissions (module_id, name, display_name, permission_key)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (permission_key) DO UPDATE SET
          display_name = EXCLUDED.display_name
      `, [moduleId, perm.name, perm.display_name, perm.key]);
      
      console.log('✅ 权限已添加:', perm.key, '-', perm.display_name);
    }
    
    // 3. 为超级管理员角色分配Game Host权限
    const superadminRoles = await client.query(`
      SELECT id FROM roles WHERE name = 'superadmin' OR role_level = 'platform'
    `);
    
    if (superadminRoles.rows.length > 0) {
      const gameHostPermissions = await client.query(`
        SELECT id FROM permissions WHERE permission_key LIKE 'game_host.%'
      `);
      
      for (const role of superadminRoles.rows) {
        for (const permission of gameHostPermissions.rows) {
          await client.query(`
            INSERT INTO role_permission_assignments (role_id, permission_id, granted)
            VALUES ($1, $2, true)
            ON CONFLICT (role_id, permission_id) DO UPDATE SET
              granted = EXCLUDED.granted
          `, [role.id, permission.id]);
        }
      }
      
      console.log(`✅ 已为 ${superadminRoles.rows.length} 个超级管理员角色分配Game Host权限`);
    }
    
    // 4. 查找host角色并分配Game Host权限
    const hostRoles = await client.query(`
      SELECT id, name, display_name FROM roles 
      WHERE name = 'host' OR name ILIKE '%host%' OR display_name ILIKE '%主持%'
    `);
    
    if (hostRoles.rows.length > 0) {
      const gameHostPermissions = await client.query(`
        SELECT id FROM permissions WHERE permission_key LIKE 'game_host.%'
      `);
      
      for (const role of hostRoles.rows) {
        for (const permission of gameHostPermissions.rows) {
          await client.query(`
            INSERT INTO role_permission_assignments (role_id, permission_id, granted)
            VALUES ($1, $2, true)
            ON CONFLICT (role_id, permission_id) DO UPDATE SET
              granted = EXCLUDED.granted
          `, [role.id, permission.id]);
        }
        console.log(`✅ 已为角色 "${role.display_name}" 分配Game Host权限`);
      }
    } else {
      console.log('⚠️  未找到host相关角色，请手动为需要的角色分配Game Host权限');
    }
    
    // 5. 显示统计信息
    const stats = await client.query(`
      SELECT 
        pm.display_name as module_name,
        COUNT(p.id) as permission_count
      FROM permission_modules pm
      LEFT JOIN permissions p ON pm.id = p.module_id
      WHERE pm.name = 'game_host'
      GROUP BY pm.id, pm.display_name
    `);
    
    console.log('📊 Game Host权限统计:');
    for (const stat of stats.rows) {
      console.log(`   ${stat.module_name}: ${stat.permission_count}个权限`);
    }
    
    console.log('✅ Game Host权限添加完成');
    
  } catch (error) {
    console.error('❌ Game Host权限添加失败:', error);
    throw error;
  } finally {
    client.release();
  }
}

// 如果直接运行此文件，执行添加
if (require.main === module) {
  (async () => {
    try {
      await addGameHostPermissions();
      console.log('🎉 Game Host权限添加成功');
      process.exit(0);
    } catch (error) {
      console.error('💥 Game Host权限添加失败:', error);
      process.exit(1);
    }
  })();
}

module.exports = { addGameHostPermissions }; 