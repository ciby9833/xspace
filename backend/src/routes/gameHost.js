const express = require('express');
const router = express.Router();
const gameHostController = require('../controllers/gameHostController');
const { authenticateToken, checkPermission } = require('../utils/auth');
const { body, param, query } = require('express-validator');

// 应用认证中间件到所有路由
router.use(authenticateToken);

// Game Host订单更新验证规则
const gameHostUpdateValidationRules = [
  body('player_count').optional().isInt({ min: 1, max: 20 }).withMessage('玩家人数必须是1-20之间的整数'),
  body('support_player_count').optional().isInt({ min: 0, max: 10 }).withMessage('补位人数必须是0-10之间的整数'),
  body('language').optional().isIn(['CN', 'EN', 'IND']).withMessage('语言必须是CN、EN或IND'),
  body('internal_support').optional().isBoolean().withMessage('内部补位必须是布尔值'),
  body('room_id').optional().isUUID().withMessage('房间ID格式不正确'),
  body('script_id').optional().isUUID().withMessage('剧本ID格式不正确'),
  body('escape_room_id').optional().isUUID().withMessage('密室ID格式不正确'),
  body('game_host_notes').optional().isLength({ max: 1000 }).withMessage('Game Host备注不能超过1000个字符')
];

// 完成游戏验证规则
const completeGameValidationRules = [
  body('game_host_notes').optional().isLength({ max: 1000 }).withMessage('Game Host备注不能超过1000个字符')
];

// 获取Game Host订单列表
router.get('/orders', 
  checkPermission('game_host.view'),
  query('start_date').optional().isISO8601().withMessage('开始日期格式不正确'),
  query('end_date').optional().isISO8601().withMessage('结束日期格式不正确'),
  query('order_type').optional().isIn(['剧本杀', '密室']).withMessage('订单类型必须是剧本杀或密室'),
  query('status').optional().isIn(['pending', 'confirmed', 'in_progress', 'completed', 'cancelled']).withMessage('状态不正确'),
  query('store_id').optional().isUUID().withMessage('门店ID格式不正确'),
  gameHostController.getOrders
);

// 获取当前进行中的订单
router.get('/current-order', 
  checkPermission('game_host.view'),
  gameHostController.getCurrentOrder
);

// 获取今日统计
router.get('/stats/today', 
  checkPermission('game_host.view'),
  gameHostController.getTodayStats
);

// 获取订单历史记录（分页）
router.get('/orders/history',
  checkPermission('game_host.view'),
  query('page').optional().isInt({ min: 1 }).withMessage('页码必须是正整数'),
  query('pageSize').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须是1-100之间的整数'),
  query('startDate').optional().isISO8601().withMessage('开始日期格式不正确'),
  query('endDate').optional().isISO8601().withMessage('结束日期格式不正确'),
  query('status').optional().isIn(['pending', 'confirmed', 'in_progress', 'completed', 'cancelled']).withMessage('状态不正确'),
  gameHostController.getOrderHistory
);

// 获取可用资源

// 获取可用房间列表
router.get('/resources/rooms', 
  checkPermission('game_host.view'),
  query('storeId').optional().isUUID().withMessage('门店ID格式不正确'),
  gameHostController.getAvailableRooms
);

// 获取可用剧本列表
router.get('/resources/scripts', 
  checkPermission('game_host.view'),
  query('storeId').optional().isUUID().withMessage('门店ID格式不正确'),
  gameHostController.getAvailableScripts
);

// 获取可用密室列表
router.get('/resources/escape-rooms', 
  checkPermission('game_host.view'),
  query('storeId').optional().isUUID().withMessage('门店ID格式不正确'),
  gameHostController.getAvailableEscapeRooms
);

// 获取订单详情
router.get('/orders/:orderId', 
  checkPermission('game_host.view'),
  param('orderId').isUUID().withMessage('订单ID格式不正确'),
  gameHostController.getOrderById
);

// 开始游戏
router.post('/orders/:orderId/start', 
  checkPermission('game_host.start'),
  param('orderId').isUUID().withMessage('订单ID格式不正确'),
  gameHostController.startGame
);

// 完成游戏
router.post('/orders/:orderId/complete', 
  checkPermission('game_host.complete'),
  param('orderId').isUUID().withMessage('订单ID格式不正确'),
  completeGameValidationRules,
  gameHostController.completeGame
);

// 更新订单信息
router.put('/orders/:orderId', 
  checkPermission('game_host.update'),
  param('orderId').isUUID().withMessage('订单ID格式不正确'),
  gameHostUpdateValidationRules,
  gameHostController.updateOrder
);

module.exports = router; 