// 设置Game Host测试用户脚本
require('dotenv').config();

const pool = require('./src/database/connection');
const bcrypt = require('bcrypt');

const setupGameHostTestUser = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🔧 开始设置Game Host测试用户...');
    
    // 1. 获取第一个门店
    const stores = await client.query(`
      SELECT id, name FROM store WHERE is_active = true LIMIT 1
    `);
    
    if (stores.rows.length === 0) {
      console.log('❌ 没有找到可用的门店');
      return;
    }
    
    const store = stores.rows[0];
    console.log(`📍 使用门店: ${store.name}`);
    
    // 2. 检查是否已存在Game Host用户
    const existingGameHost = await client.query(`
      SELECT id, name, email FROM users 
      WHERE role = 'host' AND position = 'Game Host' AND is_active = true LIMIT 1
    `);
    
    let gameHostUser;
    
    if (existingGameHost.rows.length > 0) {
      gameHostUser = existingGameHost.rows[0];
      console.log(`✅ 找到现有Game Host用户: ${gameHostUser.name} (${gameHostUser.email})`);
    } else {
      // 3. 创建Game Host用户
      console.log('👤 创建新的Game Host用户...');
      
      const hashedPassword = await bcrypt.hash('password', 10);
      const gameHostData = {
        email: 'gamehost@test.com',
        name: 'Game Host测试用户',
        role: 'host',
        position: 'Game Host',
        account_level: 'store',
        store_id: store.id,
        password_hash: hashedPassword,
        is_active: true,
        timezone: 'Asia/Jakarta'
      };
      
      const insertResult = await client.query(`
        INSERT INTO users (email, name, role, position, account_level, store_id, password_hash, is_active, timezone, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
        RETURNING id, name, email
      `, [
        gameHostData.email,
        gameHostData.name,
        gameHostData.role,
        gameHostData.position,
        gameHostData.account_level,
        gameHostData.store_id,
        gameHostData.password_hash,
        gameHostData.is_active,
        gameHostData.timezone
      ]);
      
      gameHostUser = insertResult.rows[0];
      console.log(`✅ 创建Game Host用户成功: ${gameHostUser.name} (${gameHostUser.email})`);
      
      // 4. 添加用户门店关联
      await client.query(`
        INSERT INTO user_stores (user_id, store_id, created_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (user_id, store_id) DO NOTHING
      `, [gameHostUser.id, store.id]);
      
      console.log(`🏪 添加用户门店关联: ${gameHostUser.name} -> ${store.name}`);
    }
    
    // 5. 创建测试订单（如果没有的话）
    console.log('\n📋 检查测试订单...');
    
    const existingOrders = await client.query(`
      SELECT COUNT(*) as count FROM orders 
      WHERE game_host_id = $1 AND is_active = true
    `, [gameHostUser.id]);
    
    if (parseInt(existingOrders.rows[0].count) === 0) {
      console.log('📝 创建测试订单...');
      
      // 获取房间
      const rooms = await client.query(`
        SELECT id, name FROM rooms WHERE store_id = $1 AND is_active = true LIMIT 1
      `, [store.id]);
      
      if (rooms.rows.length > 0) {
        const room = rooms.rows[0];
        
        // 创建一个确认状态的订单
        await client.query(`
          INSERT INTO orders (
            order_type, order_date, weekday, start_time, end_time, duration,
            customer_name, customer_phone, player_count, support_player_count,
            language, internal_support, status, game_host_id, store_id, room_id,
            is_active, created_at, updated_at
          ) VALUES (
            '剧本杀', CURRENT_DATE, '星期四', '14:00:00', '16:00:00', 120,
            '测试客户1', '08123456789', 4, 0,
            'CN', false, 'confirmed', $1, $2, $3,
            true, NOW(), NOW()
          )
        `, [gameHostUser.id, store.id, room.id]);
        
        // 创建一个进行中的订单
        await client.query(`
          INSERT INTO orders (
            order_type, order_date, weekday, start_time, end_time, duration,
            customer_name, customer_phone, player_count, support_player_count,
            language, internal_support, status, game_host_id, store_id, room_id,
            actual_start_time, is_active, created_at, updated_at
          ) VALUES (
            '密室', CURRENT_DATE, '星期四', '16:30:00', '18:30:00', 120,
            '测试客户2', '08123456790', 6, 1,
            'CN', true, 'in_progress', $1, $2, $3,
            NOW() - INTERVAL '30 minutes', true, NOW(), NOW()
          )
        `, [gameHostUser.id, store.id, room.id]);
        
        console.log('✅ 创建测试订单成功');
      }
    } else {
      console.log(`ℹ️  已存在 ${existingOrders.rows[0].count} 个订单`);
    }
    
    // 6. 验证设置结果
    console.log('\n🔍 验证设置结果...');
    
    const verifyOrders = await client.query(`
      SELECT o.id, o.customer_name, o.order_type, o.status, r.name as room_name
      FROM orders o
      LEFT JOIN rooms r ON o.room_id = r.id
      WHERE o.game_host_id = $1 AND o.is_active = true
      ORDER BY o.created_at DESC
    `, [gameHostUser.id]);
    
    console.log(`📊 Game Host订单统计:`);
    console.log(`  - 总订单: ${verifyOrders.rows.length}`);
    verifyOrders.rows.forEach(order => {
      console.log(`  - ${order.customer_name} | ${order.order_type} | ${order.status} | 房间: ${order.room_name}`);
    });
    
    console.log('\n✅ Game Host测试用户设置完成！');
    console.log('\n📋 登录信息:');
    console.log(`  邮箱: gamehost@test.com`);
    console.log(`  密码: password`);
    console.log(`  角色: host`);
    console.log(`  职位: Game Host`);
    console.log(`  门店: ${store.name}`);
    
  } catch (error) {
    console.error('❌ 设置Game Host测试用户失败:', error);
  } finally {
    client.release();
  }
};

// 如果直接运行此文件
if (require.main === module) {
  setupGameHostTestUser()
    .then(() => {
      console.log('🎉 设置完成！');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 设置过程中发生错误:', error);
      process.exit(1);
    });
}

module.exports = setupGameHostTestUser; 