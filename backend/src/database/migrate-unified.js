// 统一迁移 - 账户级别系统
require('dotenv').config();

const pool = require('./connection');

const unifiedMigration = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🔄 开始统一数据库迁移...');
    
    // 确保UUID扩展存在
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    
    // 1. 检查并创建基础表
    console.log('📝 检查基础表...');
    
    // 1.1 创建company表 以创建公司
    await client.query(`
      CREATE TABLE IF NOT EXISTS company (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) CHECK (type IN ('直营', '加盟')) DEFAULT '加盟',
        contact_name VARCHAR(100),
        contact_phone VARCHAR(20),
        contact_email VARCHAR(255),
        status VARCHAR(20) DEFAULT 'active',
        timezone VARCHAR(50) DEFAULT 'Asia/Jakarta',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    
    // 1.2 创建store表 以创建门店
    await client.query(`
      CREATE TABLE IF NOT EXISTS store (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        company_id UUID REFERENCES company(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        address TEXT,
        business_hours JSONB,
        is_active BOOLEAN DEFAULT true,
        timezone VARCHAR(50) DEFAULT 'Asia/Jakarta',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    
    // 1.3 创建departments表 以创建部门
    await client.query(`
      CREATE TABLE IF NOT EXISTS departments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        company_id UUID REFERENCES company(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    
    // 1.4 创建users表（包含账户级别字段） 以创建用户
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        company_id UUID REFERENCES company(id) ON DELETE CASCADE,
        department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(20),
        password_hash VARCHAR(255),
        name VARCHAR(100),
        position VARCHAR(100) CHECK (position IN ('Store Manager', 'Customer Support', 'Game Host', 'Supervisor', 'Finance', 'Finance Manager', 'Person in Charge')),
        role VARCHAR(50) CHECK (role IN ('superadmin', 'admin', 'Finance', 'Staff', 'service', 'manager', 'host', 'supervisor')) NOT NULL,
        account_level VARCHAR(20) CHECK (account_level IN ('platform', 'company', 'store')) DEFAULT 'store',
        is_active BOOLEAN DEFAULT true,
        timezone VARCHAR(50) DEFAULT 'Asia/Jakarta',
        last_login_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    
    // 1.5 创建用户-门店关联表 以创建用户-门店关联
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_stores (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        store_id UUID REFERENCES store(id) ON DELETE CASCADE,
        is_primary BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, store_id)
      )
    `);
    
    // 1.6 创建房间表 以创建房间
    await client.query(`
      CREATE TABLE IF NOT EXISTS rooms (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        store_id UUID REFERENCES store(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        room_type VARCHAR(20) CHECK (room_type IN ('剧本杀', '密室', '混合')) NOT NULL,
        capacity INTEGER CHECK (capacity > 0) NOT NULL,
        status VARCHAR(20) CHECK (status IN ('正常', '维护', '关闭')) DEFAULT '正常',
        images JSONB DEFAULT '[]',
        description TEXT,
        equipment TEXT,
        notes TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    
    // 1.7 创建房间图片表（用于更好的图片管理） 以创建房间图片  
    await client.query(`
      CREATE TABLE IF NOT EXISTS room_images (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
        image_url VARCHAR(500) NOT NULL,
        image_name VARCHAR(255),
        sort_order INTEGER DEFAULT 0,
        is_primary BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    
    // 2. 检查并添加账户级别字段（如果不存在）
    console.log('📝 检查账户级别字段...');
    const accountLevelExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'account_level'
      );
    `);
    
    if (!accountLevelExists.rows[0].exists) {
      await client.query(`
        ALTER TABLE users 
        ADD COLUMN account_level VARCHAR(20) CHECK (account_level IN ('platform', 'company', 'store')) DEFAULT 'store'
      `);
      console.log('✅ 添加账户层级字段');
    }
    
    // 3. 检查并添加岗位字段（如果不存在）
    console.log('📝 检查岗位字段...');
    const positionExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'position'
      );
    `);
    
    if (!positionExists.rows[0].exists) {
      await client.query(`
        ALTER TABLE users 
        ADD COLUMN position VARCHAR(100) CHECK (position IN ('Store Manager', 'Customer Support', 'Game Host', 'Supervisor', 'Finance', 'Finance Manager', 'Person in Charge'))
      `);
      console.log('✅ 添加岗位字段');
    }
    
    // 4. 初始化现有用户的账户层级（基于角色）
    console.log('📝 初始化账户层级...');
    await client.query(`
      UPDATE users SET account_level = 
        CASE 
          WHEN role = 'superadmin' THEN 'platform'
          WHEN role = 'admin' THEN 'company'
          ELSE 'store'
        END
      WHERE account_level IS NULL OR account_level = 'store'
    `);
    console.log('✅ 初始化现有用户的账户层级');
    
    // 5. 确保门店级用户都有公司关联
    console.log('📝 检查门店级用户的公司关联...');
    const orphanUsers = await client.query(`
      SELECT id, name, email FROM users 
      WHERE account_level IN ('company', 'store') AND company_id IS NULL
    `);
    
    if (orphanUsers.rows.length > 0) {
      console.log(`⚠️  发现 ${orphanUsers.rows.length} 个用户没有公司关联:`);
      orphanUsers.rows.forEach(user => {
        console.log(`   - ${user.name} (${user.email})`);
      });
      console.log('请手动为这些用户分配公司ID');
    } else {
      console.log('✅ 所有用户都有正确的公司关联');
    }
    
    // 6. 创建基础索引
    console.log('📝 创建索引...');
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id)',
      'CREATE INDEX IF NOT EXISTS idx_users_account_level ON users(account_level)',
      'CREATE INDEX IF NOT EXISTS idx_user_stores_user_id ON user_stores(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_user_stores_store_id ON user_stores(store_id)',
      'CREATE INDEX IF NOT EXISTS idx_rooms_store_id ON rooms(store_id)',
      'CREATE INDEX IF NOT EXISTS idx_rooms_room_type ON rooms(room_type)',
      'CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status)',
      'CREATE INDEX IF NOT EXISTS idx_room_images_room_id ON room_images(room_id)',
      'CREATE INDEX IF NOT EXISTS idx_room_images_sort_order ON room_images(sort_order)'
    ];
    
    for (const indexSQL of indexes) {
      try {
        await client.query(indexSQL);
      } catch (error) {
        console.log(`⚠️  索引创建失败:`, error.message);
      }
    }
    
    // 7. 显示最终统计
    const stats = await client.query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN account_level = 'platform' THEN 1 END) as platform_users,
        COUNT(CASE WHEN account_level = 'company' THEN 1 END) as company_users,
        COUNT(CASE WHEN account_level = 'store' THEN 1 END) as store_users,
        COUNT(CASE WHEN account_level IN ('company', 'store') AND company_id IS NULL THEN 1 END) as orphan_users
      FROM users
    `);
    
    console.log('📊 迁移结果统计:');
    console.log(`   总用户数: ${stats.rows[0].total_users}`);
    console.log(`   平台级用户: ${stats.rows[0].platform_users}`);
    console.log(`   公司级用户: ${stats.rows[0].company_users}`);
    console.log(`   门店级用户: ${stats.rows[0].store_users}`);
    console.log(`   无公司关联用户: ${stats.rows[0].orphan_users}`);
    
    console.log('✅ 账户级别系统迁移完成');
    
  } catch (error) {
    console.error('❌ 统一迁移失败:', error);
    throw error;
  } finally {
    client.release();
  }
};

// 如果直接运行此文件，执行迁移
if (require.main === module) {
  (async () => {
    try {
      await unifiedMigration();
      console.log('🎉 统一数据库迁移成功');
      process.exit(0);
    } catch (error) {
      console.error('💥 统一数据库迁移失败:', error);
      process.exit(1);
    }
  })();
}

module.exports = { unifiedMigration }; 