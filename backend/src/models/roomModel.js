const pool = require('../database/connection');

class RoomModel {
  // 创建房间
  async create(roomData) {
    const { 
      store_id, 
      name, 
      room_type, 
      capacity, 
      status = '正常', 
      description, 
      equipment, 
      notes 
    } = roomData;
    
    const query = `
      INSERT INTO rooms (store_id, name, room_type, capacity, status, description, equipment, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      store_id, 
      name, 
      room_type, 
      capacity, 
      status, 
      description, 
      equipment, 
      notes
    ]);
    return result.rows[0];
  }

  // 根据门店ID查询房间列表
  async findByStoreId(storeId, filters = {}) {
    let query = `
      SELECT r.*, 
        s.name as store_name,
        s.address as store_address,
        c.name as company_name,
        (SELECT COUNT(*) FROM room_images ri WHERE ri.room_id = r.id) as image_count
      FROM rooms r
      JOIN store s ON r.store_id = s.id
      JOIN company c ON s.company_id = c.id
      WHERE r.store_id = $1 AND r.is_active = true
    `;
    
    const params = [storeId];
    let paramIndex = 2;
    
    // 添加筛选条件
    if (filters.room_type) {
      query += ` AND r.room_type = $${paramIndex}`;
      params.push(filters.room_type);
      paramIndex++;
    }
    
    if (filters.status) {
      query += ` AND r.status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }
    
    if (filters.min_capacity) {
      query += ` AND r.capacity >= $${paramIndex}`;
      params.push(parseInt(filters.min_capacity));
      paramIndex++;
    }
    
    if (filters.max_capacity) {
      query += ` AND r.capacity <= $${paramIndex}`;
      params.push(parseInt(filters.max_capacity));
      paramIndex++;
    }
    
    if (filters.keyword) {
      query += ` AND (r.name ILIKE $${paramIndex} OR r.description ILIKE $${paramIndex})`;
      params.push(`%${filters.keyword}%`);
      paramIndex++;
    }
    
    query += ' ORDER BY r.created_at DESC';
    
    const result = await pool.query(query, params);
    return result.rows;
  }

  // 根据公司ID查询房间列表（公司级用户）
  async findByCompanyId(companyId, filters = {}) {
    let query = `
      SELECT r.*, 
        s.name as store_name,
        s.address as store_address,
        c.name as company_name,
        (SELECT COUNT(*) FROM room_images ri WHERE ri.room_id = r.id) as image_count
      FROM rooms r
      JOIN store s ON r.store_id = s.id
      JOIN company c ON s.company_id = c.id
      WHERE c.id = $1 AND r.is_active = true
    `;
    
    const params = [companyId];
    let paramIndex = 2;
    
    // 添加筛选条件
    if (filters.store_id) {
      query += ` AND r.store_id = $${paramIndex}`;
      params.push(filters.store_id);
      paramIndex++;
    }
    
    if (filters.room_type) {
      query += ` AND r.room_type = $${paramIndex}`;
      params.push(filters.room_type);
      paramIndex++;
    }
    
    if (filters.status) {
      query += ` AND r.status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }
    
    if (filters.min_capacity) {
      query += ` AND r.capacity >= $${paramIndex}`;
      params.push(parseInt(filters.min_capacity));
      paramIndex++;
    }
    
    if (filters.max_capacity) {
      query += ` AND r.capacity <= $${paramIndex}`;
      params.push(parseInt(filters.max_capacity));
      paramIndex++;
    }
    
    if (filters.keyword) {
      query += ` AND (r.name ILIKE $${paramIndex} OR r.description ILIKE $${paramIndex})`;
      params.push(`%${filters.keyword}%`);
      paramIndex++;
    }
    
    query += ' ORDER BY s.name, r.name';
    
    const result = await pool.query(query, params);
    return result.rows;
  }

  // 查询所有房间（平台级用户）
  async findAllWithCompanyInfo(filters = {}) {
    let query = `
      SELECT r.*, 
        s.name as store_name,
        s.address as store_address,
        c.name as company_name,
        c.type as company_type,
        (SELECT COUNT(*) FROM room_images ri WHERE ri.room_id = r.id) as image_count
      FROM rooms r
      JOIN store s ON r.store_id = s.id
      JOIN company c ON s.company_id = c.id
      WHERE r.is_active = true
    `;
    
    const params = [];
    let paramIndex = 1;
    
    // 添加筛选条件
    if (filters.company_id) {
      query += ` AND c.id = $${paramIndex}`;
      params.push(filters.company_id);
      paramIndex++;
    }
    
    if (filters.store_id) {
      query += ` AND r.store_id = $${paramIndex}`;
      params.push(filters.store_id);
      paramIndex++;
    }
    
    if (filters.room_type) {
      query += ` AND r.room_type = $${paramIndex}`;
      params.push(filters.room_type);
      paramIndex++;
    }
    
    if (filters.status) {
      query += ` AND r.status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }
    
    if (filters.min_capacity) {
      query += ` AND r.capacity >= $${paramIndex}`;
      params.push(parseInt(filters.min_capacity));
      paramIndex++;
    }
    
    if (filters.max_capacity) {
      query += ` AND r.capacity <= $${paramIndex}`;
      params.push(parseInt(filters.max_capacity));
      paramIndex++;
    }
    
    if (filters.keyword) {
      query += ` AND (r.name ILIKE $${paramIndex} OR r.description ILIKE $${paramIndex})`;
      params.push(`%${filters.keyword}%`);
      paramIndex++;
    }
    
    query += ' ORDER BY c.name, s.name, r.name';
    
    const result = await pool.query(query, params);
    return result.rows;
  }

  // 根据ID查询房间详情
  async findById(roomId) {
    const query = `
      SELECT r.*, 
        s.name as store_name,
        s.address as store_address,
        s.company_id,
        c.name as company_name,
        c.type as company_type
      FROM rooms r
      JOIN store s ON r.store_id = s.id
      JOIN company c ON s.company_id = c.id
      WHERE r.id = $1
    `;
    
    const result = await pool.query(query, [roomId]);
    return result.rows[0] || null;
  }

  // 根据ID和门店ID查询房间（权限控制）
  async findByIdAndStore(roomId, storeId) {
    const query = `
      SELECT r.*, 
        s.name as store_name,
        s.address as store_address,
        s.company_id,
        c.name as company_name
      FROM rooms r
      JOIN store s ON r.store_id = s.id
      JOIN company c ON s.company_id = c.id
      WHERE r.id = $1 AND r.store_id = $2 AND r.is_active = true
    `;
    
    const result = await pool.query(query, [roomId, storeId]);
    return result.rows[0] || null;
  }

  // 根据ID和公司ID查询房间（权限控制）
  async findByIdAndCompany(roomId, companyId) {
    const query = `
      SELECT r.*, 
        s.name as store_name,
        s.address as store_address,
        s.company_id,
        c.name as company_name
      FROM rooms r
      JOIN store s ON r.store_id = s.id
      JOIN company c ON s.company_id = c.id
      WHERE r.id = $1 AND c.id = $2 AND r.is_active = true
    `;
    
    const result = await pool.query(query, [roomId, companyId]);
    return result.rows[0] || null;
  }

  // 更新房间信息
  async update(roomId, updateData) {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    // 动态构建更新字段
    const allowedFields = ['name', 'room_type', 'capacity', 'status', 'description', 'equipment', 'notes', 'is_active'];
    
    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        fields.push(`${field} = $${paramIndex}`);
        values.push(updateData[field]);
        paramIndex++;
      }
    }

    if (fields.length === 0) {
      throw new Error('没有要更新的字段');
    }

    // 添加updated_at字段
    fields.push(`updated_at = NOW()`);
    
    // 添加WHERE条件的参数
    values.push(roomId);
    
    const query = `
      UPDATE rooms 
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // 删除房间（软删除）
  async delete(roomId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 软删除房间
      await client.query(
        'UPDATE rooms SET is_active = false, updated_at = NOW() WHERE id = $1',
        [roomId]
      );
      
      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // 检查房间名称是否在门店内唯一
  async checkNameUnique(storeId, name, excludeRoomId = null) {
    let query = `
      SELECT COUNT(*) as count 
      FROM rooms 
      WHERE store_id = $1 AND name = $2 AND is_active = true
    `;
    const params = [storeId, name];
    
    if (excludeRoomId) {
      query += ' AND id != $3';
      params.push(excludeRoomId);
    }
    
    const result = await pool.query(query, params);
    return parseInt(result.rows[0].count) === 0;
  }

  // 获取房间图片
  async getRoomImages(roomId) {
    const query = `
      SELECT * FROM room_images 
      WHERE room_id = $1 
      ORDER BY sort_order ASC, created_at ASC
    `;
    
    const result = await pool.query(query, [roomId]);
    return result.rows;
  }

  // 添加房间图片
  async addRoomImage(roomId, imageData) {
    const { image_url, image_name, sort_order = 0, is_primary = false } = imageData;
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 如果设置为主图，先取消其他主图
      if (is_primary) {
        await client.query(
          'UPDATE room_images SET is_primary = false WHERE room_id = $1',
          [roomId]
        );
      }

      // 添加新图片
      const query = `
        INSERT INTO room_images (room_id, image_url, image_name, sort_order, is_primary)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;
      
      const result = await client.query(query, [
        roomId, 
        image_url, 
        image_name, 
        sort_order, 
        is_primary
      ]);

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // 删除房间图片
  async deleteRoomImage(imageId) {
    const query = 'DELETE FROM room_images WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [imageId]);
    return result.rows[0];
  }

  // 更新图片排序
  async updateImageOrder(roomId, imageOrders) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      for (const { id, sort_order } of imageOrders) {
        await client.query(
          'UPDATE room_images SET sort_order = $1 WHERE id = $2 AND room_id = $3',
          [sort_order, id, roomId]
        );
      }

      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // 批量更新房间状态
  async batchUpdateStatus(roomIds, status, companyId = null) {
    let query = `
      UPDATE rooms 
      SET status = $1, updated_at = NOW()
      WHERE id = ANY($2) AND is_active = true
    `;
    const params = [status, roomIds];
    
    // 如果指定了公司ID，添加权限限制
    if (companyId) {
      query += ` AND store_id IN (SELECT id FROM store WHERE company_id = $3)`;
      params.push(companyId);
    }
    
    query += ' RETURNING *';
    
    const result = await pool.query(query, params);
    return result.rows;
  }

  // 获取房间统计信息
  async getRoomStats(storeId = null, companyId = null) {
    let query = `
      SELECT 
        COUNT(*) as total_rooms,
        COUNT(CASE WHEN status = '正常' THEN 1 END) as normal_rooms,
        COUNT(CASE WHEN status = '维护' THEN 1 END) as maintenance_rooms,
        COUNT(CASE WHEN status = '关闭' THEN 1 END) as closed_rooms,
        COUNT(CASE WHEN room_type = '剧本杀' THEN 1 END) as script_rooms,
        COUNT(CASE WHEN room_type = '密室' THEN 1 END) as escape_rooms,
        COUNT(CASE WHEN room_type = '混合' THEN 1 END) as mixed_rooms,
        AVG(capacity) as avg_capacity,
        SUM(capacity) as total_capacity
      FROM rooms r
      JOIN store s ON r.store_id = s.id
      WHERE r.is_active = true
    `;
    
    const params = [];
    let paramIndex = 1;
    
    if (storeId) {
      query += ` AND r.store_id = $${paramIndex}`;
      params.push(storeId);
      paramIndex++;
    } else if (companyId) {
      query += ` AND s.company_id = $${paramIndex}`;
      params.push(companyId);
      paramIndex++;
    }
    
    const result = await pool.query(query, params);
    return result.rows[0];
  }
}

module.exports = new RoomModel(); 