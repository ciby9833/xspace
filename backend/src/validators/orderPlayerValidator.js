const { body, param, query } = require('express-validator');

/**
 * 订单参与玩家验证器
 */
class OrderPlayerValidator {
  /**
   * 创建订单参与玩家验证规则
   */
  static createOrderPlayer() {
    return [
      body('order_id')
        .notEmpty()
        .withMessage('订单ID不能为空')
        .isUUID()
        .withMessage('订单ID必须是有效的UUID'),
      
      body('role_name')
        .notEmpty()
        .withMessage('角色名称不能为空')
        .isLength({ min: 1, max: 50 })
        .withMessage('角色名称长度必须在1-50个字符之间'),
      
      body('player_name')
        .notEmpty()
        .withMessage('玩家姓名不能为空')
        .isLength({ min: 1, max: 50 })
        .withMessage('玩家姓名长度必须在1-50个字符之间'),
      
      body('player_phone')
        .optional()
        .matches(/^1[3-9]\d{9}$/)
        .withMessage('玩家电话必须是有效的手机号码'),
      
      body('role_price')
        .notEmpty()
        .withMessage('角色价格不能为空')
        .isFloat({ min: 0 })
        .withMessage('角色价格必须是大于等于0的数字'),
      
      body('payment_status')
        .optional()
        .isIn(['pending', 'paid', 'cancelled'])
        .withMessage('支付状态必须是pending、paid或cancelled'),
      
      body('special_requirements')
        .optional()
        .isLength({ max: 500 })
        .withMessage('特殊要求长度不能超过500个字符'),
      
      body('player_notes')
        .optional()
        .isLength({ max: 500 })
        .withMessage('玩家备注长度不能超过500个字符')
    ];
  }

  /**
   * 更新订单参与玩家验证规则
   */
  static updateOrderPlayer() {
    return [
      param('id')
        .notEmpty()
        .withMessage('参与玩家ID不能为空')
        .isUUID()
        .withMessage('参与玩家ID必须是有效的UUID'),
      
      body('role_name')
        .optional()
        .isLength({ min: 1, max: 50 })
        .withMessage('角色名称长度必须在1-50个字符之间'),
      
      body('player_name')
        .optional()
        .isLength({ min: 1, max: 50 })
        .withMessage('玩家姓名长度必须在1-50个字符之间'),
      
      body('player_phone')
        .optional()
        .matches(/^1[3-9]\d{9}$/)
        .withMessage('玩家电话必须是有效的手机号码'),
      
      body('role_price')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('角色价格必须是大于等于0的数字'),
      
      body('payment_status')
        .optional()
        .isIn(['pending', 'paid', 'cancelled'])
        .withMessage('支付状态必须是pending、paid或cancelled'),
      
      body('special_requirements')
        .optional()
        .isLength({ max: 500 })
        .withMessage('特殊要求长度不能超过500个字符'),
      
      body('player_notes')
        .optional()
        .isLength({ max: 500 })
        .withMessage('玩家备注长度不能超过500个字符')
    ];
  }

  /**
   * 获取订单参与玩家详情验证规则
   */
  static getOrderPlayer() {
    return [
      param('id')
        .notEmpty()
        .withMessage('参与玩家ID不能为空')
        .isUUID()
        .withMessage('参与玩家ID必须是有效的UUID')
    ];
  }

  /**
   * 获取订单参与玩家列表验证规则
   */
  static getOrderPlayerList() {
    return [
      query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('页码必须是大于0的整数'),
      
      query('page_size')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('每页数量必须是1-100之间的整数'),
      
      query('order_id')
        .optional()
        .isUUID()
        .withMessage('订单ID必须是有效的UUID'),
      
      query('role_name')
        .optional()
        .isLength({ max: 50 })
        .withMessage('角色名称长度不能超过50个字符'),
      
      query('player_name')
        .optional()
        .isLength({ max: 50 })
        .withMessage('玩家姓名长度不能超过50个字符'),
      
      query('payment_status')
        .optional()
        .isIn(['pending', 'paid', 'cancelled'])
        .withMessage('支付状态必须是pending、paid或cancelled'),
      
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
   * 获取指定订单的参与玩家验证规则
   */
  static getByOrderId() {
    return [
      param('orderId')
        .notEmpty()
        .withMessage('订单ID不能为空')
        .isUUID()
        .withMessage('订单ID必须是有效的UUID'),
      
      query('role_name')
        .optional()
        .isLength({ max: 50 })
        .withMessage('角色名称长度不能超过50个字符'),
      
      query('payment_status')
        .optional()
        .isIn(['pending', 'paid', 'cancelled'])
        .withMessage('支付状态必须是pending、paid或cancelled')
    ];
  }

  /**
   * 批量创建订单参与玩家验证规则
   */
  static batchCreateOrderPlayers() {
    return [
      body('players')
        .isArray({ min: 1 })
        .withMessage('玩家列表必须是非空数组'),
      
      body('players.*.order_id')
        .notEmpty()
        .withMessage('订单ID不能为空')
        .isUUID()
        .withMessage('订单ID必须是有效的UUID'),
      
      body('players.*.role_name')
        .notEmpty()
        .withMessage('角色名称不能为空')
        .isLength({ min: 1, max: 50 })
        .withMessage('角色名称长度必须在1-50个字符之间'),
      
      body('players.*.player_name')
        .notEmpty()
        .withMessage('玩家姓名不能为空')
        .isLength({ min: 1, max: 50 })
        .withMessage('玩家姓名长度必须在1-50个字符之间'),
      
      body('players.*.role_price')
        .notEmpty()
        .withMessage('角色价格不能为空')
        .isFloat({ min: 0 })
        .withMessage('角色价格必须是大于等于0的数字')
    ];
  }

  /**
   * 批量更新支付状态验证规则
   */
  static batchUpdatePaymentStatus() {
    return [
      body('player_ids')
        .isArray({ min: 1 })
        .withMessage('玩家ID列表必须是非空数组'),
      
      body('player_ids.*')
        .isUUID()
        .withMessage('玩家ID必须是有效的UUID'),
      
      body('payment_status')
        .notEmpty()
        .withMessage('支付状态不能为空')
        .isIn(['pending', 'paid', 'cancelled'])
        .withMessage('支付状态必须是pending、paid或cancelled')
    ];
  }

  /**
   * 统计查询验证规则
   */
  static getStats() {
    return [
      query('order_id')
        .optional()
        .isUUID()
        .withMessage('订单ID必须是有效的UUID'),
      
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
        .custom((value, { req }) => {
          if (value && req.query.start_date && new Date(value) <= new Date(req.query.start_date)) {
            throw new Error('结束日期必须晚于开始日期');
          }
          return true;
        })
    ];
  }

  /**
   * 获取角色统计验证规则
   */
  static getRoleStats() {
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
   * 获取支付状态统计验证规则
   */
  static getPaymentStats() {
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
   * 删除订单参与玩家验证规则
   */
  static deleteOrderPlayer() {
    return [
      param('id')
        .notEmpty()
        .withMessage('参与玩家ID不能为空')
        .isUUID()
        .withMessage('参与玩家ID必须是有效的UUID')
    ];
  }
}

module.exports = OrderPlayerValidator; 