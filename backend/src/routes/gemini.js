const express = require('express');
const multer = require('multer');
const { geminiController, uploadSingle, uploadMultiple } = require('../controllers/geminiController');
const { authenticateToken } = require('../utils/auth');

const router = express.Router();

/**
 * Gemini AI 图片理解路由
 * 专门用于识别印尼银行付款凭证
 */

// 健康检查 - 不需要认证
router.get('/health', geminiController.healthCheck.bind(geminiController));

// 获取支持的银行列表 - 需要认证
router.get('/supported-banks', 
  authenticateToken, 
  geminiController.getSupportedBanks.bind(geminiController)
);

// 获取服务统计信息 - 需要认证
router.get('/service-stats', 
  authenticateToken, 
  geminiController.getServiceStats.bind(geminiController)
);

// 分析单张银行付款凭证 - 需要认证和文件上传
router.post('/analyze-payment',
  authenticateToken,
  uploadSingle,
  geminiController.analyzeBankPayment.bind(geminiController)
);

// 批量分析银行付款凭证 - 需要认证和多文件上传
router.post('/analyze-payment-batch',
  authenticateToken,
  uploadMultiple,
  geminiController.analyzeBankPaymentBatch.bind(geminiController)
);

// 错误处理中间件
router.use((error, req, res, next) => {
  console.error('🚨 Gemini路由错误:', error);
  
  // 处理multer错误
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: '文件过大，最大支持20MB',
        error: 'FILE_TOO_LARGE'
      });
    }
    
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: '文件数量过多，最多支持10张图片',
        error: 'TOO_MANY_FILES'
      });
    }
  }
  
  // 处理文件类型错误
  if (error.message === '只允许上传图片文件') {
    return res.status(400).json({
      success: false,
      message: '请上传有效的图片文件',
      error: 'INVALID_FILE_TYPE'
    });
  }
  
  // 通用错误
  res.status(500).json({
    success: false,
    message: '服务器内部错误',
    error: error.message,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;