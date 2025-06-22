const gameHostService = require('../services/gameHostService');
const { validationResult } = require('express-validator');

class GameHostController {
  // 获取Game Host订单列表
  async getOrders(req, res) {
    try {
      // 验证请求参数
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: '参数验证失败',
          details: errors.array(),
          timestamp: new Date().toISOString()
        });
      }

      const orders = await gameHostService.getGameHostOrders(req.user, req.query);

      res.json({
        success: true,
        data: orders,
        total: orders.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('获取Game Host订单列表失败:', error);
      res.status(500).json({
        success: false,
        error: error.message || '获取订单列表失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 获取当前进行中的订单
  async getCurrentOrder(req, res) {
    try {
      const currentOrder = await gameHostService.getCurrentInProgressOrder(req.user);

      res.json({
        success: true,
        data: currentOrder,
        message: currentOrder ? '获取当前订单成功' : '当前无进行中的订单',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('获取当前订单失败:', error);
      res.status(500).json({
        success: false,
        error: error.message || '获取当前订单失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 获取订单详情
  async getOrderById(req, res) {
    try {
      const { orderId } = req.params;

      const order = await gameHostService.getGameHostOrderById(orderId, req.user);

      if (!order) {
        return res.status(404).json({
          success: false,
          error: '订单不存在或无权限访问',
          timestamp: new Date().toISOString()
        });
      }

      res.json({
        success: true,
        data: order,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('获取订单详情失败:', error);
      res.status(500).json({
        success: false,
        error: error.message || '获取订单详情失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 开始游戏
  async startGame(req, res) {
    try {
      const { orderId } = req.params;

      const result = await gameHostService.startGame(orderId, req.user);

      res.json({
        success: true,
        data: result.order,
        message: result.message,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('开始游戏失败:', error);
      res.status(400).json({
        success: false,
        error: error.message || '开始游戏失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 完成游戏
  async completeGame(req, res) {
    try {
      const { orderId } = req.params;
      const completionData = req.body;

      // 验证请求参数
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: '参数验证失败',
          details: errors.array(),
          timestamp: new Date().toISOString()
        });
      }

      const result = await gameHostService.completeGame(orderId, req.user, completionData);

      res.json({
        success: true,
        data: result.order,
        message: result.message,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('完成游戏失败:', error);
      res.status(400).json({
        success: false,
        error: error.message || '完成游戏失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 更新订单信息
  async updateOrder(req, res) {
    try {
      const { orderId } = req.params;
      const updateData = req.body;

      // 验证请求参数
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: '参数验证失败',
          details: errors.array(),
          timestamp: new Date().toISOString()
        });
      }

      const result = await gameHostService.updateGameHostOrder(orderId, updateData, req.user);

      res.json({
        success: true,
        data: result.order,
        message: result.message,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('更新订单失败:', error);
      res.status(400).json({
        success: false,
        error: error.message || '更新订单失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 获取今日统计
  async getTodayStats(req, res) {
    try {
      const stats = await gameHostService.getTodayStats(req.user);

      res.json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('获取今日统计失败:', error);
      res.status(500).json({
        success: false,
        error: error.message || '获取统计失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 获取可用房间列表
  async getAvailableRooms(req, res) {
    try {
      const { storeId } = req.query;
      const rooms = await gameHostService.getAvailableRooms(req.user, storeId);

      res.json({
        success: true,
        data: rooms,
        total: rooms.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('获取可用房间失败:', error);
      res.status(500).json({
        success: false,
        error: error.message || '获取房间列表失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 获取可用剧本列表
  async getAvailableScripts(req, res) {
    try {
      const { storeId } = req.query;
      const scripts = await gameHostService.getAvailableScripts(req.user, storeId);

      res.json({
        success: true,
        data: scripts,
        total: scripts.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('获取可用剧本失败:', error);
      res.status(500).json({
        success: false,
        error: error.message || '获取剧本列表失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 获取可用密室列表
  async getAvailableEscapeRooms(req, res) {
    try {
      const { storeId } = req.query;
      const escapeRooms = await gameHostService.getAvailableEscapeRooms(req.user, storeId);

      res.json({
        success: true,
        data: escapeRooms,
        total: escapeRooms.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('获取可用密室失败:', error);
      res.status(500).json({
        success: false,
        error: error.message || '获取密室列表失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 获取订单历史记录（分页）
  async getOrderHistory(req, res) {
    try {
      // 验证请求参数
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: '参数验证失败',
          details: errors.array(),
          timestamp: new Date().toISOString()
        });
      }

      const history = await gameHostService.getOrderHistory(req.user, req.query);

      res.json({
        success: true,
        data: history.data,
        pagination: history.pagination,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('获取订单历史失败:', error);
      res.status(500).json({
        success: false,
        error: error.message || '获取订单历史失败',
        timestamp: new Date().toISOString()
      });
    }
  }
}

module.exports = new GameHostController(); 