const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController');
const { body } = require('express-validator');
const { authenticateToken, checkPermission } = require('../utils/auth');

// 验证规则
const createRoomValidation = [
  body('store_id').notEmpty().withMessage('门店ID不能为空'),
  body('name').notEmpty().withMessage('房间名称不能为空'),
  body('room_type').isIn(['剧本杀', '密室', '混合']).withMessage('房间类型无效'),
  body('capacity').isInt({ min: 1, max: 50 }).withMessage('房间容量应在1-50之间'),
  body('status').optional().isIn(['正常', '维护', '关闭']).withMessage('房间状态无效'),
  body('description').optional().isLength({ max: 1000 }).withMessage('描述长度不能超过1000字符'),
  body('equipment').optional().isLength({ max: 500 }).withMessage('设备信息长度不能超过500字符'),
  body('notes').optional().isLength({ max: 500 }).withMessage('备注长度不能超过500字符')
];

const updateRoomValidation = [
  body('name').optional().notEmpty().withMessage('房间名称不能为空'),
  body('room_type').optional().isIn(['剧本杀', '密室', '混合']).withMessage('房间类型无效'),
  body('capacity').optional().isInt({ min: 1, max: 50 }).withMessage('房间容量应在1-50之间'),
  body('status').optional().isIn(['正常', '维护', '关闭']).withMessage('房间状态无效'),
  body('description').optional().isLength({ max: 1000 }).withMessage('描述长度不能超过1000字符'),
  body('equipment').optional().isLength({ max: 500 }).withMessage('设备信息长度不能超过500字符'),
  body('notes').optional().isLength({ max: 500 }).withMessage('备注长度不能超过500字符')
];

// 应用认证中间件到所有路由
router.use(authenticateToken);

// 特定路由（必须在参数路由之前）
router.get('/available-stores', 
  checkPermission('room.view'),
  roomController.getAvailableStores
);

router.get('/stats', 
  checkPermission('room.view'),
  roomController.getRoomStats
);

// 批量操作
router.post('/batch', 
  checkPermission('room.manage'),
  roomController.batchOperation
);

// 图片上传
router.post('/:roomId/images', 
  checkPermission('room.manage'),
  roomController.uploadImages
);

// CRUD 操作
router.get('/', 
  checkPermission('room.view'), 
  roomController.getRoomList
);

router.post('/', 
  checkPermission('room.create'),
  createRoomValidation,
  roomController.createRoom
);

router.get('/:roomId', 
  checkPermission('room.view'),
  roomController.getRoomDetail
);

router.put('/:roomId', 
  checkPermission('room.edit'),
  updateRoomValidation,
  roomController.updateRoom
);

router.delete('/:roomId', 
  checkPermission('room.delete'),
  roomController.deleteRoom
);

// 图片管理
router.delete('/:roomId/images/:imageId', 
  checkPermission('room.manage'),
  roomController.deleteImage
);

router.put('/:roomId/images/order', 
  checkPermission('room.manage'),
  roomController.updateImageOrder
);

module.exports = router; 