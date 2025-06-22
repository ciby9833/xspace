// 初始化平台管理员角色和权限 node src/database/init-platform-admin.js
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'xspace',
  password: 'postgres',
  port: 5432,
});

const initPlatformAdmin = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🔄 开始初始化平台管理员角色和权限...');
    await client.query('BEGIN');

    // 1. 创建平台管理员角色
    const platformAdminRole = {
      name: 'superadmin',
      display_name: '平台管理员',
      description: '平台级管理员，拥有所有权限'
    };

    const roleResult = await client.query(`
      INSERT INTO roles (company_id, name, display_name, description, is_system_role)
      VALUES (NULL, $1, $2, $3, true)
      ON CONFLICT (company_id, name) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        description = EXCLUDED.description
      RETURNING id
    `, [platformAdminRole.name, platformAdminRole.display_name, platformAdminRole.description]);

    const roleId = roleResult.rows[0].id;
    console.log('✅ 创建平台管理员角色成功');

    // 2. 获取所有权限
    const permissionsResult = await client.query(`
      SELECT id FROM permissions WHERE is_active = true
    `);
    const permissionIds = permissionsResult.rows.map(row => row.id);

    // 3. 清除现有权限分配
    await client.query('DELETE FROM role_permission_assignments WHERE role_id = $1', [roleId]);

    // 4. 分配所有权限给平台管理员
    if (permissionIds.length > 0) {
      const values = permissionIds.map((permId, index) => 
        `($1, $${index + 2}, true)`
      ).join(',');

      await client.query(`
        INSERT INTO role_permission_assignments (role_id, permission_id, granted)
        VALUES ${values}
      `, [roleId, ...permissionIds]);
    }

    console.log(`✅ 已分配 ${permissionIds.length} 个权限给平台管理员`);

    // 5. 更新平台管理员用户
    await client.query(`
      UPDATE users 
      SET role_id = $1, role = 'superadmin'
      WHERE email = 'admin@test.com'
    `, [roleId]);

    console.log('✅ 更新平台管理员用户成功');

    await client.query('COMMIT');
    console.log('🎉 平台管理员角色和权限初始化完成');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ 初始化失败:', error);
    throw error;
  } finally {
    client.release();
  }
};

// 如果直接运行此文件，执行初始化
if (require.main === module) {
  (async () => {
    try {
      await initPlatformAdmin();
      process.exit(0);
    } catch (error) {
      console.error('💥 初始化失败:', error);
      process.exit(1);
    }
  })();
}

module.exports = { initPlatformAdmin }; 