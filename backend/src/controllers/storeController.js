const storeService = require('../services/storeService');
const { validationResult } = require('express-validator');

class StoreController {
  // 获取门店列表
  async getStoreList(req, res) {
    try {
      const { company_id, is_active } = req.query;
      
      // 构建筛选条件
      const filters = {};
      if (is_active !== undefined) {
        filters.is_active = is_active === 'true';
      }
      
      const result = await storeService.getStoreList(req.user, company_id, filters);
      
      res.json({
        success: true,
        message: '获取门店列表成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('获取门店列表错误:', error);
      
      if (error.message.includes('权限不足')) {
        return res.status(403).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: '获取门店列表失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 获取门店详情
  async getStoreDetail(req, res) {
    try {
      const { storeId } = req.params;
      const result = await storeService.getStoreDetail(storeId, req.user);
      
      res.json({
        success: true,
        message: '获取门店详情成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('获取门店详情错误:', error);
      
      if (error.message.includes('权限不足')) {
        return res.status(403).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      if (error.message.includes('不存在')) {
        return res.status(404).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: '获取门店详情失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 创建门店
  async createStore(req, res) {
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

      const result = await storeService.createStore(req.body, req.user);
      
      res.json({
        success: true,
        message: result.message,
        data: result.store,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('创建门店错误:', error);
      
      if (error.message.includes('权限不足') || 
          error.message.includes('已存在') ||
          error.message.includes('不能为空') ||
          error.message.includes('不存在')) {
        return res.status(400).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: '创建门店失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 更新门店信息
  async updateStore(req, res) {
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

      const { storeId } = req.params;
      const result = await storeService.updateStore(storeId, req.body, req.user);
      
      res.json({
        success: true,
        message: result.message,
        data: result.store,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('更新门店信息错误:', error);
      
      if (error.message.includes('权限不足')) {
        return res.status(403).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      if (error.message.includes('不存在')) {
        return res.status(404).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      if (error.message.includes('已存在')) {
        return res.status(400).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: '更新门店信息失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 删除门店
  async deleteStore(req, res) {
    try {
      const { storeId } = req.params;
      const result = await storeService.deleteStore(storeId, req.user);
      
      res.json({
        success: true,
        message: result.message,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('删除门店错误:', error);
      
      if (error.message.includes('权限不足')) {
        return res.status(403).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      if (error.message.includes('不存在')) {
        return res.status(404).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      if (error.message.includes('还有用户')) {
        return res.status(400).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: '删除门店失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 获取门店用户列表
  async getStoreUsers(req, res) {
    try {
      const { storeId } = req.params;
      const result = await storeService.getStoreUsers(storeId, req.user);
      
      res.json({
        success: true,
        message: '获取门店用户列表成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('获取门店用户列表错误:', error);
      
      if (error.message.includes('权限不足')) {
        return res.status(403).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      if (error.message.includes('不存在')) {
        return res.status(404).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: '获取门店用户列表失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 获取可选择的公司列表（用于创建门店）
  async getAvailableCompanies(req, res) {
    try {
      const result = await storeService.getAvailableCompanies(req.user);
      
      res.json({
        success: true,
        message: '获取可选公司列表成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('获取可选公司列表错误:', error);
      
      res.status(500).json({
        success: false,
        error: '获取可选公司列表失败',
        timestamp: new Date().toISOString()
      });
    }
  }
}

module.exports = new StoreController(); 