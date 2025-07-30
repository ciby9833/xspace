// 定价日历模型
const pool = require('../database/connection');

class PricingCalendarModel {
  /**
   * 字段映射：前端字段名到数据库字段名
   */
  static mapFields(data) {
    const mapping = {
      date_type: 'calendar_type'
    };
    
    const mapped = {};
    for (const [key, value] of Object.entries(data)) {
      const dbField = mapping[key] || key;
      mapped[dbField] = value;
    }
    
    // 处理日期字段的特殊逻辑
    if (data.date_type === 'special') {
      // 特殊日期类型：使用specific_date
      mapped.calendar_date = data.specific_date;
    } else {
      // 其他类型（promotion/weekend/holiday）：使用effective_date
      mapped.calendar_date = data.effective_date;
    }
    
    return mapped;
  }

  /**
   * 反向字段映射：数据库字段名到前端字段名
   */
  static unmapFields(data) {
    const mapping = {
      calendar_type: 'date_type'
    };
    
    const mapped = {};
    for (const [key, value] of Object.entries(data)) {
      const frontendField = mapping[key] || key;
      mapped[frontendField] = value;
    }
    
    // 处理日期字段的特殊逻辑
    if (data.calendar_type === 'special') {
      // 特殊日期类型：calendar_date映射到specific_date
      mapped.specific_date = data.calendar_date;
      mapped.effective_date = data.calendar_date; // 保持一致性
      mapped.expiry_date = data.calendar_date;
    } else {
      // 其他类型：calendar_date映射到effective_date，specific_date为null
      mapped.specific_date = null;
      mapped.effective_date = data.calendar_date;
      mapped.expiry_date = data.calendar_date;
    }
    
    return mapped;
  }

  /**
   * 创建定价日历条目
   */
  async create(data) {
    const mappedData = this.constructor.mapFields(data);
    
    const { 
      company_id, 
      store_ids = null,
      calendar_date,
      calendar_type,
      discount_type = 'percentage',
      discount_value = 0,
      description,
      is_active = true
    } = mappedData;
    
    const query = `
      INSERT INTO pricing_calendar (
        company_id, store_ids, calendar_date, calendar_type,
        discount_type, discount_value, description, is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      company_id, store_ids, calendar_date, calendar_type,
      discount_type, discount_value, description, is_active
    ]);
    
    return this.constructor.unmapFields(result.rows[0]);
  }

  /**
   * 批量创建定价日历条目
   */
  async createBatch(calendarDataList) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const createdCalendars = [];
      for (const calendarData of calendarDataList) {
        const result = await this.create(calendarData);
        createdCalendars.push(result);
      }
      
      await client.query('COMMIT');
      return createdCalendars;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 根据公司ID获取定价日历（带分页）
   */
  async findByCompanyIdWithPagination(companyId, params = {}) {
    const { 
      page = 1, 
      page_size = 10,
      date_type,
      discount_type,
      start_date,
      end_date,
      is_active,
      store_id 
    } = params;
    
    const offset = (page - 1) * page_size;
    let whereConditions = ['pc.company_id = $1'];
    let queryParams = [companyId];
    let paramIndex = 2;
    
    // 添加筛选条件（过滤空字符串）
    if (date_type && date_type !== '') {
      whereConditions.push(`pc.calendar_type = $${paramIndex}`);
      queryParams.push(date_type);
      paramIndex++;
    }
    
    if (discount_type && discount_type !== '') {
      whereConditions.push(`pc.discount_type = $${paramIndex}`);
      queryParams.push(discount_type);
      paramIndex++;
    }
    
    if (start_date && start_date !== '') {
      whereConditions.push(`pc.calendar_date >= $${paramIndex}`);
      queryParams.push(start_date);
      paramIndex++;
    }
    
    if (end_date && end_date !== '') {
      whereConditions.push(`pc.calendar_date <= $${paramIndex}`);
      queryParams.push(end_date);
      paramIndex++;
    }
    
    if (is_active !== undefined && is_active !== '') {
      // 处理布尔值字符串
      const activeValue = is_active === 'true' || is_active === true;
      whereConditions.push(`pc.is_active = $${paramIndex}`);
      queryParams.push(activeValue);
      paramIndex++;
    }
    
    if (store_id && store_id !== '') {
      whereConditions.push(`(pc.store_ids IS NULL OR pc.store_ids = '{}' OR $${paramIndex} = ANY(pc.store_ids))`);
      queryParams.push(store_id);
      paramIndex++;
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // 获取总数
    const countQuery = `
      SELECT COUNT(*) as total
      FROM pricing_calendar pc
      ${whereClause}
    `;
    
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);
    
    // 获取分页数据
    const dataQuery = `
      SELECT pc.*,
        c.name as company_name
      FROM pricing_calendar pc
      LEFT JOIN company c ON pc.company_id = c.id
      ${whereClause}
      ORDER BY pc.calendar_date DESC, pc.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    queryParams.push(page_size, offset);
    
    const dataResult = await pool.query(dataQuery, queryParams);
    const data = dataResult.rows.map(row => this.constructor.unmapFields(row));
    
    return {
      data,
      total,
      current: page,
      pageSize: page_size
    };
  }

  /**
   * 根据公司ID获取定价日历
   */
  async findByCompanyId(companyId) {
    const query = `
      SELECT pc.*,
        c.name as company_name,
        CASE 
          WHEN pc.discount_type = 'percentage' THEN CONCAT(pc.discount_value, '%')
          WHEN pc.discount_type = 'fixed' THEN CONCAT('Rp ', pc.discount_value)
          ELSE '无折扣'
        END as discount_display,
        CASE 
          WHEN pc.calendar_type = 'holiday' THEN '节假日'
          WHEN pc.calendar_type = 'weekend' THEN '周末'
          WHEN pc.calendar_type = 'special' THEN '特殊日期'
          ELSE '促销日期'
        END as calendar_type_text,
        CASE 
          WHEN pc.is_active = true THEN '激活'
          ELSE '未激活'
        END as status_text
      FROM pricing_calendar pc
      LEFT JOIN company c ON pc.company_id = c.id
      WHERE pc.company_id = $1
      ORDER BY pc.calendar_date DESC
    `;
    
    const result = await pool.query(query, [companyId]);
    return result.rows.map(row => this.constructor.unmapFields(row));
  }

  /**
   * 根据公司ID和门店ID获取适用的定价日历
   */
  async findByCompanyAndStore(companyId, storeId = null) {
    let query = `
      SELECT pc.*,
        c.name as company_name,
        CASE 
          WHEN pc.discount_type = 'percentage' THEN CONCAT(pc.discount_value, '%')
          WHEN pc.discount_type = 'fixed' THEN CONCAT('Rp ', pc.discount_value)
          ELSE '无折扣'
        END as discount_display
      FROM pricing_calendar pc
      LEFT JOIN company c ON pc.company_id = c.id
      WHERE pc.company_id = $1 AND pc.is_active = true
    `;
    
    const params = [companyId];
    
    if (storeId) {
      query += ' AND (pc.store_ids IS NULL OR pc.store_ids = \'{}\' OR $2 = ANY(pc.store_ids))';
      params.push(storeId);
    }
    
    query += ' ORDER BY pc.calendar_date DESC';
    
    const result = await pool.query(query, params);
    return result.rows.map(row => this.constructor.unmapFields(row));
  }

  /**
   * 根据日期范围获取定价日历
   */
  async findByDateRange(companyId, startDate, endDate, storeId = null) {
    let query = `
      SELECT pc.*,
        c.name as company_name
      FROM pricing_calendar pc
      LEFT JOIN company c ON pc.company_id = c.id
      WHERE pc.company_id = $1 
        AND pc.calendar_date >= $2 
        AND pc.calendar_date <= $3
        AND pc.is_active = true
    `;
    
    const params = [companyId, startDate, endDate];
    
    if (storeId) {
      query += ' AND (pc.store_ids IS NULL OR pc.store_ids = \'{}\' OR $4 = ANY(pc.store_ids))';
      params.push(storeId);
    }
    
    query += ' ORDER BY pc.calendar_date ASC';
    
    const result = await pool.query(query, params);
    return result.rows.map(row => this.constructor.unmapFields(row));
  }

  /**
   * 根据特定日期获取定价规则
   */
  async findByDate(companyId, date, storeId = null) {
    let query = `
      SELECT pc.*,
        c.name as company_name
      FROM pricing_calendar pc
      LEFT JOIN company c ON pc.company_id = c.id
      WHERE pc.company_id = $1 
        AND pc.calendar_date = $2
        AND pc.is_active = true
    `;
    
    const params = [companyId, date];
    
    if (storeId) {
      query += ' AND (pc.store_ids IS NULL OR pc.store_ids = \'{}\' OR $3 = ANY(pc.store_ids))';
      params.push(storeId);
    }
    
    query += ' ORDER BY pc.calendar_type ASC';
    
    const result = await pool.query(query, params);
    return result.rows.map(row => this.constructor.unmapFields(row));
  }

  /**
   * 根据ID获取单个定价日历条目
   */
  async findById(id) {
    const query = `
      SELECT pc.*,
        c.name as company_name,
        CASE 
          WHEN pc.discount_type = 'percentage' THEN CONCAT(pc.discount_value, '%')
          WHEN pc.discount_type = 'fixed' THEN CONCAT('Rp ', pc.discount_value)
          ELSE '无折扣'
        END as discount_display,
        CASE 
          WHEN pc.calendar_type = 'holiday' THEN '节假日'
          WHEN pc.calendar_type = 'weekend' THEN '周末'
          WHEN pc.calendar_type = 'special' THEN '特殊日期'
          ELSE '促销日期'
        END as calendar_type_text,
        CASE 
          WHEN pc.is_active = true THEN '激活'
          ELSE '未激活'
        END as status_text
      FROM pricing_calendar pc
      LEFT JOIN company c ON pc.company_id = c.id
      WHERE pc.id = $1
    `;
    
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.constructor.unmapFields(result.rows[0]);
  }

  /**
   * 更新定价日历条目
   */
  async update(id, data) {
    const mappedData = this.constructor.mapFields(data);
    
    // 构建动态更新语句
    const updates = [];
    const values = [];
    let paramIndex = 1;
    
    const allowedFields = [
      'store_ids', 'calendar_date', 'calendar_type',
      'discount_type', 'discount_value', 'description', 'is_active'
    ];
    
    for (const field of allowedFields) {
      if (mappedData[field] !== undefined) {
        updates.push(`${field} = $${paramIndex}`);
        values.push(mappedData[field]);
        paramIndex++;
      }
    }
    
    if (updates.length === 0) {
      throw new Error('没有可更新的字段');
    }
    
    updates.push(`updated_at = NOW()`);
    values.push(id);
    
    const query = `
      UPDATE pricing_calendar 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.constructor.unmapFields(result.rows[0]);
  }

  /**
   * 更新日历条目状态
   */
  async updateStatus(calendarId, isActive) {
    const query = `
      UPDATE pricing_calendar 
      SET is_active = $2,
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await pool.query(query, [calendarId, isActive]);
    return this.constructor.unmapFields(result.rows[0]);
  }

  /**
   * 删除定价日历条目
   */
  async delete(id) {
    const query = 'DELETE FROM pricing_calendar WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.constructor.unmapFields(result.rows[0]);
  }

  /**
   * 删除公司的所有定价日历条目
   */
  async deleteByCompanyId(companyId) {
    const query = 'DELETE FROM pricing_calendar WHERE company_id = $1 RETURNING *';
    const result = await pool.query(query, [companyId]);
    return result.rows.map(row => this.constructor.unmapFields(row));
  }

  /**
   * 检查日期是否已存在
   */
  async checkDateExists(companyId, date, excludeCalendarId = null) {
    let query = `
      SELECT COUNT(*) as count
      FROM pricing_calendar
      WHERE company_id = $1 AND calendar_date = $2
    `;
    
    const params = [companyId, date];
    
    if (excludeCalendarId) {
      query += ' AND id != $3';
      params.push(excludeCalendarId);
    }
    
    const result = await pool.query(query, params);
    return parseInt(result.rows[0].count) > 0;
  }

  /**
   * 获取公司的日历统计
   */
  async getCalendarStats(companyId) {
    const query = `
      SELECT 
        COUNT(*) as total_entries,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_entries,
        COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_entries,
        COUNT(CASE WHEN calendar_type = 'holiday' THEN 1 END) as holiday_entries,
        COUNT(CASE WHEN calendar_type = 'weekend' THEN 1 END) as weekend_entries,
        COUNT(CASE WHEN calendar_type = 'special' THEN 1 END) as special_entries,
        COUNT(CASE WHEN calendar_type = 'promotion' THEN 1 END) as promotion_entries,
        COUNT(CASE WHEN discount_type = 'percentage' THEN 1 END) as percentage_entries,
        COUNT(CASE WHEN discount_type = 'fixed' THEN 1 END) as fixed_entries,
        AVG(CASE WHEN discount_type = 'percentage' THEN discount_value END) as avg_percentage_discount,
        AVG(CASE WHEN discount_type = 'fixed' THEN discount_value END) as avg_fixed_discount
      FROM pricing_calendar
      WHERE company_id = $1
    `;
    
    const result = await pool.query(query, [companyId]);
    return result.rows[0];
  }

  /**
   * 获取即将到来的特殊日期
   */
  async getUpcomingSpecialDates(companyId, days = 30) {
    const query = `
      SELECT pc.*,
        c.name as company_name,
        (pc.calendar_date - CURRENT_DATE) as days_until_date,
        CASE 
          WHEN pc.discount_type = 'percentage' THEN CONCAT(pc.discount_value, '%')
          WHEN pc.discount_type = 'fixed' THEN CONCAT('Rp ', pc.discount_value)
          ELSE '无折扣'
        END as discount_display
      FROM pricing_calendar pc
      LEFT JOIN company c ON pc.company_id = c.id
      WHERE pc.company_id = $1 
        AND pc.is_active = true
        AND pc.calendar_date >= CURRENT_DATE
        AND pc.calendar_date <= CURRENT_DATE + INTERVAL '$2 days'
      ORDER BY pc.calendar_date ASC
    `;
    
    const result = await pool.query(query, [companyId, days]);
    return result.rows.map(row => this.constructor.unmapFields(row));
  }

  /**
   * 获取过去的特殊日期（用于分析）
   */
  async getPastSpecialDates(companyId, days = 30) {
    const query = `
      SELECT pc.*,
        c.name as company_name,
        (CURRENT_DATE - pc.calendar_date) as days_passed,
        CASE 
          WHEN pc.discount_type = 'percentage' THEN CONCAT(pc.discount_value, '%')
          WHEN pc.discount_type = 'fixed' THEN CONCAT('Rp ', pc.discount_value)
          ELSE '无折扣'
        END as discount_display
      FROM pricing_calendar pc
      LEFT JOIN company c ON pc.company_id = c.id
      WHERE pc.company_id = $1 
        AND pc.calendar_date < CURRENT_DATE
        AND pc.calendar_date >= CURRENT_DATE - INTERVAL '$2 days'
      ORDER BY pc.calendar_date DESC
    `;
    
    const result = await pool.query(query, [companyId, days]);
    return result.rows.map(row => this.constructor.unmapFields(row));
  }

  /**
   * 根据日历类型获取条目
   */
  async findByCalendarType(companyId, calendarType) {
    const query = `
      SELECT pc.*,
        c.name as company_name,
        CASE 
          WHEN pc.discount_type = 'percentage' THEN CONCAT(pc.discount_value, '%')
          WHEN pc.discount_type = 'fixed' THEN CONCAT('Rp ', pc.discount_value)
          ELSE '无折扣'
        END as discount_display
      FROM pricing_calendar pc
      LEFT JOIN company c ON pc.company_id = c.id
      WHERE pc.company_id = $1 AND pc.calendar_type = $2
      ORDER BY pc.calendar_date DESC
    `;
    
    const result = await pool.query(query, [companyId, calendarType]);
    return result.rows.map(row => this.constructor.unmapFields(row));
  }

  /**
   * 计算特定日期的折扣价格
   */
  async calculateDateDiscount(companyId, date, originalPrice, storeId = null) {
    const calendarEntries = await this.findByDate(companyId, date, storeId);
    
    if (!calendarEntries || calendarEntries.length === 0) {
      return originalPrice;
    }
    
    let finalPrice = originalPrice;
    
    // 应用所有适用的折扣
    for (const entry of calendarEntries) {
      finalPrice = this.calculateDiscountedPrice(finalPrice, entry.discount_type, entry.discount_value);
    }
    
    return finalPrice;
  }

  /**
   * 计算折扣后的价格（静态方法）
   */
  calculateDiscountedPrice(originalPrice, discountType, discountValue) {
    if (!originalPrice || originalPrice <= 0) {
      return 0;
    }
    
    switch (discountType) {
      case 'percentage':
        return originalPrice * (1 - discountValue / 100);
      case 'fixed':
        return Math.max(0, originalPrice - discountValue);
      default:
        return originalPrice;
    }
  }

  /**
   * 获取门店专属的定价日历
   */
  async findStoreSpecificCalendar(companyId, storeId) {
    const query = `
      SELECT pc.*,
        c.name as company_name,
        s.name as store_name,
        CASE 
          WHEN pc.discount_type = 'percentage' THEN CONCAT(pc.discount_value, '%')
          WHEN pc.discount_type = 'fixed' THEN CONCAT('Rp ', pc.discount_value)
          ELSE '无折扣'
        END as discount_display
      FROM pricing_calendar pc
      LEFT JOIN company c ON pc.company_id = c.id
      LEFT JOIN store s ON s.id = ANY(pc.store_ids)
      WHERE pc.company_id = $1 
        AND pc.store_ids IS NOT NULL 
        AND pc.store_ids != '{}'
        AND $2 = ANY(pc.store_ids)
        AND pc.is_active = true
      ORDER BY pc.calendar_date DESC
    `;
    
    const result = await pool.query(query, [companyId, storeId]);
    return result.rows.map(row => this.constructor.unmapFields(row));
  }

  /**
   * 获取公司通用的定价日历
   */
  async findCompanyWideCalendar(companyId) {
    const query = `
      SELECT pc.*,
        c.name as company_name,
        CASE 
          WHEN pc.discount_type = 'percentage' THEN CONCAT(pc.discount_value, '%')
          WHEN pc.discount_type = 'fixed' THEN CONCAT('Rp ', pc.discount_value)
          ELSE '无折扣'
        END as discount_display
      FROM pricing_calendar pc
      LEFT JOIN company c ON pc.company_id = c.id
      WHERE pc.company_id = $1 
        AND (pc.store_ids IS NULL OR pc.store_ids = '{}')
        AND pc.is_active = true
      ORDER BY pc.calendar_date DESC
    `;
    
    const result = await pool.query(query, [companyId]);
    return result.rows.map(row => this.constructor.unmapFields(row));
  }

  /**
   * 复制定价日历到其他门店
   */
  async copyCalendarToStores(calendarId, storeIds) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // 获取原日历信息
      const originalCalendar = await this.findById(calendarId);
      if (!originalCalendar) {
        throw new Error('原日历条目不存在');
      }
      
      // 创建新的日历副本
      const newCalendar = await this.create({
        company_id: originalCalendar.company_id,
        store_ids: storeIds,
        calendar_date: originalCalendar.calendar_date,
        calendar_type: originalCalendar.calendar_type,
        discount_type: originalCalendar.discount_type,
        discount_value: originalCalendar.discount_value,
        description: originalCalendar.description,
        is_active: originalCalendar.is_active
      });
      
      await client.query('COMMIT');
      return newCalendar;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 批量创建节假日（辅助方法）
   */
  async createHolidays(companyId, holidays) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const createdHolidays = [];
      for (const holiday of holidays) {
        const calendarData = {
          company_id: companyId,
          calendar_date: holiday.date,
          calendar_type: 'holiday',
          discount_type: holiday.discount_type || 'percentage',
          discount_value: holiday.discount_value || 0,
          description: holiday.description || holiday.name,
          is_active: true
        };
        
        const result = await this.create(calendarData);
        createdHolidays.push(result);
      }
      
      await client.query('COMMIT');
      return createdHolidays;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 批量更新状态
   */
  async batchUpdateStatus(ids, isActive) {
    const query = `
      UPDATE pricing_calendar 
      SET is_active = $1, updated_at = NOW()
      WHERE id = ANY($2)
      RETURNING *
    `;
    
    const result = await pool.query(query, [isActive, ids]);
    return result.rows.map(row => this.constructor.unmapFields(row));
  }

  /**
   * 获取定价日历统计
   */
  async getStats(companyId) {
    const query = `
      SELECT 
        COUNT(*) as total_entries,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_entries,
        COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_entries,
        COUNT(CASE WHEN calendar_type = 'holiday' THEN 1 END) as holiday_entries,
        COUNT(CASE WHEN calendar_type = 'weekend' THEN 1 END) as weekend_entries,
        COUNT(CASE WHEN calendar_type = 'special' THEN 1 END) as special_entries,
        COUNT(CASE WHEN calendar_type = 'promotion' THEN 1 END) as promotion_entries,
        COUNT(CASE WHEN discount_type = 'percentage' THEN 1 END) as percentage_entries,
        COUNT(CASE WHEN discount_type = 'fixed' THEN 1 END) as fixed_entries,
        AVG(CASE WHEN discount_type = 'percentage' THEN discount_value END) as avg_percentage_discount,
        AVG(CASE WHEN discount_type = 'fixed' THEN discount_value END) as avg_fixed_discount
      FROM pricing_calendar
      WHERE company_id = $1
    `;
    
    const result = await pool.query(query, [companyId]);
    return result.rows[0];
  }
}

module.exports = new PricingCalendarModel(); 