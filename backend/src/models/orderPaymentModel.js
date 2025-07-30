//支付记录模型
const pool = require('../database/connection');

class OrderPaymentModel {
  // 创建支付记录
  async create(paymentData) {
    const { 
      order_id, 
      payer_name, 
      payer_phone, 
      payment_amount,
      payment_method,
      payment_date = new Date(),
      payment_status = 'pending',
      covers_player_ids = [],
      // 🆕 详细支付信息
      covers_player_count = 0,
      payment_for_roles = [],
      original_total_amount = 0,
      discount_total_amount = 0,
      // 原有字段
      payment_proof_images = [],
      notes,
      created_by
    } = paymentData;
    
    const query = `
      INSERT INTO order_payments (
        order_id, payer_name, payer_phone, payment_amount,
        payment_method, payment_date, payment_status, 
        covers_player_ids, covers_player_count, payment_for_roles,
        original_total_amount, discount_total_amount,
        payment_proof_images, notes, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      order_id, payer_name, payer_phone, payment_amount,
      payment_method, payment_date, payment_status,
      covers_player_ids, covers_player_count, payment_for_roles,
      original_total_amount, discount_total_amount,
      payment_proof_images, notes, created_by
    ]);
    
    return result.rows[0];
  }

  // 创建支付记录并更新玩家支付状态
  async createAndUpdatePlayerStatus(paymentData) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // 创建支付记录
      const payment = await this.create(paymentData);
      
      // 更新相关玩家的支付状态
      if (paymentData.covers_player_ids && paymentData.covers_player_ids.length > 0) {
        await this.updatePlayersPaymentStatus(
          paymentData.covers_player_ids, 
          payment.payment_status === 'confirmed' ? 'paid' : 'partial'
        );
      }
      
      await client.query('COMMIT');
      return payment;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // 根据订单ID获取所有支付记录
  async findByOrderId(orderId) {
    const query = `
      SELECT op.*,
        u.name as created_by_name,
        CASE 
          WHEN op.payment_status = 'confirmed' THEN '已确认'
          WHEN op.payment_status = 'pending' THEN '待确认'
          WHEN op.payment_status = 'failed' THEN '失败'
          ELSE '已取消'
        END as payment_status_text
      FROM order_payments op
      LEFT JOIN users u ON op.created_by = u.id
      WHERE op.order_id = $1
      ORDER BY op.payment_date DESC
    `;
    
    const result = await pool.query(query, [orderId]);
    return result.rows;
  }

  // 根据订单ID获取支付记录（带玩家信息）
  async findByOrderIdWithPlayers(orderId) {
    const query = `
      SELECT op.*,
        u.name as created_by_name,
        CASE 
          WHEN op.payment_status = 'confirmed' THEN '已确认'
          WHEN op.payment_status = 'pending' THEN '待确认'
          WHEN op.payment_status = 'failed' THEN '失败'
          ELSE '已取消'
        END as payment_status_text,
        COALESCE(
          ARRAY_AGG(
            CASE WHEN opl.id IS NOT NULL THEN
              json_build_object(
                'player_id', opl.id,
                'player_name', opl.player_name,
                'player_phone', opl.player_phone,
                'final_amount', opl.final_amount,
                'payment_status', opl.payment_status
              )
            END
          ) FILTER (WHERE opl.id IS NOT NULL), 
          '{}'::json[]
        ) as covered_players
      FROM order_payments op
      LEFT JOIN users u ON op.created_by = u.id
      LEFT JOIN order_players opl ON opl.order_id = op.order_id 
        AND opl.id::text = ANY(op.covers_player_ids)
      WHERE op.order_id = $1
      GROUP BY op.id, u.name
      ORDER BY op.payment_date DESC
    `;
    
    const result = await pool.query(query, [orderId]);
    return result.rows;
  }

  // 根据ID获取单个支付记录
  async findById(paymentId) {
    const query = `
      SELECT op.*,
        u.name as created_by_name,
        o.customer_name as order_customer_name,
        o.order_date,
        o.start_time,
        o.end_time,
        s.name as store_name
      FROM order_payments op
      LEFT JOIN users u ON op.created_by = u.id
      LEFT JOIN orders o ON op.order_id = o.id
      LEFT JOIN store s ON o.store_id = s.id
      WHERE op.id = $1
    `;
    
    const result = await pool.query(query, [paymentId]);
    return result.rows[0] || null;
  }

  // 更新支付记录
  async update(paymentId, updateData) {
    const { 
      payer_name, 
      payer_phone, 
      payment_amount,
      payment_method,
      payment_date,
      payment_status,
      covers_player_ids,
      payment_proof_images,
      notes
    } = updateData;
    
    const query = `
      UPDATE order_payments 
      SET payer_name = COALESCE($2, payer_name),
          payer_phone = COALESCE($3, payer_phone),
          payment_amount = COALESCE($4, payment_amount),
          payment_method = COALESCE($5, payment_method),
          payment_date = COALESCE($6, payment_date),
          payment_status = COALESCE($7, payment_status),
          covers_player_ids = COALESCE($8, covers_player_ids),
          payment_proof_images = COALESCE($9, payment_proof_images),
          notes = COALESCE($10, notes),
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      paymentId, payer_name, payer_phone, payment_amount,
      payment_method, payment_date, payment_status,
      covers_player_ids, payment_proof_images, notes
    ]);
    
    return result.rows[0] || null;
  }

  // 更新支付状态
  async updatePaymentStatus(paymentId, paymentStatus) {
    const query = `
      UPDATE order_payments 
      SET payment_status = $2,
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await pool.query(query, [paymentId, paymentStatus]);
    return result.rows[0] || null;
  }

  // 🆕 更新支付凭证
  async updatePaymentProof(paymentId, proofImages) {
    const query = `
      UPDATE order_payments 
      SET payment_proof_images = $2,
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await pool.query(query, [paymentId, proofImages]);
    return result.rows[0] || null;
  }

  // 🆕 添加支付凭证（追加模式）
  async addPaymentProof(paymentId, newProofImages) {
    const query = `
      UPDATE order_payments 
      SET payment_proof_images = COALESCE(payment_proof_images, '{}') || $2,
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await pool.query(query, [paymentId, newProofImages]);
    return result.rows[0] || null;
  }

  // 确认支付并更新玩家状态
  async confirmPayment(paymentId) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // 更新支付状态为已确认
      const payment = await this.updatePaymentStatus(paymentId, 'confirmed');
      
      if (payment && payment.covers_player_ids && payment.covers_player_ids.length > 0) {
        // 更新相关玩家的支付状态
        await this.updatePlayersPaymentStatus(payment.covers_player_ids, 'paid');
      }
      
      await client.query('COMMIT');
      return payment;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // 删除支付记录
  async delete(paymentId) {
    const query = 'DELETE FROM order_payments WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [paymentId]);
    return result.rows[0] || null;
  }

  // 删除订单的所有支付记录
  async deleteByOrderId(orderId) {
    const query = 'DELETE FROM order_payments WHERE order_id = $1 RETURNING *';
    const result = await pool.query(query, [orderId]);
    return result.rows;
  }

  // 获取订单的支付统计信息
  async getPaymentStats(orderId) {
    const query = `
      SELECT 
        COUNT(*) as total_payments,
        COUNT(CASE WHEN payment_status = 'confirmed' THEN 1 END) as confirmed_payments,
        COUNT(CASE WHEN payment_status = 'pending' THEN 1 END) as pending_payments,
        COUNT(CASE WHEN payment_status = 'failed' THEN 1 END) as failed_payments,
        SUM(payment_amount) as total_payment_amount,
        SUM(CASE WHEN payment_status = 'confirmed' THEN payment_amount ELSE 0 END) as confirmed_amount,
        SUM(CASE WHEN payment_status = 'pending' THEN payment_amount ELSE 0 END) as pending_amount
      FROM order_payments
      WHERE order_id = $1
    `;
    
    const result = await pool.query(query, [orderId]);
    return result.rows[0];
  }

  // 获取公司的支付统计（按时间范围）
  async getCompanyPaymentStats(companyId, startDate = null, endDate = null) {
    let query = `
      SELECT 
        DATE_TRUNC('day', op.payment_date) as payment_date,
        COUNT(*) as payment_count,
        SUM(op.payment_amount) as total_amount,
        AVG(op.payment_amount) as avg_amount,
        COUNT(CASE WHEN op.payment_status = 'confirmed' THEN 1 END) as confirmed_count,
        SUM(CASE WHEN op.payment_status = 'confirmed' THEN op.payment_amount ELSE 0 END) as confirmed_amount
      FROM order_payments op
      JOIN orders o ON op.order_id = o.id
      WHERE o.company_id = $1
    `;
    
    const params = [companyId];
    
    if (startDate) {
      query += ' AND op.payment_date >= $2';
      params.push(startDate);
    }
    
    if (endDate) {
      query += ` AND op.payment_date <= $${params.length + 1}`;
      params.push(endDate);
    }
    
    query += `
      GROUP BY DATE_TRUNC('day', op.payment_date)
      ORDER BY payment_date DESC
    `;
    
    const result = await pool.query(query, params);
    return result.rows;
  }

  // 获取支付方式统计
  async getPaymentMethodStats(companyId, startDate = null, endDate = null) {
    let query = `
      SELECT 
        op.payment_method,
        COUNT(*) as payment_count,
        SUM(op.payment_amount) as total_amount,
        AVG(op.payment_amount) as avg_amount
      FROM order_payments op
      JOIN orders o ON op.order_id = o.id
      WHERE o.company_id = $1
    `;
    
    const params = [companyId];
    
    if (startDate) {
      query += ' AND op.payment_date >= $2';
      params.push(startDate);
    }
    
    if (endDate) {
      query += ` AND op.payment_date <= $${params.length + 1}`;
      params.push(endDate);
    }
    
    query += `
      GROUP BY op.payment_method
      ORDER BY payment_count DESC
    `;
    
    const result = await pool.query(query, params);
    return result.rows;
  }

  // 更新玩家支付状态（辅助方法）
  async updatePlayersPaymentStatus(playerIds, paymentStatus) {
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

  // 合并支付记录
  async mergePayments(paymentIds, mergeData) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // 获取要合并的支付记录
      const paymentsQuery = `
        SELECT * FROM order_payments 
        WHERE id = ANY($1)
        ORDER BY payment_date ASC
      `;
      const paymentsResult = await client.query(paymentsQuery, [paymentIds]);
      const payments = paymentsResult.rows;
      
      if (payments.length === 0) {
        throw new Error('没有找到要合并的支付记录');
      }
      
      // 计算合并后的金额和覆盖的玩家
      const totalAmount = payments.reduce((sum, payment) => sum + parseFloat(payment.payment_amount), 0);
      const allPlayerIds = [...new Set(payments.flatMap(p => p.covers_player_ids || []))];
      const allProofImages = [...new Set(payments.flatMap(p => p.payment_proof_images || []))];
      
      // 创建合并后的支付记录
      const mergedPayment = await this.create({
        order_id: payments[0].order_id,
        payer_name: mergeData.payer_name || payments[0].payer_name,
        payer_phone: mergeData.payer_phone || payments[0].payer_phone,
        payment_amount: totalAmount,
        payment_method: mergeData.payment_method || payments[0].payment_method,
        payment_date: mergeData.payment_date || new Date(),
        payment_status: mergeData.payment_status || 'confirmed',
        covers_player_ids: allPlayerIds,
        payment_proof_images: allProofImages,
        notes: mergeData.notes || `合并支付记录: ${paymentIds.join(', ')}`,
        created_by: mergeData.created_by || payments[0].created_by
      });
      
      // 删除原有的支付记录
      await client.query('DELETE FROM order_payments WHERE id = ANY($1)', [paymentIds]);
      
      await client.query('COMMIT');
      return mergedPayment;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // 按付款人统计
  async getPaymentsByPayer(companyId, startDate = null, endDate = null) {
    let query = `
      SELECT 
        op.payer_name,
        op.payer_phone,
        COUNT(*) as payment_count,
        SUM(op.payment_amount) as total_amount,
        AVG(op.payment_amount) as avg_amount
      FROM order_payments op
      JOIN orders o ON op.order_id = o.id
      WHERE o.company_id = $1
    `;
    
    const params = [companyId];
    
    if (startDate) {
      query += ' AND op.payment_date >= $2';
      params.push(startDate);
    }
    
    if (endDate) {
      query += ` AND op.payment_date <= $${params.length + 1}`;
      params.push(endDate);
    }
    
    query += `
      GROUP BY op.payer_name, op.payer_phone
      ORDER BY payment_count DESC
    `;
    
    const result = await pool.query(query, params);
    return result.rows;
  }
}

module.exports = new OrderPaymentModel(); 