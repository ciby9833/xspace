const express = require('express');
const router = express.Router();
const rolePricingTemplateController = require('../controllers/rolePricingTemplateController');
const { authenticateToken } = require('../utils/auth');
const PermissionChecker = require('../utils/permissions');
const { body, param, query } = require('express-validator');

// 权限检查中间件
const checkPermission = (permission) => PermissionChecker.requirePermissionMiddleware(permission);

// 参数验证
const validateTemplateData = [
  body('role_name').trim().isLength({ min: 1, max: 100 }).withMessage('角色名称长度必须在1-100个字符之间'),
  body('discount_type').isIn(['percentage', 'fixed', 'multiplier']).withMessage('折扣类型无效'),
  body('discount_value').isFloat({ min: 0 }).withMessage('折扣值必须是非负数'),
  // 允许 store_ids 为 null 或数组
  body('store_ids').optional().custom((value) => {
    if (value === null || value === undefined) {
      return true; // 允许 null 或 undefined
    }
    if (Array.isArray(value)) {
      return true; // 允许数组
    }
    throw new Error('门店ID必须是数组或null');
  }),
  body('store_ids.*').optional().isUUID().withMessage('门店ID格式不正确'),
  body('is_active').optional().isBoolean().withMessage('激活状态必须是布尔值')
];

const validateBatchTemplatesData = [
  body('templates').isArray({ min: 1 }).withMessage('模板数组不能为空'),
  body('templates.*.role_name').trim().isLength({ min: 1, max: 100 }).withMessage('角色名称长度必须在1-100个字符之间'),
  body('templates.*.role_description').optional().trim().isLength({ max: 500 }).withMessage('角色描述不能超过500个字符'),
  body('templates.*.discount_type').isIn(['percentage', 'fixed', 'multiplier']).withMessage('折扣类型无效'),
  body('templates.*.discount_value').isFloat({ min: 0 }).withMessage('折扣值必须是非负数'),
  body('templates.*.min_price').optional().isFloat({ min: 0 }).withMessage('最低价格必须是非负数'),
  body('templates.*.max_price').optional().isFloat({ min: 0 }).withMessage('最高价格必须是非负数'),
  body('templates.*.store_ids').optional().isArray().withMessage('门店ID必须是数组'),
  body('templates.*.store_ids.*').optional().isUUID().withMessage('门店ID格式不正确')
];

const validateStatusUpdate = [
  body('is_active').isBoolean().withMessage('激活状态必须是布尔值')
];

const validateSortOrderUpdate = [
  body('template_ids').isArray({ min: 1 }).withMessage('模板ID数组不能为空'),
  body('template_ids.*').isUUID().withMessage('模板ID格式不正确'),
  body('sort_orders').isArray({ min: 1 }).withMessage('排序值数组不能为空'),
  body('sort_orders.*').isInt({ min: 0 }).withMessage('排序值必须是非负整数')
];

const validateCopyToStores = [
  body('store_ids').isArray({ min: 1 }).withMessage('门店ID数组不能为空'),
  body('store_ids.*').isUUID().withMessage('门店ID格式不正确')
];

const validatePriceCalculation = [
  body('original_price').isFloat({ min: 0 }).withMessage('原价必须是非负数'),
  body('template_id').isUUID().withMessage('模板ID格式不正确')
];

// 创建角色定价模板
router.post('/', 
  authenticateToken,
  checkPermission('role.pricing.manage'),
  validateTemplateData,
  rolePricingTemplateController.createTemplate
);

// 批量创建角色定价模板
router.post('/batch',
  authenticateToken,
  checkPermission('role.pricing.manage'),
  validateBatchTemplatesData,
  rolePricingTemplateController.createTemplatesBatch
);

// 获取公司的角色定价模板列表
router.get('/',
  authenticateToken,
  checkPermission('role.pricing.view'),
  rolePricingTemplateController.getTemplatesByCompany
);

// 获取适用于特定门店的角色定价模板
router.get('/store/:storeId',
  authenticateToken,
  checkPermission('role.pricing.view'),
  param('storeId').isUUID().withMessage('门店ID格式不正确'),
  rolePricingTemplateController.getTemplatesByStore
);

// 🆕 专门为下单场景获取角色定价模板（下单专用接口）
// 只需要身份验证，不需要特殊权限
router.get('/for-order/:storeId',
  authenticateToken, // 只需要用户登录
  param('storeId').isUUID().withMessage('门店ID格式不正确'),
  rolePricingTemplateController.getTemplatesForOrder
);

// 获取单个角色定价模板详情
router.get('/:id',
  authenticateToken,
  checkPermission('role.pricing.view'),
  param('id').isUUID().withMessage('模板ID格式不正确'),
  rolePricingTemplateController.getTemplateDetail
);

// 更新角色定价模板
router.put('/:id',
  authenticateToken,
  checkPermission('role.pricing.manage'),
  param('id').isUUID().withMessage('模板ID格式不正确'),
  [
    body('role_name').optional().trim().isLength({ min: 1, max: 100 }).withMessage('角色名称长度必须在1-100个字符之间'),
    body('discount_type').optional().isIn(['percentage', 'fixed', 'multiplier']).withMessage('折扣类型无效'),
    body('discount_value').optional().isFloat({ min: 0 }).withMessage('折扣值必须是非负数'),
    // 允许 store_ids 为 null 或数组
    body('store_ids').optional().custom((value) => {
      if (value === null || value === undefined) {
        return true; // 允许 null 或 undefined
      }
      if (Array.isArray(value)) {
        return true; // 允许数组
      }
      throw new Error('门店ID必须是数组或null');
    }),
    body('store_ids.*').optional().isUUID().withMessage('门店ID格式不正确'),
    body('is_active').optional().isBoolean().withMessage('激活状态必须是布尔值')
  ],
  rolePricingTemplateController.updateTemplate
);

// 更新模板状态
router.patch('/:id/status',
  authenticateToken,
  checkPermission('role.pricing.manage'),
  param('id').isUUID().withMessage('模板ID格式不正确'),
  validateStatusUpdate,
  rolePricingTemplateController.updateTemplateStatus
);

// 批量更新排序
router.patch('/sort-order',
  authenticateToken,
  checkPermission('role.pricing.manage'),
  validateSortOrderUpdate,
  rolePricingTemplateController.updateSortOrder
);

// 删除角色定价模板
router.delete('/:id',
  authenticateToken,
  checkPermission('role.pricing.manage'),
  param('id').isUUID().withMessage('模板ID格式不正确'),
  rolePricingTemplateController.deleteTemplate
);

// 获取角色统计
router.get('/stats/roles',
  authenticateToken,
  checkPermission('role.pricing.view'),
  rolePricingTemplateController.getRoleStats
);

// 获取角色使用情况统计
router.get('/stats/usage',
  authenticateToken,
  checkPermission('role.pricing.view'),
  [
    query('start_date').optional().isISO8601().withMessage('开始日期格式不正确'),
    query('end_date').optional().isISO8601().withMessage('结束日期格式不正确')
  ],
  rolePricingTemplateController.getRoleUsageStats
);

// 计算角色折扣价格
router.post('/calculate-price',
  authenticateToken,
  checkPermission('role.pricing.view'),
  validatePriceCalculation,
  rolePricingTemplateController.calculateRolePrice
);

// 获取门店专属的角色定价模板
router.get('/store/:storeId/specific',
  authenticateToken,
  checkPermission('role.pricing.view'),
  param('storeId').isUUID().withMessage('门店ID格式不正确'),
  rolePricingTemplateController.getStoreSpecificTemplates
);

// 获取公司通用的角色定价模板
router.get('/company-wide',
  authenticateToken,
  checkPermission('role.pricing.view'),
  rolePricingTemplateController.getCompanyWideTemplates
);

// 复制角色定价模板到其他门店
router.post('/:id/copy-to-stores',
  authenticateToken,
  checkPermission('role.pricing.manage'),
  param('id').isUUID().withMessage('模板ID格式不正确'),
  validateCopyToStores,
  rolePricingTemplateController.copyTemplateToStores
);

// 获取即将过期的角色定价模板
router.get('/expiring',
  authenticateToken,
  checkPermission('role.pricing.view'),
  [
    query('days').optional().isInt({ min: 1 }).withMessage('天数必须是正整数')
  ],
  rolePricingTemplateController.getExpiringTemplates
);

// 检查角色名称是否存在
router.get('/check-name',
  authenticateToken,
  checkPermission('role.pricing.view'),
  [
    query('role_name').trim().isLength({ min: 1 }).withMessage('角色名称不能为空'),
    query('exclude_template_id').optional().isUUID().withMessage('排除模板ID格式不正确')
  ],
  rolePricingTemplateController.checkRoleNameExists
);

// 获取热门角色定价模板
router.get('/popular',
  authenticateToken,
  checkPermission('role.pricing.view'),
  [
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('限制数量必须在1-50之间')
  ],
  rolePricingTemplateController.getTemplatesByCompany
);

// 获取角色定价效果分析
router.get('/:id/analysis',
  authenticateToken,
  checkPermission('role.pricing.view'),
  param('id').isUUID().withMessage('模板ID格式不正确'),
  rolePricingTemplateController.getTemplateDetail
);

// 导出角色定价模板
router.get('/export',
  authenticateToken,
  checkPermission('role.pricing.view'),
  rolePricingTemplateController.getTemplatesByCompany
);

// 导入角色定价模板
router.post('/import',
  authenticateToken,
  checkPermission('role.pricing.manage'),
  [
    body('templates').isArray({ min: 1 }).withMessage('模板数组不能为空'),
    body('templates.*.role_name').trim().isLength({ min: 1, max: 100 }).withMessage('角色名称长度必须在1-100个字符之间'),
    body('templates.*.discount_type').isIn(['percentage', 'fixed', 'multiplier']).withMessage('折扣类型无效'),
    body('templates.*.discount_value').isFloat({ min: 0 }).withMessage('折扣值必须是非负数')
  ],
  rolePricingTemplateController.createTemplatesBatch
);

// 获取角色定价建议
router.post('/suggestions',
  authenticateToken,
  checkPermission('role.pricing.view'),
  [
    body('base_price').isFloat({ min: 0 }).withMessage('基础价格必须是非负数')
  ],
  rolePricingTemplateController.calculateRolePrice
);

// 应用角色定价模板
router.post('/:id/apply-to-order',
  authenticateToken,
  checkPermission('role.pricing.manage'),
  param('id').isUUID().withMessage('模板ID格式不正确'),
  [
    body('order_id').isUUID().withMessage('订单ID格式不正确')
  ],
  rolePricingTemplateController.calculateRolePrice
);

// 获取角色定价冲突检查
router.post('/check-conflicts',
  authenticateToken,
  checkPermission('role.pricing.view'),
  validateTemplateData,
  rolePricingTemplateController.createTemplate
);

// 获取角色定价推荐
router.get('/recommendations',
  authenticateToken,
  checkPermission('role.pricing.view'),
  rolePricingTemplateController.getTemplatesByCompany
);

// 同步角色定价模板到所有门店
router.post('/:id/sync-to-all-stores',
  authenticateToken,
  checkPermission('role.pricing.manage'),
  param('id').isUUID().withMessage('模板ID格式不正确'),
  rolePricingTemplateController.copyTemplateToStores
);

// 批量激活/停用模板
router.patch('/batch/status',
  authenticateToken,
  checkPermission('role.pricing.manage'),
  [
    body('template_ids').isArray({ min: 1 }).withMessage('模板ID数组不能为空'),
    body('template_ids.*').isUUID().withMessage('模板ID格式不正确'),
    body('is_active').isBoolean().withMessage('激活状态必须是布尔值')
  ],
  rolePricingTemplateController.updateTemplateStatus
);

// 获取角色定价历史
router.get('/:id/history',
  authenticateToken,
  checkPermission('role.pricing.view'),
  param('id').isUUID().withMessage('模板ID格式不正确'),
  rolePricingTemplateController.getTemplateDetail
);

module.exports = router; 