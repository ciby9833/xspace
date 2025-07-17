const BaseService = require('../core/BaseService');
const orderModel = require('../models/orderModel');
const gameHostModel = require('../models/gameHostModel');
const PermissionChecker = require('../utils/permissions');
const pool = require('../database/connection');
const { ACCOUNT_LEVELS } = require('../config/permissions');

class GameHostService extends BaseService {
  constructor() {
    super(orderModel, 'Game Host订单');
  }

  // 获取Game Host的订单列表
  async getGameHostOrders(user, filters = {}) {
    // 检查Game Host权限
    await PermissionChecker.requirePermission(user, 'game_host.view');

    const gameHostId = user.user_id;
    const today = new Date().toISOString().split('T')[0];
    
    // 处理筛选条件
    const processedFilters = {
      // 默认查询当日订单
      start_date: filters.start_date || today,
      end_date: filters.end_date || today,
      
      // 其他筛选条件
      order_type: filters.order_type,
      status: filters.status,
      customer_name: filters.customer_name ? filters.customer_name.trim() : undefined,
      customer_phone: filters.customer_phone ? filters.customer_phone.trim() : undefined,
      store_id: filters.store_id,
      // 🆕 添加语言筛选
      language: filters.language
    };

    // 移除undefined值
    Object.keys(processedFilters).forEach(key => {
      if (processedFilters[key] === undefined) {
        delete processedFilters[key];
      }
    });

    const orders = await gameHostModel.findGameHostOrders(gameHostId, processedFilters);

    // 格式化时间字段并处理语言显示
    return orders.map(order => {
      const formatted = this.formatTimeFields(order, user.user_timezone);
      // 🆕 处理语言显示：显示剧本/密室支持的语言
      formatted.display_languages = this.getOrderDisplayLanguages(order);
      // 确保 images 是数组
      if (formatted.images && !Array.isArray(formatted.images)) {
        formatted.images = [];
      }
      return formatted;
    });
  }

  // 获取Game Host当前进行中的订单
  async getCurrentInProgressOrder(user) {
    await PermissionChecker.requirePermission(user, 'game_host.view');

    const gameHostId = user.user_id;
    const order = await gameHostModel.findCurrentInProgressOrder(gameHostId);
    
    if (order) {
      const formatted = this.formatTimeFields(order, user.user_timezone);
      // 🆕 处理语言显示：显示剧本/密室支持的语言
      formatted.display_languages = this.getOrderDisplayLanguages(order);
      return formatted;
    }
    
    return null;
  }

  // 开始游戏（将订单状态更新为in_progress）
  async startGame(orderId, user) {
    await PermissionChecker.requirePermission(user, 'game_host.start');

    const gameHostId = user.user_id;
    
    // 检查是否已有进行中的订单
    const currentInProgress = await this.getCurrentInProgressOrder(user);
    if (currentInProgress && currentInProgress.id !== orderId) {
      throw new Error(`您已有进行中的订单：${currentInProgress.customer_name}，请先完成当前订单`);
    }

    // 获取订单详情并验证权限
    const order = await this.getGameHostOrderById(orderId, user);
    if (!order) {
      throw new Error('订单不存在或无权限访问');
    }

    // 检查订单状态
    if (order.status === 'in_progress') {
      return {
        success: true,
        message: '订单已在进行中',
        order: order
      };
    }

    if (order.status !== 'confirmed') {
      throw new Error('只能开始已确认的订单');
    }

    // 更新订单状态
    const updatedOrder = await gameHostModel.updateOrderStatus(
      orderId, 
      gameHostId, 
      'in_progress',
      { updated_by: user.user_id }
    );

    if (!updatedOrder) {
      throw new Error('更新订单状态失败');
    }

    const finalOrder = await this.getGameHostOrderById(orderId, user);

    return {
      success: true,
      message: '游戏开始成功',
      order: finalOrder
    };
  }

  // 完成游戏（将订单状态更新为completed）
  async completeGame(orderId, user, completionData = {}) {
    await PermissionChecker.requirePermission(user, 'game_host.complete');

    const gameHostId = user.user_id;
    
    // 获取订单详情并验证权限
    const order = await this.getGameHostOrderById(orderId, user);
    if (!order) {
      throw new Error('订单不存在或无权限访问');
    }

    // 检查订单状态
    if (order.status === 'completed') {
      return {
        success: true,
        message: '订单已完成',
        order: order
      };
    }

    if (order.status !== 'in_progress') {
      throw new Error('只能完成进行中的订单');
    }

    // 准备更新数据
    const additionalData = { updated_by: user.user_id };
    
    // 如果有完成备注，添加到Game Host备注中
    if (completionData.game_host_notes) {
      additionalData.game_host_notes = completionData.game_host_notes;
    }

    // 更新订单状态
    const updatedOrder = await gameHostModel.updateOrderStatus(
      orderId, 
      gameHostId, 
      'completed',
      additionalData
    );

    if (!updatedOrder) {
      throw new Error('更新订单状态失败');
    }

    const finalOrder = await this.getGameHostOrderById(orderId, user);

    return {
      success: true,
      message: '游戏完成成功',
      order: finalOrder
    };
  }

  // 更新订单信息（Game Host可编辑字段）
  async updateGameHostOrder(orderId, updateData, user) {
    await PermissionChecker.requirePermission(user, 'game_host.update');

    const gameHostId = user.user_id;
    
    // 获取订单详情并验证权限
    const order = await this.getGameHostOrderById(orderId, user);
    if (!order) {
      throw new Error('订单不存在或无权限访问');
    }

    // 检查订单状态 - 只有未完成的订单可以编辑
    if (order.status === 'completed') {
      throw new Error('已完成的订单无法修改');
    }

    if (order.status === 'cancelled') {
      throw new Error('已取消的订单无法修改');
    }

    // 验证可编辑字段
    const allowedFields = [
      'player_count',           // 玩家人数
      'support_player_count',   // 补位人数
      'language',              // 客户语言
      'internal_support',      // 是否内部补位
      'room_id',               // 房间
      'script_id',             // 剧本（剧本杀订单）
      'escape_room_id',        // 密室（密室订单）
      'game_host_notes'        // Game Host备注
    ];

    const cleanedUpdateData = {};
    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        cleanedUpdateData[field] = updateData[field];
      }
    });

    if (Object.keys(cleanedUpdateData).length === 0) {
      throw new Error('没有可更新的字段');
    }

    // 验证数据
    this.validateGameHostUpdateData(cleanedUpdateData, order);

    // 处理剧本/密室名称的冗余存储
    if (cleanedUpdateData.script_id && order.order_type === '剧本杀') {
      const scriptName = await gameHostModel.getScriptName(cleanedUpdateData.script_id);
      if (scriptName) {
        cleanedUpdateData.script_name = scriptName;
      }
    }

    if (cleanedUpdateData.escape_room_id && order.order_type === '密室') {
      const escapeRoomName = await gameHostModel.getEscapeRoomName(cleanedUpdateData.escape_room_id);
      if (escapeRoomName) {
        cleanedUpdateData.escape_room_name = escapeRoomName;
      }
    }

    // 如果更换了房间，需要检查时间冲突
    if (cleanedUpdateData.room_id && cleanedUpdateData.room_id !== order.room_id) {
      const conflicts = await gameHostModel.checkRoomTimeConflicts(
        cleanedUpdateData.room_id,
        order.order_date,
        order.start_time,
        order.end_time,
        orderId // 排除当前订单
      );

      if (conflicts.length > 0) {
        throw new Error('选择的房间在该时间段已被占用');
      }
    }

    cleanedUpdateData.updated_by = user.user_id;

    // 使用gameHostModel更新订单
    const updatedOrder = await gameHostModel.updateGameHostOrder(orderId, gameHostId, cleanedUpdateData);

    if (!updatedOrder) {
      throw new Error('更新订单失败');
    }

    const finalOrder = await this.getGameHostOrderById(orderId, user);

    return {
      success: true,
      message: '订单更新成功',
      order: finalOrder
    };
  }

  // 获取Game Host订单详情
  async getGameHostOrderById(orderId, user) {
    await PermissionChecker.requirePermission(user, 'game_host.view');

    const gameHostId = user.user_id;
    const order = await gameHostModel.findGameHostOrderById(orderId, gameHostId);
    
    if (order) {
      const formatted = this.formatTimeFields(order, user.user_timezone);
      // 🆕 处理语言显示：显示剧本/密室支持的语言
      formatted.display_languages = this.getOrderDisplayLanguages(order);
      return formatted;
    }
    
    return null;
  }

  // 获取Game Host今日统计
  async getTodayStats(user) {
    await PermissionChecker.requirePermission(user, 'game_host.view');

    const gameHostId = user.user_id;
    const today = new Date().toISOString().split('T')[0];
    
    return await gameHostModel.getTodayStats(gameHostId, today);
  }

  // 获取可选择的房间列表（Game Host权限范围内）
  async getAvailableRooms(user, storeId = null) {
    await PermissionChecker.requirePermission(user, 'game_host.view');

    // 如果没有指定门店，获取Game Host关联的门店
    if (!storeId) {
      const userStores = await gameHostModel.getUserStores(user.user_id);
      if (userStores.length === 0) {
        throw new Error('用户未关联任何门店');
      }
      storeId = userStores[0].id; // 使用第一个门店
    }

    // 对于门店级用户，自动验证门店访问权限
    if (user.account_level === ACCOUNT_LEVELS.STORE) {
      const hasAccess = await this.canAccessStore(user, storeId);
      if (!hasAccess) {
        throw new Error('权限不足：无法访问该门店');
      }
    }

    return await gameHostModel.getAvailableRooms(storeId);
  }

  // 获取可选择的剧本列表（Game Host权限范围内）
  async getAvailableScripts(user, storeId = null) {
    await PermissionChecker.requirePermission(user, 'game_host.view');

    if (!storeId) {
      const userStores = await gameHostModel.getUserStores(user.user_id);
      if (userStores.length === 0) {
        throw new Error('用户未关联任何门店');
      }
      storeId = userStores[0].id;
    }

    // 对于门店级用户，自动验证门店访问权限
    if (user.account_level === ACCOUNT_LEVELS.STORE) {
      const hasAccess = await this.canAccessStore(user, storeId);
      if (!hasAccess) {
        throw new Error('权限不足：无法访问该门店');
      }
    }

    return await gameHostModel.getAvailableScripts(storeId);
  }

  // 获取可选择的密室列表（Game Host权限范围内）
  async getAvailableEscapeRooms(user, storeId = null) {
    await PermissionChecker.requirePermission(user, 'game_host.view');

    if (!storeId) {
      const userStores = await gameHostModel.getUserStores(user.user_id);
      if (userStores.length === 0) {
        throw new Error('用户未关联任何门店');
      }
      storeId = userStores[0].id;
    }

    // 对于门店级用户，自动验证门店访问权限
    if (user.account_level === ACCOUNT_LEVELS.STORE) {
      const hasAccess = await this.canAccessStore(user, storeId);
      if (!hasAccess) {
        throw new Error('权限不足：无法访问该门店');
      }
    }

    return await gameHostModel.getAvailableEscapeRooms(storeId);
  }

  // 获取订单历史记录（分页）
  async getOrderHistory(user, options = {}) {
    await PermissionChecker.requirePermission(user, 'game_host.view');

    const gameHostId = user.user_id;
    const {
      page = 1,
      pageSize = 20,
      startDate = null,
      endDate = null,
      status = null
    } = options;

    const historyOptions = {
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      startDate,
      endDate,
      status
    };

    const result = await gameHostModel.getGameHostOrderHistory(gameHostId, historyOptions);

    // 格式化时间字段并处理语言显示
    result.data = result.data.map(order => {
      const formatted = this.formatTimeFields(order, user.user_timezone);
      // 🆕 处理语言显示：显示剧本/密室支持的语言
      formatted.display_languages = this.getOrderDisplayLanguages(order);
      return formatted;
    });

    return result;
  }

  // ========== 辅助方法 ==========

  // 验证Game Host更新数据
  validateGameHostUpdateData(data, currentOrder) {
    // 验证玩家人数
    if (data.player_count !== undefined) {
      if (!Number.isInteger(data.player_count) || data.player_count < 1) {
        throw new Error('玩家人数必须是大于0的整数');
      }
      if (data.player_count > 20) {
        throw new Error('玩家人数不能超过20人');
      }
    }

    // 验证补位人数
    if (data.support_player_count !== undefined) {
      if (!Number.isInteger(data.support_player_count) || data.support_player_count < 0) {
        throw new Error('补位人数必须是非负整数');
      }
      if (data.support_player_count > 10) {
        throw new Error('补位人数不能超过10人');
      }
    }

    // 验证语言
    if (data.language !== undefined) {
      if (!['CN', 'EN', 'IND'].includes(data.language)) {
        throw new Error('客户语言必须是CN、EN或IND');
      }
    }

    // 验证内部补位
    if (data.internal_support !== undefined) {
      if (typeof data.internal_support !== 'boolean') {
        throw new Error('内部补位必须是布尔值');
      }
    }

    // 验证Game Host备注长度
    if (data.game_host_notes !== undefined && data.game_host_notes.length > 1000) {
      throw new Error('Game Host备注不能超过1000个字符');
    }
  }

  // 检查是否可以访问门店
  async canAccessStore(user, storeId) {
    if (user.account_level === ACCOUNT_LEVELS.PLATFORM) {
      return true;
    }

    if (user.account_level === ACCOUNT_LEVELS.COMPANY) {
      const query = `SELECT id FROM store WHERE id = $1 AND company_id = $2`;
      const result = await pool.query(query, [storeId, user.company_id]);
      return result.rows.length > 0;
    }

    // 门店级用户：检查user_stores关联关系，而不是依赖users.store_id字段
    if (user.account_level === ACCOUNT_LEVELS.STORE) {
      const query = `
        SELECT us.user_id 
        FROM user_stores us 
        WHERE us.user_id = $1 AND us.store_id = $2
      `;
      const result = await pool.query(query, [user.user_id, storeId]);
      return result.rows.length > 0;
    }

    return false;
  }

  // 🆕 获取订单显示语言（基于剧本/密室的支持语言）
  getOrderDisplayLanguages(order) {
    let supportedLanguages = [];
    
    if (order.order_type === '剧本杀' && order.script_supported_languages) {
      try {
        if (typeof order.script_supported_languages === 'string') {
          supportedLanguages = JSON.parse(order.script_supported_languages);
        } else if (Array.isArray(order.script_supported_languages)) {
          supportedLanguages = order.script_supported_languages;
        }
      } catch (e) {
        console.warn('解析剧本语言失败:', e);
        supportedLanguages = ['IND']; // 默认印尼语
      }
    } else if (order.order_type === '密室' && order.escape_room_supported_languages) {
      try {
        if (typeof order.escape_room_supported_languages === 'string') {
          supportedLanguages = JSON.parse(order.escape_room_supported_languages);
        } else if (Array.isArray(order.escape_room_supported_languages)) {
          supportedLanguages = order.escape_room_supported_languages;
        }
      } catch (e) {
        console.warn('解析密室语言失败:', e);
        supportedLanguages = ['IND']; // 默认印尼语
      }
    } else if (order.content_supported_languages) {
      // 处理历史记录查询中的语言字段
      try {
        if (typeof order.content_supported_languages === 'string') {
          supportedLanguages = JSON.parse(order.content_supported_languages);
        } else if (Array.isArray(order.content_supported_languages)) {
          supportedLanguages = order.content_supported_languages;
        }
      } catch (e) {
        console.warn('解析内容语言失败:', e);
        supportedLanguages = ['IND']; // 默认印尼语
      }
    }
    
    // 如果没有获取到语言信息，使用默认值
    if (!supportedLanguages || supportedLanguages.length === 0) {
      supportedLanguages = ['IND'];
    }
    
    // 转换为中文显示
    return supportedLanguages.map(lang => this.getLanguageText(lang));
  }

  // 🆕 获取语言文本显示
  getLanguageText(language) {
    const languageMap = {
      'CN': '中文',
      'EN': '英语',
      'IND': '印尼语'
    };
    return languageMap[language] || language;
  }
}

module.exports = new GameHostService(); 