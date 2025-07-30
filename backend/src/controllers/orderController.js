const orderService = require('../services/orderService');
const { validationResult } = require('express-validator');
const { uploadOrderImages, getFileUrl } = require('../utils/upload');

class OrderController {
  // 上传订单图片（支付凭证等）
  async uploadImages(req, res) {
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
            error: '请选择要上传的图片',
            timestamp: new Date().toISOString()
          });
        }

        const imageUrls = req.files.map((file, index) => ({
          url: getFileUrl(file.filename, 'order'),
          name: file.originalname,
          type: 'proof',
          sort_order: index
        }));

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

  // 获取订单列表
  async getList(req, res) {
    try {
      // 🆕 优化查询参数处理
      const query = {
        // 门店筛选
        store_id: req.query.store_id,
        
        // 订单类型筛选
        order_type: req.query.order_type,
        
        // 状态筛选
        status: req.query.status,
        
        // 支付状态筛选
        payment_status: req.query.payment_status,
        
        // 预订类型筛选
        booking_type: req.query.booking_type,
        
        // 🆕 语言筛选（按剧本/密室支持的语言筛选）
        language: req.query.language,
        
        // 日期范围筛选
        start_date: req.query.start_date,
        end_date: req.query.end_date,
        
        // 客户信息搜索
        customer_name: req.query.customer_name,
        customer_phone: req.query.customer_phone
      };

      const result = await orderService.getList(query, req.user);
      
      res.json({
        success: true,
        message: '获取订单列表成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('获取订单列表错误:', error);
      
      if (error.message === '权限不足') {
        return res.status(403).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: '获取订单列表失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 获取门店订单列表
  async getStoreOrders(req, res) {
    try {
      const { storeId } = req.params;
      
      // 🆕 优化查询参数处理
      const query = {
        order_type: req.query.order_type,
        status: req.query.status,
        payment_status: req.query.payment_status,
        booking_type: req.query.booking_type,
        language: req.query.language,
        start_date: req.query.start_date,
        end_date: req.query.end_date,
        customer_name: req.query.customer_name,
        customer_phone: req.query.customer_phone
      };
      
      const result = await orderService.getStoreOrders(storeId, query, req.user);
      
      res.json({
        success: true,
        message: '获取门店订单列表成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('获取门店订单列表错误:', error);
      
      if (error.message === '权限不足') {
        return res.status(403).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: '获取门店订单列表失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 获取订单详情
  async getById(req, res) {
    try {
      const { id } = req.params;
      const result = await orderService.getById(id, req.user);
      
      if (!result) {
        return res.status(404).json({
          success: false,
          error: '订单不存在',
          timestamp: new Date().toISOString()
        });
      }
      
      res.json({
        success: true,
        message: '获取订单成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('获取订单错误:', error);
      
      if (error.message === '权限不足') {
        return res.status(403).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: '获取订单失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 创建订单
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

      const result = await orderService.create(req.body, req.user);
      
      res.json({
        success: true,
        message: '创建订单成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('创建订单错误:', error);
      
      if (error.message === '权限不足') {
        return res.status(403).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      if (error.message.includes('必须') || error.message.includes('不能为空') || error.message.includes('不能为负数')) {
        return res.status(400).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: '创建订单失败',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  // 🆕 多笔付款订单创建
  async createOrderWithMultiPayment(req, res) {
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

      console.log('🚀 开始创建多笔付款订单:', req.body);
      
      const result = await orderService.createOrderWithMultiPayment(req.body, req.user);
      
      res.json({
        success: true,
        message: '多笔付款订单创建成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('多笔付款订单创建错误:', error);
      
      if (error.message === '权限不足') {
        return res.status(403).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      if (error.message.includes('门店') || error.message.includes('剧本') || error.message.includes('密室')) {
        return res.status(404).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: '多笔付款订单创建失败',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  // 🆕 生成付款项建议
  async generatePaymentItemsSuggestion(req, res) {
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

      console.log('💡 生成付款项建议:', req.body);
      
      const result = await orderService.generatePaymentItemsSuggestion(req.body, req.user);
      
      res.json({
        success: true,
        message: '付款项建议生成成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('生成付款项建议错误:', error);
      
      if (error.message === '权限不足') {
        return res.status(403).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: '生成付款项建议失败',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  // 更新订单
  async update(req, res) {
    try {
      const { id } = req.params;
      const result = await orderService.update(id, req.body, req.user);
      
      res.json({
        success: true,
        message: '更新订单成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('更新订单错误:', error);
      
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
        error: '更新订单失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 删除订单
  async delete(req, res) {
    try {
      const { id } = req.params;
      await orderService.delete(id, req.user);
      
      res.json({
        success: true,
        message: '删除订单成功',
        data: null,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('删除订单错误:', error);
      
      if (error.message === '权限不足') {
        return res.status(403).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: '删除订单失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 获取订单统计
  async getStats(req, res) {
    try {
      const stats = await orderService.getStats(req.user);
      
      res.json({
        success: true,
        message: '获取订单统计成功',
        data: stats,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('获取订单统计错误:', error);
      
      if (error.message === '权限不足') {
        return res.status(403).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: '获取订单统计失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 获取门店统计
  async getStoreStats(req, res) {
    try {
      const { storeId } = req.params;
      const stats = await orderService.getStoreStats(storeId, req.user);
      
      res.json({
        success: true,
        message: '获取门店统计成功',
        data: stats,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('获取门店统计错误:', error);
      
      if (error.message === '权限不足') {
        return res.status(403).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: '获取门店统计失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 批量操作
  async batchOperation(req, res) {
    try {
      const { operation, order_ids } = req.body;
      
      if (!Array.isArray(order_ids) || order_ids.length === 0) {
        return res.status(400).json({
          success: false,
          error: '请选择要操作的订单',
          timestamp: new Date().toISOString()
        });
      }

      let result;
      switch (operation) {
        case 'confirm':
          result = await orderService.batchUpdateStatus(order_ids, 'confirmed', req.user);
          break;
        case 'complete':
          result = await orderService.batchUpdateStatus(order_ids, 'completed', req.user);
          break;
        case 'cancel':
          result = await orderService.batchUpdateStatus(order_ids, 'cancelled', req.user);
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

  // 获取订单配置
  async getConfigs(req, res) {
    try {
      const { configType } = req.params;
      const configs = await orderService.getConfigs(configType, req.user);
      
      res.json({
        success: true,
        message: '获取订单配置成功',
        data: configs,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('获取订单配置错误:', error);
      
      if (error.message === '权限不足') {
        return res.status(403).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: '获取订单配置失败',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  // 获取门店可用资源
  async getStoreResources(req, res) {
    try {
      const { storeId } = req.params;
      const resources = await orderService.getStoreResources(storeId, req.user);
      
      res.json({
        success: true,
        message: '获取门店资源成功',
        data: resources,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('获取门店资源错误:', error);
      
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
        error: '获取门店资源失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 上传订单图片到指定订单
  async uploadOrderImages(req, res) {
    try {
      const { orderId } = req.params;
      const { images } = req.body;
      
      if (!images || !Array.isArray(images) || images.length === 0) {
        return res.status(400).json({
          success: false,
          error: '请提供要上传的图片信息',
          timestamp: new Date().toISOString()
        });
      }

      const result = await orderService.uploadImages(orderId, images, req.user);
      
      res.json({
        success: true,
        message: '上传订单图片成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('上传订单图片错误:', error);
      
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
        error: '上传订单图片失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 删除订单图片
  async deleteImage(req, res) {
    try {
      const { orderId, imageId } = req.params;
      
      const result = await orderService.deleteImage(orderId, imageId, req.user);
      
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

  // 🆕 获取用户可选门店列表
  async getAvailableStores(req, res) {
    try {
      const stores = await orderService.getAvailableStores(req.user);
      
      res.json({
        success: true,
        message: '获取可选门店列表成功',
        data: stores,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('获取可选门店列表错误:', error);
      console.error('错误堆栈:', error.stack);
      
      if (error.message === '权限不足') {
        return res.status(403).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: '获取可选门店列表失败',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  // 🆕 获取房间占用情况
  async getRoomOccupancy(req, res) {
    try {
      const { storeId, roomId } = req.params;
      const { date, start_time, end_time } = req.query;
      
      const occupancy = await orderService.getRoomOccupancy(
        storeId, 
        roomId, 
        { date, start_time, end_time }, 
        req.user
      );
      
      res.json({
        success: true,
        message: '获取房间占用情况成功',
        data: occupancy,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('获取房间占用情况错误:', error);
      
      if (error.message === '权限不足') {
        return res.status(403).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: '获取房间占用情况失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 🆕 检查房间可用性
  async checkRoomAvailability(req, res) {
    try {
      const { storeId, roomId } = req.params;
      const { date, start_time, end_time, exclude_order_id } = req.query;
      
      if (!date || !start_time || !end_time) {
        return res.status(400).json({
          success: false,
          error: '请提供日期、开始时间和结束时间',
          timestamp: new Date().toISOString()
        });
      }
      
      const availability = await orderService.checkRoomAvailability(
        storeId, 
        roomId, 
        { date, start_time, end_time, exclude_order_id }, 
        req.user
      );
      
      res.json({
        success: true,
        message: '检查房间可用性成功',
        data: availability,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('检查房间可用性错误:', error);
      
      if (error.message === '权限不足') {
        return res.status(403).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: '检查房间可用性失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 🆕 获取可预订项目统一列表（剧本+密室）可视化预定功能
  async getBookingItems(req, res) {
    try {
      const { item_type, keyword } = req.query; // 'all', 'script', 'escape_room'
      const filters = {
        keyword: keyword ? keyword.trim() : undefined,
        ...req.query
      };
      const result = await orderService.getBookingItems(item_type, filters, req.user);
      
      res.json({
        success: true,
        message: '获取可预订项目成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('获取可预订项目错误:', error);
      
      if (error.message === '权限不足') {
        return res.status(403).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: '获取可预订项目失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 🆕 获取预订项目详情页数据（包含门店、房间、时间信息）
  async getBookingItemDetail(req, res) {
    try {
      const { itemType, itemId } = req.params;
      const result = await orderService.getBookingItemDetail(itemType, itemId, req.user);
      
      res.json({
        success: true,
        message: '获取项目详情成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('获取项目详情错误:', error);
      
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
        error: '获取项目详情失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 🆕 获取指定日期的门店房间时间段可用性
  async getStoreRoomSchedule(req, res) {
    try {
      const { storeId } = req.params;
      const { date, item_type, item_id } = req.query;
      
      if (!date) {
        return res.status(400).json({
          success: false,
          error: '请提供查询日期',
          timestamp: new Date().toISOString()
        });
      }
      
      const schedule = await orderService.getStoreRoomSchedule(
        storeId, 
        date, 
        { item_type, item_id }, 
        req.user
      );
      
      res.json({
        success: true,
        message: '获取房间时间表成功',
        data: schedule,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('获取房间时间表错误:', error);
      
      if (error.message === '权限不足') {
        return res.status(403).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: '获取房间时间表失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 🆕 预检查预订可用性（下单前最后确认）
  async preCheckBooking(req, res) {
    try {
      const { store_id, room_id, item_type, item_id, date, start_time, end_time } = req.body;
      
      const result = await orderService.preCheckBooking({
        store_id, room_id, item_type, item_id, date, start_time, end_time
      }, req.user);
      
      res.json({
        success: true,
        message: '预检查完成',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('预检查失败:', error);
      
      if (error.message === '权限不足') {
        return res.status(403).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      if (error.message.includes('不可用')) {
        return res.status(400).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: '预检查失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 🆕 检查自定义时间段可用性
  async checkCustomTimeSlot(req, res) {
    try {
      const { storeId, roomId } = req.params;
      const { date, start_time, end_time } = req.query;
      
      if (!date || !start_time || !end_time) {
        return res.status(400).json({
          success: false,
          error: '请提供完整的时间信息',
          timestamp: new Date().toISOString()
        });
      }
      
      const result = await orderService.checkCustomTimeSlot(
        storeId, roomId, date, start_time, end_time, req.user
      );
      
      res.json({
        success: true,
        message: '时间段检查完成',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('检查自定义时间段失败:', error);
      
      if (error.message === '权限不足') {
        return res.status(403).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: '检查时间段失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 🆕 导出订单
  async exportOrders(req, res) {
    try {
      const query = {
        store_id: req.query.store_id,
        order_type: req.query.order_type,
        status: req.query.status,
        payment_status: req.query.payment_status,
        booking_type: req.query.booking_type,
        language: req.query.language,
        start_date: req.query.start_date,
        end_date: req.query.end_date,
        customer_name: req.query.customer_name,
        customer_phone: req.query.customer_phone
      };

      const buffer = await orderService.exportOrders(query, req.user);
      
      // 设置响应头
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="orders.xlsx"');
      
      res.send(buffer);
    } catch (error) {
      console.error('导出订单错误:', error);
      
      if (error.message === '权限不足') {
        return res.status(403).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: '导出订单失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 🆕 更新订单状态
  async updateStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      const result = await orderService.updateStatus(id, status, req.user);
      
      res.json({
        success: true,
        message: '订单状态更新成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('更新订单状态错误:', error);
      
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
        error: '更新订单状态失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 🆕 开始游戏
  async startGame(req, res) {
    try {
      const { id } = req.params;
      
      const result = await orderService.startGame(id, req.user);
      
      res.json({
        success: true,
        message: '游戏开始成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('开始游戏错误:', error);
      
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
        error: '开始游戏失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 🆕 完成游戏
  async completeGame(req, res) {
    try {
      const { id } = req.params;
      
      const result = await orderService.completeGame(id, req.user);
      
      res.json({
        success: true,
        message: '游戏完成成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('完成游戏错误:', error);
      
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
        error: '开始游戏失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 🆕 处理退款
  async processRefund(req, res) {
    try {
      const { id } = req.params;
      const refundData = req.body;
      
      const result = await orderService.processRefund(id, refundData, req.user);
      
      res.json({
        success: true,
        message: '退款处理成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('处理退款错误:', error);
      
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
        error: '处理退款失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 🆕 获取可用的角色定价模板（用于订单折扣选择）
  async getAvailableRolePricingTemplates(req, res) {
    try {
      const { storeId } = req.params;
      const { item_type, item_id, date } = req.query;
      
      const result = await orderService.getAvailableRolePricingTemplates(
        storeId, 
        { item_type, item_id, date }, 
        req.user
      );
      
      res.json({
        success: true,
        message: '获取可用角色定价模板成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('获取可用角色定价模板错误:', error);
      
      if (error.message === '权限不足') {
        return res.status(403).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: '获取可用角色定价模板失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 🆕 获取可用的定价日历规则（用于订单折扣选择）
  async getAvailablePricingCalendar(req, res) {
    try {
      const { storeId } = req.params;
      const { date, item_type, item_id } = req.query;
      
      if (!date) {
        return res.status(400).json({
          success: false,
          error: '请提供查询日期',
          timestamp: new Date().toISOString()
        });
      }
      
      const result = await orderService.getAvailablePricingCalendar(
        storeId, 
        date, 
        { item_type, item_id }, 
        req.user
      );
      
      res.json({
        success: true,
        message: '获取可用定价日历成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('获取可用定价日历错误:', error);
      
      if (error.message === '权限不足') {
        return res.status(403).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: '获取可用定价日历失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 🆕 计算订单折扣预览
  async calculateOrderDiscount(req, res) {
    try {
      const { 
        store_id, 
        item_type, 
        item_id, 
        date, 
        original_amount, 
        player_count,
        role_pricing_template_id,
        pricing_calendar_id 
      } = req.body;
      
      const result = await orderService.calculateOrderDiscount({
        store_id,
        item_type,
        item_id,
        date,
        original_amount,
        player_count,
        role_pricing_template_id,
        pricing_calendar_id
      }, req.user);
      
      res.json({
        success: true,
        message: '计算订单折扣成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('计算订单折扣错误:', error);
      
      if (error.message === '权限不足') {
        return res.status(403).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: '计算订单折扣失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 🆕 获取订单支付信息汇总（包含玩家和支付记录）
  async getOrderPaymentSummary(req, res) {
    try {
      const { orderId } = req.params;
      
      const result = await orderService.getOrderPaymentSummary(orderId, req.user);
      
      res.json({
        success: true,
        message: '获取订单支付信息汇总成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('获取订单支付信息汇总错误:', error);
      
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
        error: '获取订单支付信息汇总失败',
        timestamp: new Date().toISOString()
      });
    }
  }
}

module.exports = new OrderController(); 