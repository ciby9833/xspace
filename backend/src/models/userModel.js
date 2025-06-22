const pool = require('../database/connection');

class UserModel {
  // 查找所有用户
  async findAll(filters = {}) {
    let query = `
      SELECT DISTINCT u.id, u.name, u.email, u.phone, u.position, u.role_id, u.account_level, u.is_active, u.created_at, u.company_id,
        c.name as company_name,
        r.name as role_name, r.display_name as role_display_name
      FROM users u
      LEFT JOIN company c ON u.company_id = c.id
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN user_stores us ON u.id = us.user_id
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;
    
    // 添加筛选条件
    if (filters.name) {
      query += ` AND u.name ILIKE $${paramIndex}`;
      params.push(`%${filters.name}%`);
      paramIndex++;
    }
    
    if (filters.email) {
      query += ` AND u.email ILIKE $${paramIndex}`;
      params.push(`%${filters.email}%`);
      paramIndex++;
    }
    
    if (filters.position) {
      query += ` AND u.position = $${paramIndex}`;
      params.push(filters.position);
      paramIndex++;
    }
    
    if (filters.role_id) {
      query += ` AND u.role_id = $${paramIndex}`;
      params.push(filters.role_id);
      paramIndex++;
    }
    
    if (filters.store_id) {
      query += ` AND us.store_id = $${paramIndex}`;
      params.push(filters.store_id);
      paramIndex++;
    }
    
    if (filters.is_active !== undefined) {
      query += ` AND u.is_active = $${paramIndex}`;
      params.push(filters.is_active);
      paramIndex++;
    }
    
    query += ` ORDER BY u.created_at DESC`;
    
    const result = await pool.query(query, params);
    
    // 为每个用户添加门店信息
    const users = result.rows;
    for (const user of users) {
      const storeQuery = `
        SELECT s.id, s.name
        FROM store s
        JOIN user_stores us ON s.id = us.store_id
        WHERE us.user_id = $1
        ORDER BY us.is_primary DESC, s.name
      `;
      const storeResult = await pool.query(storeQuery, [user.id]);
      user.stores = storeResult.rows;
    }
    
    return users;
  }

  // 根据公司ID查询用户
  async findByCompanyId(companyId, filters = {}) {
    let query = `
      SELECT DISTINCT u.id, u.name, u.email, u.phone, u.position, u.role_id, u.account_level, u.is_active, u.created_at, u.company_id,
        c.name as company_name,
        r.name as role_name, r.display_name as role_display_name
      FROM users u
      LEFT JOIN company c ON u.company_id = c.id
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN user_stores us ON u.id = us.user_id
      WHERE u.company_id = $1
    `;
    
    const params = [companyId];
    let paramIndex = 2;
    
    // 添加筛选条件
    if (filters.name) {
      query += ` AND u.name ILIKE $${paramIndex}`;
      params.push(`%${filters.name}%`);
      paramIndex++;
    }
    
    if (filters.email) {
      query += ` AND u.email ILIKE $${paramIndex}`;
      params.push(`%${filters.email}%`);
      paramIndex++;
    }
    
    if (filters.position) {
      query += ` AND u.position = $${paramIndex}`;
      params.push(filters.position);
      paramIndex++;
    }
    
    if (filters.role_id) {
      query += ` AND u.role_id = $${paramIndex}`;
      params.push(filters.role_id);
      paramIndex++;
    }
    
    if (filters.store_id) {
      query += ` AND us.store_id = $${paramIndex}`;
      params.push(filters.store_id);
      paramIndex++;
    }
    
    if (filters.is_active !== undefined) {
      query += ` AND u.is_active = $${paramIndex}`;
      params.push(filters.is_active);
      paramIndex++;
    }
    
    query += ` ORDER BY u.created_at DESC`;
    
    const result = await pool.query(query, params);
    
    // 为每个用户添加门店信息
    const users = result.rows;
    for (const user of users) {
      const storeQuery = `
        SELECT s.id, s.name
        FROM store s
        JOIN user_stores us ON s.id = us.store_id
        WHERE us.user_id = $1
        ORDER BY us.is_primary DESC, s.name
      `;
      const storeResult = await pool.query(storeQuery, [user.id]);
      user.stores = storeResult.rows;
    }
    
    return users;
  }

  // 根据门店ID查询用户
  async findByStoreId(storeId, filters = {}) {
    let query = `
      SELECT DISTINCT u.id, u.name, u.email, u.phone, u.position, u.role_id, u.account_level, u.is_active, u.created_at, u.company_id,
        c.name as company_name,
        r.name as role_name, r.display_name as role_display_name
      FROM users u
      LEFT JOIN company c ON u.company_id = c.id
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN user_stores us ON u.id = us.user_id
      WHERE us.store_id = $1
    `;
    
    const params = [storeId];
    let paramIndex = 2;
    
    // 添加筛选条件
    if (filters.name) {
      query += ` AND u.name ILIKE $${paramIndex}`;
      params.push(`%${filters.name}%`);
      paramIndex++;
    }
    
    if (filters.email) {
      query += ` AND u.email ILIKE $${paramIndex}`;
      params.push(`%${filters.email}%`);
      paramIndex++;
    }
    
    if (filters.position) {
      query += ` AND u.position = $${paramIndex}`;
      params.push(filters.position);
      paramIndex++;
    }
    
    if (filters.role_id) {
      query += ` AND u.role_id = $${paramIndex}`;
      params.push(filters.role_id);
      paramIndex++;
    }
    
    if (filters.is_active !== undefined) {
      query += ` AND u.is_active = $${paramIndex}`;
      params.push(filters.is_active);
      paramIndex++;
    }
    
    query += ` ORDER BY u.created_at DESC`;
    
    const result = await pool.query(query, params);
    
    // 为每个用户添加门店信息
    const users = result.rows;
    for (const user of users) {
      const storeQuery = `
        SELECT s.id, s.name
        FROM store s
        JOIN user_stores us ON s.id = us.store_id
        WHERE us.user_id = $1
        ORDER BY us.is_primary DESC, s.name
      `;
      const storeResult = await pool.query(storeQuery, [user.id]);
      user.stores = storeResult.rows;
    }
    
    return users;
  }

  // 根据部门ID查询用户
  async findByDepartmentId(departmentId) {
    const query = `
      SELECT u.id, u.name, u.email, u.phone, u.role_id, u.account_level, u.is_active, u.created_at,
        c.name as company_name,
        r.name as role_name, r.display_name as role_display_name,
        json_agg(json_build_object(
          'id', s.id,
          'name', s.name
        )) as stores
      FROM users u
      LEFT JOIN company c ON u.company_id = c.id
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN user_stores us ON u.id = us.user_id
      LEFT JOIN store s ON us.store_id = s.id
      WHERE u.department_id = $1
      GROUP BY u.id, u.name, u.email, u.phone, u.role_id, u.account_level, u.is_active, u.created_at, c.name, r.name, r.display_name
      ORDER BY u.created_at DESC
    `;
    const result = await pool.query(query, [departmentId]);
    return result.rows;
  }

  // 根据ID查询用户（包含完整信息）
  async findByIdWithCompanyInfo(userId) {
    const query = `
      SELECT u.id, u.name, u.email, u.phone, u.position, u.role_id, u.account_level, u.company_id, u.timezone, u.is_active, u.created_at,
        c.name as company_name, c.timezone as company_timezone,
        r.name as role_name, r.display_name as role_display_name,
        json_agg(json_build_object(
          'id', s.id,
          'name', s.name,
          'timezone', s.timezone
        )) FILTER (WHERE s.id IS NOT NULL) as stores,
        COALESCE(u.timezone, c.timezone, 'Asia/Jakarta') as effective_timezone
      FROM users u
      LEFT JOIN company c ON u.company_id = c.id
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN user_stores us ON u.id = us.user_id
      LEFT JOIN store s ON us.store_id = s.id
      WHERE u.id = $1
      GROUP BY u.id, u.name, u.email, u.phone, u.position, u.role_id, u.account_level, u.company_id, u.timezone, u.is_active, u.created_at, c.name, c.timezone, r.name, r.display_name
    `;
    const result = await pool.query(query, [userId]);
    return result.rows[0] || null;
  }



  // 更新最后登录时间
  async updateLastLogin(userId) {
    const query = 'UPDATE users SET last_login_at = NOW() WHERE id = $1';
    await pool.query(query, [userId]);
  }

  // 更新用户时区
  async updateTimezone(userId, timezone) {
    const query = `
      UPDATE users 
      SET timezone = $1, updated_at = NOW() 
      WHERE id = $2
      RETURNING timezone
    `;
    
    const result = await pool.query(query, [timezone, userId]);
    return result.rows[0];
  }

  /**
   * 通过邮箱查找用户（包含公司和门店信息）
   * @param {string} email - 用户邮箱
   * @returns {Promise<Object>} 用户信息
   */
  async findByEmailWithCompanyInfo(email) {
    const query = `
      SELECT 
        u.*,
        c.name as company_name,
        c.type as company_type,
        c.timezone as company_timezone,
        r.name as role_name, 
        r.display_name as role_display_name,
        json_agg(
          json_build_object(
            'id', s.id,
            'name', s.name,
            'is_primary', us.is_primary
          )
        ) as stores
      FROM users u
      LEFT JOIN company c ON u.company_id = c.id
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN user_stores us ON u.id = us.user_id
      LEFT JOIN store s ON us.store_id = s.id
      WHERE u.email = $1
      GROUP BY u.id, u.name, u.email, u.phone, u.position, u.role_id, u.account_level, u.company_id, u.timezone, u.is_active, u.created_at, u.updated_at, u.last_login_at, c.id, c.name, c.type, c.timezone, r.id, r.name, r.display_name
    `;

    const result = await pool.query(query, [email]);
    return result.rows[0] || null;
  }

  /**
   * 通过邮箱查找用户
   * @param {string} email - 用户邮箱
   * @returns {Promise<Object>} 用户信息
   */
  async findByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await pool.query(query, [email]);
    return result.rows[0] || null;
  }

  /**
   * 检查邮箱是否存在
   * @param {string} email - 用户邮箱
   * @returns {Promise<boolean>} 是否存在
   */
  async emailExists(email) {
    const query = 'SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)';
    const result = await pool.query(query, [email]);
    return result.rows[0].exists;
  }

  /**
   * 检查手机号是否存在
   * @param {string} phone - 用户手机号
   * @returns {Promise<boolean>} 是否存在
   */
  async phoneExists(phone) {
    const query = 'SELECT EXISTS(SELECT 1 FROM users WHERE phone = $1)';
    const result = await pool.query(query, [phone]);
    return result.rows[0].exists;
  }

  /**
   * 获取用户关联的门店
   * @param {string} userId - 用户ID
   * @returns {Promise<Array>} 门店列表
   */
  async getUserStores(userId) {
    const query = `
      SELECT 
        s.*,
        us.is_primary
      FROM store s
      JOIN user_stores us ON s.id = us.store_id
      WHERE us.user_id = $1
      ORDER BY us.is_primary DESC, s.name
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  /**
   * 创建用户
   * @param {Object} userData - 用户数据
   * @returns {Promise<Object>} 创建的用户
   */
  async create(userData) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 创建用户
      const userQuery = `
        INSERT INTO users (
          company_id,
          email,
          phone,
          password_hash,
          name,
          position,
          role_id,
          account_level,
          timezone
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;
      
      const userResult = await client.query(userQuery, [
        userData.company_id,
        userData.email,
        userData.phone,
        userData.password_hash,
        userData.name,
        userData.position,
        userData.role_id,
        userData.account_level || 'store',
        userData.timezone || 'Asia/Jakarta'
      ]);

      const user = userResult.rows[0];

      // 如果提供了门店列表，创建用户-门店关联
      if (userData.stores && userData.stores.length > 0) {
        const storeValues = userData.stores.map((storeId, index) => 
          `($1, $${index + 2}, ${index === 0})`
        ).join(', ');

        const storeQuery = `
          INSERT INTO user_stores (user_id, store_id, is_primary)
          VALUES ${storeValues}
        `;

        await client.query(storeQuery, [user.id, ...userData.stores]);
      }

      await client.query('COMMIT');
      return await this.findByIdWithCompanyInfo(user.id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 更新用户
   * @param {string} id - 用户ID
   * @param {Object} userData - 用户数据
   * @returns {Promise<Object>} 更新后的用户
   */
  async update(id, userData) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 构建更新字段
      const updateFields = [];
      const values = [];
      let paramIndex = 1;

      for (const [key, value] of Object.entries(userData)) {
        if (key !== 'stores' && key !== 'id') {
          updateFields.push(`${key} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
      }

      if (updateFields.length > 0) {
        const updateQuery = `
          UPDATE users 
          SET ${updateFields.join(', ')}, updated_at = NOW()
          WHERE id = $${paramIndex}
          RETURNING *
        `;
        values.push(id);
        
        await client.query(updateQuery, values);
      }

      // 如果提供了门店列表，更新用户-门店关联
      if (userData.stores) {
        // 删除现有关联
        await client.query('DELETE FROM user_stores WHERE user_id = $1', [id]);

        // 创建新关联
        if (userData.stores.length > 0) {
          const storeValues = userData.stores.map((storeId, index) => 
            `($1, $${index + 2}, ${index === 0})`
          ).join(', ');

          const storeQuery = `
            INSERT INTO user_stores (user_id, store_id, is_primary)
            VALUES ${storeValues}
          `;

          await client.query(storeQuery, [id, ...userData.stores]);
        }
      }

      await client.query('COMMIT');
      return await this.findByIdWithCompanyInfo(id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 删除用户
   * @param {string} id - 用户ID
   * @returns {Promise<boolean>} 是否删除成功
   */
  async delete(id) {
    const query = 'DELETE FROM users WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rowCount > 0;
  }
}

module.exports = new UserModel();