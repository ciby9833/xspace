const pool = require('../database/connection');

class GameHostModel {
  // 获取Game Host的订单列表（基础查询）
  async findGameHostOrders(gameHostId, filters = {}) {
    let query = `
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
        s.name as current_script_name,
        
        -- 密室信息
        o.escape_room_id,
        o.escape_room_name,
        er.name as current_escape_room_name,
        
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
        o.updated_at,
        
        -- 图片信息
        COALESCE(
          ARRAY_AGG(
            CASE WHEN oi.id IS NOT NULL THEN
              json_build_object(
                'id', oi.id,
                'image_url', oi.image_url,
                'image_name', oi.image_name,
                'image_type', oi.image_type,
                'sort_order', oi.sort_order
              )
            END
          ) FILTER (WHERE oi.id IS NOT NULL), 
          '{}'::json[]
        ) as images
        
      FROM orders o
      LEFT JOIN scripts s ON o.script_id = s.id
      LEFT JOIN escape_rooms er ON o.escape_room_id = er.id
      LEFT JOIN rooms r ON o.room_id = r.id
      LEFT JOIN store st ON o.store_id = st.id
      LEFT JOIN users u ON o.game_host_id = u.id
      LEFT JOIN order_images oi ON o.id = oi.order_id
      WHERE o.game_host_id = $1 
        AND o.is_active = true
        AND o.status IN ('confirmed', 'in_progress', 'completed')
    `;
    
    const params = [gameHostId];
    let paramIndex = 2;

    // 添加筛选条件
    if (filters.start_date) {
      query += ` AND DATE(o.order_date) >= $${paramIndex}`;
      params.push(filters.start_date);
      paramIndex++;
    }

    if (filters.end_date) {
      query += ` AND DATE(o.order_date) <= $${paramIndex}`;
      params.push(filters.end_date);
      paramIndex++;
    }

    if (filters.order_type) {
      query += ` AND o.order_type = $${paramIndex}`;
      params.push(filters.order_type);
      paramIndex++;
    }

    if (filters.status) {
      query += ` AND o.status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    if (filters.customer_name) {
      query += ` AND o.customer_name ILIKE $${paramIndex}`;
      params.push(`%${filters.customer_name}%`);
      paramIndex++;
    }

    if (filters.customer_phone) {
      query += ` AND o.customer_phone ILIKE $${paramIndex}`;
      params.push(`%${filters.customer_phone}%`);
      paramIndex++;
    }

    if (filters.store_id) {
      query += ` AND o.store_id = $${paramIndex}`;
      params.push(filters.store_id);
      paramIndex++;
    }

    query += ` GROUP BY o.id, o.order_type, o.order_date, o.weekday, o.start_time, o.end_time,
               o.actual_start_time, o.actual_end_time, o.duration, o.customer_name,
               o.customer_phone, o.player_count, o.support_player_count, o.language,
               o.internal_support, o.script_id, o.script_name, o.escape_room_id,
               o.escape_room_name, o.room_id, o.include_photos, o.include_cctv,
               o.is_group_booking, o.status, o.game_host_notes, o.notes,
               o.game_host_id, o.store_id, o.company_id, o.created_at, o.updated_at,
               st.name, u.name, s.name, er.name, r.name
               ORDER BY o.order_date DESC, o.start_time ASC`;

    const result = await pool.query(query, params);
    return result.rows;
  }

  // 获取Game Host单个订单详情
  async findGameHostOrderById(orderId, gameHostId) {
    const query = `
      SELECT 
        o.*,
        st.name as store_name,
        r.name as room_name,
        u.name as game_host_name,
        s.name as current_script_name,
        er.name as current_escape_room_name,
        COALESCE(
          ARRAY_AGG(
            CASE WHEN oi.id IS NOT NULL THEN
              json_build_object(
                'id', oi.id,
                'image_url', oi.image_url,
                'image_name', oi.image_name,
                'image_type', oi.image_type,
                'sort_order', oi.sort_order
              )
            END
          ) FILTER (WHERE oi.id IS NOT NULL), 
          '{}'::json[]
        ) as images
      FROM orders o
      LEFT JOIN store st ON o.store_id = st.id
      LEFT JOIN rooms r ON o.room_id = r.id
      LEFT JOIN users u ON o.game_host_id = u.id
      LEFT JOIN scripts s ON o.script_id = s.id
      LEFT JOIN escape_rooms er ON o.escape_room_id = er.id
      LEFT JOIN order_images oi ON o.id = oi.order_id
      WHERE o.id = $1 AND o.game_host_id = $2 AND o.is_active = true
      GROUP BY o.id, o.order_type, o.order_date, o.weekday, o.start_time, o.end_time,
               o.actual_start_time, o.actual_end_time, o.duration, o.customer_name,
               o.customer_phone, o.player_count, o.support_player_count, o.language,
               o.internal_support, o.script_id, o.script_name, o.escape_room_id,
               o.escape_room_name, o.room_id, o.include_photos, o.include_cctv,
               o.is_group_booking, o.status, o.game_host_notes, o.notes,
               o.game_host_id, o.store_id, o.company_id, o.created_at, o.updated_at,
               st.name, r.name, u.name, s.name, er.name
    `;
    
    const result = await pool.query(query, [orderId, gameHostId]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  // 获取Game Host当前进行中的订单
  async findCurrentInProgressOrder(gameHostId) {
    const query = `
      SELECT 
        o.*,
        st.name as store_name,
        r.name as room_name,
        u.name as game_host_name,
        s.name as current_script_name,
        er.name as current_escape_room_name
      FROM orders o
      LEFT JOIN store st ON o.store_id = st.id
      LEFT JOIN rooms r ON o.room_id = r.id
      LEFT JOIN users u ON o.game_host_id = u.id
      LEFT JOIN scripts s ON o.script_id = s.id
      LEFT JOIN escape_rooms er ON o.escape_room_id = er.id
      WHERE o.game_host_id = $1 AND o.status = 'in_progress' AND o.is_active = true
      ORDER BY o.actual_start_time DESC
      LIMIT 1
    `;
    
    const result = await pool.query(query, [gameHostId]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  // 更新订单状态（Game Host专用）
  async updateOrderStatus(orderId, gameHostId, status, additionalData = {}) {
    const updateFields = ['status = $3', 'updated_at = NOW()'];
    const params = [orderId, gameHostId, status];
    let paramIndex = 4;

    // 根据状态添加时间戳
    if (status === 'in_progress') {
      updateFields.push(`actual_start_time = COALESCE(actual_start_time, NOW())`);
    } else if (status === 'completed') {
      updateFields.push(`actual_end_time = COALESCE(actual_end_time, NOW())`);
    }

    // 添加额外字段
    Object.keys(additionalData).forEach(key => {
      updateFields.push(`${key} = $${paramIndex}`);
      params.push(additionalData[key]);
      paramIndex++;
    });

    const query = `
      UPDATE orders 
      SET ${updateFields.join(', ')}
      WHERE id = $1 AND game_host_id = $2 AND is_active = true
      RETURNING *
    `;

    const result = await pool.query(query, params);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  // 更新订单信息（Game Host可编辑字段）
  async updateGameHostOrder(orderId, gameHostId, updateData) {
    const allowedFields = [
      'player_count',
      'support_player_count', 
      'language',
      'internal_support',
      'room_id',
      'script_id',
      'script_name',
      'escape_room_id',
      'escape_room_name',
      'game_host_notes',
      'updated_by'
    ];

    const updateFields = ['updated_at = NOW()'];
    const params = [orderId, gameHostId];
    let paramIndex = 3;

    // 只更新允许的字段
    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key) && updateData[key] !== undefined) {
        updateFields.push(`${key} = $${paramIndex}`);
        params.push(updateData[key]);
        paramIndex++;
      }
    });

    if (updateFields.length === 1) {
      throw new Error('没有可更新的字段');
    }

    const query = `
      UPDATE orders 
      SET ${updateFields.join(', ')}
      WHERE id = $1 AND game_host_id = $2 AND is_active = true
      RETURNING *
    `;

    const result = await pool.query(query, params);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  // 获取Game Host今日统计
  async getTodayStats(gameHostId, date = null) {
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    const query = `
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
      WHERE game_host_id = $1 AND order_date = $2 AND is_active = true
    `;
    
    const result = await pool.query(query, [gameHostId, targetDate]);
    return result.rows[0];
  }

  // 检查Game Host是否有其他进行中的订单
  async hasOtherInProgressOrders(gameHostId, excludeOrderId = null) {
    let query = `
      SELECT COUNT(*) as count
      FROM orders 
      WHERE game_host_id = $1 
        AND status = 'in_progress' 
        AND is_active = true
    `;
    
    const params = [gameHostId];
    
    if (excludeOrderId) {
      query += ` AND id != $2`;
      params.push(excludeOrderId);
    }

    const result = await pool.query(query, params);
    return parseInt(result.rows[0].count) > 0;
  }

  // 获取Game Host可用的房间列表
  async getAvailableRooms(storeId) {
    const query = `
      SELECT id, name, room_type, capacity, status
      FROM rooms
      WHERE store_id = $1 AND is_active = true AND status != '关闭'
      ORDER BY name ASC
    `;
    
    const result = await pool.query(query, [storeId]);
    return result.rows;
  }

  // 获取Game Host可用的剧本列表
  async getAvailableScripts(storeId) {
    const query = `
      SELECT s.id, s.name, s.type, s.min_players, s.max_players, s.duration
      FROM scripts s
      INNER JOIN store_scripts ss ON s.id = ss.script_id
      WHERE ss.store_id = $1 AND s.is_active = true AND ss.is_available = true
      ORDER BY s.name ASC
    `;
    
    const result = await pool.query(query, [storeId]);
    return result.rows;
  }

  // 获取Game Host可用的密室列表
  async getAvailableEscapeRooms(storeId) {
    const query = `
      SELECT er.id, er.name, er.horror_level, er.min_players, er.max_players, er.duration
      FROM escape_rooms er
      INNER JOIN store_escape_rooms ser ON er.id = ser.escape_room_id
      WHERE ser.store_id = $1 AND er.is_active = true AND ser.is_available = true
      ORDER BY er.name ASC
    `;
    
    const result = await pool.query(query, [storeId]);
    return result.rows;
  }

  // 获取用户关联的门店
  async getUserStores(userId) {
    const query = `
      SELECT s.id, s.name, s.address
      FROM store s
      INNER JOIN user_stores us ON s.id = us.store_id
      WHERE us.user_id = $1 AND s.is_active = true
      ORDER BY s.name ASC
    `;
    
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  // 检查房间时间冲突
  async checkRoomTimeConflicts(roomId, orderDate, startTime, endTime, excludeOrderId = null) {
    let query = `
      SELECT id, customer_name, start_time, end_time
      FROM orders
      WHERE room_id = $1 
        AND order_date = $2
        AND status IN ('confirmed', 'in_progress')
        AND is_active = true
        AND (
          (start_time <= $3 AND end_time > $3) OR
          (start_time < $4 AND end_time >= $4) OR
          (start_time >= $3 AND end_time <= $4)
        )
    `;
    
    const params = [roomId, orderDate, startTime, endTime];
    
    if (excludeOrderId) {
      query += ` AND id != $5`;
      params.push(excludeOrderId);
    }

    const result = await pool.query(query, params);
    return result.rows;
  }

  // 验证Game Host权限（检查订单是否属于该Game Host）
  async validateGameHostPermission(orderId, gameHostId) {
    const query = `
      SELECT id, status, game_host_id
      FROM orders
      WHERE id = $1 AND game_host_id = $2 AND is_active = true
    `;
    
    const result = await pool.query(query, [orderId, gameHostId]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  // 获取剧本/密室名称（用于冗余存储）
  async getScriptName(scriptId) {
    const query = `SELECT name FROM scripts WHERE id = $1 AND is_active = true`;
    const result = await pool.query(query, [scriptId]);
    return result.rows.length > 0 ? result.rows[0].name : null;
  }

  async getEscapeRoomName(escapeRoomId) {
    const query = `SELECT name FROM escape_rooms WHERE id = $1 AND is_active = true`;
    const result = await pool.query(query, [escapeRoomId]);
    return result.rows.length > 0 ? result.rows[0].name : null;
  }

  // Game Host订单历史记录
  async getGameHostOrderHistory(gameHostId, options = {}) {
    const { 
      page = 1, 
      pageSize = 20, 
      startDate = null, 
      endDate = null,
      status = null 
    } = options;

    let query = `
      SELECT 
        o.id,
        o.order_type,
        o.order_date,
        o.start_time,
        o.end_time,
        o.actual_start_time,
        o.actual_end_time,
        o.customer_name,
        o.player_count,
        o.support_player_count,
        o.status,
        o.game_host_notes,
        st.name as store_name,
        r.name as room_name,
        CASE 
          WHEN o.order_type = '剧本杀' THEN COALESCE(s.name, o.script_name)
          ELSE COALESCE(er.name, o.escape_room_name)
        END as content_name
      FROM orders o
      LEFT JOIN store st ON o.store_id = st.id
      LEFT JOIN rooms r ON o.room_id = r.id
      LEFT JOIN scripts s ON o.script_id = s.id
      LEFT JOIN escape_rooms er ON o.escape_room_id = er.id
      WHERE o.game_host_id = $1 AND o.is_active = true
    `;

    const params = [gameHostId];
    let paramIndex = 2;

    if (startDate) {
      query += ` AND o.order_date >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      query += ` AND o.order_date <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    if (status) {
      query += ` AND o.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    query += ` ORDER BY o.order_date DESC, o.start_time DESC`;
    
    // 添加分页
    const offset = (page - 1) * pageSize;
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(pageSize, offset);

    const result = await pool.query(query, params);
    
    // 获取总数
    let countQuery = `
      SELECT COUNT(*) as total
      FROM orders o
      WHERE o.game_host_id = $1 AND o.is_active = true
    `;
    
    const countParams = [gameHostId];
    let countParamIndex = 2;

    if (startDate) {
      countQuery += ` AND o.order_date >= $${countParamIndex}`;
      countParams.push(startDate);
      countParamIndex++;
    }

    if (endDate) {
      countQuery += ` AND o.order_date <= $${countParamIndex}`;
      countParams.push(endDate);
      countParamIndex++;
    }

    if (status) {
      countQuery += ` AND o.status = $${countParamIndex}`;
      countParams.push(status);
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);

    return {
      data: result.rows,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    };
  }
}

module.exports = new GameHostModel(); 