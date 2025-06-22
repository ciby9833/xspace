const pool = require('./src/database/connection');

async function checkUserPermissions() {
  try {
    // 查询公司级用户的权限
    const query = `
      SELECT DISTINCT 
        u.id, u.name, u.email, u.account_level,
        p.permission_key
      FROM users u
      JOIN roles r ON u.role_id = r.id
      JOIN role_permission_assignments rpa ON r.id = rpa.role_id
      JOIN permissions p ON rpa.permission_id = p.id
      WHERE u.account_level = 'company' 
        AND rpa.granted = true 
        AND u.is_active = true 
        AND r.is_active = true 
        AND p.is_active = true
      ORDER BY u.name, p.permission_key
    `;
    
    const result = await pool.query(query);
    
    // 按用户分组显示权限
    const userPermissions = {};
    result.rows.forEach(row => {
      if (!userPermissions[row.id]) {
        userPermissions[row.id] = {
          name: row.name,
          email: row.email,
          account_level: row.account_level,
          permissions: []
        };
      }
      userPermissions[row.id].permissions.push(row.permission_key);
    });
    
    console.log('=== 公司级用户权限检查 ===');
    Object.values(userPermissions).forEach(user => {
      console.log(`\n用户: ${user.name} (${user.email})`);
      console.log(`账户级别: ${user.account_level}`);
      console.log(`权限数量: ${user.permissions.length}`);
      console.log(`是否有 system.role 权限: ${user.permissions.includes('system.role') ? '是' : '否'}`);
      console.log(`是否有 system.permission 权限: ${user.permissions.includes('system.permission') ? '是' : '否'}`);
      
      if (user.permissions.includes('system.role') || user.permissions.includes('system.permission')) {
        console.log('✅ 该用户应该可以管理权限');
      } else {
        console.log('❌ 该用户缺少权限管理权限');
      }
    });
    
    process.exit(0);
  } catch (error) {
    console.error('检查用户权限失败:', error);
    process.exit(1);
  }
}

checkUserPermissions(); 