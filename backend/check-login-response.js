const pool = require('./src/database/connection');

async function checkLoginResponse() {
  try {
    // 模拟登录查询，检查返回的用户信息和权限
    const query = `
      SELECT 
        u.id, u.name, u.email, u.account_level, u.company_id,
        c.name as company_name,
        r.name as role_name, r.display_name as role_display_name,
        array_agg(DISTINCT p.permission_key) as permissions
      FROM users u
      LEFT JOIN company c ON u.company_id = c.id
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN role_permission_assignments rpa ON r.id = rpa.role_id AND rpa.granted = true
      LEFT JOIN permissions p ON rpa.permission_id = p.id AND p.is_active = true
      WHERE u.email = 'w@x.com' AND u.is_active = true
      GROUP BY u.id, c.name, r.name, r.display_name
    `;
    
    const result = await pool.query(query);
    
    if (result.rows.length === 0) {
      console.log('❌ 用户不存在或未激活');
      return;
    }
    
    const user = result.rows[0];
    console.log('=== 登录响应数据检查 ===');
    console.log(`用户: ${user.name} (${user.email})`);
    console.log(`账户级别: ${user.account_level}`);
    console.log(`公司: ${user.company_name || '无'}`);
    console.log(`角色: ${user.role_display_name || user.role_name || '无'}`);
    console.log(`权限数量: ${user.permissions ? user.permissions.filter(p => p).length : 0}`);
    
    if (user.permissions && user.permissions.length > 0) {
      console.log('\n权限列表:');
      user.permissions.filter(p => p).forEach(permission => {
        console.log(`  - ${permission}`);
      });
      
      console.log(`\n关键权限检查:`);
      console.log(`  system.role: ${user.permissions.includes('system.role') ? '✅' : '❌'}`);
      console.log(`  system.permission: ${user.permissions.includes('system.permission') ? '✅' : '❌'}`);
      console.log(`  user.manage: ${user.permissions.includes('user.manage') ? '✅' : '❌'}`);
    } else {
      console.log('❌ 用户没有任何权限');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('检查登录响应失败:', error);
    process.exit(1);
  }
}

checkLoginResponse(); 