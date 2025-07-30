//角色定价模板控制器
const rolePricingTemplateService = require('../services/rolePricingTemplateService');
const { validationResult } = require('express-validator');

class RolePricingTemplateController {
  // 创建角色定价模板
  async createTemplate(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: '参数验证失败',
          details: errors.array(),
          timestamp: new Date().toISOString()
        });
      }

      const result = await rolePricingTemplateService.createTemplate(req.body, req.user);
      
      res.json({
        success: true,
        message: '创建角色定价模板成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('创建角色定价模板错误:', error);
      
      if (error.message === '权限不足') {
        return res.status(403).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: '创建角色定价模板失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 批量创建角色定价模板
  async createTemplatesBatch(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: '参数验证失败',
          details: errors.array(),
          timestamp: new Date().toISOString()
        });
      }

      const result = await rolePricingTemplateService.createTemplatesBatch(req.body, req.user);
      
      res.json({
        success: true,
        message: '批量创建角色定价模板成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('批量创建角色定价模板错误:', error);
      
      if (error.message === '权限不足') {
        return res.status(403).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: '批量创建角色定价模板失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 获取公司的角色定价模板列表
  async getTemplatesByCompany(req, res) {
    try {
      // 获取分页和过滤参数
      const {
        role_name = '',
        store_id = '',
        discount_type = '',
        is_active,
        page = 1,
        page_size = 10
      } = req.query;

      const filters = {
        role_name,
        store_id,
        discount_type,
        is_active: is_active !== undefined ? is_active === 'true' : undefined
      };

      const pagination = {
        page: parseInt(page),
        page_size: parseInt(page_size)
      };

      const result = await rolePricingTemplateService.getTemplatesByCompany(req.user, filters, pagination);
      
      res.json({
        success: true,
        message: '获取角色定价模板列表成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('获取角色定价模板列表错误:', error);
      
      if (error.message === '权限不足') {
        return res.status(403).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: '获取角色定价模板列表失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 获取适用于特定门店的角色定价模板
  async getTemplatesByStore(req, res) {
    try {
      const storeId = req.params.storeId;
      const result = await rolePricingTemplateService.getTemplatesByStore(storeId, req.user);
      
      res.json({
        success: true,
        message: '获取门店角色定价模板成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('获取门店角色定价模板错误:', error);
      
      if (error.message === '权限不足') {
        return res.status(403).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      if (error.message === '门店不存在') {
        return res.status(404).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: '获取门店角色定价模板失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 获取单个角色定价模板详情
  async getTemplateDetail(req, res) {
    try {
      const templateId = req.params.id;
      const result = await rolePricingTemplateService.getTemplateDetail(templateId, req.user);
      
      res.json({
        success: true,
        message: '获取角色定价模板详情成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('获取角色定价模板详情错误:', error);
      
      if (error.message === '权限不足') {
        return res.status(403).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      if (error.message === '角色定价模板不存在') {
        return res.status(404).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: '获取角色定价模板详情失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 更新角色定价模板
  async updateTemplate(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: '参数验证失败',
          details: errors.array(),
          timestamp: new Date().toISOString()
        });
      }

      const templateId = req.params.id;
      const result = await rolePricingTemplateService.updateTemplate(templateId, req.body, req.user);
      
      res.json({
        success: true,
        message: '更新角色定价模板成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('更新角色定价模板错误:', error);
      
      if (error.message === '权限不足') {
        return res.status(403).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      if (error.message === '角色定价模板不存在') {
        return res.status(404).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: '更新角色定价模板失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 更新模板状态
  async updateTemplateStatus(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: '参数验证失败',
          details: errors.array(),
          timestamp: new Date().toISOString()
        });
      }

      const templateId = req.params.id;
      const { is_active } = req.body;
      
      const result = await rolePricingTemplateService.updateTemplateStatus(templateId, is_active, req.user);
      
      res.json({
        success: true,
        message: '更新模板状态成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('更新模板状态错误:', error);
      
      if (error.message === '权限不足') {
        return res.status(403).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      if (error.message === '角色定价模板不存在') {
        return res.status(404).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: '更新模板状态失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 批量更新排序
  async updateSortOrder(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: '参数验证失败',
          details: errors.array(),
          timestamp: new Date().toISOString()
        });
      }

      const { template_ids, sort_orders } = req.body;
      const result = await rolePricingTemplateService.updateSortOrder(template_ids, sort_orders, req.user);
      
      res.json({
        success: true,
        message: '更新排序成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('更新排序错误:', error);
      
      if (error.message === '权限不足') {
        return res.status(403).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: '更新排序失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 删除角色定价模板
  async deleteTemplate(req, res) {
    try {
      const templateId = req.params.id;
      const result = await rolePricingTemplateService.deleteTemplate(templateId, req.user);
      
      res.json({
        success: true,
        message: '删除角色定价模板成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('删除角色定价模板错误:', error);
      
      if (error.message === '权限不足') {
        return res.status(403).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      if (error.message === '角色定价模板不存在') {
        return res.status(404).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: '删除角色定价模板失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 获取角色统计
  async getRoleStats(req, res) {
    try {
      const result = await rolePricingTemplateService.getRoleStats(req.user);
      
      res.json({
        success: true,
        message: '获取角色统计成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('获取角色统计错误:', error);
      
      if (error.message === '权限不足') {
        return res.status(403).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: '获取角色统计失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 获取角色使用情况统计
  async getRoleUsageStats(req, res) {
    try {
      const { start_date, end_date } = req.query;
      const result = await rolePricingTemplateService.getRoleUsageStats(req.user, start_date, end_date);
      
      res.json({
        success: true,
        message: '获取角色使用情况统计成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('获取角色使用情况统计错误:', error);
      
      if (error.message === '权限不足') {
        return res.status(403).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: '获取角色使用情况统计失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 计算角色折扣价格
  async calculateRolePrice(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: '参数验证失败',
          details: errors.array(),
          timestamp: new Date().toISOString()
        });
      }

      const { original_price, template_id } = req.body;
      const result = await rolePricingTemplateService.calculateRolePrice(original_price, template_id, req.user);
      
      res.json({
        success: true,
        message: '计算角色折扣价格成功',
        data: { discounted_price: result },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('计算角色折扣价格错误:', error);
      
      if (error.message === '权限不足') {
        return res.status(403).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      if (error.message === '角色定价模板不存在') {
        return res.status(404).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: '计算角色折扣价格失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 获取门店专属的角色定价模板
  async getStoreSpecificTemplates(req, res) {
    try {
      const storeId = req.params.storeId;
      const result = await rolePricingTemplateService.getStoreSpecificTemplates(storeId, req.user);
      
      res.json({
        success: true,
        message: '获取门店专属角色定价模板成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('获取门店专属角色定价模板错误:', error);
      
      if (error.message === '权限不足') {
        return res.status(403).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: '获取门店专属角色定价模板失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 获取公司通用的角色定价模板
  async getCompanyWideTemplates(req, res) {
    try {
      const result = await rolePricingTemplateService.getCompanyWideTemplates(req.user);
      
      res.json({
        success: true,
        message: '获取公司通用角色定价模板成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('获取公司通用角色定价模板错误:', error);
      
      if (error.message === '权限不足') {
        return res.status(403).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: '获取公司通用角色定价模板失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 复制角色定价模板到其他门店
  async copyTemplateToStores(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: '参数验证失败',
          details: errors.array(),
          timestamp: new Date().toISOString()
        });
      }

      const templateId = req.params.id;
      const { store_ids } = req.body;
      
      const result = await rolePricingTemplateService.copyTemplateToStores(templateId, store_ids, req.user);
      
      res.json({
        success: true,
        message: '复制角色定价模板到其他门店成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('复制角色定价模板到其他门店错误:', error);
      
      if (error.message === '权限不足') {
        return res.status(403).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      if (error.message === '原模板不存在') {
        return res.status(404).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: '复制角色定价模板到其他门店失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 获取即将过期的角色定价模板
  async getExpiringTemplates(req, res) {
    try {
      const days = req.query.days ? parseInt(req.query.days) : 7;
      const result = await rolePricingTemplateService.getExpiringTemplates(days, req.user);
      
      res.json({
        success: true,
        message: '获取即将过期的角色定价模板成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('获取即将过期的角色定价模板错误:', error);
      
      if (error.message === '权限不足') {
        return res.status(403).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: '获取即将过期的角色定价模板失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 检查角色名称是否存在
  async checkRoleNameExists(req, res) {
    try {
      const { role_name } = req.query;
      const templateId = req.query.exclude_template_id;
      
      const result = await rolePricingTemplateService.checkRoleNameExists(role_name, templateId, req.user);
      
      res.json({
        success: true,
        message: '检查角色名称成功',
        data: { exists: result },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('检查角色名称错误:', error);
      
      if (error.message === '权限不足') {
        return res.status(403).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: '检查角色名称失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 🆕 专门为下单场景获取角色定价模板（下单专用接口）
  async getTemplatesForOrder(req, res) {
    try {
      const { storeId } = req.params;
      
      console.log('🎯 下单专用接口调用:', {
        storeId,
        userId: req.user.id,
        userLevel: req.user.account_level,
        companyId: req.user.company_id
      });
      
      const result = await rolePricingTemplateService.getTemplatesForOrder(storeId, req.user);
      
      res.json({
        success: true,
        message: result.message,
        data: result.data,
        meta: {
          store_id: result.store_id,
          company_id: result.company_id,
          user_level: result.user_level,
          total: result.total,
          company_wide_count: result.company_wide_count, // 🆕 公司通用模板数量
          store_specific_count: result.store_specific_count, // 🆕 门店专属模板数量
          for_order: true // 标识这是下单专用接口
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('获取下单角色定价模板错误:', error);
      console.error('错误堆栈:', error.stack);
      
      // 权限相关错误
      if (error.message.includes('权限不足') || error.message.includes('无法访问')) {
        return res.status(403).json({
          success: false,
          error: error.message,
          debug_info: {
            user_id: req.user.id,
            user_level: req.user.account_level,
            company_id: req.user.company_id,
            store_id: storeId
          },
          timestamp: new Date().toISOString()
        });
      }
      
      if (error.message.includes('不存在')) {
        return res.status(404).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: '获取角色定价模板失败',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
}

module.exports = new RolePricingTemplateController(); 