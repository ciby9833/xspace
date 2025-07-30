const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticateToken } = require('../utils/auth');
const PermissionChecker = require('../utils/permissions');
const { body, param } = require('express-validator');

// 权限检查中间件
const checkPermission = (permission) => PermissionChecker.requirePermissionMiddleware(permission);

// 订单图片上传（功能内部依赖，用户有order.create权限即可上传图片）
router.post('/upload-images', authenticateToken, checkPermission('order.create'), orderController.uploadImages);

// 订单统计和报表
router.get('/stats/summary', authenticateToken, checkPermission('order.view'), orderController.getStats);

// 获取订单统计
router.get('/stats', 
  authenticateToken,
  checkPermission('order.view'),
  orderController.getStats
);

// 🆕 获取用户可选门店列表
router.get('/available-stores', 
  authenticateToken,
  checkPermission('order.view'),
  orderController.getAvailableStores
);

// 获取门店订单列表
router.get('/store/:storeId', 
  authenticateToken,
  checkPermission('order.view'),
  param('storeId').isUUID().withMessage('门店ID格式不正确'),
  orderController.getStoreOrders
);

// 获取门店统计
router.get('/store/:storeId/stats', 
  authenticateToken,
  checkPermission('order.view'),
  param('storeId').isUUID().withMessage('门店ID格式不正确'),
  orderController.getStoreStats
);

// 获取门店可用资源
router.get('/store/:storeId/resources', 
  authenticateToken,
  checkPermission('order.view'),
  param('storeId').isUUID().withMessage('门店ID格式不正确'),
  orderController.getStoreResources
);

// 🆕 获取房间占用情况
router.get('/store/:storeId/rooms/:roomId/occupancy', 
  authenticateToken,
  checkPermission('order.view'),
  param('storeId').isUUID().withMessage('门店ID格式不正确'),
  param('roomId').isUUID().withMessage('房间ID格式不正确'),
  orderController.getRoomOccupancy
);

// 🆕 检查房间可用性
router.get('/store/:storeId/rooms/:roomId/availability', 
  authenticateToken,
  checkPermission('order.view'),
  param('storeId').isUUID().withMessage('门店ID格式不正确'),
  param('roomId').isUUID().withMessage('房间ID格式不正确'),
  orderController.checkRoomAvailability
);

// 获取订单配置
router.get('/configs/:configType?', 
  authenticateToken,
  checkPermission('order.view'),
  orderController.getConfigs
);

// 批量操作
router.post('/batch', 
  authenticateToken,
  checkPermission('order.manage'),
  body('operation').isIn(['confirm', 'complete', 'cancel']).withMessage('操作类型不正确'),
  body('order_ids').isArray({ min: 1 }).withMessage('请选择要操作的订单'),
  orderController.batchOperation
);

// 获取可预订项目列表（剧本+密室统一）
router.get('/booking/items',
  authenticateToken,
  checkPermission('order.view'),
  orderController.getBookingItems.bind(orderController)
);

// 获取预订项目详情页数据
router.get('/booking/item/:itemType/:itemId',
  authenticateToken,
  checkPermission('order.view'),
  orderController.getBookingItemDetail.bind(orderController)
);

// 获取门店房间时间表
router.get('/booking/store/:storeId/schedule',
  authenticateToken,
  checkPermission('order.view'),
  orderController.getStoreRoomSchedule.bind(orderController)
);

// 预检查预订可用性 - 支持多种功能权限
router.post('/booking/pre-check',
  authenticateToken,
  checkPermission('order.create'),
  orderController.preCheckBooking.bind(orderController)
);

// 🆕 检查自定义时间段可用性
router.get('/stores/:storeId/rooms/:roomId/time-slots/check', orderController.checkCustomTimeSlot);

// 🆕 获取可用的角色定价模板（用于订单折扣选择）
router.get('/stores/:storeId/role-pricing-templates', orderController.getAvailableRolePricingTemplates);

// 🆕 获取可用的定价日历规则（用于订单折扣选择）
router.get('/stores/:storeId/pricing-calendar', orderController.getAvailablePricingCalendar);

// 🆕 计算订单折扣预览
router.post('/calculate-discount', orderController.calculateOrderDiscount);

// 🆕 获取订单支付信息汇总（包含玩家和支付记录）
router.get('/:orderId/payment-summary', 
  authenticateToken,
  checkPermission('order.view'),
  param('orderId').isUUID().withMessage('订单ID格式不正确'),
  orderController.getOrderPaymentSummary
);

// 🆕 订单状态管理路由
router.put('/:id/status', 
  authenticateToken, 
  checkPermission('order.manage'), 
  param('id').isUUID().withMessage('订单ID格式不正确'),
  body('status').isIn(['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'refunded', 'partially_refunded', 'no_show', 'rescheduled']).withMessage('无效的订单状态'),
  orderController.updateStatus
);

// 🆕 游戏控制路由
router.put('/:id/start', 
  authenticateToken, 
  checkPermission('order.manage'), 
  param('id').isUUID().withMessage('订单ID格式不正确'),
  orderController.startGame
);

router.put('/:id/complete', 
  authenticateToken, 
  checkPermission('order.manage'), 
  param('id').isUUID().withMessage('订单ID格式不正确'),
  orderController.completeGame
);

// 🆕 退款处理路由
router.put('/:id/refund', 
  authenticateToken, 
  checkPermission('order.manage'), 
  param('id').isUUID().withMessage('订单ID格式不正确'),
  body('refund_amount').isFloat({ min: 0 }).withMessage('退款金额必须大于等于0'),
  body('refund_reason').optional().isString().withMessage('退款原因必须是字符串'),
  orderController.processRefund
);

// 🆕 导出订单
router.get('/export', 
  authenticateToken, 
  checkPermission('order.view'), 
  orderController.exportOrders
);

// 🆕 多笔付款相关路由
router.post('/multi-payment', authenticateToken, orderController.createOrderWithMultiPayment);
router.post('/payment-items-suggestion', authenticateToken, orderController.generatePaymentItemsSuggestion);

// 订单管理路由（放在最后，避免与特定路由冲突）
router.get('/', authenticateToken, checkPermission('order.view'), orderController.getList);
router.get('/:id', authenticateToken, checkPermission('order.view'), orderController.getById);
router.post('/', authenticateToken, checkPermission('order.create'), orderController.create);
router.put('/:id', authenticateToken, checkPermission('order.edit'), orderController.update);
router.delete('/:id', authenticateToken, checkPermission('order.delete'), orderController.delete);

module.exports = router; 