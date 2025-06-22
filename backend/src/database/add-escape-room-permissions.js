require('dotenv').config();
const pool = require('./src/database/connection');

async function addEscapeRoomPermissions() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 开始添加密室权限...');
    
    // 1. 添加密室管理模块
    const moduleResult = await client.query(`
      INSERT INTO permission_modules (name, display_name, description, sort_order)
      VALUES ('escape_room', '密室管理', '密室相关功能管理', 7)
      ON CONFLICT (name) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        description = EXCLUDED.description,
        sort_order = EXCLUDED.sort_order
      RETURNING id
    `);
    
    const moduleId = moduleResult.rows[0].id;
    console.log('✅ 密室管理模块已添加，ID:', moduleId);
    
    // 2. 添加密室权限项
    const permissions = [
      { name: 'view', display_name: '查看密室', key: 'escape_room.view' },
      { name: 'create', display_name: '创建密室', key: 'escape_room.create' },
      { name: 'edit', display_name: '编辑密室', key: 'escape_room.edit' },
      { name: 'delete', display_name: '删除密室', key: 'escape_room.delete' },
      { name: 'manage', display_name: '密室管理', key: 'escape_room.manage' }
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
    
    // 3. 为超级管理员角色分配密室权限
    const superadminRoles = await client.query(`
      SELECT id FROM roles WHERE name = 'superadmin' OR role_level = 'platform'
    `);
    
    if (superadminRoles.rows.length > 0) {
      const escapeRoomPermissions = await client.query(`
        SELECT id FROM permissions WHERE permission_key LIKE 'escape_room%'
      `);
      
      for (const role of superadminRoles.rows) {
        for (const perm of escapeRoomPermissions.rows) {
          await client.query(`
            INSERT INTO role_permission_assignments (role_id, permission_id, granted)
            VALUES ($1, $2, true)
            ON CONFLICT (role_id, permission_id) DO UPDATE SET
              granted = EXCLUDED.granted
          `, [role.id, perm.id]);
        }
      }
      
      console.log('✅ 已为', superadminRoles.rows.length, '个超级管理员角色分配密室权限');
    }
    
    // 4. 为现有的公司管理员角色分配密室权限
    const companyRoles = await client.query(`
      SELECT DISTINCT r.id, r.name, r.display_name 
      FROM roles r 
      WHERE r.role_level = 'company' AND r.is_active = true
    `);
    
    if (companyRoles.rows.length > 0) {
      const escapeRoomPermissions = await client.query(`
        SELECT id FROM permissions WHERE permission_key LIKE 'escape_room%'
      `);
      
      for (const role of companyRoles.rows) {
        for (const perm of escapeRoomPermissions.rows) {
          await client.query(`
            INSERT INTO role_permission_assignments (role_id, permission_id, granted)
            VALUES ($1, $2, true)
            ON CONFLICT (role_id, permission_id) DO UPDATE SET
              granted = EXCLUDED.granted
          `, [role.id, perm.id]);
        }
      }
      
      console.log('✅ 已为', companyRoles.rows.length, '个公司级角色分配密室权限');
    }
    
    // 5. 验证权限添加结果
    const addedPermissions = await client.query(`
      SELECT p.permission_key, p.display_name, pm.display_name as module_name
      FROM permissions p
      JOIN permission_modules pm ON p.module_id = pm.id
      WHERE p.permission_key LIKE 'escape_room%'
      ORDER BY p.permission_key
    `);
    
    console.log('🔑 已添加的密室权限:');
    addedPermissions.rows.forEach(perm => {
      console.log(`  ✓ ${perm.permission_key} - ${perm.display_name}`);
    });
    
    console.log('✅ 密室权限添加完成');
    
  } catch (error) {
    console.error('❌ 添加密室权限失败:', error);
    throw error;
  } finally {
    client.release();
  }
}

// 执行脚本
(async () => {
  try {
    await addEscapeRoomPermissions();
    console.log('🎉 密室权限添加成功');
    process.exit(0);
  } catch (error) {
    console.error('💥 密室权限添加失败:', error);
    process.exit(1);
  }
})(); 