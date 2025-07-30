const express = require('express');
const router = express.Router();
const pricingCalendarController = require('../controllers/pricingCalendarController');
const { authenticateToken } = require('../utils/auth');
const PermissionChecker = require('../utils/permissions');
const PricingCalendarValidator = require('../validators/pricingCalendarValidator');

// 权限检查中间件
const checkPermission = (permission) => PermissionChecker.requirePermissionMiddleware(permission);

// 创建定价日历
router.post('/', 
  authenticateToken,
  checkPermission('pricing.calendar.create'),
  PricingCalendarValidator.createPricingCalendar(),
  pricingCalendarController.create
);

// 获取定价日历列表
router.get('/',
  authenticateToken,
  checkPermission('pricing.calendar.view'),
  PricingCalendarValidator.getPricingCalendarList(),
  pricingCalendarController.getList
);

// 获取定价日历详情
router.get('/:id',
  authenticateToken,
  checkPermission('pricing.calendar.view'),
  PricingCalendarValidator.getPricingCalendar(),
  pricingCalendarController.getById
);

// 更新定价日历
router.put('/:id',
  authenticateToken,
  checkPermission('pricing.calendar.edit'),
  PricingCalendarValidator.updatePricingCalendar(),
  pricingCalendarController.update
);

// 删除定价日历
router.delete('/:id',
  authenticateToken,
  checkPermission('pricing.calendar.delete'),
  PricingCalendarValidator.deletePricingCalendar(),
  pricingCalendarController.delete
);

// 批量更新状态
router.put('/batch/status',
  authenticateToken,
  checkPermission('pricing.calendar.edit'),
  PricingCalendarValidator.batchUpdateStatus(),
  pricingCalendarController.batchUpdateStatus
);

// 获取定价日历统计
router.get('/stats',
  authenticateToken,
  checkPermission('pricing.calendar.view'),
  pricingCalendarController.getStats
);

// 根据日期获取定价规则
router.get('/date',
  authenticateToken,
  checkPermission('pricing.calendar.view'),
  pricingCalendarController.getByDate
);

// 根据日期范围获取定价规则
router.get('/date-range',
  authenticateToken,
  checkPermission('pricing.calendar.view'),
  pricingCalendarController.getByDateRange
);

module.exports = router; 