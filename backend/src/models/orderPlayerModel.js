//订单参与玩家模型
const pool = require('../database/connection');

class OrderPlayerModel {
  // 创建订单参与玩家
  async create(playerData) {
    const { 
      order_id, 
      player_name, 
      player_phone, 
      selected_role_name,
      // 🆕 角色定价模板信息
      role_template_id,
      template_snapshot,
      // 🆕 详细折扣信息
      discount_type = 'none',
      discount_percentage = 0,
      discount_fixed_amount = 0,
      // 原有字段
      original_amount = 0,
      discount_amount = 0,
      final_amount = 0,
      payment_status = 'pending',
      player_order,
      notes
    } = playerData;
    
    const query = `
      INSERT INTO order_players (
        order_id, player_name, player_phone, selected_role_name,
        role_template_id, template_snapshot,
        discount_type, discount_percentage, discount_fixed_amount,
        original_amount, discount_amount, final_amount, 
        payment_status, player_order, notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      order_id, player_name, player_phone, selected_role_name,
      role_template_id, template_snapshot ? JSON.stringify(template_snapshot) : null,
      discount_type, discount_percentage, discount_fixed_amount,
      original_amount, discount_amount, final_amount,
      payment_status, player_order, notes
    ]);
    
    // 解析返回的JSON字段
    if (result.rows[0] && result.rows[0].template_snapshot) {
      try {
        result.rows[0].template_snapshot = JSON.parse(result.rows[0].template_snapshot);
      } catch (error) {
        console.warn('解析template_snapshot失败:', error);
      }
    }
    
    return result.rows[0];
  }

  // 批量创建订单参与玩家
  async createBatch(playersData) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const createdPlayers = [];
      for (const playerData of playersData) {
        const result = await this.create(playerData);
        createdPlayers.push(result);
      }
      
      await client.query('COMMIT');
      return createdPlayers;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // 根据订单ID获取所有参与玩家
  async findByOrderId(orderId) {
    const query = `
      SELECT op.*,
        CASE 
          WHEN op.payment_status = 'paid' THEN '已支付'
          WHEN op.payment_status = 'partial' THEN '部分支付'
          ELSE '未支付'
        END as payment_status_text
      FROM order_players op
      WHERE op.order_id = $1
      ORDER BY op.player_order ASC
    `;
    
    const result = await pool.query(query, [orderId]);
    return result.rows;
  }

  // 根据订单ID获取参与玩家（带支付信息）
  async findByOrderIdWithPayments(orderId) {
    const query = `
      SELECT op.*,
        CASE 
          WHEN op.payment_status = 'paid' THEN '已支付'
          WHEN op.payment_status = 'partial' THEN '部分支付'
          ELSE '未支付'
        END as payment_status_text,
        COALESCE(
          ARRAY_AGG(
            CASE WHEN opay.id IS NOT NULL THEN
              json_build_object(
                'payment_id', opay.id,
                'payer_name', opay.payer_name,
                'payment_amount', opay.payment_amount,
                'payment_date', opay.payment_date,
                'payment_method', opay.payment_method,
                'payment_status', opay.payment_status
              )
            END
          ) FILTER (WHERE opay.id IS NOT NULL), 
          '{}'::json[]
        ) as related_payments
      FROM order_players op
      LEFT JOIN order_payments opay ON op.order_id = opay.order_id 
        AND op.id::text = ANY(opay.covers_player_ids)
      WHERE op.order_id = $1
      GROUP BY op.id
      ORDER BY op.player_order ASC
    `;
    
    const result = await pool.query(query, [orderId]);
    return result.rows;
  }

  // 根据ID获取单个参与玩家
  async findById(playerId) {
    const query = `
      SELECT op.*,
        o.id as order_id,
        o.customer_name as order_customer_name,
        o.order_date,
        o.start_time,
        o.end_time,
        s.name as store_name
      FROM order_players op
      LEFT JOIN orders o ON op.order_id = o.id
      LEFT JOIN store s ON o.store_id = s.id
      WHERE op.id = $1
    `;
    
    const result = await pool.query(query, [playerId]);
    return result.rows[0] || null;
  }

  // 更新参与玩家信息
  async update(playerId, updateData) {
    const { 
      player_name, 
      player_phone, 
      selected_role_name,
      original_amount,
      discount_amount,
      final_amount,
      payment_status,
      player_order,
      notes
    } = updateData;
    
    const query = `
      UPDATE order_players 
      SET player_name = COALESCE($2, player_name),
          player_phone = COALESCE($3, player_phone),
          selected_role_name = COALESCE($4, selected_role_name),
          original_amount = COALESCE($5, original_amount),
          discount_amount = COALESCE($6, discount_amount),
          final_amount = COALESCE($7, final_amount),
          payment_status = COALESCE($8, payment_status),
          player_order = COALESCE($9, player_order),
          notes = COALESCE($10, notes),
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      playerId, player_name, player_phone, selected_role_name,
      original_amount, discount_amount, final_amount,
      payment_status, player_order, notes
    ]);
    
    return result.rows[0] || null;
  }

  // 更新支付状态
  async updatePaymentStatus(playerId, paymentStatus) {
    const query = `
      UPDATE order_players 
      SET payment_status = $2,
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await pool.query(query, [playerId, paymentStatus]);
    return result.rows[0] || null;
  }

  // 批量更新支付状态
  async updatePaymentStatusBatch(playerIds, paymentStatus) {
    const query = `
      UPDATE order_players 
      SET payment_status = $2,
          updated_at = NOW()
      WHERE id = ANY($1)
      RETURNING *
    `;
    
    const result = await pool.query(query, [playerIds, paymentStatus]);
    return result.rows;
  }

  // 删除参与玩家
  async delete(playerId) {
    const query = 'DELETE FROM order_players WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [playerId]);
    return result.rows[0] || null;
  }

  // 删除订单的所有参与玩家
  async deleteByOrderId(orderId) {
    const query = 'DELETE FROM order_players WHERE order_id = $1 RETURNING *';
    const result = await pool.query(query, [orderId]);
    return result.rows;
  }

  // 获取订单的支付统计信息
  async getPaymentStats(orderId) {
    const query = `
      SELECT 
        COUNT(*) as total_players,
        COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid_players,
        COUNT(CASE WHEN payment_status = 'partial' THEN 1 END) as partial_players,
        COUNT(CASE WHEN payment_status = 'pending' THEN 1 END) as pending_players,
        SUM(original_amount) as total_original_amount,
        SUM(discount_amount) as total_discount_amount,
        SUM(final_amount) as total_final_amount,
        SUM(CASE WHEN payment_status = 'paid' THEN final_amount ELSE 0 END) as paid_amount,
        SUM(CASE WHEN payment_status = 'pending' THEN final_amount ELSE 0 END) as pending_amount,
        -- 🆕 添加折扣统计字段
        COUNT(CASE WHEN discount_amount > 0 THEN 1 END) as players_with_discount,
        COUNT(CASE WHEN discount_amount = 0 THEN 1 END) as players_without_discount,
        CASE 
          WHEN SUM(original_amount) > 0 THEN 
            ROUND((SUM(discount_amount) / SUM(original_amount)) * 100, 2)
          ELSE 0 
        END as discount_percentage,
        CASE 
          WHEN SUM(discount_amount) > 0 THEN true 
          ELSE false 
        END as has_discount
      FROM order_players
      WHERE order_id = $1
    `;
    
    const result = await pool.query(query, [orderId]);
    const stats = result.rows[0];
    
    // 转换数据类型
    return {
      total_players: parseInt(stats.total_players) || 0,
      paid_players: parseInt(stats.paid_players) || 0,
      partial_players: parseInt(stats.partial_players) || 0,
      pending_players: parseInt(stats.pending_players) || 0,
      total_original_amount: parseFloat(stats.total_original_amount) || 0,
      total_discount_amount: parseFloat(stats.total_discount_amount) || 0,
      total_final_amount: parseFloat(stats.total_final_amount) || 0,
      paid_amount: parseFloat(stats.paid_amount) || 0,
      pending_amount: parseFloat(stats.pending_amount) || 0,
      players_with_discount: parseInt(stats.players_with_discount) || 0,
      players_without_discount: parseInt(stats.players_without_discount) || 0,
      discount_percentage: parseFloat(stats.discount_percentage) || 0,
      has_discount: stats.has_discount || false
    };
  }

  // 检查玩家序号是否重复
  async checkPlayerOrderExists(orderId, playerOrder, excludePlayerId = null) {
    let query = `
      SELECT COUNT(*) as count
      FROM order_players
      WHERE order_id = $1 AND player_order = $2
    `;
    
    const params = [orderId, playerOrder];
    
    if (excludePlayerId) {
      query += ' AND id != $3';
      params.push(excludePlayerId);
    }
    
    const result = await pool.query(query, params);
    return parseInt(result.rows[0].count) > 0;
  }

  // 获取订单的下一个玩家序号
  async getNextPlayerOrder(orderId) {
    const query = `
      SELECT COALESCE(MAX(player_order), 0) + 1 as next_order
      FROM order_players
      WHERE order_id = $1
    `;
    
    const result = await pool.query(query, [orderId]);
    return result.rows[0].next_order;
  }

  // 根据角色名称统计
  async getPlayersByRole(companyId, startDate = null, endDate = null) {
    let query = `
      SELECT 
        op.selected_role_name,
        COUNT(*) as player_count,
        SUM(op.final_amount) as total_amount,
        AVG(op.final_amount) as avg_amount
      FROM order_players op
      JOIN orders o ON op.order_id = o.id
      WHERE o.company_id = $1
    `;
    
    const params = [companyId];
    
    if (startDate) {
      query += ' AND o.order_date >= $2';
      params.push(startDate);
    }
    
    if (endDate) {
      query += ` AND o.order_date <= $${params.length + 1}`;
      params.push(endDate);
    }
    
    query += `
      GROUP BY op.selected_role_name
      ORDER BY player_count DESC
    `;
    
    const result = await pool.query(query, params);
    return result.rows;
  }
}

module.exports = new OrderPlayerModel(); 