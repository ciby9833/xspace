//支付记录控制器
const orderPaymentService = require('../services/orderPaymentService');
const orderService = require('../services/orderService');
const { validationResult } = require('express-validator');

class OrderPaymentController {
  // 创建支付记录
  async createPayment(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: '参数验证失败',
          details: errors.array(),
          timestamp: new Date().toISOString()
        });
      }

      const result = await orderPaymentService.createPayment(req.body, req.user);
      
      res.json({
        success: true,
        message: '创建支付记录成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('创建支付记录错误:', error);
      
      if (error.message === '权限不足') {
        return res.status(403).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      if (error.message === '订单不存在') {
        return res.status(404).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: '创建支付记录失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 🆕 上传支付凭证
  async uploadPaymentProof(req, res) {
    const { uploadOrderImages } = require('../utils/upload');
    
    uploadOrderImages(req, res, async (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          error: err.message,
          timestamp: new Date().toISOString()
        });
      }

      try {
        if (!req.files || req.files.length === 0) {
          return res.status(400).json({
            success: false,
            error: '请选择要上传的支付凭证图片',
            timestamp: new Date().toISOString()
          });
        }

        const result = await orderPaymentService.uploadPaymentProof(req.files, req.user);
        
        res.json({
          success: true,
          message: '支付凭证上传成功',
          data: result,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('上传支付凭证错误:', error);
        res.status(500).json({
          success: false,
          error: '上传支付凭证失败',
          details: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });
  }

  // 🆕 更新支付记录的凭证
  async updatePaymentProof(req, res) {
    try {
      const { paymentId } = req.params;
      const { proof_images, mode = 'replace' } = req.body;
      
      if (!proof_images || !Array.isArray(proof_images) || proof_images.length === 0) {
        return res.status(400).json({
          success: false,
          error: '请提供要更新的支付凭证图片',
          timestamp: new Date().toISOString()
        });
      }

      const result = await orderPaymentService.updatePaymentProof(
        paymentId, 
        proof_images, 
        mode, 
        req.user
      );
      
      res.json({
        success: true,
        message: '支付凭证更新成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('更新支付凭证错误:', error);
      
      if (error.message === '权限不足' || error.message === '支付记录不存在') {
        return res.status(403).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: '更新支付凭证失败',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  // 创建支付记录并更新玩家状态
  async createPaymentAndUpdateStatus(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: '参数验证失败',
          details: errors.array(),
          timestamp: new Date().toISOString()
        });
      }

      const result = await orderPaymentService.createPaymentAndUpdateStatus(req.body, req.user);
      
      res.json({
        success: true,
        message: '创建支付记录并更新玩家状态成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('创建支付记录并更新玩家状态错误:', error);
      
      if (error.message === '权限不足') {
        return res.status(403).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      if (error.message === '订单不存在') {
        return res.status(404).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: '创建支付记录并更新玩家状态失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 获取订单的所有支付记录
  async getPaymentsByOrderId(req, res) {
    try {
      const orderId = req.params.orderId;
      const withPlayers = req.query.withPlayers === 'true';
      
      const result = await orderPaymentService.getPaymentsByOrderId(orderId, withPlayers, req.user);
      
      res.json({
        success: true,
        message: '获取订单支付记录成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('获取订单支付记录错误:', error);
      
      if (error.message === '权限不足') {
        return res.status(403).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      if (error.message === '订单不存在') {
        return res.status(404).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: '获取订单支付记录失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 获取单个支付记录详情
  async getPaymentDetail(req, res) {
    try {
      const paymentId = req.params.id;
      const result = await orderPaymentService.getPaymentDetail(paymentId, req.user);
      
      res.json({
        success: true,
        message: '获取支付记录详情成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('获取支付记录详情错误:', error);
      
      if (error.message === '权限不足') {
        return res.status(403).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      if (error.message === '支付记录不存在') {
        return res.status(404).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: '获取支付记录详情失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 更新支付记录
  async updatePayment(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: '参数验证失败',
          details: errors.array(),
          timestamp: new Date().toISOString()
        });
      }

      const paymentId = req.params.id;
      const result = await orderPaymentService.updatePayment(paymentId, req.body, req.user);
      
      res.json({
        success: true,
        message: '更新支付记录成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('更新支付记录错误:', error);
      
      if (error.message === '权限不足') {
        return res.status(403).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      if (error.message === '支付记录不存在') {
        return res.status(404).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: '更新支付记录失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 更新支付状态
  async updatePaymentStatus(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: '参数验证失败',
          details: errors.array(),
          timestamp: new Date().toISOString()
        });
      }

      const paymentId = req.params.id;
      const { payment_status } = req.body;
      
      const result = await orderPaymentService.updatePaymentStatus(paymentId, payment_status, req.user);
      
      res.json({
        success: true,
        message: '更新支付状态成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('更新支付状态错误:', error);
      
      if (error.message === '权限不足') {
        return res.status(403).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      if (error.message === '支付记录不存在') {
        return res.status(404).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: '更新支付状态失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 确认支付
  async confirmPayment(req, res) {
    try {
      const paymentId = req.params.id;
      const result = await orderPaymentService.confirmPayment(paymentId, req.user);
      
      res.json({
        success: true,
        message: '确认支付成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('确认支付错误:', error);
      
      if (error.message === '权限不足') {
        return res.status(403).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      if (error.message === '支付记录不存在') {
        return res.status(404).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: '确认支付失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 删除支付记录
  async deletePayment(req, res) {
    try {
      const paymentId = req.params.id;
      const result = await orderPaymentService.deletePayment(paymentId, req.user);
      
      res.json({
        success: true,
        message: '删除支付记录成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('删除支付记录错误:', error);
      
      if (error.message === '权限不足') {
        return res.status(403).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      if (error.message === '支付记录不存在') {
        return res.status(404).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: '删除支付记录失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 获取支付统计信息
  async getPaymentStats(req, res) {
    try {
      const orderId = req.params.orderId;
      const result = await orderPaymentService.getPaymentStats(orderId, req.user);
      
      res.json({
        success: true,
        message: '获取支付统计信息成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('获取支付统计信息错误:', error);
      
      if (error.message === '权限不足') {
        return res.status(403).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      if (error.message === '订单不存在') {
        return res.status(404).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: '获取支付统计信息失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 获取公司支付统计
  async getCompanyPaymentStats(req, res) {
    try {
      const { start_date, end_date } = req.query;
      const result = await orderPaymentService.getCompanyPaymentStats(req.user, start_date, end_date);
      
      res.json({
        success: true,
        message: '获取公司支付统计成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('获取公司支付统计错误:', error);
      
      if (error.message === '权限不足') {
        return res.status(403).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: '获取公司支付统计失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 获取支付方式统计
  async getPaymentMethodStats(req, res) {
    try {
      const { start_date, end_date } = req.query;
      const result = await orderPaymentService.getPaymentMethodStats(req.user, start_date, end_date);
      
      res.json({
        success: true,
        message: '获取支付方式统计成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('获取支付方式统计错误:', error);
      
      if (error.message === '权限不足') {
        return res.status(403).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: '获取支付方式统计失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 获取付款人统计
  async getPaymentsByPayer(req, res) {
    try {
      const { start_date, end_date } = req.query;
      const result = await orderPaymentService.getPaymentsByPayer(req.user, start_date, end_date);
      
      res.json({
        success: true,
        message: '获取付款人统计成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('获取付款人统计错误:', error);
      
      if (error.message === '权限不足') {
        return res.status(403).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: '获取付款人统计失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 合并支付记录
  async mergePayments(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: '参数验证失败',
          details: errors.array(),
          timestamp: new Date().toISOString()
        });
      }

      const { payment_ids, merge_data } = req.body;
      const result = await orderPaymentService.mergePayments(payment_ids, merge_data, req.user);
      
      res.json({
        success: true,
        message: '合并支付记录成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('合并支付记录错误:', error);
      
      if (error.message === '权限不足') {
        return res.status(403).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      if (error.message === '没有找到要合并的支付记录') {
        return res.status(404).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: '合并支付记录失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 上传支付凭证
  async uploadPaymentProof(req, res) {
    try {
      const paymentId = req.params.id;
      const result = await orderPaymentService.uploadPaymentProof(paymentId, req.files, req.user);
      
      res.json({
        success: true,
        message: '上传支付凭证成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('上传支付凭证错误:', error);
      
      if (error.message === '权限不足') {
        return res.status(403).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      if (error.message === '支付记录不存在') {
        return res.status(404).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: '上传支付凭证失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 🤖 手动触发AI识别订单付款凭证
  async recognizeOrderPaymentProof(req, res) {
    try {
      const { orderId } = req.params;
      
      if (!orderId) {
        return res.status(400).json({
          success: false,
          error: '订单ID不能为空',
          timestamp: new Date().toISOString()
        });
      }
      
      // 异步执行AI识别
      setImmediate(async () => {
        try {
          await orderService.recognizeOrderPaymentProof(orderId, req.user);
        } catch (error) {
          console.error('❌ 手动AI识别失败:', error);
        }
      });
      
      res.json({
        success: true,
        message: 'AI识别任务已启动',
        data: { order_id: orderId },
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('启动AI识别错误:', error);
      
      if (error.message === '权限不足') {
        return res.status(403).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: '启动AI识别失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 🤖 获取订单AI识别结果
  async getOrderRecognitionResult(req, res) {
    try {
      const { orderId } = req.params;
      
      if (!orderId) {
        return res.status(400).json({
          success: false,
          error: '订单ID不能为空',
          timestamp: new Date().toISOString()
        });
      }
      
      const result = await orderPaymentService.getOrderRecognitionResult(orderId, req.user);
      
      res.json({
        success: true,
        message: '获取AI识别结果成功',
        data: result,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('获取AI识别结果错误:', error);
      
      if (error.message === '权限不足') {
        return res.status(403).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      if (error.message === '订单不存在') {
        return res.status(404).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: '获取AI识别结果失败',
        timestamp: new Date().toISOString()
      });
    }
  }
}

module.exports = new OrderPaymentController(); 