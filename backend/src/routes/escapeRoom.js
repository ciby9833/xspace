const express = require('express');
const router = express.Router();
const escapeRoomController = require('../controllers/escapeRoomController');
const { body } = require('express-validator');
const { authenticateToken, checkPermission } = require('../utils/auth');

// 验证规则
const createEscapeRoomValidation = [
  body('name').notEmpty().withMessage('密室名称不能为空'),
  body('horror_level').isIn(['非恐', '微恐', '中恐', '重恐']).withMessage('恐怖等级无效'),
  body('min_players').isInt({ min: 1, max: 20 }).withMessage('最少人数应在1-20之间'),
  body('max_players').isInt({ min: 1, max: 20 }).withMessage('最多人数应在1-20之间'),
  body('duration').isInt({ min: 1 }).withMessage('游戏时长必须大于0'),
  body('npc_count').optional().isInt({ min: 0 }).withMessage('NPC数量不能为负数'),
  body('price').optional().isFloat({ min: 0 }).withMessage('价格不能为负数')
];

const updateEscapeRoomValidation = [
  body('name').optional().notEmpty().withMessage('密室名称不能为空'),
  body('horror_level').optional().isIn(['非恐', '微恐', '中恐', '重恐']).withMessage('恐怖等级无效'),
  body('min_players').optional().isInt({ min: 1, max: 20 }).withMessage('最少人数应在1-20之间'),
  body('max_players').optional().isInt({ min: 1, max: 20 }).withMessage('最多人数应在1-20之间'),
  body('duration').optional().isInt({ min: 1 }).withMessage('游戏时长必须大于0'),
  body('npc_count').optional().isInt({ min: 0 }).withMessage('NPC数量不能为负数'),
  body('price').optional().isFloat({ min: 0 }).withMessage('价格不能为负数')
];

// 应用认证中间件到所有路由
router.use(authenticateToken);

// 特定路由（必须在参数路由之前）
router.get('/company-stores', 
  checkPermission('escape_room.manage'),
  escapeRoomController.getCompanyStores
);
router.get('/stats/overview', 
  checkPermission('escape_room.manage'),
  escapeRoomController.getStats
);
router.post('/batch', 
  checkPermission('escape_room.manage'),
  escapeRoomController.batchOperation
);

// 图片上传
router.post('/upload-images', 
  checkPermission('escape_room.manage'),
  escapeRoomController.uploadImages
);

// CRUD 操作
router.get('/', 
  checkPermission('escape_room.view'), 
  escapeRoomController.getList
);
router.post('/', 
  checkPermission('escape_room.manage'),
  createEscapeRoomValidation, 
  escapeRoomController.create
);
router.get('/:id', 
  checkPermission('escape_room.view'),
  escapeRoomController.getById
);
router.put('/:id', 
  checkPermission('escape_room.manage'),
  updateEscapeRoomValidation, 
  escapeRoomController.update
);
router.delete('/:id', 
  checkPermission('escape_room.manage'),
  escapeRoomController.delete
);

// 门店配置相关
router.get('/:id/store-configs', 
  checkPermission('escape_room.view'),
  escapeRoomController.getEscapeRoomStoreConfigs
);
router.post('/:id/configure-stores', 
  checkPermission('escape_room.manage'),
  escapeRoomController.batchConfigureStores
);

// 门店密室管理
router.get('/store/:storeId', 
  checkPermission('escape_room.view'),
  escapeRoomController.getStoreEscapeRooms
);
router.post('/store/:storeId/:escapeRoomId', 
  checkPermission('escape_room.manage'),
  escapeRoomController.configureStoreEscapeRoom
);

// 图片管理
router.delete('/:id/images', 
  checkPermission('escape_room.manage'),
  escapeRoomController.deleteImage
);

module.exports = router; 