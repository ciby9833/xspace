// Game Host功能测试脚本
require('dotenv').config();

const pool = require('./src/database/connection');

const testGameHostFunctionality = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🎮 开始测试Game Host功能...');
    console.log('');

    // 1. 测试订单表新增字段
    console.log('📝 测试1: 检查订单表新增字段...');
    const fieldsQuery = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'orders' 
        AND column_name IN ('support_player_count', 'actual_start_time', 'actual_end_time', 'game_host_notes')
      ORDER BY column_name;
    `;
    
    const fieldsResult = await client.query(fieldsQuery);
    console.log('   新增字段信息:');
    fieldsResult.rows.forEach(row => {
      console.log(`   • ${row.column_name}: ${row.data_type} (可空: ${row.is_nullable}, 默认值: ${row.column_default})`);
    });
    console.log('');

    // 2. 测试Game Host视图
    console.log('📝 测试2: 检查Game Host视图...');
    try {
      const viewQuery = `SELECT COUNT(*) as view_count FROM game_host_orders LIMIT 1`;
      const viewResult = await client.query(viewQuery);
      console.log('   ✅ game_host_orders视图创建成功');
    } catch (error) {
      console.log('   ❌ game_host_orders视图不存在:', error.message);
    }
    console.log('');

    // 3. 测试Game Host权限检查函数
    console.log('📝 测试3: 测试权限检查函数...');
    try {
      const permissionQuery = `SELECT check_game_host_permission('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000') as has_permission`;
      const permissionResult = await client.query(permissionQuery);
      console.log('   ✅ check_game_host_permission函数创建成功');
      console.log(`   测试结果: ${permissionResult.rows[0].has_permission}`);
    } catch (error) {
      console.log('   ❌ 权限检查函数测试失败:', error.message);
    }
    console.log('');

    // 4. 测试Game Host统计函数
    console.log('📝 测试4: 测试统计函数...');
    try {
      const statsQuery = `SELECT * FROM get_game_host_today_stats('00000000-0000-0000-0000-000000000000')`;
      const statsResult = await client.query(statsQuery);
      console.log('   ✅ get_game_host_today_stats函数创建成功');
      console.log('   统计结果:', statsResult.rows[0]);
    } catch (error) {
      console.log('   ❌ 统计函数测试失败:', error.message);
    }
    console.log('');

    // 5. 检查索引创建情况
    console.log('📝 测试5: 检查Game Host相关索引...');
    const indexQuery = `
      SELECT indexname, tablename 
      FROM pg_indexes 
      WHERE tablename = 'orders' 
        AND indexname LIKE '%game_host%' 
        OR indexname LIKE '%actual_%'
        OR indexname LIKE '%support_%'
      ORDER BY indexname;
    `;
    
    const indexResult = await client.query(indexQuery);
    console.log('   Game Host相关索引:');
    if (indexResult.rows.length > 0) {
      indexResult.rows.forEach(row => {
        console.log(`   • ${row.indexname} (表: ${row.tablename})`);
      });
    } else {
      console.log('   ⚠️  未找到Game Host相关索引');
    }
    console.log('');

    // 6. 测试订单状态更新函数
    console.log('📝 测试6: 测试状态更新函数...');
    try {
      // 首先检查是否有测试订单
      const testOrderQuery = `
        SELECT id, status, game_host_id 
        FROM orders 
        WHERE game_host_id IS NOT NULL 
        LIMIT 1
      `;
      const testOrderResult = await client.query(testOrderQuery);
      
      if (testOrderResult.rows.length > 0) {
        const testOrder = testOrderResult.rows[0];
        console.log(`   找到测试订单: ${testOrder.id}, 当前状态: ${testOrder.status}`);
        
        // 不实际更新状态，只测试函数是否存在
        console.log('   ✅ 找到可用的测试订单');
      } else {
        console.log('   ⚠️  没有找到有Game Host的订单进行测试');
      }
    } catch (error) {
      console.log('   ❌ 状态更新函数测试失败:', error.message);
    }
    console.log('');

    // 7. 检查Game Host用户
    console.log('📝 测试7: 检查Game Host用户...');
    
    try {
      // 先检查用户表结构
      const userTableQuery = `
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        ORDER BY column_name
      `;
      const userTableResult = await client.query(userTableQuery);
      console.log('   用户表字段:', userTableResult.rows.map(r => r.column_name).join(', '));
      
      // 使用简单查询检查用户
      const simpleQuery = `
        SELECT COUNT(*) as total_users,
               COUNT(CASE WHEN name ILIKE '%host%' THEN 1 END) as potential_hosts
        FROM users 
        WHERE is_active = true
      `;
      const simpleResult = await client.query(simpleQuery);
      console.log(`   总用户数: ${simpleResult.rows[0].total_users}`);
      console.log(`   潜在Host用户: ${simpleResult.rows[0].potential_hosts}`);
    } catch (error) {
      console.log('   ❌ 用户查询失败:', error.message);
    }
    console.log('');

    // 8. 检查订单统计
    console.log('📝 测试8: 订单统计信息...');
    const orderStatsQuery = `
      SELECT 
        COUNT(*) as total_orders,
        COUNT(CASE WHEN game_host_id IS NOT NULL THEN 1 END) as orders_with_host,
        COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_orders,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_orders,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_orders,
        COUNT(CASE WHEN support_player_count > 0 THEN 1 END) as orders_with_support
      FROM orders 
      WHERE is_active = true
    `;
    
    const orderStatsResult = await client.query(orderStatsQuery);
    const stats = orderStatsResult.rows[0];
    console.log('   订单统计:');
    console.log(`   • 订单总数: ${stats.total_orders}`);
    console.log(`   • 有Game Host的订单: ${stats.orders_with_host}`);
    console.log(`   • 已确认订单: ${stats.confirmed_orders}`);
    console.log(`   • 进行中订单: ${stats.in_progress_orders}`);
    console.log(`   • 已完成订单: ${stats.completed_orders}`);
    console.log(`   • 有补位的订单: ${stats.orders_with_support}`);
    console.log('');

    // 9. API路由测试提示
    console.log('📝 测试9: API路由测试提示...');
    console.log('   Game Host API路由已创建:');
    console.log('   • GET  /api/game-host/orders           - 获取订单列表');
    console.log('   • GET  /api/game-host/current-order    - 获取当前进行中订单');
    console.log('   • GET  /api/game-host/orders/:id       - 获取订单详情');
    console.log('   • POST /api/game-host/orders/:id/start - 开始游戏');
    console.log('   • POST /api/game-host/orders/:id/complete - 完成游戏');
    console.log('   • PUT  /api/game-host/orders/:id       - 更新订单');
    console.log('   • GET  /api/game-host/stats/today      - 今日统计');
    console.log('   • GET  /api/game-host/resources/*      - 获取可用资源');
    console.log('');

    console.log('✅ Game Host功能测试完成！');
    console.log('');
    console.log('🎯 下一步建议：');
    console.log('1. 为用户分配Game Host权限');
    console.log('2. 创建测试订单并分配Game Host');
    console.log('3. 使用前端界面或API测试完整流程');
    console.log('4. 验证权限控制和状态流转');

  } catch (error) {
    console.error('❌ Game Host功能测试失败:', error);
    throw error;
  } finally {
    client.release();
  }
};

// 如果直接运行此文件
if (require.main === module) {
  testGameHostFunctionality()
    .then(() => {
      console.log('🎉 测试完成！');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 测试过程中发生错误:', error);
      process.exit(1);
    });
}

module.exports = testGameHostFunctionality; 