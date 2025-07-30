const express = require('express');
const router = express.Router();
const orderPaymentController = require('../controllers/orderPaymentController');
const { authenticateToken } = require('../utils/auth');
const PermissionChecker = require('../utils/permissions');
const { body, param, query } = require('express-validator');

// 权限检查中间件
const checkPermission = (permission) => PermissionChecker.requirePermissionMiddleware(permission);

// 参数验证
const validatePaymentData = [
  body('order_id').isUUID().withMessage('订单ID格式不正确'),
  body('player_ids').isArray({ min: 1 }).withMessage('玩家ID数组不能为空'),
  body('player_ids.*').isUUID().withMessage('玩家ID格式不正确'),
  body('payment_method').isIn(['wechat', 'alipay', 'cash', 'bank_transfer', 'credit_card']).withMessage('支付方式无效'),
  body('amount').isFloat({ min: 0.01 }).withMessage('支付金额必须大于0'),
  body('payer_name').trim().isLength({ min: 1, max: 50 }).withMessage('付款人姓名长度必须在1-50个字符之间')
];

const validatePaymentUpdate = [
  body('payment_method').optional().isIn(['wechat', 'alipay', 'cash', 'bank_transfer', 'credit_card']).withMessage('支付方式无效'),
  body('amount').optional().isFloat({ min: 0.01 }).withMessage('支付金额必须大于0'),
  body('payer_name').optional().trim().isLength({ min: 1, max: 50 }).withMessage('付款人姓名长度必须在1-50个字符之间')
];

const validatePaymentStatusUpdate = [
  body('payment_status').isIn(['pending', 'confirmed', 'failed', 'refunded']).withMessage('支付状态无效')
];

const validateMergePayments = [
  body('payment_ids').isArray({ min: 2 }).withMessage('至少需要2个支付记录才能合并'),
  body('payment_ids.*').isUUID().withMessage('支付记录ID格式不正确'),
  body('merge_data').isObject().withMessage('合并数据必须是对象'),
  body('merge_data.payment_method').isIn(['wechat', 'alipay', 'cash', 'bank_transfer', 'credit_card']).withMessage('支付方式无效'),
  body('merge_data.payer_name').trim().isLength({ min: 1, max: 50 }).withMessage('付款人姓名长度必须在1-50个字符之间'),
  body('merge_data.payer_phone').optional().matches(/^1[3-9]\d{9}$/).withMessage('付款人手机号格式不正确'),
  body('merge_data.notes').optional().trim().isLength({ max: 500 }).withMessage('备注不能超过500个字符')
];

// 创建支付记录
router.post('/', 
  authenticateToken,
  checkPermission('order.payment'),
  validatePaymentData,
  orderPaymentController.createPayment
);

// 🆕 上传支付凭证
router.post('/upload-proof',
  authenticateToken,
  checkPermission('order.payment'),
  orderPaymentController.uploadPaymentProof
);

// 🆕 更新支付记录的凭证
router.put('/:paymentId/proof',
  authenticateToken,
  checkPermission('order.payment'),
  orderPaymentController.updatePaymentProof
);

// 创建支付记录并更新玩家状态
router.post('/with-status-update',
  authenticateToken,
  checkPermission('order.payment'),
  validatePaymentData,
  orderPaymentController.createPaymentAndUpdateStatus
);

// 获取订单的所有支付记录
router.get('/order/:orderId',
  authenticateToken,
  checkPermission('order.view'),
  param('orderId').isUUID().withMessage('订单ID格式不正确'),
  orderPaymentController.getPaymentsByOrderId
);

// 获取订单的所有支付记录（包含玩家信息）
router.get('/order/:orderId/with-players',
  authenticateToken,
  checkPermission('order.view'),
  param('orderId').isUUID().withMessage('订单ID格式不正确'),
  orderPaymentController.getPaymentsByOrderId
);

// 获取单个支付记录详情
router.get('/:id',
  authenticateToken,
  checkPermission('order.view'),
  param('id').isUUID().withMessage('支付记录ID格式不正确'),
  orderPaymentController.getPaymentDetail
);

// 更新支付记录
router.put('/:id',
  authenticateToken,
  checkPermission('order.payment'),
  param('id').isUUID().withMessage('支付记录ID格式不正确'),
  validatePaymentUpdate,
  orderPaymentController.updatePayment
);

// 更新支付状态
router.patch('/:id/status',
  authenticateToken,
  checkPermission('order.payment'),
  param('id').isUUID().withMessage('支付记录ID格式不正确'),
  validatePaymentStatusUpdate,
  orderPaymentController.updatePaymentStatus
);

// 确认支付
router.post('/:id/confirm',
  authenticateToken,
  checkPermission('order.payment'),
  param('id').isUUID().withMessage('支付记录ID格式不正确'),
  orderPaymentController.confirmPayment
);

// 删除支付记录
router.delete('/:id',
  authenticateToken,
  checkPermission('order.payment'),
  param('id').isUUID().withMessage('支付记录ID格式不正确'),
  orderPaymentController.deletePayment
);

// 获取支付统计信息
router.get('/order/:orderId/stats',
  authenticateToken,
  checkPermission('order.view'),
  param('orderId').isUUID().withMessage('订单ID格式不正确'),
  orderPaymentController.getPaymentStats
);

// 获取公司支付统计
router.get('/stats/company',
  authenticateToken,
  checkPermission('order.view'),
  [
    query('start_date').optional().isISO8601().withMessage('开始日期格式不正确'),
    query('end_date').optional().isISO8601().withMessage('结束日期格式不正确')
  ],
  orderPaymentController.getCompanyPaymentStats
);

// 获取支付方式统计
router.get('/stats/payment-methods',
  authenticateToken,
  checkPermission('order.view'),
  [
    query('start_date').optional().isISO8601().withMessage('开始日期格式不正确'),
    query('end_date').optional().isISO8601().withMessage('结束日期格式不正确')
  ],
  orderPaymentController.getPaymentMethodStats
);

// 获取付款人统计
router.get('/stats/payers',
  authenticateToken,
  checkPermission('order.view'),
  [
    query('start_date').optional().isISO8601().withMessage('开始日期格式不正确'),
    query('end_date').optional().isISO8601().withMessage('结束日期格式不正确')
  ],
  orderPaymentController.getPaymentsByPayer
);

// 合并支付记录
router.post('/merge',
  authenticateToken,
  checkPermission('order.payment'),
  validateMergePayments,
  orderPaymentController.mergePayments
);

// 上传支付凭证
router.post('/:id/upload-proof',
  authenticateToken,
  checkPermission('order.payment'),
  param('id').isUUID().withMessage('支付记录ID格式不正确'),
  orderPaymentController.uploadPaymentProof
);

// 获取支付趋势
router.get('/stats/trends',
  authenticateToken,
  checkPermission('order.view'),
  [
    query('start_date').optional().isISO8601().withMessage('开始日期格式不正确'),
    query('end_date').optional().isISO8601().withMessage('结束日期格式不正确'),
    query('granularity').optional().isIn(['day', 'week', 'month']).withMessage('粒度参数无效')
  ],
  orderPaymentController.getCompanyPaymentStats
);

// 获取未完成支付的订单
router.get('/unpaid-orders',
  authenticateToken,
  checkPermission('order.view'),
  orderPaymentController.getCompanyPaymentStats
);

// 获取部分支付的订单
router.get('/partial-paid-orders',
  authenticateToken,
  checkPermission('order.view'),
  orderPaymentController.getCompanyPaymentStats
);

// 获取退款记录
router.get('/refunds',
  authenticateToken,
  checkPermission('order.view'),
  [
    query('start_date').optional().isISO8601().withMessage('开始日期格式不正确'),
    query('end_date').optional().isISO8601().withMessage('结束日期格式不正确')
  ],
  orderPaymentController.getCompanyPaymentStats
);

// 处理退款
router.post('/:id/refund',
  authenticateToken,
  checkPermission('order.payment'),
  param('id').isUUID().withMessage('支付记录ID格式不正确'),
  [
    body('refund_amount').isFloat({ min: 0.01 }).withMessage('退款金额必须大于0'),
    body('refund_reason').trim().isLength({ min: 1, max: 200 }).withMessage('退款原因长度必须在1-200个字符之间'),
    body('refund_notes').optional().trim().isLength({ max: 500 }).withMessage('退款备注不能超过500个字符')
  ],
  orderPaymentController.getPaymentDetail
);

// 获取支付记录历史
router.get('/order/:orderId/history',
  authenticateToken,
  checkPermission('order.view'),
  param('orderId').isUUID().withMessage('订单ID格式不正确'),
  orderPaymentController.getPaymentsByOrderId
);

// 验证支付金额
router.post('/validate-amount',
  authenticateToken,
  checkPermission('order.view'),
  [
    body('order_id').isUUID().withMessage('订单ID格式不正确'),
    body('amount').isFloat({ min: 0.01 }).withMessage('金额必须大于0')
  ],
  orderPaymentController.getPaymentStats
);

// 自动匹配支付记录
router.post('/order/:orderId/auto-match',
  authenticateToken,
  checkPermission('order.payment'),
  param('orderId').isUUID().withMessage('订单ID格式不正确'),
  orderPaymentController.getPaymentsByOrderId
);

// 导出支付数据
router.get('/order/:orderId/export',
  authenticateToken,
  checkPermission('order.view'),
  param('orderId').isUUID().withMessage('订单ID格式不正确'),
  orderPaymentController.getPaymentsByOrderId
);

// 发送支付提醒
router.post('/order/:orderId/send-reminder',
  authenticateToken,
  checkPermission('order.payment'),
  param('orderId').isUUID().withMessage('订单ID格式不正确'),
  orderPaymentController.confirmPayment
);

// 计算支付手续费
router.post('/calculate-fee',
  authenticateToken,
  checkPermission('order.view'),
  [
    body('payment_method').isIn(['wechat', 'alipay', 'cash', 'bank_transfer', 'credit_card']).withMessage('支付方式无效'),
    body('amount').isFloat({ min: 0.01 }).withMessage('金额必须大于0')
  ],
  orderPaymentController.getPaymentDetail
);

// 批量处理支付
router.post('/batch-process',
  authenticateToken,
  checkPermission('order.payment'),
  [
    body('payment_ids').isArray({ min: 1 }).withMessage('支付记录ID数组不能为空'),
    body('payment_ids.*').isUUID().withMessage('支付记录ID格式不正确'),
    body('action').isIn(['confirm', 'reject']).withMessage('操作类型无效')
  ],
  orderPaymentController.mergePayments
);

module.exports = router; 