//角色定价模板模型
const pool = require('../database/connection');

class RolePricingTemplateModel {
  // 创建角色定价模板
  async create(templateData) {
    const { 
      company_id, 
      store_ids = [],
      role_name, 
      role_description,
      discount_type = 'percentage',
      discount_value = 0,
      valid_from,
      valid_to,
      is_active = true,
      sort_order = 0
    } = templateData;
    
    const query = `
      INSERT INTO role_pricing_templates (
        company_id, store_ids, role_name, role_description,
        discount_type, discount_value, valid_from, valid_to,
        is_active, sort_order
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      company_id, store_ids, role_name, role_description,
      discount_type, discount_value, valid_from, valid_to,
      is_active, sort_order
    ]);
    
    return result.rows[0];
  }

  // 批量创建角色定价模板
  async createBatch(templatesData) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const createdTemplates = [];
      for (const templateData of templatesData) {
        const result = await this.create(templateData);
        createdTemplates.push(result);
      }
      
      await client.query('COMMIT');
      return createdTemplates;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // 根据公司ID获取所有角色定价模板
  async findByCompanyId(companyId) {
    const query = `
      SELECT rpt.*,
        c.name as company_name,
        CASE 
          WHEN rpt.discount_type = 'percentage' THEN CONCAT(rpt.discount_value, '%')
          WHEN rpt.discount_type = 'fixed' THEN CONCAT('Rp ', rpt.discount_value)
          ELSE '免费'
        END as discount_display,
        CASE 
          WHEN rpt.is_active = true THEN '激活'
          ELSE '未激活'
        END as status_text
      FROM role_pricing_templates rpt
      LEFT JOIN company c ON rpt.company_id = c.id
      WHERE rpt.company_id = $1
      ORDER BY rpt.sort_order ASC, rpt.role_name ASC
    `;
    
    const result = await pool.query(query, [companyId]);
    return result.rows;
  }

  // 根据公司ID获取角色定价模板（支持分页和过滤）
  async findByCompanyIdWithPagination(companyId, filters = {}, pagination = {}) {
    const { offset = 0, limit = 10 } = pagination;
    const { role_name, store_id, discount_type, is_active } = filters;

    // 构建WHERE条件
    let whereConditions = ['rpt.company_id = $1'];
    let queryParams = [companyId];
    let paramIndex = 2;

    if (role_name) {
      whereConditions.push(`rpt.role_name ILIKE $${paramIndex}`);
      queryParams.push(`%${role_name}%`);
      paramIndex++;
    }

    if (store_id) {
      whereConditions.push(`($${paramIndex} = ANY(rpt.store_ids) OR rpt.store_ids IS NULL)`);
      queryParams.push(store_id);
      paramIndex++;
    }

    if (discount_type) {
      whereConditions.push(`rpt.discount_type = $${paramIndex}`);
      queryParams.push(discount_type);
      paramIndex++;
    }

    if (is_active !== undefined) {
      whereConditions.push(`rpt.is_active = $${paramIndex}`);
      queryParams.push(is_active);
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');

    // 查询总数
    const countQuery = `
      SELECT COUNT(*) as total
      FROM role_pricing_templates rpt
      WHERE ${whereClause}
    `;
    
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);

    // 查询数据
    const dataQuery = `
      SELECT rpt.*,
        c.name as company_name,
        CASE 
          WHEN rpt.discount_type = 'percentage' THEN CONCAT(rpt.discount_value, '%')
          WHEN rpt.discount_type = 'fixed' THEN CONCAT('Rp ', rpt.discount_value)
          ELSE '免费'
        END as discount_display,
        CASE 
          WHEN rpt.is_active = true THEN '激活'
          ELSE '未激活'
        END as status_text
      FROM role_pricing_templates rpt
      LEFT JOIN company c ON rpt.company_id = c.id
      WHERE ${whereClause}
      ORDER BY rpt.sort_order ASC, rpt.role_name ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    const dataResult = await pool.query(dataQuery, [...queryParams, limit, offset]);
    
    return {
      data: dataResult.rows,
      total
    };
  }

  // 根据公司ID和门店ID获取适用的角色定价模板
  async findByCompanyAndStore(companyId, storeId = null) {
    let query = `
      SELECT rpt.*,
        c.name as company_name,
        CASE 
          WHEN rpt.discount_type = 'percentage' THEN CONCAT(rpt.discount_value, '%')
          WHEN rpt.discount_type = 'fixed' THEN CONCAT('Rp ', rpt.discount_value)
          ELSE '免费'
        END as discount_display
      FROM role_pricing_templates rpt
      LEFT JOIN company c ON rpt.company_id = c.id
      WHERE rpt.company_id = $1 AND rpt.is_active = true
    `;
    
    const params = [companyId];
    
    if (storeId) {
      query += ' AND (rpt.store_ids IS NULL OR rpt.store_ids = \'{}\' OR $2 = ANY(rpt.store_ids))';
      params.push(storeId);
    }
    
    query += `
      AND (rpt.valid_from IS NULL OR rpt.valid_from <= CURRENT_DATE)
      AND (rpt.valid_to IS NULL OR rpt.valid_to >= CURRENT_DATE)
      ORDER BY rpt.sort_order ASC, rpt.role_name ASC
    `;
    
    const result = await pool.query(query, params);
    return result.rows;
  }

  // 根据ID获取单个角色定价模板
  async findById(templateId) {
    const query = `
      SELECT rpt.*,
        c.name as company_name,
        CASE 
          WHEN rpt.discount_type = 'percentage' THEN CONCAT(rpt.discount_value, '%')
          WHEN rpt.discount_type = 'fixed' THEN CONCAT('Rp ', rpt.discount_value)
          ELSE '免费'
        END as discount_display,
        CASE 
          WHEN rpt.is_active = true THEN '激活'
          ELSE '未激活'
        END as status_text
      FROM role_pricing_templates rpt
      LEFT JOIN company c ON rpt.company_id = c.id
      WHERE rpt.id = $1
    `;
    
    const result = await pool.query(query, [templateId]);
    return result.rows[0] || null;
  }

  // 根据角色名称查找模板
  async findByRoleName(companyId, roleName) {
    const query = `
      SELECT rpt.*,
        c.name as company_name
      FROM role_pricing_templates rpt
      LEFT JOIN company c ON rpt.company_id = c.id
      WHERE rpt.company_id = $1 AND rpt.role_name = $2
      ORDER BY rpt.sort_order ASC
    `;
    
    const result = await pool.query(query, [companyId, roleName]);
    return result.rows;
  }

  // 更新角色定价模板
  async update(templateId, updateData) {
    const { 
      store_ids,
      role_name, 
      role_description,
      discount_type,
      discount_value,
      valid_from,
      valid_to,
      is_active,
      sort_order
    } = updateData;
    
    // 构建动态更新语句
    const updateFields = [];
    const queryParams = [templateId];
    let paramIndex = 2;
    
    if (store_ids !== undefined) {
      updateFields.push(`store_ids = $${paramIndex}`);
      queryParams.push(store_ids);
      paramIndex++;
    }
    
    if (role_name !== undefined) {
      updateFields.push(`role_name = $${paramIndex}`);
      queryParams.push(role_name);
      paramIndex++;
    }
    
    if (role_description !== undefined) {
      updateFields.push(`role_description = $${paramIndex}`);
      queryParams.push(role_description);
      paramIndex++;
    }
    
    if (discount_type !== undefined) {
      updateFields.push(`discount_type = $${paramIndex}`);
      queryParams.push(discount_type);
      paramIndex++;
    }
    
    if (discount_value !== undefined) {
      updateFields.push(`discount_value = $${paramIndex}`);
      queryParams.push(discount_value);
      paramIndex++;
    }
    
    if (valid_from !== undefined) {
      updateFields.push(`valid_from = $${paramIndex}`);
      queryParams.push(valid_from);
      paramIndex++;
    }
    
    if (valid_to !== undefined) {
      updateFields.push(`valid_to = $${paramIndex}`);
      queryParams.push(valid_to);
      paramIndex++;
    }
    
    if (is_active !== undefined) {
      updateFields.push(`is_active = $${paramIndex}`);
      queryParams.push(is_active);
      paramIndex++;
    }
    
    if (sort_order !== undefined) {
      updateFields.push(`sort_order = $${paramIndex}`);
      queryParams.push(sort_order);
      paramIndex++;
    }
    
    // 如果没有字段需要更新，直接返回原记录
    if (updateFields.length === 0) {
      return await this.findById(templateId);
    }
    
    // 添加更新时间
    updateFields.push('updated_at = NOW()');
    
    const query = `
      UPDATE role_pricing_templates 
      SET ${updateFields.join(', ')}
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await pool.query(query, queryParams);
    return result.rows[0] || null;
  }

  // 更新模板状态
  async updateStatus(templateId, isActive) {
    const query = `
      UPDATE role_pricing_templates 
      SET is_active = $2,
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await pool.query(query, [templateId, isActive]);
    return result.rows[0] || null;
  }

  // 批量更新排序
  async updateSortOrder(templateIds, sortOrders) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const updatedTemplates = [];
      for (let i = 0; i < templateIds.length; i++) {
        const result = await client.query(
          'UPDATE role_pricing_templates SET sort_order = $2, updated_at = NOW() WHERE id = $1 RETURNING *',
          [templateIds[i], sortOrders[i]]
        );
        if (result.rows[0]) {
          updatedTemplates.push(result.rows[0]);
        }
      }
      
      await client.query('COMMIT');
      return updatedTemplates;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // 删除角色定价模板
  async delete(templateId) {
    const query = 'DELETE FROM role_pricing_templates WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [templateId]);
    return result.rows[0] || null;
  }

  // 删除公司的所有角色定价模板
  async deleteByCompanyId(companyId) {
    const query = 'DELETE FROM role_pricing_templates WHERE company_id = $1 RETURNING *';
    const result = await pool.query(query, [companyId]);
    return result.rows;
  }

  // 检查角色名称是否重复
  async checkRoleNameExists(companyId, roleName, excludeTemplateId = null) {
    let query = `
      SELECT COUNT(*) as count
      FROM role_pricing_templates
      WHERE company_id = $1 AND role_name = $2
    `;
    
    const params = [companyId, roleName];
    
    if (excludeTemplateId) {
      query += ' AND id != $3';
      params.push(excludeTemplateId);
    }
    
    const result = await pool.query(query, params);
    return parseInt(result.rows[0].count) > 0;
  }

  // 获取公司的角色统计
  async getRoleStats(companyId) {
    const query = `
      SELECT 
        COUNT(*) as total_roles,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_roles,
        COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_roles,
        COUNT(CASE WHEN discount_type = 'percentage' THEN 1 END) as percentage_roles,
        COUNT(CASE WHEN discount_type = 'fixed' THEN 1 END) as fixed_roles,
        COUNT(CASE WHEN discount_type = 'free' THEN 1 END) as free_roles,
        AVG(CASE WHEN discount_type = 'percentage' THEN discount_value END) as avg_percentage_discount,
        AVG(CASE WHEN discount_type = 'fixed' THEN discount_value END) as avg_fixed_discount
      FROM role_pricing_templates
      WHERE company_id = $1
    `;
    
    const result = await pool.query(query, [companyId]);
    return result.rows[0];
  }

  // 获取角色使用情况统计
  async getRoleUsageStats(companyId, startDate = null, endDate = null) {
    let query = `
      SELECT 
        rpt.role_name,
        rpt.discount_type,
        rpt.discount_value,
        COUNT(op.id) as usage_count,
        SUM(op.final_amount) as total_amount,
        AVG(op.final_amount) as avg_amount,
        COUNT(DISTINCT o.id) as order_count
      FROM role_pricing_templates rpt
      LEFT JOIN order_players op ON rpt.role_name = op.selected_role_name
      LEFT JOIN orders o ON op.order_id = o.id AND o.company_id = rpt.company_id
      WHERE rpt.company_id = $1
    `;
    
    const params = [companyId];
    
    if (startDate) {
      query += ' AND (o.order_date IS NULL OR o.order_date >= $2)';
      params.push(startDate);
    }
    
    if (endDate) {
      query += ` AND (o.order_date IS NULL OR o.order_date <= $${params.length + 1})`;
      params.push(endDate);
    }
    
    query += `
      GROUP BY rpt.id, rpt.role_name, rpt.discount_type, rpt.discount_value
      ORDER BY usage_count DESC
    `;
    
    const result = await pool.query(query, params);
    return result.rows;
  }

  // 计算角色折扣后的价格
  async calculateRolePrice(originalPrice, templateId) {
    const template = await this.findById(templateId);
    if (!template) {
      return originalPrice;
    }
    
    return this.calculateDiscountedPrice(originalPrice, template.discount_type, template.discount_value);
  }

  // 计算折扣后的价格（静态方法）
  calculateDiscountedPrice(originalPrice, discountType, discountValue) {
    if (!originalPrice || originalPrice <= 0) {
      return 0;
    }
    
    switch (discountType) {
      case 'percentage':
        return originalPrice * (1 - discountValue / 100);
      case 'fixed':
        return Math.max(0, originalPrice - discountValue);
      case 'free':
        return 0;
      default:
        return originalPrice;
    }
  }

  // 获取门店专属的角色定价模板
  async findStoreSpecificTemplates(companyId, storeId) {
    const query = `
      SELECT rpt.*,
        c.name as company_name,
        s.name as store_name,
        CASE 
          WHEN rpt.discount_type = 'percentage' THEN CONCAT(rpt.discount_value, '%')
          WHEN rpt.discount_type = 'fixed' THEN CONCAT('Rp ', rpt.discount_value)
          ELSE '免费'
        END as discount_display
      FROM role_pricing_templates rpt
      LEFT JOIN company c ON rpt.company_id = c.id
      LEFT JOIN store s ON s.id = ANY(rpt.store_ids)
      WHERE rpt.company_id = $1 
        AND rpt.store_ids IS NOT NULL 
        AND rpt.store_ids != '{}'
        AND $2 = ANY(rpt.store_ids)
        AND rpt.is_active = true
      ORDER BY rpt.sort_order ASC, rpt.role_name ASC
    `;
    
    const result = await pool.query(query, [companyId, storeId]);
    return result.rows;
  }

  // 获取公司通用的角色定价模板
  async findCompanyWideTemplates(companyId) {
    const query = `
      SELECT rpt.*,
        c.name as company_name,
        CASE 
          WHEN rpt.discount_type = 'percentage' THEN CONCAT(rpt.discount_value, '%')
          WHEN rpt.discount_type = 'fixed' THEN CONCAT('Rp ', rpt.discount_value)
          ELSE '免费'
        END as discount_display
      FROM role_pricing_templates rpt
      LEFT JOIN company c ON rpt.company_id = c.id
      WHERE rpt.company_id = $1 
        AND (rpt.store_ids IS NULL OR rpt.store_ids = '{}')
        AND rpt.is_active = true
      ORDER BY rpt.sort_order ASC, rpt.role_name ASC
    `;
    
    const result = await pool.query(query, [companyId]);
    return result.rows;
  }

  // 复制角色定价模板到其他门店
  async copyTemplateToStores(templateId, storeIds) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // 获取原模板信息
      const originalTemplate = await this.findById(templateId);
      if (!originalTemplate) {
        throw new Error('原模板不存在');
      }
      
      // 创建新的模板副本
      const newTemplate = await this.create({
        company_id: originalTemplate.company_id,
        store_ids: storeIds,
        role_name: originalTemplate.role_name,
        role_description: originalTemplate.role_description,
        discount_type: originalTemplate.discount_type,
        discount_value: originalTemplate.discount_value,
        valid_from: originalTemplate.valid_from,
        valid_to: originalTemplate.valid_to,
        is_active: originalTemplate.is_active,
        sort_order: originalTemplate.sort_order
      });
      
      await client.query('COMMIT');
      return newTemplate;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // 获取即将过期的角色定价模板
  async getExpiringTemplates(companyId, days = 7) {
    const query = `
      SELECT rpt.*,
        c.name as company_name,
        (rpt.valid_to - CURRENT_DATE) as days_until_expire
      FROM role_pricing_templates rpt
      LEFT JOIN company c ON rpt.company_id = c.id
      WHERE rpt.company_id = $1 
        AND rpt.is_active = true
        AND rpt.valid_to IS NOT NULL
        AND rpt.valid_to > CURRENT_DATE
        AND rpt.valid_to <= CURRENT_DATE + INTERVAL '$2 days'
      ORDER BY rpt.valid_to ASC
    `;
    
    const result = await pool.query(query, [companyId, days]);
    return result.rows;
  }

  // 🆕 专门为下单场景获取门店的角色定价模板（下单专用接口）
  async findForOrderByStore(companyId, storeId = null) {
    let query = `
      SELECT rpt.*,
        CASE 
          WHEN rpt.discount_type = 'percentage' THEN CONCAT('-', rpt.discount_value, '%')
          WHEN rpt.discount_type = 'fixed' THEN CONCAT('-Rp ', rpt.discount_value)
          ELSE '无折扣'
        END as discount_display,
        CASE 
          WHEN rpt.valid_from IS NULL AND rpt.valid_to IS NULL THEN '长期有效'
          WHEN rpt.valid_from IS NOT NULL AND rpt.valid_to IS NULL THEN CONCAT('从 ', rpt.valid_from, ' 开始')
          WHEN rpt.valid_from IS NULL AND rpt.valid_to IS NOT NULL THEN CONCAT('截止至 ', rpt.valid_to)
          ELSE CONCAT(rpt.valid_from, ' 至 ', rpt.valid_to)
        END as validity_display,
        CASE 
          WHEN rpt.valid_from IS NOT NULL AND rpt.valid_from > CURRENT_DATE THEN false
          WHEN rpt.valid_to IS NOT NULL AND rpt.valid_to < CURRENT_DATE THEN false
          ELSE true
        END as is_valid_now,
        CASE 
          WHEN rpt.store_ids IS NULL OR rpt.store_ids = '{}' THEN '公司通用'
          ELSE '门店专属'
        END as template_type
      FROM role_pricing_templates rpt
      WHERE rpt.company_id = $1 
        AND rpt.is_active = true
    `;
    
    const params = [companyId];
    
    if (storeId) {
      // 🎯 核心逻辑：显示公司通用的 + 当前门店专属的
      // 公司通用：store_ids IS NULL OR store_ids = '{}'（空数组）
      // 门店专属：storeId = ANY(store_ids)（门店ID在数组中）
      query += ` AND (
        (rpt.store_ids IS NULL OR rpt.store_ids = '{}') OR 
        ($2 = ANY(rpt.store_ids))
      )`;
      params.push(storeId);
    } else {
      // 如果没有指定门店，只返回公司通用的模板
      query += ' AND (rpt.store_ids IS NULL OR rpt.store_ids = \'{}\')';
    }
    
    // 只返回当前有效的模板，并按类型和优先级排序
    query += `
      AND (rpt.valid_from IS NULL OR rpt.valid_from <= CURRENT_DATE)
      AND (rpt.valid_to IS NULL OR rpt.valid_to >= CURRENT_DATE)
      ORDER BY 
        CASE WHEN rpt.store_ids IS NULL OR rpt.store_ids = '{}' THEN 1 ELSE 2 END,
        rpt.sort_order ASC, 
        rpt.role_name ASC
    `;
    
    const result = await pool.query(query, params);
    return result.rows;
  }
}

module.exports = new RolePricingTemplateModel(); 