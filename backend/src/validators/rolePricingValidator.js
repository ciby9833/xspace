const { body, param, query } = require('express-validator');

/**
 * 角色定价模板验证器
 */
class RolePricingValidator {
  /**
   * 创建角色定价模板验证规则
   */
  static createRolePricingTemplate() {
    return [
      body('role_name')
        .notEmpty()
        .withMessage('角色名称不能为空')
        .isLength({ min: 1, max: 50 })
        .withMessage('角色名称长度必须在1-50个字符之间'),
      
      body('discount_type')
        .notEmpty()
        .withMessage('折扣类型不能为空')
        .isIn(['percentage', 'fixed'])
        .withMessage('折扣类型必须是percentage或fixed'),
      
      body('discount_value')
        .notEmpty()
        .withMessage('折扣值不能为空')
        .isFloat({ min: 0 })
        .withMessage('折扣值必须是大于等于0的数字')
        .custom((value, { req }) => {
          if (req.body.discount_type === 'percentage' && value > 100) {
            throw new Error('百分比折扣值不能超过100');
          }
          if (req.body.discount_type === 'fixed' && value > 9999) {
            throw new Error('固定金额折扣值不能超过9999');
          }
          return true;
        }),
      
      body('store_ids')
        .optional()
        .isArray()
        .withMessage('门店ID列表必须是数组')
        .custom((value) => {
          if (value && value.length > 0) {
            for (const storeId of value) {
              if (!storeId || typeof storeId !== 'string') {
                throw new Error('门店ID必须是有效的字符串');
              }
            }
          }
          return true;
        }),
      
      body('description')
        .optional()
        .isLength({ max: 500 })
        .withMessage('描述长度不能超过500个字符'),
      
      body('is_active')
        .optional()
        .isBoolean()
        .withMessage('状态必须是布尔值')
    ];
  }

  /**
   * 更新角色定价模板验证规则
   */
  static updateRolePricingTemplate() {
    return [
      param('id')
        .notEmpty()
        .withMessage('模板ID不能为空')
        .isUUID()
        .withMessage('模板ID必须是有效的UUID'),
      
      ...this.createRolePricingTemplate()
    ];
  }

  /**
   * 获取角色定价模板详情验证规则
   */
  static getRolePricingTemplate() {
    return [
      param('id')
        .notEmpty()
        .withMessage('模板ID不能为空')
        .isUUID()
        .withMessage('模板ID必须是有效的UUID')
    ];
  }

  /**
   * 获取角色定价模板列表验证规则
   */
  static getRolePricingTemplateList() {
    return [
      query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('页码必须是大于0的整数'),
      
      query('page_size')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('每页数量必须是1-100之间的整数'),
      
      query('role_name')
        .optional()
        .isLength({ max: 50 })
        .withMessage('角色名称长度不能超过50个字符'),
      
      query('discount_type')
        .optional()
        .isIn(['percentage', 'fixed'])
        .withMessage('折扣类型必须是percentage或fixed'),
      
      query('is_active')
        .optional()
        .isBoolean()
        .withMessage('状态必须是布尔值'),
      
      query('company_id')
        .optional()
        .isUUID()
        .withMessage('公司ID必须是有效的UUID'),
      
      query('store_id')
        .optional()
        .isUUID()
        .withMessage('门店ID必须是有效的UUID')
    ];
  }

  /**
   * 批量创建角色定价模板验证规则
   */
  static batchCreateRolePricingTemplates() {
    return [
      body('templates')
        .isArray({ min: 1 })
        .withMessage('模板列表必须是非空数组'),
      
      body('templates.*.role_name')
        .notEmpty()
        .withMessage('角色名称不能为空')
        .isLength({ min: 1, max: 50 })
        .withMessage('角色名称长度必须在1-50个字符之间'),
      
      body('templates.*.discount_type')
        .notEmpty()
        .withMessage('折扣类型不能为空')
        .isIn(['percentage', 'fixed'])
        .withMessage('折扣类型必须是percentage或fixed'),
      
      body('templates.*.discount_value')
        .notEmpty()
        .withMessage('折扣值不能为空')
        .isFloat({ min: 0 })
        .withMessage('折扣值必须是大于等于0的数字')
    ];
  }

  /**
   * 批量更新状态验证规则
   */
  static batchUpdateStatus() {
    return [
      body('template_ids')
        .isArray({ min: 1 })
        .withMessage('模板ID列表必须是非空数组'),
      
      body('template_ids.*')
        .isUUID()
        .withMessage('模板ID必须是有效的UUID'),
      
      body('is_active')
        .notEmpty()
        .withMessage('状态不能为空')
        .isBoolean()
        .withMessage('状态必须是布尔值')
    ];
  }

  /**
   * 价格计算验证规则
   */
  static calculatePrice() {
    return [
      body('role_name')
        .notEmpty()
        .withMessage('角色名称不能为空')
        .isLength({ min: 1, max: 50 })
        .withMessage('角色名称长度必须在1-50个字符之间'),
      
      body('base_price')
        .notEmpty()
        .withMessage('基础价格不能为空')
        .isFloat({ min: 0 })
        .withMessage('基础价格必须是大于等于0的数字'),
      
      body('company_id')
        .optional()
        .isUUID()
        .withMessage('公司ID必须是有效的UUID'),
      
      body('store_id')
        .optional()
        .isUUID()
        .withMessage('门店ID必须是有效的UUID')
    ];
  }

  /**
   * 复制角色定价模板验证规则
   */
  static copyRolePricingTemplate() {
    return [
      param('id')
        .notEmpty()
        .withMessage('模板ID不能为空')
        .isUUID()
        .withMessage('模板ID必须是有效的UUID'),
      
      body('new_role_name')
        .notEmpty()
        .withMessage('新角色名称不能为空')
        .isLength({ min: 1, max: 50 })
        .withMessage('新角色名称长度必须在1-50个字符之间'),
      
      body('target_company_id')
        .optional()
        .isUUID()
        .withMessage('目标公司ID必须是有效的UUID'),
      
      body('target_store_ids')
        .optional()
        .isArray()
        .withMessage('目标门店ID列表必须是数组')
        .custom((value) => {
          if (value && value.length > 0) {
            for (const storeId of value) {
              if (!storeId || typeof storeId !== 'string') {
                throw new Error('门店ID必须是有效的字符串');
              }
            }
          }
          return true;
        })
    ];
  }

  /**
   * 统计查询验证规则
   */
  static getStats() {
    return [
      query('company_id')
        .optional()
        .isUUID()
        .withMessage('公司ID必须是有效的UUID'),
      
      query('store_id')
        .optional()
        .isUUID()
        .withMessage('门店ID必须是有效的UUID'),
      
      query('start_date')
        .optional()
        .isISO8601()
        .withMessage('开始日期必须是有效的日期格式'),
      
      query('end_date')
        .optional()
        .isISO8601()
        .withMessage('结束日期必须是有效的日期格式')
    ];
  }

  /**
   * 获取公司角色定价模板验证规则
   */
  static getByCompanyId() {
    return [
      param('companyId')
        .notEmpty()
        .withMessage('公司ID不能为空')
        .isUUID()
        .withMessage('公司ID必须是有效的UUID'),
      
      query('is_active')
        .optional()
        .isBoolean()
        .withMessage('状态必须是布尔值'),
      
      query('role_name')
        .optional()
        .isLength({ max: 50 })
        .withMessage('角色名称长度不能超过50个字符')
    ];
  }

  /**
   * 获取门店角色定价模板验证规则
   */
  static getByStoreId() {
    return [
      param('storeId')
        .notEmpty()
        .withMessage('门店ID不能为空')
        .isUUID()
        .withMessage('门店ID必须是有效的UUID'),
      
      query('is_active')
        .optional()
        .isBoolean()
        .withMessage('状态必须是布尔值'),
      
      query('role_name')
        .optional()
        .isLength({ max: 50 })
        .withMessage('角色名称长度不能超过50个字符')
    ];
  }

  /**
   * 删除角色定价模板验证规则
   */
  static deleteRolePricingTemplate() {
    return [
      param('id')
        .notEmpty()
        .withMessage('模板ID不能为空')
        .isUUID()
        .withMessage('模板ID必须是有效的UUID')
    ];
  }
}

module.exports = RolePricingValidator; 