const escapeRoomService = require('../services/escapeRoomService');
const { validationResult } = require('express-validator');
const { uploadEscapeRoomImages, getFileUrl } = require('../utils/upload');

class EscapeRoomController {
  // 上传密室封面图片
  async uploadImages(req, res) {
    uploadEscapeRoomImages(req, res, async (err) => {
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
            error: '请选择要上传的图片',
            timestamp: new Date().toISOString()
          });
        }

        const imageUrls = req.files.map(file => getFileUrl(file.filename, 'escape-room'));

        res.json({
          success: true,
          message: '图片上传成功',
          data: {
            images: imageUrls,
            count: imageUrls.length
          },
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('图片上传处理错误:', error);
        res.status(500).json({
          success: false,
          error: '图片上传处理失败',
          timestamp: new Date().toISOString()
        });
      }
    });
  }

  // 获取密室列表
  async getList(req, res) {
    try {
      const filters = {
        horror_level: req.query.horror_level,
        is_active: req.query.is_active !== undefined ? 
          req.query.is_active === 'true' : undefined,
        min_players: req.query.min_players ? parseInt(req.query.min_players) : undefined,
        max_players: req.query.max_players ? parseInt(req.query.max_players) : undefined,
        min_price: req.query.min_price !== undefined && req.query.min_price !== '' ? 
          parseFloat(req.query.min_price) : undefined,
        max_price: req.query.max_price !== undefined && req.query.max_price !== '' ? 
          parseFloat(req.query.max_price) : undefined,
        min_duration: req.query.min_duration ? parseInt(req.query.min_duration) : undefined,
        max_duration: req.query.max_duration ? parseInt(req.query.max_duration) : undefined,
        min_npc_count: req.query.min_npc_count !== undefined && req.query.min_npc_count !== '' ? 
          parseInt(req.query.min_npc_count) : undefined,
        max_npc_count: req.query.max_npc_count !== undefined && req.query.max_npc_count !== '' ? 
          parseInt(req.query.max_npc_count) : undefined,
        keyword: req.query.keyword,
        language: req.query.language,
        company_id: req.query.company_id
      };

      const result = await escapeRoomService.getList(filters, req.user);
      
      res.json({
        success: true,
        message: '获取密室列表成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('获取密室列表错误:', error);
      
      if (error.message === '权限不足') {
        return res.status(403).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: '获取密室列表失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 获取密室详情
  async getById(req, res) {
    try {
      const { id } = req.params;
      const result = await escapeRoomService.getById(id, req.user);
      
      if (!result) {
        return res.status(404).json({
          success: false,
          error: '密室不存在',
          timestamp: new Date().toISOString()
        });
      }
      
      res.json({
        success: true,
        message: '获取密室成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('获取密室错误:', error);
      
      if (error.message === '权限不足') {
        return res.status(403).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: '获取密室失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 创建密室
  async create(req, res) {
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

      const result = await escapeRoomService.create(req.body, req.user);
      
      res.json({
        success: true,
        message: '创建密室成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('创建密室错误:', error);
      
      if (error.message === '权限不足') {
        return res.status(403).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      if (error.message.includes('已存在') || error.message.includes('重复') || error.message.includes('无效')) {
        return res.status(400).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: '创建密室失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 更新密室
  async update(req, res) {
    try {
      const { id } = req.params;
      const result = await escapeRoomService.update(id, req.body, req.user);
      
      res.json({
        success: true,
        message: '更新密室成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('更新密室错误:', error);
      
      if (error.message === '权限不足') {
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
        error: '更新密室失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 删除密室
  async delete(req, res) {
    try {
      const { id } = req.params;
      await escapeRoomService.delete(id, req.user);
      
      res.json({
        success: true,
        message: '删除密室成功',
        data: null,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('删除密室错误:', error);
      
      if (error.message === '权限不足') {
        return res.status(403).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: '删除密室失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 获取门店密室列表
  async getStoreEscapeRooms(req, res) {
    try {
      const { storeId } = req.params;
      const escapeRooms = await escapeRoomService.getStoreEscapeRooms(storeId, req.user);
      
      res.json({
        success: true,
        message: '获取门店密室列表成功',
        data: escapeRooms,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('获取门店密室列表错误:', error);
      
      if (error.message === '权限不足') {
        return res.status(403).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: '获取门店密室列表失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 配置门店密室
  async configureStoreEscapeRoom(req, res) {
    try {
      const { storeId, escapeRoomId } = req.params;
      const config = req.body;

      const result = await escapeRoomService.configureStoreEscapeRoom(storeId, escapeRoomId, config, req.user);
      
      res.json({
        success: true,
        message: '配置门店密室成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('配置门店密室错误:', error);
      
      if (error.message === '权限不足') {
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
        error: '配置门店密室失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 获取密室统计
  async getStats(req, res) {
    try {
      const stats = await escapeRoomService.getStats(req.user);
      
      res.json({
        success: true,
        message: '获取密室统计成功',
        data: stats,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('获取密室统计错误:', error);
      
      if (error.message === '权限不足') {
        return res.status(403).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: '获取密室统计失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 批量操作
  async batchOperation(req, res) {
    try {
      const { operation, escape_room_ids } = req.body;
      
      if (!Array.isArray(escape_room_ids) || escape_room_ids.length === 0) {
        return res.status(400).json({
          success: false,
          error: '请选择要操作的密室',
          timestamp: new Date().toISOString()
        });
      }

      let result;
      switch (operation) {
        case 'enable':
          result = await escapeRoomService.batchUpdateStatus(escape_room_ids, true, req.user);
          break;
        case 'disable':
          result = await escapeRoomService.batchUpdateStatus(escape_room_ids, false, req.user);
          break;
        case 'delete':
          result = await escapeRoomService.batchDelete(escape_room_ids, req.user);
          break;
        default:
          return res.status(400).json({
            success: false,
            error: '不支持的操作类型',
            timestamp: new Date().toISOString()
          });
      }

      res.json({
        success: true,
        message: `批量${operation}操作成功`,
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('批量操作错误:', error);
      
      if (error.message === '权限不足') {
        return res.status(403).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: '批量操作失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 删除单张密室图片
  async deleteImage(req, res) {
    try {
      const { id } = req.params; // 密室ID
      const { imageUrl } = req.body; // 要删除的图片URL

      const result = await escapeRoomService.deleteImage(id, imageUrl, req.user);
      
      res.json({
        success: true,
        message: '删除图片成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('删除图片错误:', error);
      
      if (error.message === '权限不足') {
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
        error: '删除图片失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 获取公司门店列表（用于密室配置）
  async getCompanyStores(req, res) {
    try {
      const stores = await escapeRoomService.getCompanyStores(req.user);
      
      res.json({
        success: true,
        message: '获取门店列表成功',
        data: stores,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('获取门店列表错误:', error);
      
      if (error.message === '权限不足') {
        return res.status(403).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: '获取门店列表失败',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  // 批量配置门店密室
  async batchConfigureStores(req, res) {
    try {
      const { id } = req.params; // 密室ID
      const { storeConfigs } = req.body; // 门店配置数组

      const result = await escapeRoomService.batchConfigureStores(id, storeConfigs, req.user);
      
      res.json({
        success: true,
        message: '配置门店密室成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('配置门店密室错误:', error);
      
      if (error.message === '权限不足') {
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
        error: '配置门店密室失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 获取密室的门店配置
  async getEscapeRoomStoreConfigs(req, res) {
    try {
      const { id } = req.params; // 密室ID
      const configs = await escapeRoomService.getEscapeRoomStoreConfigs(id, req.user);
      
      res.json({
        success: true,
        message: '获取密室门店配置成功',
        data: configs,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('获取密室门店配置错误:', error);
      
      if (error.message === '权限不足') {
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
        error: '获取密室门店配置失败',
        timestamp: new Date().toISOString()
      });
    }
  }
}

module.exports = new EscapeRoomController(); 