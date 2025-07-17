// 初始化测试数据 - 需要先运行 npm run migrate 创建表，然后运行   node src/database/seed.js   
require('dotenv').config();

const pool = require('./connection');
const bcrypt = require('bcryptjs');

const seedData = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🌱 开始初始化平台账号...');
    
    // 1. 检查权限系统是否已初始化
    console.log('🔐 检查权限系统...');
    const permissionModulesExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'permission_modules'
      );
    `);

    if (!permissionModulesExists.rows[0].exists) {
      console.log('❌ 权限系统未初始化，请先运行 migrate-permissions-final.js');
      throw new Error('权限系统未初始化');
    }

    // 2. 检查超级管理员角色是否存在
    console.log('👑 检查超级管理员角色...');
    const superadminRoleExists = await client.query(`
      SELECT id FROM roles WHERE name = 'superadmin' AND role_level = 'platform'
    `);

    let superadminRoleId;
    if (superadminRoleExists.rows.length === 0) {
      console.log('❌ 超级管理员角色不存在，请先运行 migrate-permissions-final.js');
      throw new Error('超级管理员角色不存在');
    } else {
      superadminRoleId = superadminRoleExists.rows[0].id;
      console.log('✅ 超级管理员角色已存在');
    }

    // 3. 创建平台账号
    console.log('👤 创建平台账号...');
    const passwordHash = await bcrypt.hash('password', 10);
    
    const platformUserResult = await client.query(`
      INSERT INTO users (
        company_id, 
        email, 
        name, 
        password_hash, 
        role,
        role_id,
        account_level,
        is_active
      ) 
      VALUES (NULL, $1, $2, $3, $4, $5, $6, true)
      ON CONFLICT (email) DO UPDATE SET
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        role_id = EXCLUDED.role_id,
        account_level = EXCLUDED.account_level,
        updated_at = NOW()
      RETURNING id, email, name, role, account_level
    `, [
      'superadmin@super.com',
      '超级管理员',
      passwordHash,
      'superadmin',
      superadminRoleId,
      'platform'
    ]);

    const platformUser = platformUserResult.rows[0];
    console.log(`✅ 平台账号创建成功: ${platformUser.email}`);
    
    console.log('\n🎉 平台账号初始化完成！');
    console.log('\n📋 平台账号信息：');
    console.log(`├── 邮箱: ${platformUser.email}`);
    console.log(`├── 姓名: ${platformUser.name}`);
    console.log(`├── 角色: ${platformUser.role}`);
    console.log(`├── 账户级别: ${platformUser.account_level}`);
    console.log(`└── 密码: xiaotao4vip`);
    console.log('\n🔗 前端登录地址: http://localhost:5173/login');
    console.log('\n💡 提示：平台账号拥有所有权限，可以管理整个系统');
    
  } catch (error) {
    console.error('❌ 平台账号初始化失败:', error);
    throw error;
  } finally {
    client.release();
  }
};

// 如果直接运行此文件，执行数据初始化
if (require.main === module) {  
  seedData()
    .then(() => {
      console.log('✨ 平台账号初始化完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 平台账号初始化失败:', error);
      process.exit(1);
    });
}

module.exports = { seedData }; 