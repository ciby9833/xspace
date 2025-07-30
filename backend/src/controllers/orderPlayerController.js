//订单参与玩家控制器
const orderPlayerService = require('../services/orderPlayerService');
const { validationResult } = require('express-validator');

class OrderPlayerController {
  // 创建订单参与玩家
  async createPlayer(req, res) {
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

      const result = await orderPlayerService.createPlayer(req.body, req.user);
      
      res.json({
        success: true,
        message: '创建订单参与玩家成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('创建订单参与玩家错误:', error);
      
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
      
      if (error.message === '玩家序号已存在') {
        return res.status(400).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: '创建订单参与玩家失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 批量创建订单参与玩家
  async createPlayersBatch(req, res) {
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

      const result = await orderPlayerService.createPlayersBatch(req.body, req.user);
      
      res.json({
        success: true,
        message: '批量创建订单参与玩家成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('批量创建订单参与玩家错误:', error);
      
      if (error.message === '权限不足') {
        return res.status(403).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: '批量创建订单参与玩家失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 获取订单的所有参与玩家
  async getPlayersByOrderId(req, res) {
    try {
      const orderId = req.params.orderId;
      const withPayments = req.query.withPayments === 'true';
      
      const result = await orderPlayerService.getPlayersByOrderId(orderId, withPayments, req.user);
      
      res.json({
        success: true,
        message: '获取订单参与玩家成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('获取订单参与玩家错误:', error);
      
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
        error: '获取订单参与玩家失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 获取单个参与玩家详情
  async getPlayerDetail(req, res) {
    try {
      const playerId = req.params.id;
      const result = await orderPlayerService.getPlayerDetail(playerId, req.user);
      
      res.json({
        success: true,
        message: '获取参与玩家详情成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('获取参与玩家详情错误:', error);
      
      if (error.message === '权限不足') {
        return res.status(403).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      if (error.message === '参与玩家不存在') {
        return res.status(404).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: '获取参与玩家详情失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 更新参与玩家信息
  async updatePlayer(req, res) {
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

      const playerId = req.params.id;
      const result = await orderPlayerService.updatePlayer(playerId, req.body, req.user);
      
      res.json({
        success: true,
        message: '更新参与玩家信息成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('更新参与玩家信息错误:', error);
      
      if (error.message === '权限不足') {
        return res.status(403).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      if (error.message === '参与玩家不存在') {
        return res.status(404).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      if (error.message === '玩家序号已存在') {
        return res.status(400).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: '更新参与玩家信息失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 更新参与玩家支付状态
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

      const playerId = req.params.id;
      const { payment_status } = req.body;
      
      const result = await orderPlayerService.updatePaymentStatus(playerId, payment_status, req.user);
      
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
      
      if (error.message === '参与玩家不存在') {
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

  // 批量更新支付状态
  async updatePaymentStatusBatch(req, res) {
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

      const { player_ids, payment_status } = req.body;
      
      const result = await orderPlayerService.updatePaymentStatusBatch(player_ids, payment_status, req.user);
      
      res.json({
        success: true,
        message: '批量更新支付状态成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('批量更新支付状态错误:', error);
      
      if (error.message === '权限不足') {
        return res.status(403).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: '批量更新支付状态失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 删除参与玩家
  async deletePlayer(req, res) {
    try {
      const playerId = req.params.id;
      const result = await orderPlayerService.deletePlayer(playerId, req.user);
      
      res.json({
        success: true,
        message: '删除参与玩家成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('删除参与玩家错误:', error);
      
      if (error.message === '权限不足') {
        return res.status(403).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      if (error.message === '参与玩家不存在') {
        return res.status(404).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: '删除参与玩家失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 获取订单的支付统计信息
  async getPaymentStats(req, res) {
    try {
      const orderId = req.params.orderId;
      const result = await orderPlayerService.getPaymentStats(orderId, req.user);
      
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

  // 获取角色使用统计
  async getRoleStats(req, res) {
    try {
      const { start_date, end_date } = req.query;
      const result = await orderPlayerService.getRoleStats(req.user, start_date, end_date);
      
      res.json({
        success: true,
        message: '获取角色使用统计成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('获取角色使用统计错误:', error);
      
      if (error.message === '权限不足') {
        return res.status(403).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: '获取角色使用统计失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 获取下一个玩家序号
  async getNextPlayerOrder(req, res) {
    try {
      const orderId = req.params.orderId;
      const result = await orderPlayerService.getNextPlayerOrder(orderId, req.user);
      
      res.json({
        success: true,
        message: '获取下一个玩家序号成功',
        data: { next_order: result },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('获取下一个玩家序号错误:', error);
      
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
        error: '获取下一个玩家序号失败',
        timestamp: new Date().toISOString()
      });
    }
  }
}

module.exports = new OrderPlayerController(); 