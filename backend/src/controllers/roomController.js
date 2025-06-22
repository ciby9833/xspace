const roomService = require('../services/roomService');
const { validationResult } = require('express-validator');
const { uploadRoomImages, getFileUrl, deleteFile } = require('../utils/upload');

class RoomController {
  // 获取房间列表
  async getRoomList(req, res) {
    try {
      const filters = {
        store_id: req.query.store_id,
        company_id: req.query.company_id,
        room_type: req.query.room_type,
        status: req.query.status,
        min_capacity: req.query.min_capacity,
        max_capacity: req.query.max_capacity,
        keyword: req.query.keyword
      };

      const result = await roomService.getList(filters, req.user);
      
      res.json({
        success: true,
        message: '获取房间列表成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('获取房间列表错误:', error);
      
      if (error.message.includes('权限不足')) {
        return res.status(403).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: '获取房间列表失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 获取房间详情
  async getRoomDetail(req, res) {
    try {
      const { roomId } = req.params;
      const result = await roomService.getById(roomId, req.user);
      
      res.json({
        success: true,
        message: '获取房间详情成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('获取房间详情错误:', error);
      
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
        error: '获取房间详情失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 创建房间
  async createRoom(req, res) {
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

      const result = await roomService.create(req.body, req.user);
      
      res.json({
        success: true,
        message: '创建房间成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('创建房间错误:', error);
      
      if (error.message.includes('权限不足') || 
          error.message.includes('已存在') ||
          error.message.includes('不能为空') ||
          error.message.includes('无效') ||
          error.message.includes('不存在')) {
        return res.status(400).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: '创建房间失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 更新房间信息
  async updateRoom(req, res) {
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

      const { roomId } = req.params;
      const result = await roomService.update(roomId, req.body, req.user);
      
      res.json({
        success: true,
        message: '更新房间成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('更新房间信息错误:', error);
      
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
      
      if (error.message.includes('已存在') || error.message.includes('无效')) {
        return res.status(400).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: '更新房间信息失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 删除房间
  async deleteRoom(req, res) {
    try {
      const { roomId } = req.params;
      const result = await roomService.delete(roomId, req.user);
      
      res.json({
        success: true,
        message: '删除房间成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('删除房间错误:', error);
      
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
        error: '删除房间失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 获取可选择的门店列表
  async getAvailableStores(req, res) {
    try {
      const result = await roomService.getAvailableStores(req.user);
      
      res.json({
        success: true,
        message: '获取可选门店列表成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('获取可选门店列表错误:', error);
      
      if (error.message.includes('权限不足')) {
        return res.status(403).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: '获取可选门店列表失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 上传房间图片
  async uploadImages(req, res) {
    // 使用房间专用的上传中间件
    uploadRoomImages(req, res, async (err) => {
      if (err) {
        console.error('上传房间图片错误:', err);
        return res.status(400).json({
          success: false,
          error: err.message || '图片上传失败',
          timestamp: new Date().toISOString()
        });
      }

      try {
        const { roomId } = req.params;
        const imageFiles = req.files || [];
        
        if (imageFiles.length === 0) {
          return res.status(400).json({
            success: false,
            error: '请选择要上传的图片',
            timestamp: new Date().toISOString()
          });
        }

        // 为每个文件添加URL信息
        const processedFiles = imageFiles.map(file => ({
          ...file,
          url: getFileUrl(file.filename, 'room')
        }));

        const result = await roomService.uploadImages(roomId, processedFiles, req.user);
        
        res.json({
          success: true,
          message: '上传房间图片成功',
          data: result,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('处理房间图片上传错误:', error);
        
        // 如果业务逻辑失败，删除已上传的文件
        if (req.files && req.files.length > 0) {
          req.files.forEach(file => {
            deleteFile(file.filename, 'room');
          });
        }
        
        if (error.message.includes('权限不足')) {
          return res.status(403).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
          });
        }
        
        if (error.message.includes('不存在') || error.message.includes('最多')) {
          return res.status(400).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
          });
        }
        
        res.status(500).json({
          success: false,
          error: '上传房间图片失败',
          timestamp: new Date().toISOString()
        });
      }
    });
  }

  // 删除房间图片
  async deleteImage(req, res) {
    try {
      const { roomId, imageId } = req.params;
      const result = await roomService.deleteImage(roomId, imageId, req.user);
      
      res.json({
        success: true,
        message: '删除房间图片成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('删除房间图片错误:', error);
      
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
        error: '删除房间图片失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 更新图片排序
  async updateImageOrder(req, res) {
    try {
      const { roomId } = req.params;
      const { imageOrders } = req.body;
      
      if (!Array.isArray(imageOrders)) {
        return res.status(400).json({
          success: false,
          error: '图片排序数据格式错误',
          timestamp: new Date().toISOString()
        });
      }

      const result = await roomService.updateImageOrder(roomId, imageOrders, req.user);
      
      res.json({
        success: true,
        message: '更新图片排序成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('更新图片排序错误:', error);
      
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
        error: '更新图片排序失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 批量操作
  async batchOperation(req, res) {
    try {
      const { operation, room_ids, status, rooms } = req.body;
      
      let result;
      switch (operation) {
        case 'updateStatus':
          if (!Array.isArray(room_ids) || room_ids.length === 0) {
            return res.status(400).json({
              success: false,
              error: '请选择要操作的房间',
              timestamp: new Date().toISOString()
            });
          }
          if (!status) {
            return res.status(400).json({
              success: false,
              error: '请指定房间状态',
              timestamp: new Date().toISOString()
            });
          }
          result = await roomService.batchUpdateStatus(room_ids, status, req.user);
          break;
        case 'batchCreate':
          if (!Array.isArray(rooms) || rooms.length === 0) {
            return res.status(400).json({
              success: false,
              error: '请提供要创建的房间数据',
              timestamp: new Date().toISOString()
            });
          }
          result = await roomService.batchCreate(rooms, req.user);
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
        message: `批量${operation === 'batchCreate' ? '创建' : operation}操作成功`,
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('批量操作错误:', error);
      
      if (error.message.includes('权限不足')) {
        return res.status(403).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      if (error.message.includes('无效') || error.message.includes('验证失败')) {
        return res.status(400).json({
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

  // 获取房间统计信息
  async getRoomStats(req, res) {
    try {
      const { store_id } = req.query;
      const result = await roomService.getStats(req.user, store_id);
      
      res.json({
        success: true,
        message: '获取房间统计成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('获取房间统计错误:', error);
      
      if (error.message.includes('权限不足')) {
        return res.status(403).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: '获取房间统计失败',
        timestamp: new Date().toISOString()
      });
    }
  }
}

module.exports = new RoomController(); 