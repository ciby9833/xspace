const pool = require('../database/connection');

class ScriptModel {
  // 根据公司ID获取剧本列表
  async findByCompanyId(companyId, filters = {}) {
    let query = `
      SELECT s.*, 
        COUNT(ss.store_id) as store_count,
        ARRAY_AGG(DISTINCT st.name) FILTER (WHERE st.name IS NOT NULL) as store_names
      FROM scripts s
      LEFT JOIN store_scripts ss ON s.id = ss.script_id AND ss.is_available = true
      LEFT JOIN store st ON ss.store_id = st.id
      WHERE s.company_id = $1
    `;
    
    const params = [companyId];
    let paramIndex = 2;

    // 添加筛选条件
    if (filters.type) {
      query += ` AND s.type = $${paramIndex}`;
      params.push(filters.type);
      paramIndex++;
    }

    // 🆕 添加多类型筛选支持
    if (filters.types && Array.isArray(filters.types) && filters.types.length > 0) {
      query += ` AND s.type = ANY($${paramIndex})`;
      params.push(filters.types);
      paramIndex++;
    }

    // 🆕 添加剧本背景筛选
    if (filters.background) {
      query += ` AND s.background = $${paramIndex}`;
      params.push(filters.background);
      paramIndex++;
    }

    if (filters.is_active !== undefined) {
      query += ` AND s.is_active = $${paramIndex}`;
      params.push(filters.is_active);
      paramIndex++;
    }

    if (filters.min_players) {
      query += ` AND s.max_players >= $${paramIndex}`;
      params.push(filters.min_players);
      paramIndex++;
    }

    // 🆕 添加最大人数筛选（如果需要精确匹配人数范围）
    if (filters.max_players) {
      query += ` AND s.min_players <= $${paramIndex}`;
      params.push(filters.max_players);
      paramIndex++;
    }

    // 🆕 添加难度筛选
    if (filters.difficulty) {
      query += ` AND s.difficulty = $${paramIndex}`;
      params.push(filters.difficulty);
      paramIndex++;
    }

    // 🆕 添加价格范围筛选
    if (filters.min_price !== undefined && filters.min_price !== null) {
      query += ` AND s.price >= $${paramIndex}`;
      params.push(filters.min_price);
      paramIndex++;
    }

    if (filters.max_price !== undefined && filters.max_price !== null) {
      query += ` AND s.price <= $${paramIndex}`;
      params.push(filters.max_price);
      paramIndex++;
    }

    // 🆕 添加时长筛选
    if (filters.min_duration) {
      query += ` AND s.duration >= $${paramIndex}`;
      params.push(filters.min_duration);
      paramIndex++;
    }

    if (filters.max_duration) {
      query += ` AND s.duration <= $${paramIndex}`;
      params.push(filters.max_duration);
      paramIndex++;
    }

    // 🆕 添加关键词搜索（名称、描述、背景）
    if (filters.keyword) {
      query += ` AND (s.name ILIKE $${paramIndex} OR s.description ILIKE $${paramIndex} OR s.background ILIKE $${paramIndex})`;
      params.push(`%${filters.keyword}%`);
      paramIndex++;
    }

    // 🆕 添加标签筛选（JSON数组包含查询）
    if (filters.tag) {
      query += ` AND s.tags::jsonb ? $${paramIndex}`;
      params.push(filters.tag);
      paramIndex++;
    }

    // 🆕 添加门店筛选
    if (filters.store_id) {
      query += ` AND ss.store_id = $${paramIndex} AND ss.is_available = true`;
      params.push(filters.store_id);
      paramIndex++;
    }

    query += ` GROUP BY s.id ORDER BY s.created_at DESC`;

    const result = await pool.query(query, params);
    return result.rows;
  }

  // 根据门店ID获取可用剧本
  async findByStoreId(storeId, filters = {}) {
    let query = `
      SELECT s.*, ss.store_price, ss.is_available as store_available, ss.sort_order
      FROM scripts s
      INNER JOIN store_scripts ss ON s.id = ss.script_id
      WHERE ss.store_id = $1 AND s.is_active = true AND ss.is_available = true
    `;
    
    const params = [storeId];
    let paramIndex = 2;

    // 添加关键词搜索
    if (filters.keyword) {
      query += ` AND (s.name ILIKE $${paramIndex} OR s.description ILIKE $${paramIndex} OR s.background ILIKE $${paramIndex})`;
      params.push(`%${filters.keyword}%`);
      paramIndex++;
    }

    query += ` ORDER BY ss.sort_order ASC, s.created_at DESC`;
    
    const result = await pool.query(query, params);
    return result.rows;
  }

  // 根据ID获取剧本详情
  async findById(scriptId, companyId = null) {
    let query = `
      SELECT s.*, 
        COUNT(ss.store_id) as store_count,
        ARRAY_AGG(
          CASE WHEN ss.store_id IS NOT NULL THEN
            json_build_object(
              'store_id', st.id,
              'store_name', st.name,
              'store_price', ss.store_price,
              'is_available', ss.is_available
            )
          END
        ) FILTER (WHERE ss.store_id IS NOT NULL) as store_configs
      FROM scripts s
      LEFT JOIN store_scripts ss ON s.id = ss.script_id
      LEFT JOIN store st ON ss.store_id = st.id
      WHERE s.id = $1
    `;

    const params = [scriptId];

    if (companyId) {
      query += ` AND s.company_id = $2`;
      params.push(companyId);
    }

    query += ` GROUP BY s.id`;

    const result = await pool.query(query, params);
    return result.rows[0] || null;
  }

  // 创建剧本
  async create(scriptData) {
    const {
      company_id, name, type, background, description, min_players, max_players,
      duration, difficulty, price, images, tags, props
    } = scriptData;

    const query = `
      INSERT INTO scripts (
        company_id, name, type, background, description, min_players, max_players,
        duration, difficulty, price, images, tags, props
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;

    const result = await pool.query(query, [
      company_id, name, type, background, description, min_players, max_players,
      duration, difficulty, price, JSON.stringify(images || []), JSON.stringify(tags || []), props
    ]);

    return result.rows[0];
  }

  // 更新剧本
  async update(scriptId, updateData) {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    // 动态构建更新字段
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        fields.push(`${key} = $${paramIndex}`);
        // 特殊处理JSON字段
        if (['tags', 'images'].includes(key)) {
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
    values.push(scriptId);

    const query = `
      UPDATE scripts 
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // 删除剧本（软删除）
  async delete(scriptId) {
    const query = `
      UPDATE scripts 
      SET is_active = false, updated_at = NOW()
      WHERE id = $1
      RETURNING id, images
    `;
    
    const result = await pool.query(query, [scriptId]);
    return result.rows[0];
  }

  // 配置门店剧本
  async configureForStore(storeId, scriptId, config) {
    const { store_price, is_available = true, sort_order = 0 } = config;

    const query = `
      INSERT INTO store_scripts (store_id, script_id, store_price, is_available, sort_order)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (store_id, script_id) 
      DO UPDATE SET 
        store_price = EXCLUDED.store_price,
        is_available = EXCLUDED.is_available,
        sort_order = EXCLUDED.sort_order
      RETURNING *
    `;

    const result = await pool.query(query, [storeId, scriptId, store_price, is_available, sort_order]);
    return result.rows[0];
  }

  // 获取剧本类型统计
  async getTypeStats(companyId) {
    const query = `
      SELECT type, COUNT(*) as count, AVG(price) as avg_price
      FROM scripts 
      WHERE company_id = $1 AND is_active = true
      GROUP BY type
      ORDER BY count DESC
    `;

    const result = await pool.query(query, [companyId]);
    return result.rows;
  }

  // 批量更新状态
  async batchUpdateStatus(scriptIds, isActive, companyId) {
    const query = `
      UPDATE scripts 
      SET is_active = $1, updated_at = NOW()
      WHERE id = ANY($2) AND company_id = $3
      RETURNING id
    `;

    const result = await pool.query(query, [isActive, scriptIds, companyId]);
    return result.rows;
  }

  // 批量删除
  async batchDelete(scriptIds, companyId) {
    const query = `
      UPDATE scripts 
      SET is_active = false, updated_at = NOW()
      WHERE id = ANY($1) AND company_id = $2
      RETURNING id, images
    `;

    const result = await pool.query(query, [scriptIds, companyId]);
    return result.rows;
  }

  // 🆕 批量配置门店剧本
  async batchConfigureStores(scriptId, storeConfigs) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // 先删除现有配置
      await client.query(
        'DELETE FROM store_scripts WHERE script_id = $1',
        [scriptId]
      );
      
      // 批量插入新配置
      if (storeConfigs && storeConfigs.length > 0) {
        const values = storeConfigs.map((config, index) => {
          const baseIndex = index * 4;
          return `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4})`;
        }).join(', ');
        
        const params = storeConfigs.flatMap(config => [
          config.store_id,
          scriptId,
          config.store_price || null,
          config.is_available !== false // 默认为true
        ]);
        
        const insertQuery = `
          INSERT INTO store_scripts (store_id, script_id, store_price, is_available)
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

  // 🆕 获取公司门店列表（用于剧本配置）
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

  // 🆕 获取剧本的门店配置
  async getScriptStoreConfigs(scriptId) {
    const query = `
      SELECT ss.*, s.name as store_name, s.address as store_address
      FROM store_scripts ss
      JOIN store s ON ss.store_id = s.id
      WHERE ss.script_id = $1
      ORDER BY s.name
    `;
    
    const result = await pool.query(query, [scriptId]);
    return result.rows;
  }
}

module.exports = new ScriptModel(); 