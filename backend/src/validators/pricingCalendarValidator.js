const { body, param, query } = require('express-validator');

/**
 * 定价日历验证器
 */
class PricingCalendarValidator {
  /**
   * 创建定价日历验证规则
   */
  static createPricingCalendar() {
    return [
      body('date_type')
        .optional({ nullable: true })
        .isIn(['weekend', 'holiday', 'special', 'promotion'])
        .withMessage('日期类型必须是weekend、holiday、special或promotion'),
      
      body('specific_date')
        .optional({ nullable: true })
        .custom((value, { req }) => {
          if (req.body.date_type === 'special' && !value) {
            throw new Error('特殊日期类型必须指定具体日期');
          }
          return true;
        })
        .isDate()
        .withMessage('请输入有效的日期'),
      
      body('discount_type')
        .notEmpty()
        .withMessage('折扣类型不能为空')
        .isIn(['percentage', 'fixed'])
        .withMessage('折扣类型必须是percentage或fixed'),
      
      body('discount_value')
        .notEmpty()
        .withMessage('折扣值不能为空')
        .isFloat({ min: 0 })
        .withMessage('折扣值必须是大于等于0的数字'),
      
      body('store_ids')
        .optional({ nullable: true })
        .custom((value) => {
          // null 或 undefined 表示通用（适用于所有门店）
          if (value === null || value === undefined) {
            return true;
          }
          // 如果不是null，必须是数组
          if (!Array.isArray(value)) {
            throw new Error('门店ID列表必须是数组');
          }
          // 验证数组中每个元素都是有效的UUID
          for (const storeId of value) {
            if (!storeId || typeof storeId !== 'string') {
              throw new Error('门店ID必须是有效的字符串');
            }
          }
          return true;
        }),
      
      body('description')
        .optional()
        .isLength({ max: 200 })
        .withMessage('描述长度不能超过200个字符'),
      
      body('is_active')
        .optional()
        .isBoolean()
        .withMessage('状态必须是布尔值'),
      
      // 忽略前端可能发送的其他字段（数据库中不存在）
      body('effective_date').optional(),
      body('expiry_date').optional(),
      body('priority').optional(),
      body('id').optional()
    ];
  }

  /**
   * 更新定价日历验证规则
   */
  static updatePricingCalendar() {
    return [
      param('id')
        .notEmpty()
        .withMessage('日历ID不能为空')
        .isUUID()
        .withMessage('日历ID必须是有效的UUID'),
      
      ...this.createPricingCalendar()
    ];
  }

  /**
   * 获取定价日历详情验证规则
   */
  static getPricingCalendar() {
    return [
      param('id')
        .notEmpty()
        .withMessage('日历ID不能为空')
        .isUUID()
        .withMessage('日历ID必须是有效的UUID')
    ];
  }

  /**
   * 获取定价日历列表验证规则
   */
  static getPricingCalendarList() {
    return [
      query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('页码必须是大于0的整数'),
      
      query('page_size')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('每页数量必须是1-100之间的整数'),
      
      query('date_type')
        .optional()
        .custom((value) => {
          if (value === '' || value === null || value === undefined) {
            return true; // 空字符串或null/undefined都视为有效
          }
          if (!['weekend', 'holiday', 'special', 'promotion'].includes(value)) {
            throw new Error('日期类型必须是weekend、holiday、special或promotion');
          }
          return true;
        }),
      
      query('discount_type')
        .optional()
        .custom((value) => {
          if (value === '' || value === null || value === undefined) {
            return true; // 空字符串或null/undefined都视为有效
          }
          if (!['percentage', 'fixed'].includes(value)) {
            throw new Error('折扣类型必须是percentage或fixed');
          }
          return true;
        }),
      
      query('start_date')
        .optional()
        .custom((value) => {
          if (value === '' || value === null || value === undefined) {
            return true; // 空字符串或null/undefined都视为有效
          }
          if (!value.match(/^\d{4}-\d{2}-\d{2}$/)) {
            throw new Error('开始日期必须是有效的ISO8601格式');
          }
          return true;
        }),
      
      query('end_date')
        .optional()
        .custom((value) => {
          if (value === '' || value === null || value === undefined) {
            return true; // 空字符串或null/undefined都视为有效
          }
          if (!value.match(/^\d{4}-\d{2}-\d{2}$/)) {
            throw new Error('结束日期必须是有效的ISO8601格式');
          }
          return true;
        }),
      
      query('is_active')
        .optional()
        .custom((value) => {
          if (value === '' || value === null || value === undefined) {
            return true; // 空字符串或null/undefined都视为有效
          }
          if (value !== 'true' && value !== 'false') {
            throw new Error('状态必须是布尔值');
          }
          return true;
        }),
      
      query('store_id')
        .optional()
        .custom((value) => {
          if (value === '' || value === null || value === undefined) {
            return true; // 空字符串或null/undefined都视为有效
          }
          if (!value.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
            throw new Error('门店ID必须是有效的UUID');
          }
          return true;
        })
    ];
  }

  /**
   * 批量更新状态验证规则
   */
  static batchUpdateStatus() {
    return [
      body('calendar_ids')
        .isArray({ min: 1 })
        .withMessage('日历ID列表必须是非空数组'),
      
      body('calendar_ids.*')
        .isUUID()
        .withMessage('日历ID必须是有效的UUID'),
      
      body('is_active')
        .notEmpty()
        .withMessage('状态不能为空')
        .isBoolean()
        .withMessage('状态必须是布尔值')
    ];
  }

  /**
   * 删除定价日历验证规则
   */
  static deletePricingCalendar() {
    return [
      param('id')
        .notEmpty()
        .withMessage('日历ID不能为空')
        .isUUID()
        .withMessage('日历ID必须是有效的UUID')
    ];
  }
}

module.exports = PricingCalendarValidator; 