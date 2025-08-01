const geminiService = require('../services/geminiService');
const multer = require('multer');
const path = require('path');

/**
 * Gemini AI 控制器
 * 处理图片理解相关的HTTP请求
 */
class GeminiController {
  
  /**
   * 分析银行付款凭证图片
   * POST /api/gemini/analyze-payment
   */
  async analyzeBankPayment(req, res) {
    try {
      console.log('🏦 收到银行付款凭证分析请求');
      
      // 检查是否有上传的文件
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: '请上传付款凭证图片',
          error: 'NO_FILE_UPLOADED'
        });
      }

      const { file } = req;
      const { originalname, mimetype, buffer, size } = file;

      console.log('📁 文件信息:', {
        name: originalname,
        type: mimetype,
        size: `${(size / 1024).toFixed(2)}KB`
      });

      // 验证文件大小（最大20MB）
      const maxSize = 20 * 1024 * 1024; // 20MB
      if (size > maxSize) {
        return res.status(400).json({
          success: false,
          message: '图片文件过大，最大支持20MB',
          error: 'FILE_TOO_LARGE'
        });
      }

      // 验证图片格式
      if (!mimetype.startsWith('image/')) {
        return res.status(400).json({
          success: false,
          message: '请上传有效的图片文件',
          error: 'INVALID_FILE_TYPE'
        });
      }

      // 调用Gemini服务分析图片
      const analysisResult = await geminiService.analyzeBankPayment(buffer, mimetype);
      
      // 验证识别结果
      const validation = geminiService.validateResult(analysisResult);

      // 构建响应
      const response = {
        success: analysisResult.success,
        message: analysisResult.success ? '银行付款凭证分析完成' : '银行付款凭证分析失败',
        data: {
          analysis: analysisResult,
          validation: validation,
          file_info: {
            original_name: originalname,
            size: size,
            type: mimetype
          }
        },
        timestamp: new Date().toISOString()
      };

      // 根据成功状态返回不同的HTTP状态码
      const statusCode = analysisResult.success ? 200 : 422;
      res.status(statusCode).json(response);

    } catch (error) {
      console.error('❌ 银行付款凭证分析控制器错误:', error);
      
      res.status(500).json({
        success: false,
        message: '服务器内部错误',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * 批量分析银行付款凭证
   * POST /api/gemini/analyze-payment-batch
   */
  async analyzeBankPaymentBatch(req, res) {
    try {
      console.log('🏦 收到批量银行付款凭证分析请求');
      
      // 检查是否有上传的文件
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: '请上传至少一张付款凭证图片',
          error: 'NO_FILES_UPLOADED'
        });
      }

      const files = req.files;
      const maxFiles = 10; // 限制最多10张图片

      if (files.length > maxFiles) {
        return res.status(400).json({
          success: false,
          message: `最多支持上传${maxFiles}张图片`,
          error: 'TOO_MANY_FILES'
        });
      }

      console.log(`📁 批量处理${files.length}张图片`);

      // 准备图片数据
      const imageList = files.map(file => ({
        data: file.buffer,
        mimeType: file.mimetype,
        originalName: file.originalname,
        size: file.size
      }));

      // 调用批量分析服务
      const results = await geminiService.analyzeBankPaymentBatch(imageList);

      // 统计成功和失败数量
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.length - successCount;

      const response = {
        success: true,
        message: `批量分析完成：成功${successCount}张，失败${failureCount}张`,
        data: {
          total_files: files.length,
          success_count: successCount,
          failure_count: failureCount,
          results: results
        },
        timestamp: new Date().toISOString()
      };

      res.status(200).json(response);

    } catch (error) {
      console.error('❌ 批量银行付款凭证分析控制器错误:', error);
      
      res.status(500).json({
        success: false,
        message: '服务器内部错误',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * 获取支持的银行列表
   * GET /api/gemini/supported-banks
   */
  async getSupportedBanks(req, res) {
    try {
      const banks = geminiService.getSupportedBanks();
      
      res.status(200).json({
        success: true,
        message: '获取支持银行列表成功',
        data: {
          banks: banks,
          total_count: banks.length
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ 获取支持银行列表错误:', error);
      
      res.status(500).json({
        success: false,
        message: '获取支持银行列表失败',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * 获取服务统计信息
   * GET /api/gemini/service-stats
   */
  async getServiceStats(req, res) {
    try {
      const stats = geminiService.getServiceStats();
      
      res.status(200).json({
        success: true,
        message: '获取服务统计信息成功',
        data: stats,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ 获取服务统计信息错误:', error);
      
      res.status(500).json({
        success: false,
        message: '获取服务统计信息失败',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * 健康检查
   * GET /api/gemini/health
   */
  async healthCheck(req, res) {
    try {
      // 简单的健康检查
      const health = {
        status: 'healthy',
        service: 'Gemini AI Image Understanding',
        model: process.env.GEMINI_MODEL || 'gemini-2.5-pro',
        api_key_configured: !!process.env.GEMINI_API_KEY,
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      };

      res.status(200).json({
        success: true,
        message: 'Gemini服务运行正常',
        data: health,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Gemini健康检查错误:', error);
      
      res.status(500).json({
        success: false,
        message: 'Gemini服务异常',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
}

// 配置multer用于处理文件上传
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB
    files: 10 // 最多10个文件
  },
  fileFilter: (req, file, cb) => {
    // 只允许图片文件
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('只允许上传图片文件'), false);
    }
  }
});

// 导出控制器实例和中间件
const geminiController = new GeminiController();

module.exports = {
  geminiController,
  uploadSingle: upload.single('image'),
  uploadMultiple: upload.array('images', 10)
};