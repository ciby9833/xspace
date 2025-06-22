const express = require('express');
const router = express.Router();
const scriptController = require('../controllers/scriptController');
const { authenticateToken, checkPermission } = require('../utils/auth');
const { 
  createScriptValidator, 
  updateScriptValidator, 
  configureStoreScriptValidator 
} = require('../validators/scriptValidator');

// 🆕 图片上传接口
router.post('/upload-images', 
  authenticateToken, 
  checkPermission('script.manage'),
  scriptController.uploadImages.bind(scriptController)
);

// 🆕 获取公司门店列表（用于剧本配置）- 必须在 /:id 之前
router.get('/company-stores', 
  authenticateToken, 
  checkPermission('script.manage'),
  scriptController.getCompanyStores.bind(scriptController)
);

// 获取剧本统计 - 必须在 /:id 之前
router.get('/stats/overview', 
  authenticateToken, 
  checkPermission('script.manage'),
  scriptController.getStats.bind(scriptController)
);

// 批量操作 - 必须在 /:id 之前
router.post('/batch', 
  authenticateToken, 
  checkPermission('script.manage'),
  scriptController.batchOperation.bind(scriptController)
);

// 获取门店剧本列表 - 必须在 /:id 之前
router.get('/store/:storeId', 
  authenticateToken, 
  checkPermission('script.view'),
  scriptController.getStoreScripts.bind(scriptController)
);

// 配置门店剧本 - 必须在 /:id 之前
router.put('/store/:storeId/:scriptId', 
  authenticateToken, 
  checkPermission('script.store_config'),
  configureStoreScriptValidator,
  scriptController.configureStoreScript.bind(scriptController)
);

// 获取剧本列表
router.get('/', 
  authenticateToken, 
  checkPermission('script.view'), 
  scriptController.getList.bind(scriptController)
);

// 创建剧本
router.post('/', 
  authenticateToken, 
  checkPermission('script.manage'),
  createScriptValidator,
  scriptController.create.bind(scriptController)
);

// 🆕 批量配置门店剧本 - 必须在 /:id 之前
router.post('/:id/stores', 
  authenticateToken, 
  checkPermission('script.manage'),
  scriptController.batchConfigureStores.bind(scriptController)
);

// 🆕 获取剧本的门店配置 - 必须在 /:id 之前
router.get('/:id/stores', 
  authenticateToken, 
  checkPermission('script.view'),
  scriptController.getScriptStoreConfigs.bind(scriptController)
);

// 删除单张图片 - 必须在 /:id 之前
router.delete('/:id/image', 
  authenticateToken, 
  checkPermission('script.manage'),
  scriptController.deleteImage.bind(scriptController)
);

// 获取剧本详情 - 参数路由放在最后
router.get('/:id', 
  authenticateToken, 
  checkPermission('script.view'),
  scriptController.getById.bind(scriptController)
);

// 更新剧本 - 参数路由放在最后
router.put('/:id', 
  authenticateToken, 
  checkPermission('script.manage'),
  updateScriptValidator,
  scriptController.update.bind(scriptController)
);

// 删除剧本 - 参数路由放在最后
router.delete('/:id', 
  authenticateToken, 
  checkPermission('script.manage'),
  scriptController.delete.bind(scriptController)
);

module.exports = router; 