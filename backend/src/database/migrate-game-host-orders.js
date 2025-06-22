// Game Host订单处理功能数据库迁移 - node src/database/migrate-game-host-orders.js
require('dotenv').config();

const pool = require('./connection');

const migrateGameHostOrders = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🔄 开始Game Host订单处理功能迁移...');
    
    // 1. 为订单表添加Game Host专用字段
    console.log('📝 添加Game Host专用字段...');
    
    // 添加补位人数字段
    await client.query(`
      ALTER TABLE orders 
      ADD COLUMN IF NOT EXISTS support_player_count INTEGER DEFAULT 0 
      CHECK (support_player_count >= 0);
    `);
    
    // 添加Game Host开始时间字段（实际游戏开始时间）
    await client.query(`
      ALTER TABLE orders 
      ADD COLUMN IF NOT EXISTS actual_start_time TIMESTAMPTZ;
    `);
    
    // 添加Game Host结束时间字段（实际游戏结束时间）
    await client.query(`
      ALTER TABLE orders 
      ADD COLUMN IF NOT EXISTS actual_end_time TIMESTAMPTZ;
    `);
    
    // 添加Game Host备注字段
    await client.query(`
      ALTER TABLE orders 
      ADD COLUMN IF NOT EXISTS game_host_notes TEXT;
    `);

    // 2. 创建Game Host订单视图
    console.log('📝 创建Game Host订单视图...');
    await client.query(`
      CREATE OR REPLACE VIEW game_host_orders AS 
      SELECT 
        o.id,
        o.order_type,
        o.order_date,
        o.weekday,
        o.start_time,
        o.end_time,
        o.actual_start_time,
        o.actual_end_time,
        o.duration,
        
        -- 客户信息
        o.customer_name,
        o.customer_phone,
        o.player_count,
        o.support_player_count,
        o.language,
        o.internal_support,
        
        -- 剧本信息
        o.script_id,
        o.script_name,
        s.name as current_script_name, -- 当前剧本名称
        
        -- 密室信息
        o.escape_room_id,
        o.escape_room_name,
        er.name as current_escape_room_name, -- 当前密室名称
        
        -- 房间信息
        o.room_id,
        r.name as room_name,
        
        -- 服务选项（密室专用）
        o.include_photos,
        o.include_cctv,
        o.is_group_booking,
        
        -- 状态和备注
        o.status,
        o.game_host_notes,
        o.notes,
        
        -- 关联信息
        o.game_host_id,
        o.store_id,
        o.company_id,
        st.name as store_name,
        u.name as game_host_name,
        
        -- 时间戳
        o.created_at,
        o.updated_at
        
      FROM orders o
      LEFT JOIN scripts s ON o.script_id = s.id
      LEFT JOIN escape_rooms er ON o.escape_room_id = er.id
      LEFT JOIN rooms r ON o.room_id = r.id
      LEFT JOIN store st ON o.store_id = st.id
      LEFT JOIN users u ON o.game_host_id = u.id
      WHERE o.game_host_id IS NOT NULL 
        AND o.is_active = true
        AND o.status IN ('confirmed', 'in_progress', 'completed');
    `);

    // 3. 创建Game Host相关索引
    console.log('📝 创建Game Host相关索引...');
    const gameHostIndexes = [
      'CREATE INDEX IF NOT EXISTS idx_orders_game_host_id ON orders(game_host_id)',
      'CREATE INDEX IF NOT EXISTS idx_orders_game_host_date ON orders(game_host_id, order_date)',
      'CREATE INDEX IF NOT EXISTS idx_orders_game_host_status ON orders(game_host_id, status)',
      'CREATE INDEX IF NOT EXISTS idx_orders_actual_times ON orders(actual_start_time, actual_end_time)',
      'CREATE INDEX IF NOT EXISTS idx_orders_support_count ON orders(support_player_count)'
    ];

    for (const indexSQL of gameHostIndexes) {
      try {
        await client.query(indexSQL);
      } catch (error) {
        console.log(`⚠️  Game Host索引创建失败:`, error.message);
      }
    }

    // 4. 添加字段注释
    console.log('📝 添加字段注释...');
    await client.query(`
      COMMENT ON COLUMN orders.support_player_count IS '补位人数（Game Host可编辑）';
      COMMENT ON COLUMN orders.actual_start_time IS '实际游戏开始时间（Game Host操作）';
      COMMENT ON COLUMN orders.actual_end_time IS '实际游戏结束时间（Game Host操作）';
      COMMENT ON COLUMN orders.game_host_notes IS 'Game Host备注';
    `);

    // 5. 创建Game Host权限检查函数
    console.log('📝 创建Game Host权限检查函数...');
    await client.query(`
      CREATE OR REPLACE FUNCTION check_game_host_permission(
        p_user_id UUID,
        p_order_id UUID
      ) RETURNS BOOLEAN AS $$
      DECLARE
        v_game_host_id UUID;
      BEGIN
        SELECT game_host_id INTO v_game_host_id
        FROM orders 
        WHERE id = p_order_id AND is_active = true;
        
        RETURN v_game_host_id = p_user_id;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // 6. 创建Game Host状态更新函数
    console.log('📝 创建Game Host状态更新函数...');
    await client.query(`
      CREATE OR REPLACE FUNCTION update_game_host_order_status(
        p_order_id UUID,
        p_user_id UUID,
        p_new_status VARCHAR(20),
        p_notes TEXT DEFAULT NULL
      ) RETURNS BOOLEAN AS $$
      DECLARE
        v_current_status VARCHAR(20);
        v_game_host_id UUID;
        v_in_progress_count INTEGER;
      BEGIN
        -- 检查订单存在性和权限
        SELECT status, game_host_id INTO v_current_status, v_game_host_id
        FROM orders 
        WHERE id = p_order_id AND is_active = true;
        
        IF v_game_host_id IS NULL OR v_game_host_id != p_user_id THEN
          RAISE EXCEPTION '权限不足或订单不存在';
        END IF;
        
        -- 如果要设置为in_progress，检查是否已有其他进行中的订单
        IF p_new_status = 'in_progress' THEN
          SELECT COUNT(*) INTO v_in_progress_count
          FROM orders 
          WHERE game_host_id = p_user_id 
            AND status = 'in_progress' 
            AND id != p_order_id
            AND is_active = true;
            
          IF v_in_progress_count > 0 THEN
            RAISE EXCEPTION '您已有进行中的订单，请先完成当前订单';
          END IF;
        END IF;
        
        -- 更新订单状态
        UPDATE orders 
        SET 
          status = p_new_status,
          actual_start_time = CASE 
            WHEN p_new_status = 'in_progress' AND actual_start_time IS NULL 
            THEN NOW() 
            ELSE actual_start_time 
          END,
          actual_end_time = CASE 
            WHEN p_new_status = 'completed' AND actual_end_time IS NULL 
            THEN NOW() 
            ELSE actual_end_time 
          END,
          game_host_notes = COALESCE(p_notes, game_host_notes),
          updated_by = p_user_id,
          updated_at = NOW()
        WHERE id = p_order_id;
        
        RETURN TRUE;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // 7. 创建Game Host统计函数
    console.log('📝 创建Game Host统计函数...');
    await client.query(`
      CREATE OR REPLACE FUNCTION get_game_host_today_stats(
        p_game_host_id UUID,
        p_date DATE DEFAULT CURRENT_DATE
      ) RETURNS TABLE (
        total_orders BIGINT,
        confirmed_orders BIGINT,
        in_progress_orders BIGINT,
        completed_orders BIGINT,
        script_orders BIGINT,
        escape_room_orders BIGINT,
        total_players BIGINT,
        total_support_players BIGINT
      ) AS $$
      BEGIN
        RETURN QUERY
        SELECT 
          COUNT(*) as total_orders,
          COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_orders,
          COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_orders,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_orders,
          COUNT(CASE WHEN order_type = '剧本杀' THEN 1 END) as script_orders,
          COUNT(CASE WHEN order_type = '密室' THEN 1 END) as escape_room_orders,
          COALESCE(SUM(player_count), 0) as total_players,
          COALESCE(SUM(support_player_count), 0) as total_support_players
        FROM orders
        WHERE game_host_id = p_game_host_id 
          AND order_date = p_date
          AND is_active = true;
      END;
      $$ LANGUAGE plpgsql;
    `);

    console.log('✅ Game Host订单处理功能迁移完成！');
    console.log('');
    console.log('📋 新增功能总结：');
    console.log('• 订单表新增字段：support_player_count, actual_start_time, actual_end_time, game_host_notes');
    console.log('• 创建game_host_orders视图，方便Game Host查询订单');
    console.log('• 创建相关索引，优化查询性能');
    console.log('• 创建权限检查、状态更新、统计等数据库函数');
    console.log('');
    console.log('🎮 Game Host功能特性：');
    console.log('• 只能查看和操作自己负责的订单');
    console.log('• 支持订单状态流转：confirmed → in_progress → completed');
    console.log('• 同时只能有一个进行中的订单');
    console.log('• 可编辑字段：玩家人数、补位人数、语言、房间、剧本/密室等');
    console.log('• 提供今日统计和可用资源查询');

  } catch (error) {
    console.error('❌ Game Host订单处理功能迁移失败:', error);
    throw error;
  } finally {
    client.release();
  }
};

// 如果直接运行此文件
if (require.main === module) {
  migrateGameHostOrders()
    .then(() => {
      console.log('🎉 Game Host订单处理功能迁移成功完成！');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 迁移过程中发生错误:', error);
      process.exit(1);
    });
}

module.exports = migrateGameHostOrders; 