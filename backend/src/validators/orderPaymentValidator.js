const { body, param, query } = require('express-validator');

/**
 * 支付记录验证器
 */
class OrderPaymentValidator {
  /**
   * 创建支付记录验证规则
   */
  static createOrderPayment() {
    return [
      body('order_id')
        .notEmpty()
        .withMessage('订单ID不能为空')
        .isUUID()
        .withMessage('订单ID必须是有效的UUID'),
      
      body('payer_name')
        .notEmpty()
        .withMessage('支付人姓名不能为空')
        .isLength({ min: 1, max: 50 })
        .withMessage('支付人姓名长度必须在1-50个字符之间'),
      
      body('payer_phone')
        .optional()
        .matches(/^1[3-9]\d{9}$/)
        .withMessage('支付人电话必须是有效的手机号码'),
      
      body('payment_amount')
        .notEmpty()
        .withMessage('支付金额不能为空')
        .isFloat({ min: 0 })
        .withMessage('支付金额必须是大于等于0的数字'),
      
      body('payment_method')
        .notEmpty()
        .withMessage('支付方式不能为空')
        .isIn(['cash', 'alipay', 'wechat', 'card', 'bank_transfer'])
        .withMessage('支付方式必须是cash、alipay、wechat、card或bank_transfer'),
      
      body('payment_status')
        .optional()
        .isIn(['pending', 'confirmed', 'cancelled'])
        .withMessage('支付状态必须是pending、confirmed或cancelled'),
      
      body('covered_player_ids')
        .optional()
        .isArray()
        .withMessage('覆盖的玩家ID列表必须是数组')
        .custom((value) => {
          if (value && value.length > 0) {
            for (const playerId of value) {
              if (!playerId || typeof playerId !== 'string') {
                throw new Error('玩家ID必须是有效的字符串');
              }
            }
          }
          return true;
        }),
      
      body('transaction_id')
        .optional()
        .isLength({ max: 100 })
        .withMessage('交易ID长度不能超过100个字符'),
      
      body('payment_notes')
        .optional()
        .isLength({ max: 500 })
        .withMessage('支付备注长度不能超过500个字符')
    ];
  }

  /**
   * 更新支付记录验证规则
   */
  static updateOrderPayment() {
    return [
      param('id')
        .notEmpty()
        .withMessage('支付记录ID不能为空')
        .isUUID()
        .withMessage('支付记录ID必须是有效的UUID'),
      
      body('payer_name')
        .optional()
        .isLength({ min: 1, max: 50 })
        .withMessage('支付人姓名长度必须在1-50个字符之间'),
      
      body('payer_phone')
        .optional()
        .matches(/^1[3-9]\d{9}$/)
        .withMessage('支付人电话必须是有效的手机号码'),
      
      body('payment_amount')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('支付金额必须是大于等于0的数字'),
      
      body('payment_method')
        .optional()
        .isIn(['cash', 'alipay', 'wechat', 'card', 'bank_transfer'])
        .withMessage('支付方式必须是cash、alipay、wechat、card或bank_transfer'),
      
      body('payment_status')
        .optional()
        .isIn(['pending', 'confirmed', 'cancelled'])
        .withMessage('支付状态必须是pending、confirmed或cancelled'),
      
      body('covered_player_ids')
        .optional()
        .isArray()
        .withMessage('覆盖的玩家ID列表必须是数组')
        .custom((value) => {
          if (value && value.length > 0) {
            for (const playerId of value) {
              if (!playerId || typeof playerId !== 'string') {
                throw new Error('玩家ID必须是有效的字符串');
              }
            }
          }
          return true;
        }),
      
      body('transaction_id')
        .optional()
        .isLength({ max: 100 })
        .withMessage('交易ID长度不能超过100个字符'),
      
      body('payment_notes')
        .optional()
        .isLength({ max: 500 })
        .withMessage('支付备注长度不能超过500个字符')
    ];
  }

  /**
   * 获取支付记录详情验证规则
   */
  static getOrderPayment() {
    return [
      param('id')
        .notEmpty()
        .withMessage('支付记录ID不能为空')
        .isUUID()
        .withMessage('支付记录ID必须是有效的UUID')
    ];
  }

  /**
   * 获取支付记录列表验证规则
   */
  static getOrderPaymentList() {
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
      
      query('payer_name')
        .optional()
        .isLength({ max: 50 })
        .withMessage('支付人姓名长度不能超过50个字符'),
      
      query('payment_method')
        .optional()
        .isIn(['cash', 'alipay', 'wechat', 'card', 'bank_transfer'])
        .withMessage('支付方式必须是cash、alipay、wechat、card或bank_transfer'),
      
      query('payment_status')
        .optional()
        .isIn(['pending', 'confirmed', 'cancelled'])
        .withMessage('支付状态必须是pending、confirmed或cancelled'),
      
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
        }),
      
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
   * 获取指定订单的支付记录验证规则
   */
  static getByOrderId() {
    return [
      param('orderId')
        .notEmpty()
        .withMessage('订单ID不能为空')
        .isUUID()
        .withMessage('订单ID必须是有效的UUID'),
      
      query('payment_status')
        .optional()
        .isIn(['pending', 'confirmed', 'cancelled'])
        .withMessage('支付状态必须是pending、confirmed或cancelled'),
      
      query('payment_method')
        .optional()
        .isIn(['cash', 'alipay', 'wechat', 'card', 'bank_transfer'])
        .withMessage('支付方式必须是cash、alipay、wechat、card或bank_transfer')
    ];
  }

  /**
   * 确认支付验证规则
   */
  static confirmPayment() {
    return [
      param('id')
        .notEmpty()
        .withMessage('支付记录ID不能为空')
        .isUUID()
        .withMessage('支付记录ID必须是有效的UUID'),
      
      body('confirmation_notes')
        .optional()
        .isLength({ max: 500 })
        .withMessage('确认备注长度不能超过500个字符'),
      
      body('confirmed_amount')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('确认金额必须是大于等于0的数字'),
      
      body('transaction_id')
        .optional()
        .isLength({ max: 100 })
        .withMessage('交易ID长度不能超过100个字符')
    ];
  }

  /**
   * 取消支付验证规则
   */
  static cancelPayment() {
    return [
      param('id')
        .notEmpty()
        .withMessage('支付记录ID不能为空')
        .isUUID()
        .withMessage('支付记录ID必须是有效的UUID'),
      
      body('cancellation_reason')
        .optional()
        .isLength({ max: 500 })
        .withMessage('取消原因长度不能超过500个字符')
    ];
  }

  /**
   * 合并支付记录验证规则
   */
  static mergePayments() {
    return [
      body('payment_ids')
        .isArray({ min: 2 })
        .withMessage('支付记录ID列表必须包含至少2个元素'),
      
      body('payment_ids.*')
        .isUUID()
        .withMessage('支付记录ID必须是有效的UUID'),
      
      body('target_payment_id')
        .notEmpty()
        .withMessage('目标支付记录ID不能为空')
        .isUUID()
        .withMessage('目标支付记录ID必须是有效的UUID')
        .custom((value, { req }) => {
          if (req.body.payment_ids && !req.body.payment_ids.includes(value)) {
            throw new Error('目标支付记录ID必须在支付记录ID列表中');
          }
          return true;
        }),
      
      body('merge_notes')
        .optional()
        .isLength({ max: 500 })
        .withMessage('合并备注长度不能超过500个字符')
    ];
  }

  /**
   * 拆分支付记录验证规则
   */
  static splitPayment() {
    return [
      param('id')
        .notEmpty()
        .withMessage('支付记录ID不能为空')
        .isUUID()
        .withMessage('支付记录ID必须是有效的UUID'),
      
      body('split_details')
        .isArray({ min: 2 })
        .withMessage('拆分详情必须包含至少2个元素'),
      
      body('split_details.*.amount')
        .notEmpty()
        .withMessage('拆分金额不能为空')
        .isFloat({ min: 0 })
        .withMessage('拆分金额必须是大于等于0的数字'),
      
      body('split_details.*.covered_player_ids')
        .optional()
        .isArray()
        .withMessage('覆盖的玩家ID列表必须是数组'),
      
      body('split_details.*.notes')
        .optional()
        .isLength({ max: 500 })
        .withMessage('拆分备注长度不能超过500个字符')
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
        .custom((value, { req }) => {
          if (value && req.query.start_date && new Date(value) <= new Date(req.query.start_date)) {
            throw new Error('结束日期必须晚于开始日期');
          }
          return true;
        }),
      
      query('payment_method')
        .optional()
        .isIn(['cash', 'alipay', 'wechat', 'card', 'bank_transfer'])
        .withMessage('支付方式必须是cash、alipay、wechat、card或bank_transfer'),
      
      query('payment_status')
        .optional()
        .isIn(['pending', 'confirmed', 'cancelled'])
        .withMessage('支付状态必须是pending、confirmed或cancelled')
    ];
  }

  /**
   * 获取支付方式统计验证规则
   */
  static getPaymentMethodStats() {
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
  static getPaymentStatusStats() {
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
   * 删除支付记录验证规则
   */
  static deleteOrderPayment() {
    return [
      param('id')
        .notEmpty()
        .withMessage('支付记录ID不能为空')
        .isUUID()
        .withMessage('支付记录ID必须是有效的UUID')
    ];
  }
}

module.exports = OrderPaymentValidator; 