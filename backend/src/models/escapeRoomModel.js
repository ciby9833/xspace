const pool = require('../database/connection');

class EscapeRoomModel {
  // 根据公司ID获取密室列表
  async findByCompanyId(companyId, filters = {}) {
    let query = `
      SELECT er.*, 
        COUNT(ser.store_id) as store_count,
        ARRAY_AGG(DISTINCT st.name) FILTER (WHERE st.name IS NOT NULL) as store_names
      FROM escape_rooms er
      LEFT JOIN store_escape_rooms ser ON er.id = ser.escape_room_id AND ser.is_available = true
      LEFT JOIN store st ON ser.store_id = st.id
      WHERE er.company_id = $1
    `;
    
    const params = [companyId];
    let paramIndex = 2;

    // 添加筛选条件
    if (filters.horror_level) {
      query += ` AND er.horror_level = $${paramIndex}`;
      params.push(filters.horror_level);
      paramIndex++;
    }

    // 🆕 添加多恐怖等级筛选支持
    if (filters.horror_levels && Array.isArray(filters.horror_levels) && filters.horror_levels.length > 0) {
      query += ` AND er.horror_level = ANY($${paramIndex})`;
      params.push(filters.horror_levels);
      paramIndex++;
    }

    if (filters.is_active !== undefined) {
      query += ` AND er.is_active = $${paramIndex}`;
      params.push(filters.is_active);
      paramIndex++;
    }

    if (filters.min_players) {
      query += ` AND er.max_players >= $${paramIndex}`;
      params.push(filters.min_players);
      paramIndex++;
    }

    // 🆕 添加价格范围筛选
    if (filters.min_price !== undefined && filters.min_price !== null) {
      query += ` AND er.price >= $${paramIndex}`;
      params.push(filters.min_price);
      paramIndex++;
    }

    if (filters.max_price !== undefined && filters.max_price !== null) {
      query += ` AND er.price <= $${paramIndex}`;
      params.push(filters.max_price);
      paramIndex++;
    }

    // 🆕 添加最大人数筛选（如果需要精确匹配人数范围）
    if (filters.max_players) {
      query += ` AND er.min_players <= $${paramIndex}`;
      params.push(filters.max_players);
      paramIndex++;
    }

    // 🆕 添加时长筛选
    if (filters.min_duration) {
      query += ` AND er.duration >= $${paramIndex}`;
      params.push(filters.min_duration);
      paramIndex++;
    }

    if (filters.max_duration) {
      query += ` AND er.duration <= $${paramIndex}`;
      params.push(filters.max_duration);
      paramIndex++;
    }

    // 🆕 添加NPC数量筛选
    if (filters.min_npc_count !== undefined && filters.min_npc_count !== null) {
      query += ` AND er.npc_count >= $${paramIndex}`;
      params.push(filters.min_npc_count);
      paramIndex++;
    }

    if (filters.max_npc_count !== undefined && filters.max_npc_count !== null) {
      query += ` AND er.npc_count <= $${paramIndex}`;
      params.push(filters.max_npc_count);
      paramIndex++;
    }

    // 🆕 添加关键词搜索（名称、描述）
    if (filters.keyword) {
      query += ` AND (er.name ILIKE $${paramIndex} OR er.description ILIKE $${paramIndex})`;
      params.push(`%${filters.keyword}%`);
      paramIndex++;
    }

    // 🆕 添加语言筛选
    if (filters.language) {
      query += ` AND er.supported_languages::jsonb ? $${paramIndex}`;
      params.push(filters.language);
      paramIndex++;
    }

    // 🆕 添加多语言筛选支持
    if (filters.languages && Array.isArray(filters.languages) && filters.languages.length > 0) {
      const languageConditions = filters.languages.map(() => `er.supported_languages::jsonb ? $${paramIndex++}`);
      query += ` AND (${languageConditions.join(' OR ')})`;
      params.push(...filters.languages);
    }

    // 🆕 添加门店筛选
    if (filters.store_id) {
      query += ` AND ser.store_id = $${paramIndex} AND ser.is_available = true`;
      params.push(filters.store_id);
      paramIndex++;
    }

    query += ` GROUP BY er.id ORDER BY er.created_at DESC`;

    const result = await pool.query(query, params);
    return result.rows;
  }

  // 根据门店ID获取可用密室
  async findByStoreId(storeId, filters = {}) {
    let query = `
      SELECT er.*, ser.store_price, ser.is_available as store_available, ser.sort_order
      FROM escape_rooms er
      INNER JOIN store_escape_rooms ser ON er.id = ser.escape_room_id
      WHERE ser.store_id = $1 AND er.is_active = true AND ser.is_available = true
    `;
    
    const params = [storeId];
    let paramIndex = 2;

    // 添加关键词搜索
    if (filters.keyword) {
      query += ` AND (er.name ILIKE $${paramIndex} OR er.description ILIKE $${paramIndex})`;
      params.push(`%${filters.keyword}%`);
      paramIndex++;
    }

    // 添加语言筛选
    if (filters.language) {
      query += ` AND er.supported_languages::jsonb ? $${paramIndex}`;
      params.push(filters.language);
      paramIndex++;
    }

    query += ` ORDER BY ser.sort_order ASC, er.created_at DESC`;
    
    const result = await pool.query(query, params);
    return result.rows;
  }

  // 根据ID获取密室详情
  async findById(escapeRoomId, companyId = null) {
    let query = `
      SELECT er.*, 
        COUNT(ser.store_id) as store_count,
        ARRAY_AGG(
          CASE WHEN ser.store_id IS NOT NULL THEN
            json_build_object(
              'store_id', st.id,
              'store_name', st.name,
              'store_price', ser.store_price,
              'is_available', ser.is_available
            )
          END
        ) FILTER (WHERE ser.store_id IS NOT NULL) as store_configs
      FROM escape_rooms er
      LEFT JOIN store_escape_rooms ser ON er.id = ser.escape_room_id
      LEFT JOIN store st ON ser.store_id = st.id
      WHERE er.id = $1
    `;

    const params = [escapeRoomId];

    if (companyId) {
      query += ` AND er.company_id = $2`;
      params.push(companyId);
    }

    query += ` GROUP BY er.id`;

    const result = await pool.query(query, params);
    return result.rows[0] || null;
  }

  // 创建密室
  async create(escapeRoomData) {
    const {
      company_id, name, horror_level, price, cover_images, min_players, max_players,
      duration, npc_count, npc_roles, description, props, supported_languages
    } = escapeRoomData;

    const query = `
      INSERT INTO escape_rooms (
        company_id, name, horror_level, price, cover_images, min_players, max_players,
        duration, npc_count, npc_roles, description, props, supported_languages
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;

    const result = await pool.query(query, [
      company_id, name, horror_level, price, JSON.stringify(cover_images || []), 
      min_players, max_players, duration, npc_count || 0, npc_roles, description, props,
      JSON.stringify(supported_languages || ['IND'])
    ]);

    return result.rows[0];
  }

  // 更新密室
  async update(escapeRoomId, updateData) {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    // 动态构建更新字段
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        fields.push(`${key} = $${paramIndex}`);
        // 特殊处理JSON字段
        if (['cover_images', 'supported_languages'].includes(key)) {
          values.push(JSON.stringify(updateData[key]));
        } else {
          values.push(updateData[key]);
        }
        paramIndex++;
      }
    });

    if (fields.length === 0) {
      throw new Error('没有要更新的字段');
    }

    fields.push(`updated_at = NOW()`);
    values.push(escapeRoomId);

    const query = `
      UPDATE escape_rooms 
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // 删除密室（软删除）
  async delete(escapeRoomId) {
    const query = `
      UPDATE escape_rooms 
      SET is_active = false, updated_at = NOW()
      WHERE id = $1
      RETURNING id, cover_images
    `;
    
    const result = await pool.query(query, [escapeRoomId]);
    return result.rows[0];
  }

  // 配置门店密室
  async configureForStore(storeId, escapeRoomId, config) {
    const { store_price, is_available = true, sort_order = 0 } = config;

    const query = `
      INSERT INTO store_escape_rooms (store_id, escape_room_id, store_price, is_available, sort_order)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (store_id, escape_room_id) 
      DO UPDATE SET 
        store_price = EXCLUDED.store_price,
        is_available = EXCLUDED.is_available,
        sort_order = EXCLUDED.sort_order
      RETURNING *
    `;

    const result = await pool.query(query, [storeId, escapeRoomId, store_price, is_available, sort_order]);
    return result.rows[0];
  }

  // 获取恐怖等级统计
  async getHorrorLevelStats(companyId) {
    const query = `
      SELECT horror_level, COUNT(*) as count, AVG(price) as avg_price
      FROM escape_rooms 
      WHERE company_id = $1 AND is_active = true
      GROUP BY horror_level
      ORDER BY 
        CASE horror_level 
          WHEN '非恐' THEN 1 
          WHEN '微恐' THEN 2 
          WHEN '中恐' THEN 3 
          WHEN '重恐' THEN 4 
        END
    `;

    const result = await pool.query(query, [companyId]);
    return result.rows;
  }

  // 批量更新状态
  async batchUpdateStatus(escapeRoomIds, isActive, companyId) {
    const query = `
      UPDATE escape_rooms 
      SET is_active = $1, updated_at = NOW()
      WHERE id = ANY($2) AND company_id = $3
      RETURNING id
    `;

    const result = await pool.query(query, [isActive, escapeRoomIds, companyId]);
    return result.rows;
  }

  // 批量删除
  async batchDelete(escapeRoomIds, companyId) {
    const query = `
      UPDATE escape_rooms 
      SET is_active = false, updated_at = NOW()
      WHERE id = ANY($1) AND company_id = $2
      RETURNING id, cover_images
    `;

    const result = await pool.query(query, [escapeRoomIds, companyId]);
    return result.rows;
  }

  // 批量配置门店密室
  async batchConfigureStores(escapeRoomId, storeConfigs) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // 先删除现有配置
      await client.query(
        'DELETE FROM store_escape_rooms WHERE escape_room_id = $1',
        [escapeRoomId]
      );
      
      // 批量插入新配置
      if (storeConfigs && storeConfigs.length > 0) {
        const values = storeConfigs.map((config, index) => {
          const baseIndex = index * 4;
          return `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4})`;
        }).join(', ');
        
        const params = storeConfigs.flatMap(config => [
          config.store_id,
          escapeRoomId,
          config.store_price || null,
          config.is_available !== false // 默认为true
        ]);
        
        const insertQuery = `
          INSERT INTO store_escape_rooms (store_id, escape_room_id, store_price, is_available)
          VALUES ${values}
        `;
        
        await client.query(insertQuery, params);
      }
      
      await client.query('COMMIT');
      return { success: true };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // 获取公司门店列表（用于密室配置）
  async getCompanyStores(companyId) {
    const query = `
      SELECT id, name, address
      FROM store 
      WHERE company_id = $1 AND is_active = true
      ORDER BY name
    `;
    
    const result = await pool.query(query, [companyId]);
    return result.rows;
  }

  // 获取密室的门店配置
  async getEscapeRoomStoreConfigs(escapeRoomId) {
    const query = `
      SELECT ser.*, s.name as store_name, s.address as store_address
      FROM store_escape_rooms ser
      JOIN store s ON ser.store_id = s.id
      WHERE ser.escape_room_id = $1
      ORDER BY s.name
    `;
    
    const result = await pool.query(query, [escapeRoomId]);
    return result.rows;
  }
}

module.exports = new EscapeRoomModel(); 