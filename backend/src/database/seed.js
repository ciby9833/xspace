// 初始化测试数据 - 需要先运行 npm run migrate 创建表，然后运行   node src/database/seed.js   
require('dotenv').config();

const pool = require('./connection');
const bcrypt = require('bcryptjs');

const seedData = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🌱 开始初始化测试数据...');
    
    // 1. 创建测试公司
    const companyResult = await client.query(`
      INSERT INTO company (name, type, contact_name, contact_phone, contact_email) 
      VALUES ('测试公司', '直营', '测试联系人', '+62-812-3456-7890', 'test@company.com')
      ON CONFLICT DO NOTHING
      RETURNING id
    `);
    
    let companyId;
    if (companyResult.rows.length > 0) {
      companyId = companyResult.rows[0].id;
      console.log('✅ 创建测试公司成功');
    } else {
      // 如果公司已存在，获取其ID
      const existingCompany = await client.query(`
        SELECT id FROM company WHERE name = '测试公司'
      `);
      companyId = existingCompany.rows[0].id;
      console.log('⚠️  测试公司已存在，跳过创建');
    }
    
    // 2. 创建测试门店
    const storeResult = await client.query(`
      INSERT INTO store (company_id, name, address, business_hours, is_active) 
      VALUES ($1, '测试门店', '测试地址123号', '{"open": "09:00", "close": "22:00"}', true)
      ON CONFLICT DO NOTHING
      RETURNING id
    `, [companyId]);
    
    let storeId = null;
    if (storeResult.rows.length > 0) {
      storeId = storeResult.rows[0].id;
      console.log('✅ 创建测试门店成功');
    } else {
      const existingStore = await client.query(`
        SELECT id FROM store WHERE company_id = $1 AND name = '测试门店'
      `, [companyId]);
      if (existingStore.rows.length > 0) {
        storeId = existingStore.rows[0].id;
        console.log('⚠️  测试门店已存在，跳过创建');
      }
    }
    
    // 3. 创建公司级系统角色
    const companyRoles = [
      { name: 'admin', display_name: '管理员', description: '公司管理员，拥有本公司所有权限' },
      { name: 'supervisor', display_name: 'SPV', description: '主管，拥有大部分权限' },
      { name: 'manager', display_name: '店长', description: '门店经理，管理门店相关业务' },
      { name: 'service', display_name: '客服', description: '客服人员，处理订单和客户服务' },
      { name: 'host', display_name: '主持人', description: '游戏主持人，查看分配的剧本和订单' }
    ];

    const roleIds = {};
    for (const role of companyRoles) {
      const roleResult = await client.query(`
        INSERT INTO roles (company_id, name, display_name, description, is_system_role)
        VALUES ($1, $2, $3, $4, true)
        ON CONFLICT (company_id, name) DO UPDATE SET
          display_name = EXCLUDED.display_name,
          description = EXCLUDED.description
        RETURNING id
      `, [companyId, role.name, role.display_name, role.description]);
      
      roleIds[role.name] = roleResult.rows[0].id;
      console.log(`✅ 创建角色: ${role.display_name}`);
    }
    
    // 4. 创建测试用户（密码都是 password）
    const passwordHash = await bcrypt.hash('password', 10);
    
    const testUsers = [
      {
        email: 'admin@test.com',
        name: '平台管理员',
        role: 'superadmin',  // 更新为 superadmin
        company_id: null,    // 平台管理员不挂靠任何公司
        role_id: null,       // 角色ID将在 init-platform-admin.js 中设置
        stores: []           // 平台管理员不关联任何门店
      },
      {
        email: 'supervisor@test.com',
        name: '主管',
        role: 'supervisor',
        company_id: companyId,
        role_id: roleIds['supervisor'],
        stores: [storeId]
      },
      {
        email: 'manager@test.com',
        name: '门店店长', 
        role: 'manager',
        company_id: companyId,
        role_id: roleIds['manager'],
        stores: [storeId]
      },
      {
        email: 'service@test.com',
        name: '客服人员',
        role: 'service',
        company_id: companyId,
        role_id: roleIds['service'],
        stores: [storeId]
      },
      {
        email: 'host@test.com',
        name: '主持人',
        role: 'host',
        company_id: companyId, 
        role_id: roleIds['host'],
        stores: [storeId]
      }
    ];
    
    for (const userData of testUsers) {
      try {
        // 创建用户
        const userResult = await client.query(`
          INSERT INTO users (
            company_id, 
            email, 
            name, 
            password_hash, 
            role,
            role_id,
            is_active
          ) 
          VALUES ($1, $2, $3, $4, $5, $6, true)
          ON CONFLICT (email) DO UPDATE SET
            name = EXCLUDED.name,
            role = EXCLUDED.role,
            role_id = EXCLUDED.role_id
          RETURNING id
        `, [
          userData.company_id, 
          userData.email, 
          userData.name, 
          passwordHash, 
          userData.role, 
          userData.role_id
        ]);

        const userId = userResult.rows[0].id;

        // 创建用户-门店关联（如果不是平台管理员）
        if (userData.stores.length > 0) {
          for (const storeId of userData.stores) {
            await client.query(`
              INSERT INTO user_stores (user_id, store_id, is_primary)
              VALUES ($1, $2, true)
              ON CONFLICT (user_id, store_id) DO NOTHING
            `, [userId, storeId]);
          }
        }

        console.log(`✅ 创建用户: ${userData.email} (${userData.role})`);
      } catch (error) {
        console.log(`⚠️  用户 ${userData.email} 创建失败:`, error.message);
      }
    }
    
    console.log('\n🎉 测试数据初始化完成！');
    console.log('\n📋 可用的测试账号：');
    console.log('├── admin@test.com      (平台管理员) - 密码: password');
    console.log('├── supervisor@test.com (主管)      - 密码: password');
    console.log('├── manager@test.com    (店长)      - 密码: password');
    console.log('├── service@test.com    (客服)      - 密码: password');
    console.log('└── host@test.com       (主持人)    - 密码: password');
    console.log('\n🔗 前端登录地址: http://localhost:5173/login');
    console.log('\n⚠️  请运行 node src/database/init-platform-admin.js 初始化平台管理员权限');
    
  } catch (error) {
    console.error('❌ 初始化测试数据失败:', error);
    throw error;
  } finally {
    client.release();
  }
};

// 如果直接运行此文件，执行数据初始化
if (require.main === module) {  
  seedData()
    .then(() => {
      console.log('✨ 数据初始化完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 数据初始化失败:', error);
      process.exit(1);
    });
}

module.exports = { seedData }; 