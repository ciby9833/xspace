const scriptService = require('../services/scriptService');
const { validationResult } = require('express-validator');
const { uploadMultiple, uploadSingle, getFileUrl } = require('../utils/upload');

class ScriptController {
  // 上传剧本图片
  async uploadImages(req, res) {
    uploadMultiple(req, res, async (err) => {
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

        const imageUrls = req.files.map(file => getFileUrl(file.filename));

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

  // 获取剧本列表
  async getList(req, res) {
    try {
      // 🆕 优化查询参数处理
      const query = {
        // 剧本类型筛选
        type: req.query.type,
        
        // 🆕 剧本背景筛选
        background: req.query.background,
        
        // 状态筛选 - 正确处理字符串形式的布尔值
        is_active: req.query.is_active !== undefined ? 
          req.query.is_active === 'true' : undefined,
        
        // 人数筛选
        min_players: req.query.min_players ? parseInt(req.query.min_players) : undefined,
        max_players: req.query.max_players ? parseInt(req.query.max_players) : undefined,
        
        // 🆕 难度筛选
        difficulty: req.query.difficulty,
        
        // 🆕 价格范围筛选
        min_price: req.query.min_price !== undefined && req.query.min_price !== '' ? 
          parseFloat(req.query.min_price) : undefined,
        max_price: req.query.max_price !== undefined && req.query.max_price !== '' ? 
          parseFloat(req.query.max_price) : undefined,
        
        // 🆕 时长筛选
        min_duration: req.query.min_duration ? parseInt(req.query.min_duration) : undefined,
        max_duration: req.query.max_duration ? parseInt(req.query.max_duration) : undefined,
        
        // 🆕 关键词搜索
        keyword: req.query.keyword,
        
        // 🆕 标签筛选
        tag: req.query.tag,
        
        // 🆕 语言筛选
        language: req.query.language,
        
        // 🆕 公司ID（平台管理员使用）
        company_id: req.query.company_id
      };

      const result = await scriptService.getList(query, req.user);
      
      res.json({
        success: true,
        message: '获取剧本列表成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('获取剧本列表错误:', error);
      
      if (error.message === '权限不足') {
        return res.status(403).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: '获取剧本列表失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 获取剧本详情
  async getById(req, res) {
    try {
      const { id } = req.params;
      const result = await scriptService.getById(id, req.user);
      
      if (!result) {
        return res.status(404).json({
          success: false,
          error: '剧本不存在',
          timestamp: new Date().toISOString()
        });
      }
      
      res.json({
        success: true,
        message: '获取剧本成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('获取剧本错误:', error);
      
      if (error.message === '权限不足') {
        return res.status(403).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: '获取剧本失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 创建剧本
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

      const result = await scriptService.create(req.body, req.user);
      
      res.json({
        success: true,
        message: '创建剧本成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('创建剧本错误:', error);
      
      if (error.message === '权限不足') {
        return res.status(403).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      if (error.message.includes('已存在') || error.message.includes('重复')) {
        return res.status(400).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: '创建剧本失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 更新剧本
  async update(req, res) {
    try {
      const { id } = req.params;
      const result = await scriptService.update(id, req.body, req.user);
      
      res.json({
        success: true,
        message: '更新剧本成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('更新剧本错误:', error);
      
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
        error: '更新剧本失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 删除剧本
  async delete(req, res) {
    try {
      const { id } = req.params;
      await scriptService.delete(id, req.user);
      
      res.json({
        success: true,
        message: '删除剧本成功',
        data: null,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('删除剧本错误:', error);
      
      if (error.message === '权限不足') {
        return res.status(403).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: '删除剧本失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 获取门店剧本列表
  async getStoreScripts(req, res) {
    try {
      const { storeId } = req.params;
      const scripts = await scriptService.getStoreScripts(storeId, req.user);
      
      res.json({
        success: true,
        message: '获取门店剧本列表成功',
        data: scripts,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('获取门店剧本列表错误:', error);
      
      if (error.message === '权限不足') {
        return res.status(403).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: '获取门店剧本列表失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 配置门店剧本
  async configureStoreScript(req, res) {
    try {
      const { storeId, scriptId } = req.params;
      const config = req.body;

      const result = await scriptService.configureStoreScript(storeId, scriptId, config, req.user);
      
      res.json({
        success: true,
        message: '配置门店剧本成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('配置门店剧本错误:', error);
      
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
        error: '配置门店剧本失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 获取剧本统计
  async getStats(req, res) {
    try {
      const stats = await scriptService.getStats(req.user);
      
      res.json({
        success: true,
        message: '获取剧本统计成功',
        data: stats,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('获取剧本统计错误:', error);
      
      if (error.message === '权限不足') {
        return res.status(403).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: '获取剧本统计失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 批量操作
  async batchOperation(req, res) {
    try {
      const { operation, script_ids } = req.body;
      
      if (!Array.isArray(script_ids) || script_ids.length === 0) {
        return res.status(400).json({
          success: false,
          error: '请选择要操作的剧本',
          timestamp: new Date().toISOString()
        });
      }

      let result;
      switch (operation) {
        case 'enable':
          result = await scriptService.batchUpdateStatus(script_ids, true, req.user);
          break;
        case 'disable':
          result = await scriptService.batchUpdateStatus(script_ids, false, req.user);
          break;
        case 'delete':
          result = await scriptService.batchDelete(script_ids, req.user);
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

  // 删除单张剧本图片
  async deleteImage(req, res) {
    try {
      const { id } = req.params; // 剧本ID
      const { imageUrl } = req.body; // 要删除的图片URL

      const result = await scriptService.deleteImage(id, imageUrl, req.user);
      
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

  // 🆕 获取公司门店列表（用于剧本配置）
  async getCompanyStores(req, res) {
    try {
      const stores = await scriptService.getCompanyStores(req.user);
      
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

  // 🆕 批量配置门店剧本
  async batchConfigureStores(req, res) {
    try {
      const { id } = req.params; // 剧本ID
      const { storeConfigs } = req.body; // 门店配置数组

      const result = await scriptService.batchConfigureStores(id, storeConfigs, req.user);
      
      res.json({
        success: true,
        message: '配置门店剧本成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('配置门店剧本错误:', error);
      
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
        error: '配置门店剧本失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 🆕 获取剧本的门店配置
  async getScriptStoreConfigs(req, res) {
    try {
      const { id } = req.params; // 剧本ID
      const configs = await scriptService.getScriptStoreConfigs(id, req.user);
      
      res.json({
        success: true,
        message: '获取剧本门店配置成功',
        data: configs,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('获取剧本门店配置错误:', error);
      
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
        error: '获取剧本门店配置失败',
        timestamp: new Date().toISOString()
      });
    }
  }
}

module.exports = new ScriptController(); 