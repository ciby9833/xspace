//  角色定价模板服务层
const BaseService = require('../core/BaseService');
const rolePricingTemplateModel = require('../models/rolePricingTemplateModel');
const storeModel = require('../models/storeModel');
const PermissionChecker = require('../utils/permissions');

class RolePricingTemplateService extends BaseService {
  constructor() {
    super(rolePricingTemplateModel, '角色定价模板');
  }

  // 创建角色定价模板
  async createTemplate(templateData, user) {
    await PermissionChecker.requirePermission(user, 'role.pricing.manage');
    
    const { company_id } = user;
    
    // 简化权限检查：只检查公司级别权限
    if (user.account_level === 'store' && templateData.store_ids) {
      // 门店级用户只能为自己门店创建模板
      if (!user.store_ids || !templateData.store_ids.every(storeId => user.store_ids.includes(storeId))) {
        throw new Error('权限不足');
      }
    }
    
    const template = await this.model.create({
      ...templateData,
      company_id,
      created_by: user.id
    });
    
    return this.formatTimeFields(template);
  }

  // 批量创建角色定价模板
  async createTemplatesBatch(templatesData, user) {
    await PermissionChecker.requirePermission(user, 'role.pricing.manage');
    
    const { company_id } = user;
    const { templates } = templatesData;
    
    // 简化权限检查：只检查公司级别权限
    if (user.account_level === 'store') {
      for (const template of templates) {
        if (template.store_ids && (!user.store_ids || !template.store_ids.every(storeId => user.store_ids.includes(storeId)))) {
          throw new Error('权限不足');
        }
      }
    }
    
    // 批量创建
    const createdTemplates = await this.model.createBatch(
      templates.map(template => ({
        ...template,
        company_id,
        created_by: user.id
      }))
    );
    
    return this.formatTimeFieldsArray(createdTemplates);
  }

  // 获取公司的角色定价模板列表
  async getTemplatesByCompany(user, filters = {}, pagination = {}) {
    await PermissionChecker.requirePermission(user, 'role.pricing.view');
    
    const { company_id } = user;
    
    // 设置默认分页参数
    const { page = 1, page_size = 10 } = pagination;
    const offset = (page - 1) * page_size;
    
    // 获取数据和总数
    const result = await this.model.findByCompanyIdWithPagination(company_id, filters, {
      offset,
      limit: page_size
    });
    
    return {
      data: this.formatTimeFieldsArray(result.data),
      total: result.total,
      current: page,
      pageSize: page_size
    };
  }

  // 获取适用于特定门店的角色定价模板
  async getTemplatesByStore(storeId, user) {
    await PermissionChecker.requirePermission(user, 'role.pricing.view');
    
    // 检查门店访问权限
    await this.validateStoreAccess([storeId], user);
    
    const templates = await this.model.findByStoreId(storeId);
    
    return this.formatTimeFieldsArray(templates);
  }

  // 获取单个角色定价模板详情
  async getTemplateDetail(templateId, user) {
    await PermissionChecker.requirePermission(user, 'role.pricing.view');
    
    const template = await this.model.findById(templateId);
    if (!template) {
      throw new Error('角色定价模板不存在');
    }
    
    // 检查公司权限
    if (template.company_id !== user.company_id) {
      throw new Error('权限不足');
    }
    
    return this.formatTimeFields(template);
  }

  // 更新角色定价模板
  async updateTemplate(templateId, updateData, user) {
    await PermissionChecker.requirePermission(user, 'role.pricing.manage');
    
    const existingTemplate = await this.model.findById(templateId);
    if (!existingTemplate) {
      throw new Error('角色定价模板不存在');
    }
    
    // 检查公司权限
    if (existingTemplate.company_id !== user.company_id) {
      throw new Error('权限不足');
    }
    
    // 简化权限检查：门店级用户只能更新自己门店的模板
    if (user.account_level === 'store') {
      if (updateData.store_ids && (!user.store_ids || !updateData.store_ids.every(storeId => user.store_ids.includes(storeId)))) {
        throw new Error('权限不足');
      }
    }
    
    const updatedTemplate = await this.model.update(templateId, {
      ...updateData,
      updated_by: user.id,
      updated_at: new Date()
    });
    
    return this.formatTimeFields(updatedTemplate);
  }

  // 更新模板状态
  async updateTemplateStatus(templateId, isActive, user) {
    await PermissionChecker.requirePermission(user, 'role.pricing.manage');
    
    const template = await this.model.findById(templateId);
    if (!template) {
      throw new Error('角色定价模板不存在');
    }
    
    // 检查公司权限
    if (template.company_id !== user.company_id) {
      throw new Error('权限不足');
    }
    
    const updatedTemplate = await this.model.updateStatus(templateId, isActive);
    
    return this.formatTimeFields(updatedTemplate);
  }

  // 批量更新排序
  async updateSortOrder(templateIds, sortOrders, user) {
    await PermissionChecker.requirePermission(user, 'role.pricing.manage');
    
    // 检查所有模板的权限
    const templates = await this.model.findByIds(templateIds);
    
    for (const template of templates) {
      if (template.company_id !== user.company_id) {
        throw new Error('权限不足');
      }
    }
    
    const updatedTemplates = await this.model.updateSortOrder(templateIds, sortOrders);
    
    return this.formatTimeFieldsArray(updatedTemplates);
  }

  // 删除角色定价模板
  async deleteTemplate(templateId, user) {
    await PermissionChecker.requirePermission(user, 'role.pricing.manage');
    
    const template = await this.model.findById(templateId);
    if (!template) {
      throw new Error('角色定价模板不存在');
    }
    
    // 检查公司权限
    if (template.company_id !== user.company_id) {
      throw new Error('权限不足');
    }
    
    await this.model.delete(templateId);
    
    return { deleted: true };
  }

  // 获取角色统计
  async getRoleStats(user) {
    await PermissionChecker.requirePermission(user, 'role.pricing.view');
    
    const { company_id } = user;
    const stats = await this.model.getRoleStats(company_id);
    
    return stats;
  }

  // 获取角色使用情况统计
  async getRoleUsageStats(user, startDate, endDate) {
    await PermissionChecker.requirePermission(user, 'role.pricing.view');
    
    const { company_id } = user;
    const stats = await this.model.getRoleUsageStats(company_id, startDate, endDate);
    
    return stats;
  }

  // 计算角色折扣价格
  async calculateRolePrice(originalPrice, templateId, user) {
    await PermissionChecker.requirePermission(user, 'role.pricing.view');
    
    const template = await this.model.findById(templateId);
    if (!template) {
      throw new Error('角色定价模板不存在');
    }
    
    // 检查公司权限
    if (template.company_id !== user.company_id) {
      throw new Error('权限不足');
    }
    
    const discountedPrice = await this.model.calculateDiscount(originalPrice, template);
    
    return discountedPrice;
  }

  // 获取门店专属的角色定价模板
  async getStoreSpecificTemplates(storeId, user) {
    await PermissionChecker.requirePermission(user, 'role.pricing.view');
    
    // 检查门店访问权限
    await this.validateStoreAccess([storeId], user);
    
    const templates = await this.model.findStoreSpecificTemplates(storeId);
    
    return this.formatTimeFieldsArray(templates);
  }

  // 获取公司通用的角色定价模板
  async getCompanyWideTemplates(user) {
    await PermissionChecker.requirePermission(user, 'role.pricing.view');
    
    const { company_id } = user;
    const templates = await this.model.findCompanyWideTemplates(company_id);
    
    return this.formatTimeFieldsArray(templates);
  }

  // 复制角色定价模板到其他门店
  async copyTemplateToStores(templateId, storeIds, user) {
    await PermissionChecker.requirePermission(user, 'role.pricing.manage');
    
    const originalTemplate = await this.model.findById(templateId);
    if (!originalTemplate) {
      throw new Error('原模板不存在');
    }
    
    // 检查公司权限
    if (originalTemplate.company_id !== user.company_id) {
      throw new Error('权限不足');
    }
    
    // 验证目标门店访问权限
    await this.validateStoreAccess(storeIds, user);
    
    const copiedTemplates = await this.model.copyTemplateToStores(templateId, storeIds, user.id);
    
    return this.formatTimeFieldsArray(copiedTemplates);
  }

  // 获取即将过期的角色定价模板
  async getExpiringTemplates(days, user) {
    await PermissionChecker.requirePermission(user, 'role.pricing.view');
    
    const { company_id } = user;
    const templates = await this.model.findExpiringTemplates(company_id, days);
    
    return this.formatTimeFieldsArray(templates);
  }

  // 检查角色名称是否存在
  async checkRoleNameExists(roleName, excludeTemplateId, user) {
    await PermissionChecker.requirePermission(user, 'role.pricing.view');
    
    const { company_id } = user;
    const existingTemplates = await this.model.findByRoleName(company_id, roleName);
    
    if (excludeTemplateId) {
      return existingTemplates && existingTemplates.length > 0 && existingTemplates.some(t => t.id !== excludeTemplateId);
    }
    
    return existingTemplates && existingTemplates.length > 0;
  }

  // 获取角色定价历史
  async getRolePricingHistory(templateId, user) {
    await PermissionChecker.requirePermission(user, 'role.pricing.view');
    
    const template = await this.model.findById(templateId);
    if (!template) {
      throw new Error('角色定价模板不存在');
    }
    
    // 检查公司权限
    if (template.company_id !== user.company_id) {
      throw new Error('权限不足');
    }
    
    const history = await this.model.getPricingHistory(templateId);
    
    return this.formatTimeFieldsArray(history);
  }

  // 批量激活/停用模板
  async batchUpdateTemplateStatus(templateIds, isActive, user) {
    await PermissionChecker.requirePermission(user, 'role.pricing.manage');
    
    // 检查所有模板的权限
    const templates = await this.model.findByIds(templateIds);
    
    for (const template of templates) {
      if (template.company_id !== user.company_id) {
        throw new Error('权限不足');
      }
    }
    
    const updatedTemplates = await this.model.batchUpdateStatus(templateIds, isActive);
    
    return this.formatTimeFieldsArray(updatedTemplates);
  }

  // 获取热门角色定价模板
  async getPopularTemplates(user, limit = 10) {
    await PermissionChecker.requirePermission(user, 'role.pricing.view');
    
    const { company_id } = user;
    const templates = await this.model.findPopularTemplates(company_id, limit);
    
    return this.formatTimeFieldsArray(templates);
  }

  // 获取角色定价效果分析
  async getRolePricingAnalysis(templateId, user) {
    await PermissionChecker.requirePermission(user, 'role.pricing.view');
    
    const template = await this.model.findById(templateId);
    if (!template) {
      throw new Error('角色定价模板不存在');
    }
    
    // 检查公司权限
    if (template.company_id !== user.company_id) {
      throw new Error('权限不足');
    }
    
    const analysis = await this.model.getRolePricingAnalysis(templateId);
    
    return analysis;
  }

  // 导出角色定价模板
  async exportTemplates(user) {
    await PermissionChecker.requirePermission(user, 'role.pricing.view');
    
    const { company_id } = user;
    const templates = await this.model.findByCompanyId(company_id);
    
    // 格式化导出数据
    const exportData = templates.map(template => ({
      角色名称: template.role_name,
      角色描述: template.role_description,
      折扣类型: this.getDiscountTypeText(template.discount_type),
      折扣值: template.discount_value,
      最低价格: template.min_price,
      最高价格: template.max_price,
      适用门店: template.store_names || '全部门店',
      有效期开始: template.valid_from || '',
      有效期结束: template.valid_to || '',
      状态: template.is_active ? '激活' : '停用',
      创建时间: this.formatTimeFields(template).created_at
    }));
    
    return exportData;
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

  // 导入角色定价模板
  async importTemplates(templateData, user) {
    await PermissionChecker.requirePermission(user, 'role.pricing.manage');
    
    const { company_id } = user;
    const { templates } = templateData;
    
    const results = [];
    
    for (const template of templates) {
      try {
        // 简化权限检查：门店级用户只能导入自己门店的模板
        if (user.account_level === 'store') {
          if (template.store_ids && (!user.store_ids || !template.store_ids.every(storeId => user.store_ids.includes(storeId)))) {
            results.push({
              role_name: template.role_name,
              success: false,
              error: '权限不足'
            });
            continue;
          }
        }
        
        // 创建模板
        const createdTemplate = await this.model.create({
          ...template,
          company_id,
          created_by: user.id
        });
        
        results.push({
          role_name: template.role_name,
          success: true,
          data: this.formatTimeFields(createdTemplate)
        });
      } catch (error) {
        results.push({
          role_name: template.role_name,
          success: false,
          error: error.message
        });
      }
    }
    
    return results;
  }

  // 获取角色定价建议
  async getRolePricingSuggestions(basePrice, user) {
    await PermissionChecker.requirePermission(user, 'role.pricing.view');
    
    const { company_id } = user;
    const suggestions = await this.model.getRolePricingSuggestions(company_id, basePrice);
    
    return suggestions;
  }

  // 应用角色定价模板
  async applyTemplateToOrder(templateId, orderId, user) {
    await PermissionChecker.requirePermission(user, 'role.pricing.manage');
    
    const template = await this.model.findById(templateId);
    if (!template) {
      throw new Error('角色定价模板不存在');
    }
    
    // 检查公司权限
    if (template.company_id !== user.company_id) {
      throw new Error('权限不足');
    }
    
    const result = await this.model.applyTemplateToOrder(templateId, orderId);
    
    return result;
  }

  // 获取角色定价冲突检查
  async checkPricingConflicts(templateData, user) {
    await PermissionChecker.requirePermission(user, 'role.pricing.view');
    
    const { company_id } = user;
    const conflicts = await this.model.checkPricingConflicts(company_id, templateData);
    
    return conflicts;
  }

  // 获取角色定价推荐
  async getRolePricingRecommendations(user) {
    await PermissionChecker.requirePermission(user, 'role.pricing.view');
    
    const { company_id } = user;
    const recommendations = await this.model.getRolePricingRecommendations(company_id);
    
    return recommendations;
  }

  // 同步角色定价模板到所有门店
  async syncTemplateToAllStores(templateId, user) {
    await PermissionChecker.requirePermission(user, 'role.pricing.manage');
    
    const template = await this.model.findById(templateId);
    if (!template) {
      throw new Error('角色定价模板不存在');
    }
    
    // 检查公司权限
    if (template.company_id !== user.company_id) {
      throw new Error('权限不足');
    }
    
    const { company_id } = user;
    const stores = await storeModel.findByCompanyId(company_id);
    const storeIds = stores.map(store => store.id);
    
    const syncedTemplates = await this.model.copyTemplateToStores(templateId, storeIds, user.id);
    
    return this.formatTimeFieldsArray(syncedTemplates);
  }

  // 🆕 专门为下单场景获取角色定价模板（下单专用接口）
  async getTemplatesForOrder(storeId, user) {
    // 下单专用接口：只需要用户登录即可，不需要特殊权限
    // 因为用户如果能访问下单界面，说明已经有基本的系统访问权限
    
    const { company_id } = user;
    
    // 验证公司权限：用户必须有公司关联
    if (!company_id) {
      throw new Error('权限不足：用户未关联公司');
    }
    
    // 如果是门店级用户，需要验证门店访问权限
    if (user.account_level === 'store' && storeId) {
      // 使用数据库查询检查用户是否有权限访问指定门店
      const pool = require('../database/connection');
      const query = `
        SELECT us.user_id 
        FROM user_stores us 
        WHERE us.user_id = $1 AND us.store_id = $2
      `;
      const result = await pool.query(query, [user.user_id || user.id, storeId]);
      
      if (result.rows.length === 0) {
        throw new Error('权限不足：无法访问该门店的角色定价模板');
      }
    }
    
    // 如果是公司级用户，需要验证门店是否属于其公司
    if (user.account_level === 'company' && storeId) {
      const storeModel = require('../models/storeModel');
      const store = await storeModel.findById(storeId);
      if (!store || store.company_id !== company_id) {
        throw new Error('权限不足：门店不属于当前公司');
      }
    }
    
    try {
      // 使用专门的模型方法获取适合下单的角色定价模板
      const templates = await this.model.findForOrderByStore(company_id, storeId);
      
      // 格式化返回数据，确保包含下单界面需要的所有字段
      const formattedTemplates = templates.map(template => ({
        id: template.id,
        role_name: template.role_name,
        role_description: template.role_description,
        discount_type: template.discount_type,
        discount_value: template.discount_value,
        discount_display: template.discount_display,
        validity_display: template.validity_display,
        is_valid_now: template.is_valid_now,
        template_type: template.template_type, // 🆕 模板类型：公司通用/门店专属
        valid_from: template.valid_from,
        valid_to: template.valid_to,
        sort_order: template.sort_order,
        store_ids: template.store_ids,
        created_at: template.created_at,
        updated_at: template.updated_at
      }));
      
      // 🆕 统计信息
      const companyWideCount = formattedTemplates.filter(t => t.template_type === '公司通用').length;
      const storeSpecificCount = formattedTemplates.filter(t => t.template_type === '门店专属').length;
      
      return {
        success: true,
        data: formattedTemplates,
        store_id: storeId,
        company_id: company_id,
        total: formattedTemplates.length,
        company_wide_count: companyWideCount,
        store_specific_count: storeSpecificCount,
        message: `成功获取 ${formattedTemplates.length} 个可用角色定价模板（公司通用 ${companyWideCount} 个，门店专属 ${storeSpecificCount} 个）`,
        user_level: user.account_level
      };
    } catch (error) {
      console.error('获取下单角色定价模板失败:', error);
      throw new Error(`获取角色定价模板失败: ${error.message}`);
    }
  }
}

module.exports = new RolePricingTemplateService(); 