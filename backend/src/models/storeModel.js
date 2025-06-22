const pool = require('../database/connection');

class StoreModel {
  // 创建门店
  async create(storeData) {
    const { company_id, name, address, business_hours, timezone } = storeData;
    
    const query = `
      INSERT INTO store (company_id, name, address, business_hours, timezone)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      company_id, 
      name, 
      address, 
      business_hours ? JSON.stringify(business_hours) : null,
      timezone || 'Asia/Jakarta'
    ]);
    return result.rows[0];
  }

  // 根据公司ID查询门店列表（带用户统计）
  async findByCompanyId(companyId, filters = {}) {
    let query = `
      SELECT s.*, 
        (SELECT COUNT(*) FROM user_stores us WHERE us.store_id = s.id) as user_count,
        (SELECT COUNT(*) FROM user_stores us 
         JOIN users u ON us.user_id = u.id 
         WHERE us.store_id = s.id AND u.is_active = true) as active_user_count,
        (SELECT COUNT(*) FROM rooms r WHERE r.store_id = s.id AND r.is_active = true) as room_count,
        (SELECT COUNT(*) FROM rooms r WHERE r.store_id = s.id AND r.is_active = true AND r.status = '正常') as active_room_count
      FROM store s
      WHERE s.company_id = $1
    `;
    
    const params = [companyId];
    let paramIndex = 2;

    // 添加状态筛选
    if (filters.status) {
      if (filters.status === '正常') {
        query += ` AND s.is_active = true`;
      } else if (filters.status === '已停业') {
        query += ` AND s.is_active = false`;
      }
    }

    // 添加其他筛选条件
    if (filters.name) {
      query += ` AND s.name ILIKE $${paramIndex}`;
      params.push(`%${filters.name}%`);
      paramIndex++;
    }

    query += ` ORDER BY s.created_at DESC`;
    
    const result = await pool.query(query, params);
    return result.rows;
  }

  // 查询所有门店（平台管理员用）
  async findAllWithCompanyInfo(filters = {}) {
    let query = `
      SELECT s.*, 
        c.name as company_name,
        c.type as company_type,
        (SELECT COUNT(*) FROM user_stores us WHERE us.store_id = s.id) as user_count,
        (SELECT COUNT(*) FROM user_stores us 
         JOIN users u ON us.user_id = u.id 
         WHERE us.store_id = s.id AND u.is_active = true) as active_user_count,
        (SELECT COUNT(*) FROM rooms r WHERE r.store_id = s.id AND r.is_active = true) as room_count,
        (SELECT COUNT(*) FROM rooms r WHERE r.store_id = s.id AND r.is_active = true AND r.status = '正常') as active_room_count
      FROM store s
      JOIN company c ON s.company_id = c.id
      WHERE 1=1
    `;

    const params = [];
    let paramIndex = 1;

    // 添加状态筛选
    if (filters.status) {
      if (filters.status === '正常') {
        query += ` AND s.is_active = true`;
      } else if (filters.status === '已停业') {
        query += ` AND s.is_active = false`;
      }
    }

    // 添加其他筛选条件
    if (filters.company_id) {
      query += ` AND s.company_id = $${paramIndex}`;
      params.push(filters.company_id);
      paramIndex++;
    }

    if (filters.name) {
      query += ` AND s.name ILIKE $${paramIndex}`;
      params.push(`%${filters.name}%`);
      paramIndex++;
    }

    query += ` ORDER BY c.name, s.name`;
    
    const result = await pool.query(query, params);
    return result.rows;
  }

  // 根据ID查询门店详情
  async findById(storeId) {
    const query = `
      SELECT s.*, 
        c.name as company_name,
        c.type as company_type,
        c.contact_name as company_contact_name,
        c.contact_phone as company_contact_phone
      FROM store s
      JOIN company c ON s.company_id = c.id
      WHERE s.id = $1
    `;
    
    const result = await pool.query(query, [storeId]);
    return result.rows[0] || null;
  }

  // 根据ID和公司ID查询门店（权限控制）
  async findByIdAndCompany(storeId, companyId) {
    const query = `
      SELECT s.*, 
        c.name as company_name,
        c.type as company_type
      FROM store s
      JOIN company c ON s.company_id = c.id
      WHERE s.id = $1 AND s.company_id = $2
    `;
    
    const result = await pool.query(query, [storeId, companyId]);
    return result.rows[0] || null;
  }

  // 更新门店信息
  async update(storeId, updateData) {
    const { name, address, business_hours, timezone, is_active } = updateData;
    
    const query = `
      UPDATE store 
      SET name = $1, 
          address = $2, 
          business_hours = $3, 
          timezone = $4,
          is_active = $5,
          updated_at = NOW()
      WHERE id = $6
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      name, 
      address, 
      business_hours ? JSON.stringify(business_hours) : null,
      timezone,
      is_active !== undefined ? is_active : true,
      storeId
    ]);
    return result.rows[0];
  }

  // 删除门店（软删除）
  async delete(storeId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 检查是否有用户关联到此门店
      const userCheck = await client.query(
        'SELECT COUNT(*) as count FROM user_stores WHERE store_id = $1',
        [storeId]
      );
      
      if (parseInt(userCheck.rows[0].count) > 0) {
        throw new Error('门店下还有用户，无法删除');
      }

      // 软删除门店
      await client.query(
        'UPDATE store SET is_active = false, updated_at = NOW() WHERE id = $1',
        [storeId]
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

  // 获取门店的用户列表
  async getStoreUsers(storeId) {
    const query = `
      SELECT u.id, u.name, u.email, u.phone, u.account_level, u.is_active,
        r.name as role_name, r.display_name as role_display_name,
        us.is_primary,
        u.created_at
      FROM users u
      JOIN user_stores us ON u.id = us.user_id
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE us.store_id = $1 AND u.is_active = true
      ORDER BY us.is_primary DESC, u.name
    `;
    
    const result = await pool.query(query, [storeId]);
    return result.rows;
  }

  // 检查门店名称是否在公司内唯一
  async checkNameUnique(companyId, name, excludeStoreId = null) {
    let query = `
      SELECT COUNT(*) as count 
      FROM store 
      WHERE company_id = $1 AND name = $2 AND is_active = true
    `;
    const params = [companyId, name];
    
    if (excludeStoreId) {
      query += ' AND id != $3';
      params.push(excludeStoreId);
    }
    
    const result = await pool.query(query, params);
    return parseInt(result.rows[0].count) === 0;
  }

  // 获取用户可访问的门店列表（基于用户权限）
  async getAccessibleStores(userId, userAccountLevel, userCompanyId, filters = {}) {
    let query;
    let params = [];
    let paramIndex = 1;
    
    if (userAccountLevel === 'platform') {
      // 平台用户可以看到所有门店
      query = `
        SELECT s.*, c.name as company_name, c.type as company_type,
          (SELECT COUNT(*) FROM rooms r WHERE r.store_id = s.id AND r.is_active = true) as room_count,
          (SELECT COUNT(*) FROM rooms r WHERE r.store_id = s.id AND r.is_active = true AND r.status = '正常') as active_room_count
        FROM store s
        JOIN company c ON s.company_id = c.id
        WHERE 1=1
      `;
    } else if (userAccountLevel === 'company') {
      // 公司用户可以看到本公司所有门店
      query = `
        SELECT s.*, c.name as company_name, c.type as company_type,
          (SELECT COUNT(*) FROM rooms r WHERE r.store_id = s.id AND r.is_active = true) as room_count,
          (SELECT COUNT(*) FROM rooms r WHERE r.store_id = s.id AND r.is_active = true AND r.status = '正常') as active_room_count
        FROM store s
        JOIN company c ON s.company_id = c.id
        WHERE s.company_id = $${paramIndex}
      `;
      params.push(userCompanyId);
      paramIndex++;
    } else {
      // 门店用户只能看到自己关联的门店
      query = `
        SELECT s.*, c.name as company_name, c.type as company_type,
          (SELECT COUNT(*) FROM rooms r WHERE r.store_id = s.id AND r.is_active = true) as room_count,
          (SELECT COUNT(*) FROM rooms r WHERE r.store_id = s.id AND r.is_active = true AND r.status = '正常') as active_room_count
        FROM store s
        JOIN company c ON s.company_id = c.id
        JOIN user_stores us ON s.id = us.store_id
        WHERE us.user_id = $${paramIndex}
      `;
      params.push(userId);
      paramIndex++;
    }

    // 添加状态筛选
    if (filters.status) {
      if (filters.status === '正常') {
        query += ` AND s.is_active = true`;
      } else if (filters.status === '已停业') {
        query += ` AND s.is_active = false`;
      }
    }

    // 添加其他筛选条件
    if (filters.name) {
      query += ` AND s.name ILIKE $${paramIndex}`;
      params.push(`%${filters.name}%`);
      paramIndex++;
    }

    // 添加排序
    if (userAccountLevel === 'platform') {
      query += ` ORDER BY c.name, s.name`;
    } else {
      query += ` ORDER BY s.name`;
    }
    
    const result = await pool.query(query, params);
    return result.rows;
  }

  // 获取门店统计信息
  async getStoreStats(storeId) {
    const query = `
      SELECT 
        (SELECT COUNT(*) FROM user_stores us WHERE us.store_id = $1) as total_users,
        (SELECT COUNT(*) FROM user_stores us 
         JOIN users u ON us.user_id = u.id 
         WHERE us.store_id = $1 AND u.is_active = true) as active_users,
        (SELECT COUNT(*) FROM user_stores us 
         JOIN users u ON us.user_id = u.id 
         WHERE us.store_id = $1 AND u.account_level = 'store') as store_level_users
    `;
    
    const result = await pool.query(query, [storeId]);
    return result.rows[0];
  }
}

module.exports = new StoreModel(); 