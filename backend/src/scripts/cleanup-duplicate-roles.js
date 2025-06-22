const pool = require('../database/connection');

const cleanupDuplicateRoles = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🧹 开始清理重复角色...');
    
    // 1. 查看当前角色情况
    console.log('📊 当前角色情况：');
    const currentRoles = await client.query(`
      SELECT id, company_id, name, display_name, is_system_role 
      FROM roles 
      ORDER BY name, company_id NULLS FIRST
    `);
    
    console.table(currentRoles.rows);
    
    // 2. 查找重复的全局角色（company_id = NULL）
    const globalRoles = await client.query(`
      SELECT id, name, display_name 
      FROM roles 
      WHERE company_id IS NULL AND is_system_role = true
    `);
    
    if (globalRoles.rows.length > 0) {
      console.log(`🔍 发现 ${globalRoles.rows.length} 个全局角色，准备删除...`);
      
      for (const role of globalRoles.rows) {
        console.log(`🗑️  删除全局角色: ${role.display_name} (${role.name})`);
        
        // 删除角色权限分配
        await client.query(`
          DELETE FROM role_permission_assignments WHERE role_id = $1
        `, [role.id]);
        
        // 检查是否有用户使用此角色
        const userCount = await client.query(`
          SELECT COUNT(*) as count FROM users WHERE role_id = $1
        `, [role.id]);
        
        if (parseInt(userCount.rows[0].count) > 0) {
          console.log(`⚠️  角色 ${role.display_name} 正被 ${userCount.rows[0].count} 个用户使用，跳过删除`);
          continue;
        }
        
        // 删除角色
        await client.query(`DELETE FROM roles WHERE id = $1`, [role.id]);
        console.log(`✅ 成功删除全局角色: ${role.display_name}`);
      }
    } else {
      console.log('✅ 没有发现全局角色');
    }
    
    // 3. 检查清理后的结果
    console.log('🎯 清理后的角色情况：');
    const finalRoles = await client.query(`
      SELECT id, company_id, name, display_name, is_system_role 
      FROM roles 
      ORDER BY company_id, name
    `);
    
    console.table(finalRoles.rows);
    
    console.log('✅ 角色清理完成！');
    
  } catch (error) {
    console.error('❌ 角色清理失败:', error);
    throw error;
  } finally {
    client.release();
  }
};

// 如果直接运行此文件，执行清理
if (require.main === module) {
  (async () => {
    try {
      await cleanupDuplicateRoles();
      console.log('🎉 角色清理成功');
      process.exit(0);
    } catch (error) {
      console.error('💥 角色清理失败:', error);
      process.exit(1);
    }
  })();
}

module.exports = { cleanupDuplicateRoles }; 