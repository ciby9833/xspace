//定价日历服务
const BaseService = require('../core/BaseService');
const pricingCalendarModel = require('../models/pricingCalendarModel');
const storeModel = require('../models/storeModel');
const PermissionChecker = require('../utils/permissions');

class PricingCalendarService extends BaseService {
  constructor() {
    super(pricingCalendarModel, '定价日历');
  }

  // 创建定价日历条目
  async createCalendar(calendarData, user) {
    await PermissionChecker.requirePermission(user, 'pricing.calendar.manage');
    
    const { company_id } = user;
    
    // 检查日期是否已存在
    const existingCalendar = await this.model.findByDate(company_id, calendarData.calendar_date);
    if (existingCalendar) {
      throw new Error('日期已存在');
    }
    
    // 验证门店关联
    if (calendarData.store_ids && calendarData.store_ids.length > 0) {
      await this.validateStoreAccess(calendarData.store_ids, user);
    }
    
    const calendar = await this.model.create({
      ...calendarData,
      company_id,
      created_by: user.id
    });
    
    return this.formatTimeFields(calendar);
  }

  // 批量创建定价日历条目
  async createCalendarBatch(calendarData, user) {
    await PermissionChecker.requirePermission(user, 'pricing.calendar.manage');
    
    const { company_id } = user;
    const { calendars } = calendarData;
    
    // 检查日期是否重复
    const dates = calendars.map(c => c.calendar_date);
    const duplicateDates = dates.filter((date, index) => 
      dates.indexOf(date) !== index
    );
    
    if (duplicateDates.length > 0) {
      throw new Error(`日期重复: ${duplicateDates.join(', ')}`);
    }
    
    // 检查日期是否已存在
    for (const calendar of calendars) {
      const existingCalendar = await this.model.findByDate(company_id, calendar.calendar_date);
      if (existingCalendar) {
        throw new Error(`日期已存在: ${calendar.calendar_date}`);
      }
    }
    
    // 批量创建
    const createdCalendars = await this.model.createBatch(
      calendars.map(calendar => ({
        ...calendar,
        company_id,
        created_by: user.id
      }))
    );
    
    return this.formatTimeFieldsArray(createdCalendars);
  }

  // 获取公司的定价日历
  async getCalendarByCompany(user) {
    await PermissionChecker.requirePermission(user, 'pricing.calendar.view');
    
    const { company_id } = user;
    const calendars = await this.model.findByCompanyId(company_id);
    
    return this.formatTimeFieldsArray(calendars);
  }

  // 获取适用于特定门店的定价日历
  async getCalendarByStore(storeId, user) {
    await PermissionChecker.requirePermission(user, 'pricing.calendar.view');
    
    // 检查门店访问权限
    await this.validateStoreAccess([storeId], user);
    
    const calendars = await this.model.findByStoreId(storeId);
    
    return this.formatTimeFieldsArray(calendars);
  }

  // 根据日期范围获取定价日历
  async getCalendarByDateRange(startDate, endDate, storeId, user) {
    await PermissionChecker.requirePermission(user, 'pricing.calendar.view');
    
    // 如果指定了门店，检查门店访问权限
    if (storeId) {
      await this.validateStoreAccess([storeId], user);
    }
    
    const { company_id } = user;
    const calendars = await this.model.findByDateRange(company_id, startDate, endDate, storeId);
    
    return this.formatTimeFieldsArray(calendars);
  }

  // 根据特定日期获取定价规则
  async getCalendarByDate(date, storeId, user) {
    await PermissionChecker.requirePermission(user, 'pricing.calendar.view');
    
    // 如果指定了门店，检查门店访问权限
    if (storeId) {
      await this.validateStoreAccess([storeId], user);
    }
    
    const { company_id } = user;
    const calendar = await this.model.findByDate(company_id, date, storeId);
    
    return calendar ? this.formatTimeFields(calendar) : null;
  }

  // 获取单个定价日历条目详情
  async getCalendarDetail(calendarId, user) {
    await PermissionChecker.requirePermission(user, 'pricing.calendar.view');
    
    const calendar = await this.model.findById(calendarId);
    if (!calendar) {
      throw new Error('定价日历条目不存在');
    }
    
    // 检查公司权限
    if (calendar.company_id !== user.company_id) {
      throw new Error('权限不足');
    }
    
    return this.formatTimeFields(calendar);
  }

  // 更新定价日历条目
  async updateCalendar(calendarId, updateData, user) {
    await PermissionChecker.requirePermission(user, 'pricing.calendar.manage');
    
    const existingCalendar = await this.model.findById(calendarId);
    if (!existingCalendar) {
      throw new Error('定价日历条目不存在');
    }
    
    // 检查公司权限
    if (existingCalendar.company_id !== user.company_id) {
      throw new Error('权限不足');
    }
    
    // 如果更新日期，检查是否重复
    if (updateData.calendar_date && updateData.calendar_date !== existingCalendar.calendar_date) {
      const duplicateCalendar = await this.model.findByDate(
        user.company_id,
        updateData.calendar_date
      );
      
      if (duplicateCalendar && duplicateCalendar.id !== calendarId) {
        throw new Error('日期已存在');
      }
    }
    
    // 验证门店关联
    if (updateData.store_ids) {
      await this.validateStoreAccess(updateData.store_ids, user);
    }
    
    const updatedCalendar = await this.model.update(calendarId, {
      ...updateData,
      updated_by: user.id,
      updated_at: new Date()
    });
    
    return this.formatTimeFields(updatedCalendar);
  }

  // 更新日历条目状态
  async updateCalendarStatus(calendarId, isActive, user) {
    await PermissionChecker.requirePermission(user, 'pricing.calendar.manage');
    
    const calendar = await this.model.findById(calendarId);
    if (!calendar) {
      throw new Error('定价日历条目不存在');
    }
    
    // 检查公司权限
    if (calendar.company_id !== user.company_id) {
      throw new Error('权限不足');
    }
    
    const updatedCalendar = await this.model.updateStatus(calendarId, isActive);
    
    return this.formatTimeFields(updatedCalendar);
  }

  // 删除定价日历条目
  async deleteCalendar(calendarId, user) {
    await PermissionChecker.requirePermission(user, 'pricing.calendar.manage');
    
    const calendar = await this.model.findById(calendarId);
    if (!calendar) {
      throw new Error('定价日历条目不存在');
    }
    
    // 检查公司权限
    if (calendar.company_id !== user.company_id) {
      throw new Error('权限不足');
    }
    
    await this.model.delete(calendarId);
    
    return { deleted: true };
  }

  // 获取日历统计
  async getCalendarStats(user) {
    await PermissionChecker.requirePermission(user, 'pricing.calendar.view');
    
    const { company_id } = user;
    const stats = await this.model.getCalendarStats(company_id);
    
    return stats;
  }

  // 获取即将到来的特殊日期
  async getUpcomingSpecialDates(days, user) {
    await PermissionChecker.requirePermission(user, 'pricing.calendar.view');
    
    const { company_id } = user;
    const dates = await this.model.findUpcomingSpecialDates(company_id, days);
    
    return this.formatTimeFieldsArray(dates);
  }

  // 获取过去的特殊日期
  async getPastSpecialDates(days, user) {
    await PermissionChecker.requirePermission(user, 'pricing.calendar.view');
    
    const { company_id } = user;
    const dates = await this.model.findPastSpecialDates(company_id, days);
    
    return this.formatTimeFieldsArray(dates);
  }

  // 根据日历类型获取条目
  async getCalendarByType(calendarType, user) {
    await PermissionChecker.requirePermission(user, 'pricing.calendar.view');
    
    const { company_id } = user;
    const calendars = await this.model.findByType(company_id, calendarType);
    
    return this.formatTimeFieldsArray(calendars);
  }

  // 计算特定日期的折扣价格
  async calculateDateDiscount(date, originalPrice, storeId, user) {
    await PermissionChecker.requirePermission(user, 'pricing.calendar.view');
    
    // 如果指定了门店，检查门店访问权限
    if (storeId) {
      await this.validateStoreAccess([storeId], user);
    }
    
    const { company_id } = user;
    const calendar = await this.model.findByDate(company_id, date, storeId);
    
    if (!calendar || !calendar.is_active) {
      return parseFloat(originalPrice);
    }
    
    const discountedPrice = await this.model.calculateDiscount(originalPrice, calendar);
    
    return discountedPrice;
  }

  // 获取门店专属的定价日历
  async getStoreSpecificCalendar(storeId, user) {
    await PermissionChecker.requirePermission(user, 'pricing.calendar.view');
    
    // 检查门店访问权限
    await this.validateStoreAccess([storeId], user);
    
    const calendars = await this.model.findStoreSpecificCalendar(storeId);
    
    return this.formatTimeFieldsArray(calendars);
  }

  // 获取公司通用的定价日历
  async getCompanyWideCalendar(user) {
    await PermissionChecker.requirePermission(user, 'pricing.calendar.view');
    
    const { company_id } = user;
    const calendars = await this.model.findCompanyWideCalendar(company_id);
    
    return this.formatTimeFieldsArray(calendars);
  }

  // 复制定价日历到其他门店
  async copyCalendarToStores(calendarId, storeIds, user) {
    await PermissionChecker.requirePermission(user, 'pricing.calendar.manage');
    
    const originalCalendar = await this.model.findById(calendarId);
    if (!originalCalendar) {
      throw new Error('原日历条目不存在');
    }
    
    // 检查公司权限
    if (originalCalendar.company_id !== user.company_id) {
      throw new Error('权限不足');
    }
    
    // 验证目标门店访问权限
    await this.validateStoreAccess(storeIds, user);
    
    const copiedCalendars = await this.model.copyCalendarToStores(calendarId, storeIds, user.id);
    
    return this.formatTimeFieldsArray(copiedCalendars);
  }

  // 批量创建节假日
  async createHolidays(holidaysData, user) {
    await PermissionChecker.requirePermission(user, 'pricing.calendar.manage');
    
    const { company_id } = user;
    const { holidays } = holidaysData;
    
    // 转换为定价日历格式
    const calendarEntries = holidays.map(holiday => ({
      calendar_date: holiday.date,
      calendar_type: 'holiday',
      name: holiday.name,
      description: holiday.description,
      discount_type: holiday.discount_type || 'percentage',
      discount_value: holiday.discount_value || 0,
      is_active: true,
      company_id,
      created_by: user.id
    }));
    
    const createdCalendars = await this.model.createBatch(calendarEntries);
    
    return this.formatTimeFieldsArray(createdCalendars);
  }

  // 检查日期是否存在
  async checkDateExists(date, excludeCalendarId, user) {
    await PermissionChecker.requirePermission(user, 'pricing.calendar.view');
    
    const { company_id } = user;
    const existingCalendar = await this.model.findByDate(company_id, date, null, excludeCalendarId);
    
    return !!existingCalendar;
  }

  // 验证门店访问权限
  async validateStoreAccess(storeIds, user) {
    if (!storeIds || storeIds.length === 0) {
      return;
    }
    
    const { company_id } = user;
    
    // 检查门店是否属于用户的公司
    const stores = await storeModel.findByIds(storeIds);
    
    for (const store of stores) {
      if (store.company_id !== company_id) {
        throw new Error('门店不属于当前公司');
      }
    }
    
    // 如果用户是门店级别，检查是否有访问权限
    if (user.account_level === 'store' && user.store_ids) {
      const hasAccess = storeIds.every(storeId => 
        user.store_ids.includes(storeId)
      );
      
      if (!hasAccess) {
        throw new Error('权限不足');
      }
    }
  }

  // 获取定价日历历史
  async getCalendarHistory(calendarId, user) {
    await PermissionChecker.requirePermission(user, 'pricing.calendar.view');
    
    const calendar = await this.model.findById(calendarId);
    if (!calendar) {
      throw new Error('定价日历条目不存在');
    }
    
    // 检查公司权限
    if (calendar.company_id !== user.company_id) {
      throw new Error('权限不足');
    }
    
    const history = await this.model.getCalendarHistory(calendarId);
    
    return this.formatTimeFieldsArray(history);
  }

  // 获取定价日历冲突
  async getCalendarConflicts(user) {
    await PermissionChecker.requirePermission(user, 'pricing.calendar.view');
    
    const { company_id } = user;
    const conflicts = await this.model.findCalendarConflicts(company_id);
    
    return this.formatTimeFieldsArray(conflicts);
  }

  // 批量激活/停用日历条目
  async batchUpdateCalendarStatus(calendarIds, isActive, user) {
    await PermissionChecker.requirePermission(user, 'pricing.calendar.manage');
    
    // 检查所有日历条目的权限
    const calendars = await this.model.findByIds(calendarIds);
    
    for (const calendar of calendars) {
      if (calendar.company_id !== user.company_id) {
        throw new Error('权限不足');
      }
    }
    
    const updatedCalendars = await this.model.batchUpdateStatus(calendarIds, isActive);
    
    return this.formatTimeFieldsArray(updatedCalendars);
  }

  // 获取热门日期类型
  async getPopularCalendarTypes(user) {
    await PermissionChecker.requirePermission(user, 'pricing.calendar.view');
    
    const { company_id } = user;
    const types = await this.model.findPopularCalendarTypes(company_id);
    
    return types;
  }

  // 获取定价日历效果分析
  async getCalendarEffectAnalysis(calendarId, user) {
    await PermissionChecker.requirePermission(user, 'pricing.calendar.view');
    
    const calendar = await this.model.findById(calendarId);
    if (!calendar) {
      throw new Error('定价日历条目不存在');
    }
    
    // 检查公司权限
    if (calendar.company_id !== user.company_id) {
      throw new Error('权限不足');
    }
    
    const analysis = await this.model.getCalendarEffectAnalysis(calendarId);
    
    return analysis;
  }

  // 导出定价日历
  async exportCalendar(user) {
    await PermissionChecker.requirePermission(user, 'pricing.calendar.view');
    
    const { company_id } = user;
    const calendars = await this.model.findByCompanyId(company_id);
    
    // 格式化导出数据
    const exportData = calendars.map(calendar => ({
      日期: calendar.calendar_date,
      名称: calendar.name,
      类型: this.getCalendarTypeText(calendar.calendar_type),
      描述: calendar.description,
      折扣类型: this.getDiscountTypeText(calendar.discount_type),
      折扣值: calendar.discount_value,
      最低价格: calendar.min_price,
      最高价格: calendar.max_price,
      适用门店: calendar.store_names || '全部门店',
      状态: calendar.is_active ? '激活' : '停用',
      创建时间: this.formatTimeFields(calendar).created_at
    }));
    
    return exportData;
  }

  // 获取日历类型文本
  getCalendarTypeText(calendarType) {
    const typeMap = {
      holiday: '节假日',
      weekend: '周末',
      special: '特殊日期',
      promotion: '促销活动',
      peak: '高峰期',
      low: '低谷期'
    };
    
    return typeMap[calendarType] || calendarType;
  }

  // 获取折扣类型文本
  getDiscountTypeText(discountType) {
    const typeMap = {
      percentage: '百分比折扣',
      fixed: '固定金额折扣',
      multiplier: '倍数调整'
    };
    
    return typeMap[discountType] || discountType;
  }

  // 导入定价日历
  async importCalendar(calendarData, user) {
    await PermissionChecker.requirePermission(user, 'pricing.calendar.manage');
    
    const { company_id } = user;
    const { calendars } = calendarData;
    
    const results = [];
    
    for (const calendar of calendars) {
      try {
        // 检查日期是否已存在
        const existingCalendar = await this.model.findByDate(company_id, calendar.calendar_date);
        
        if (existingCalendar) {
          results.push({
            date: calendar.calendar_date,
            success: false,
            error: '日期已存在'
          });
          continue;
        }
        
        // 创建日历条目
        const createdCalendar = await this.model.create({
          ...calendar,
          company_id,
          created_by: user.id
        });
        
        results.push({
          date: calendar.calendar_date,
          success: true,
          data: this.formatTimeFields(createdCalendar)
        });
      } catch (error) {
        results.push({
          date: calendar.calendar_date,
          success: false,
          error: error.message
        });
      }
    }
    
    return results;
  }

  // 获取定价日历建议
  async getCalendarSuggestions(user) {
    await PermissionChecker.requirePermission(user, 'pricing.calendar.view');
    
    const { company_id } = user;
    const suggestions = await this.model.getCalendarSuggestions(company_id);
    
    return suggestions;
  }

  // 应用定价日历到订单
  async applyCalendarToOrder(calendarId, orderId, user) {
    await PermissionChecker.requirePermission(user, 'pricing.calendar.manage');
    
    const calendar = await this.model.findById(calendarId);
    if (!calendar) {
      throw new Error('定价日历条目不存在');
    }
    
    // 检查公司权限
    if (calendar.company_id !== user.company_id) {
      throw new Error('权限不足');
    }
    
    const result = await this.model.applyCalendarToOrder(calendarId, orderId);
    
    return result;
  }

  // 获取定价日历推荐
  async getCalendarRecommendations(user) {
    await PermissionChecker.requirePermission(user, 'pricing.calendar.view');
    
    const { company_id } = user;
    const recommendations = await this.model.getCalendarRecommendations(company_id);
    
    return recommendations;
  }

  // 同步定价日历到所有门店
  async syncCalendarToAllStores(calendarId, user) {
    await PermissionChecker.requirePermission(user, 'pricing.calendar.manage');
    
    const calendar = await this.model.findById(calendarId);
    if (!calendar) {
      throw new Error('定价日历条目不存在');
    }
    
    // 检查公司权限
    if (calendar.company_id !== user.company_id) {
      throw new Error('权限不足');
    }
    
    const { company_id } = user;
    const stores = await storeModel.findByCompanyId(company_id);
    const storeIds = stores.map(store => store.id);
    
    const syncedCalendars = await this.model.copyCalendarToStores(calendarId, storeIds, user.id);
    
    return this.formatTimeFieldsArray(syncedCalendars);
  }

  // 获取定价日历覆盖率
  async getCalendarCoverage(user) {
    await PermissionChecker.requirePermission(user, 'pricing.calendar.view');
    
    const { company_id } = user;
    const coverage = await this.model.getCalendarCoverage(company_id);
    
    return coverage;
  }

  // 获取定价日历空白期
  async getCalendarGaps(user, startDate, endDate) {
    await PermissionChecker.requirePermission(user, 'pricing.calendar.view');
    
    const { company_id } = user;
    const gaps = await this.model.findCalendarGaps(company_id, startDate, endDate);
    
    return gaps;
  }

  // 自动生成定价日历
  async autoGenerateCalendar(generationData, user) {
    await PermissionChecker.requirePermission(user, 'pricing.calendar.manage');
    
    const { company_id } = user;
    const { calendar_type, date_range, discount_config } = generationData;
    
    const generatedCalendars = await this.model.autoGenerateCalendar(
      company_id,
      calendar_type,
      date_range,
      discount_config,
      user.id
    );
    
    return this.formatTimeFieldsArray(generatedCalendars);
  }

  // 获取定价日历使用情况
  async getCalendarUsage(calendarId, user) {
    await PermissionChecker.requirePermission(user, 'pricing.calendar.view');
    
    const calendar = await this.model.findById(calendarId);
    if (!calendar) {
      throw new Error('定价日历条目不存在');
    }
    
    // 检查公司权限
    if (calendar.company_id !== user.company_id) {
      throw new Error('权限不足');
    }
    
    const usage = await this.model.getCalendarUsage(calendarId);
    
    return usage;
  }
}

module.exports = new PricingCalendarService(); 