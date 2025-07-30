const express = require('express');
const router = express.Router();
const orderPlayerController = require('../controllers/orderPlayerController');
const { authenticateToken } = require('../utils/auth');
const PermissionChecker = require('../utils/permissions');
const { body, param, query } = require('express-validator');

// 权限检查中间件
const checkPermission = (permission) => PermissionChecker.requirePermissionMiddleware(permission);

// 参数验证
const validatePlayerData = [
  body('order_id').isUUID().withMessage('订单ID格式不正确'),
  body('player_order').isInt({ min: 1 }).withMessage('玩家序号必须是正整数'),
  body('player_name').trim().isLength({ min: 1, max: 50 }).withMessage('玩家姓名长度必须在1-50个字符之间'),
  body('role_price').optional().isFloat({ min: 0 }).withMessage('角色价格必须是非负数'),
  body('final_price').optional().isFloat({ min: 0 }).withMessage('最终价格必须是非负数'),
  body('payment_status').optional().isIn(['pending', 'paid', 'partial', 'refunded']).withMessage('支付状态无效')
];

const validateBatchPlayersData = [
  body('order_id').isUUID().withMessage('订单ID格式不正确'),
  body('players').isArray({ min: 1 }).withMessage('玩家数组不能为空'),
  body('players.*.player_order').isInt({ min: 1 }).withMessage('玩家序号必须是正整数'),
  body('players.*.player_name').trim().isLength({ min: 1, max: 50 }).withMessage('玩家姓名长度必须在1-50个字符之间'),
  body('players.*.player_phone').optional().matches(/^1[3-9]\d{9}$/).withMessage('手机号格式不正确'),
  body('players.*.selected_role').optional().trim().isLength({ max: 100 }).withMessage('角色名称不能超过100个字符'),
  body('players.*.role_price').optional().isFloat({ min: 0 }).withMessage('角色价格必须是非负数'),
  body('players.*.discount_amount').optional().isFloat({ min: 0 }).withMessage('折扣金额必须是非负数'),
  body('players.*.final_price').optional().isFloat({ min: 0 }).withMessage('最终价格必须是非负数')
];

const validatePaymentStatusUpdate = [
  body('payment_status').isIn(['pending', 'paid', 'partial', 'refunded']).withMessage('支付状态无效')
];

const validateBatchPaymentStatusUpdate = [
  body('player_ids').isArray({ min: 1 }).withMessage('玩家ID数组不能为空'),
  body('player_ids.*').isUUID().withMessage('玩家ID格式不正确'),
  body('payment_status').isIn(['pending', 'paid', 'partial', 'refunded']).withMessage('支付状态无效')
];

// 创建订单参与玩家
router.post('/', 
  authenticateToken,
  checkPermission('order.edit'),
  validatePlayerData,
  orderPlayerController.createPlayer
);

// 批量创建订单参与玩家
router.post('/batch',
  authenticateToken,
  checkPermission('order.edit'),
  validateBatchPlayersData,
  orderPlayerController.createPlayersBatch
);

// 获取订单的所有参与玩家
router.get('/order/:orderId',
  authenticateToken,
  checkPermission('order.view'),
  param('orderId').isUUID().withMessage('订单ID格式不正确'),
  orderPlayerController.getPlayersByOrderId
);

// 获取订单的所有参与玩家（包含支付信息）
router.get('/order/:orderId/with-payments',
  authenticateToken,
  checkPermission('order.view'),
  param('orderId').isUUID().withMessage('订单ID格式不正确'),
  orderPlayerController.getPlayersByOrderId
);

// 获取单个参与玩家详情
router.get('/:id',
  authenticateToken,
  checkPermission('order.view'),
  param('id').isUUID().withMessage('玩家ID格式不正确'),
  orderPlayerController.getPlayerDetail
);

// 更新参与玩家信息
router.put('/:id',
  authenticateToken,
  checkPermission('order.edit'),
  param('id').isUUID().withMessage('玩家ID格式不正确'),
  [
    body('player_order').optional().isInt({ min: 1 }).withMessage('玩家序号必须是正整数'),
    body('player_name').optional().trim().isLength({ min: 1, max: 50 }).withMessage('玩家姓名长度必须在1-50个字符之间'),
    body('role_price').optional().isFloat({ min: 0 }).withMessage('角色价格必须是非负数'),
    body('final_price').optional().isFloat({ min: 0 }).withMessage('最终价格必须是非负数')
  ],
  orderPlayerController.updatePlayer
);

// 更新参与玩家支付状态
router.patch('/:id/payment-status',
  authenticateToken,
  checkPermission('order.payment'),
  param('id').isUUID().withMessage('玩家ID格式不正确'),
  validatePaymentStatusUpdate,
  orderPlayerController.updatePaymentStatus
);

// 批量更新支付状态
router.patch('/batch/payment-status',
  authenticateToken,
  checkPermission('order.payment'),
  validateBatchPaymentStatusUpdate,
  orderPlayerController.updatePaymentStatusBatch
);

// 删除参与玩家
router.delete('/:id',
  authenticateToken,
  checkPermission('order.edit'),
  param('id').isUUID().withMessage('玩家ID格式不正确'),
  orderPlayerController.deletePlayer
);

// 获取订单的支付统计信息
router.get('/order/:orderId/payment-stats',
  authenticateToken,
  checkPermission('order.view'),
  param('orderId').isUUID().withMessage('订单ID格式不正确'),
  orderPlayerController.getPaymentStats
);

// 获取角色使用统计
router.get('/stats/roles',
  authenticateToken,
  checkPermission('order.view'),
  [
    query('start_date').optional().isISO8601().withMessage('开始日期格式不正确'),
    query('end_date').optional().isISO8601().withMessage('结束日期格式不正确')
  ],
  orderPlayerController.getRoleStats
);

// 获取下一个玩家序号
router.get('/order/:orderId/next-player-order',
  authenticateToken,
  checkPermission('order.view'),
  param('orderId').isUUID().withMessage('订单ID格式不正确'),
  orderPlayerController.getNextPlayerOrder
);

// 检查玩家序号可用性
router.get('/order/:orderId/check-player-order/:playerOrder',
  authenticateToken,
  checkPermission('order.view'),
  param('orderId').isUUID().withMessage('订单ID格式不正确'),
  param('playerOrder').isInt({ min: 1 }).withMessage('玩家序号必须是正整数'),
  (req, res, next) => {
    req.query.playerOrder = req.params.playerOrder;
    next();
  },
  orderPlayerController.getNextPlayerOrder
);

// 获取订单玩家摘要
router.get('/order/:orderId/summary',
  authenticateToken,
  checkPermission('order.view'),
  param('orderId').isUUID().withMessage('订单ID格式不正确'),
  orderPlayerController.getPaymentStats
);

// 复制玩家到其他订单
router.post('/copy',
  authenticateToken,
  checkPermission('order.edit'),
  [
    body('source_order_id').isUUID().withMessage('源订单ID格式不正确'),
    body('target_order_id').isUUID().withMessage('目标订单ID格式不正确')
  ],
  orderPlayerController.createPlayersBatch
);

// 重新计算所有玩家价格
router.post('/order/:orderId/recalculate-prices',
  authenticateToken,
  checkPermission('order.edit'),
  param('orderId').isUUID().withMessage('订单ID格式不正确'),
  orderPlayerController.updatePlayer
);

// 导出玩家数据
router.get('/order/:orderId/export',
  authenticateToken,
  checkPermission('order.view'),
  param('orderId').isUUID().withMessage('订单ID格式不正确'),
  orderPlayerController.getPlayersByOrderId
);

module.exports = router; 