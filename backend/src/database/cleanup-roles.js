// 清理角色数据 node src/database/cleanup-roles.js  
require('dotenv').config();
const { Pool } = require('pg');

// 只保留这些角色
const ROLE_WHITELIST = [
  'superadmin', 'admin', 'Finance', 'Staff', 'service', 'manager', 'supervisor', 'Store Manager', 'Front Desk', 'Game Host', 'Franchisee'
];

// 使用现有的数据库连接配置
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'xspace',
  password: 'postgres',
  port: 5432,
});

const cleanupRoles = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🔄 开始清理角色数据...');
    
    await client.query('BEGIN');

    // 1. 备份现有角色数据
    await client.query(`
      CREATE TABLE IF NOT EXISTS roles_backup AS 
      SELECT * FROM roles
    `);

    // 2. 删除所有不在白名单内的角色
    await client.query(
      `DELETE FROM roles WHERE name NOT IN (${ROLE_WHITELIST.map((_, i) => `$${i+1}`).join(',')})`,
      ROLE_WHITELIST
    );

    // 3. 对于每个公司和平台，去重，只保留每个(name, company_id)最早的那条
    const dupQuery = `
      SELECT name, company_id, MIN(created_at) as min_created
      FROM roles
      GROUP BY name, company_id
      HAVING COUNT(*) > 1
    `;
    const dups = await client.query(dupQuery);
    for (const row of dups.rows) {
      // 查出要保留的id
      const keepRes = await client.query(
        `SELECT id FROM roles WHERE name = $1 AND company_id IS NOT DISTINCT FROM $2 AND created_at = $3 LIMIT 1`,
        [row.name, row.company_id, row.min_created]
      );
      const keep_id = keepRes.rows[0]?.id;
      if (!keep_id) continue;
      // 删除除keep_id外的所有同名同公司角色
      await client.query(
        `DELETE FROM roles WHERE name = $1 AND company_id IS NOT DISTINCT FROM $2 AND id <> $3`,
        [row.name, row.company_id, keep_id]
      );
    }

    await client.query('COMMIT');
    console.log('✅ 角色数据清理完成');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ 角色数据清理失败:', error);
    throw error;
  } finally {
    client.release();
  }
};

// 如果直接运行此文件，执行清理
if (require.main === module) {
  (async () => {
    try {
      await cleanupRoles();
      console.log('🎉 角色数据清理成功');
      process.exit(0);
    } catch (error) {
      console.error('💥 角色数据清理失败:', error);
      process.exit(1);
    }
  })();
}

module.exports = { cleanupRoles }; 