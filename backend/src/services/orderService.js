const BaseService = require('../core/BaseService');
const orderModel = require('../models/orderModel');
const { deleteFile } = require('../utils/upload');
const PermissionChecker = require('../utils/permissions');
const pool = require('../database/connection');
const { ACCOUNT_LEVELS } = require('../config/permissions');

class OrderService extends BaseService {
  constructor() {
    super(orderModel, '订单');
  }

  // 获取订单列表（公司维度）
  async getList(query, user) {
    // 检查查看权限
    await PermissionChecker.requirePermission(user, 'order.view');

    const { company_id } = user;
    
    // 🆕 优化筛选条件处理
    const processedFilters = {
      // 门店筛选
      store_id: query.store_id,
      
      // 订单类型筛选
      order_type: query.order_type,
      
      // 状态筛选
      status: query.status,
      
      // 支付状态筛选
      payment_status: query.payment_status,
      
      // 预订类型筛选
      booking_type: query.booking_type,
      
      // 语言筛选
      language: query.language,
      
      // 日期范围筛选
      start_date: query.start_date,
      end_date: query.end_date,
      
      // 客户信息搜索
      customer_name: query.customer_name ? query.customer_name.trim() : undefined,
      customer_phone: query.customer_phone ? query.customer_phone.trim() : undefined
    };

    // 移除undefined值，避免传递给数据库
    Object.keys(processedFilters).forEach(key => {
      if (processedFilters[key] === undefined) {
        delete processedFilters[key];
      }
    });

    const orders = await this.model.findByCompanyId(company_id, processedFilters);

    // 格式化时间字段
    return orders.map(order => {
      const formatted = this.formatTimeFields(order, user.user_timezone);
      // 确保 images 是数组
      if (formatted.images && !Array.isArray(formatted.images)) {
        formatted.images = [];
      }
      return formatted;
    });
  }

  // 获取门店订单列表
  async getStoreOrders(storeId, query, user) {
    await PermissionChecker.requirePermission(user, 'order.view');
    
    // 🔧 修复：基于账户层级检查数据访问权限，不依赖其他功能权限
    // 门店级用户只能访问自己关联的门店数据
    if (user.account_level === 'store' && user.store_id && user.store_id !== storeId) {
      throw new Error('权限不足：无法访问该门店的订单');
    }
    
    // 公司级用户需要验证门店是否属于其公司
    if (user.account_level === 'company') {
      const storeModel = require('../models/storeModel');
      const store = await storeModel.findById(storeId);
      if (!store || store.company_id !== user.company_id) {
        throw new Error('权限不足：无法访问该门店的订单');
      }
    }

    const processedFilters = {
      order_type: query.order_type,
      status: query.status,
      start_date: query.start_date,
      end_date: query.end_date,
      customer_name: query.customer_name ? query.customer_name.trim() : undefined,
      customer_phone: query.customer_phone ? query.customer_phone.trim() : undefined
    };

    // 移除undefined值
    Object.keys(processedFilters).forEach(key => {
      if (processedFilters[key] === undefined) {
        delete processedFilters[key];
      }
    });

    const orders = await this.model.findByStoreId(storeId, processedFilters);
    return orders.map(order => this.formatTimeFields(order, user.user_timezone));
  }

  // 获取订单详情
  async getById(orderId, user) {
    // 检查查看权限
    await PermissionChecker.requirePermission(user, 'order.view');

    const { company_id } = user;
    
    // 🔧 修复：基于账户层级确定数据访问范围
    let companyId = null;
    if (user.account_level === 'platform') {
      companyId = null; // 平台级可访问所有数据
    } else {
      companyId = company_id; // 公司级和门店级只能访问本公司数据
    }
    
    const order = await this.model.findById(orderId, companyId);
    
    if (!order) {
      throw new Error('订单不存在或无权限访问');
    }

    const formatted = this.formatTimeFields(order, user.user_timezone);
    // 处理图片数组
    if (formatted.images && !Array.isArray(formatted.images)) {
      formatted.images = [];
    }
    return formatted;
  }

  // 创建订单
  async create(data, user) {
    // 权限检查：只有有管理权限的用户可以创建订单
    await PermissionChecker.requirePermission(user, 'order.manage');

    const { company_id } = user;

    // 🆕 语言值映射：将前端的中文语言值转换为数据库期望的值
    const languageMapping = {
      '中文': 'CN',
      '英语': 'EN',
      '印尼语': 'IND',
      'CN': 'CN',
      'EN': 'EN',
      'IND': 'IND'
    };

    if (data.language && languageMapping[data.language]) {
      data.language = languageMapping[data.language];
    }

    // 数据验证
    this.validateOrderData(data);

    // 验证图片数量
    if (data.images && data.images.length > 10) {
      throw new Error('最多只能上传10张图片');
    }

    // 🔧 修复：基于账户层级确定目标公司ID
    let targetCompanyId;
    
    if (user.account_level === 'platform') {
      // 平台级用户：可以指定公司ID，如果没有指定则需要提供
      if (!data.company_id) {
        throw new Error('平台级用户创建订单时必须指定公司');
      }
      targetCompanyId = data.company_id;
    } else {
      // 公司级和门店级用户：只能为自己的公司创建订单
      if (!company_id) {
        throw new Error('用户未关联公司，无法创建订单');
      }
      targetCompanyId = company_id;
    }

    // 处理星期几自动计算
    if (data.order_date && !data.weekday) {
      const orderDate = new Date(data.order_date);
      const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      data.weekday = weekdays[orderDate.getDay()];
    }

    // 🆕 自动计算时长（分钟）
    if (data.start_time && data.end_time) {
      data.duration = this.calculateDuration(data.start_time, data.end_time);
    }

    // 处理剧本名称或密室名称的冗余存储
    if (data.order_type === '剧本杀' && data.script_id && !data.script_name) {
      // 从数据库获取剧本名称
      const scriptQuery = await require('../database/connection').query(
        'SELECT name FROM scripts WHERE id = $1',
        [data.script_id]
      );
      if (scriptQuery.rows.length > 0) {
        data.script_name = scriptQuery.rows[0].name;
      }
    }

    if (data.order_type === '密室' && data.escape_room_id && !data.escape_room_name) {
      // 从数据库获取密室名称
      const escapeRoomQuery = await require('../database/connection').query(
        'SELECT name FROM escape_rooms WHERE id = $1',
        [data.escape_room_id]
      );
      if (escapeRoomQuery.rows.length > 0) {
        data.escape_room_name = escapeRoomQuery.rows[0].name;
      }
    }

    const orderData = {
      ...data,
      company_id: targetCompanyId,
      created_by: user.user_id,
      images: data.images || [],
      // 🆕 确保新字段正确映射
      pic_id: data.pic_id || null,
      pic_payment: data.pic_payment || null,
      promo_quantity: data.promo_quantity || null,
      // 🆕 处理其他可能的字段映射
      unit_price: data.total_amount, // 单价等于总金额
      is_free: data.free_pay === 'Free' ? true : false, // 转换Free/Pay为布尔值
      // 🆕 新增财务字段处理
      original_price: data.original_price || data.total_amount || 0,
      discount_price: data.discount_price || 0,
      discount_amount: data.discount_amount || 0,
      prepaid_amount: data.prepaid_amount || 0,
      remaining_amount: data.remaining_amount || 0,
      tax_amount: data.tax_amount || 0,
      service_fee: data.service_fee || 0,
      manual_discount: data.manual_discount || 0,
      activity_discount: data.activity_discount || 0,
      member_discount: data.member_discount || 0,
      package_discount: data.package_discount || 0,
      refund_amount: data.refund_amount || 0,
      refund_reason: data.refund_reason || null,
      refund_date: data.refund_date || null,
      actual_start_time: data.actual_start_time || null,
      actual_end_time: data.actual_end_time || null
    };

    // 🆕 使用清理函数只保留有效字段
    const cleanedOrderData = this.cleanOrderData(orderData);

    return await this.model.create(cleanedOrderData);
  }

  // 更新订单
  async update(orderId, data, user) {
    await PermissionChecker.requirePermission(user, 'order.manage');

    // 先获取现有订单信息
    const existingOrder = await this.getById(orderId, user);
    if (!existingOrder) {
      throw new Error('订单不存在或无权限访问');
    }

    // 🆕 语言值映射：将前端的中文语言值转换为数据库期望的值
    const languageMapping = {
      '中文': 'CN',
      '英语': 'EN',
      '印尼语': 'IND',
      'CN': 'CN',
      'EN': 'EN',
      'IND': 'IND'
    };

    if (data.language && languageMapping[data.language]) {
      data.language = languageMapping[data.language];
    }

    // 数据验证
    this.validateOrderData(data);

    // 验证图片数量
    if (data.images && data.images.length > 10) {
      throw new Error('最多只能上传10张图片');
    }

    // 处理星期几自动计算
    if (data.order_date && !data.weekday) {
      const orderDate = new Date(data.order_date);
      const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      data.weekday = weekdays[orderDate.getDay()];
    }

    // 🆕 自动计算时长（分钟）
    if (data.start_time && data.end_time) {
      data.duration = this.calculateDuration(data.start_time, data.end_time);
    }

    // 处理剧本名称或密室名称的冗余存储
    if (data.order_type === '剧本杀' && data.script_id && !data.script_name) {
      // 从数据库获取剧本名称
      const scriptQuery = await require('../database/connection').query(
        'SELECT name FROM scripts WHERE id = $1',
        [data.script_id]
      );
      if (scriptQuery.rows.length > 0) {
        data.script_name = scriptQuery.rows[0].name;
      }
    }

    if (data.order_type === '密室' && data.escape_room_id && !data.escape_room_name) {
      // 从数据库获取密室名称
      const escapeRoomQuery = await require('../database/connection').query(
        'SELECT name FROM escape_rooms WHERE id = $1',
        [data.escape_room_id]
      );
      if (escapeRoomQuery.rows.length > 0) {
        data.escape_room_name = escapeRoomQuery.rows[0].name;
      }
    }

    const updateData = {
      ...data,
      updated_by: user.user_id,
      images: data.images || existingOrder.images || [],
      // 🆕 确保新字段正确映射
      pic_id: data.pic_id || null,
      pic_payment: data.pic_payment || null,
      promo_quantity: data.promo_quantity || null,
      // 🆕 处理其他可能的字段映射
      unit_price: data.total_amount, // 单价等于总金额
      is_free: data.free_pay === 'Free' ? true : false, // 转换Free/Pay为布尔值
      // 🆕 新增财务字段处理
      original_price: data.original_price !== undefined ? data.original_price : existingOrder.original_price,
      discount_price: data.discount_price !== undefined ? data.discount_price : existingOrder.discount_price,
      discount_amount: data.discount_amount !== undefined ? data.discount_amount : existingOrder.discount_amount,
      prepaid_amount: data.prepaid_amount !== undefined ? data.prepaid_amount : existingOrder.prepaid_amount,
      remaining_amount: data.remaining_amount !== undefined ? data.remaining_amount : existingOrder.remaining_amount,
      tax_amount: data.tax_amount !== undefined ? data.tax_amount : existingOrder.tax_amount,
      service_fee: data.service_fee !== undefined ? data.service_fee : existingOrder.service_fee,
      manual_discount: data.manual_discount !== undefined ? data.manual_discount : existingOrder.manual_discount,
      activity_discount: data.activity_discount !== undefined ? data.activity_discount : existingOrder.activity_discount,
      member_discount: data.member_discount !== undefined ? data.member_discount : existingOrder.member_discount,
      package_discount: data.package_discount !== undefined ? data.package_discount : existingOrder.package_discount,
      refund_amount: data.refund_amount !== undefined ? data.refund_amount : existingOrder.refund_amount,
      refund_reason: data.refund_reason !== undefined ? data.refund_reason : existingOrder.refund_reason,
      refund_date: data.refund_date !== undefined ? data.refund_date : existingOrder.refund_date,
      actual_start_time: data.actual_start_time !== undefined ? data.actual_start_time : existingOrder.actual_start_time,
      actual_end_time: data.actual_end_time !== undefined ? data.actual_end_time : existingOrder.actual_end_time
    };

    // 🆕 使用清理函数只保留有效字段
    const cleanedUpdateData = this.cleanOrderData(updateData);

    const updatedOrder = await this.model.update(orderId, cleanedUpdateData);

    return this.formatTimeFields(updatedOrder, user.user_timezone);
  }

  // 删除订单
  async delete(orderId, user) {
    await PermissionChecker.requirePermission(user, 'order.manage');

    const order = await this.getById(orderId, user);
    if (!order) {
      throw new Error('订单不存在或无权限访问');
    }

    // 删除订单记录
    await this.model.delete(orderId);

    // 删除关联的图片文件
    if (order.images && order.images.length > 0) {
      order.images.forEach(image => {
        const filename = image.image_url.split('/').pop();
        deleteFile(filename);
      });
    }

    return { success: true, message: '订单删除成功' };
  }

  // 批量更新状态
  async batchUpdateStatus(orderIds, status, user) {
    await PermissionChecker.requirePermission(user, 'order.manage');

    const { company_id } = user;
    // 🔧 修复：基于账户层级确定数据访问范围
    let companyId = null;
    if (user.account_level === 'platform') {
      companyId = null; // 平台级可操作所有数据
    } else {
      companyId = company_id; // 公司级和门店级只能操作本公司数据
    }
    
    return await this.model.batchUpdateStatus(orderIds, status, companyId);
  }

  // 获取订单统计
  async getStats(user) {
    await PermissionChecker.requirePermission(user, 'order.view');

    const { company_id } = user;
    // 🔧 修复：基于账户层级确定数据访问范围
    let companyId = null;
    if (user.account_level === 'platform') {
      companyId = null; // 平台级可查看所有统计
    } else {
      companyId = company_id; // 公司级和门店级只能查看本公司统计
    }
    
    return await this.model.getStats(companyId);
  }

  // 获取门店统计
  async getStoreStats(storeId, user) {
    await PermissionChecker.requirePermission(user, 'order.view');

    // 🔧 修复：基于账户层级检查数据访问权限
    if (user.account_level === 'store' && user.store_id && user.store_id !== storeId) {
      throw new Error('权限不足：无法访问该门店的统计');
    }
    
    // 公司级用户需要验证门店是否属于其公司
    if (user.account_level === 'company') {
      const storeModel = require('../models/storeModel');
      const store = await storeModel.findById(storeId);
      if (!store || store.company_id !== user.company_id) {
        throw new Error('权限不足：无法访问该门店的统计');
      }
    }

    return await this.model.getStats(null, storeId);
  }

  // 获取订单配置
  async getConfigs(configType, user) {
    await PermissionChecker.requirePermission(user, 'order.view');

    const { company_id } = user;
    return await this.model.getConfigs(company_id, configType);
  }

  // 获取门店可用资源
  async getStoreResources(storeId, user) {
    await PermissionChecker.requirePermission(user, 'order.view');

    // 🔧 修复：基于账户层级检查数据访问权限
    if (user.account_level === 'store' && user.store_id && user.store_id !== storeId) {
      throw new Error('权限不足：无法访问该门店的资源');
    }
    
    // 公司级用户需要验证门店是否属于其公司
    if (user.account_level === 'company') {
      const storeModel = require('../models/storeModel');
      const store = await storeModel.findById(storeId);
      if (!store || store.company_id !== user.company_id) {
        throw new Error('权限不足：无法访问该门店的资源');
      }
    }

    return await this.model.getStoreResources(storeId);
  }

  // 🆕 获取用户可选门店列表
  async getAvailableStores(user) {
    await PermissionChecker.requirePermission(user, 'order.view');

    const storeModel = require('../models/storeModel');
    const { ACCOUNT_LEVELS } = require('../config/permissions');

    let stores = [];

    if (user.account_level === ACCOUNT_LEVELS.PLATFORM) {
      // 平台级用户可以看到所有门店（只显示启用状态）
      stores = await storeModel.findAllWithCompanyInfo({ status: '正常' });
    } else if (user.account_level === ACCOUNT_LEVELS.COMPANY) {
      // 公司级用户只能看到本公司的门店（只显示启用状态）
      if (!user.company_id) {
        throw new Error('权限不足');
      }
      stores = await storeModel.findByCompanyId(user.company_id, { status: '正常' });
    } else {
      // 门店级用户只能看到关联的门店（只显示启用状态）
      if (!user.company_id) {
        throw new Error('权限不足');
      }
      stores = await storeModel.getAccessibleStores(
        user.user_id, 
        user.account_level, 
        user.company_id,
        { status: '正常' }
      );
    }

    return stores;
  }

  // 🆕 获取增强的门店资源（包含房间占用情况）
  async getEnhancedStoreResources(storeId, user, options = {}) {
    await PermissionChecker.requirePermission(user, 'order.view');

    // 🔧 修复：基于账户层级检查数据访问权限
    if (user.account_level === 'store' && user.store_id && user.store_id !== storeId) {
      throw new Error('权限不足：无法访问该门店的资源');
    }
    
    // 公司级用户需要验证门店是否属于其公司
    if (user.account_level === 'company') {
      const storeModel = require('../models/storeModel');
      const store = await storeModel.findById(storeId);
      if (!store || store.company_id !== user.company_id) {
        throw new Error('权限不足：无法访问该门店的资源');
      }
    }

    const resources = await this.model.getStoreResources(storeId);
    
    // 如果需要房间占用信息
    if (options.includeRoomOccupancy && options.date) {
      for (let room of resources.rooms) {
        room.occupancy = await this.model.getRoomOccupancyByDate(
          room.id, 
          options.date
        );
      }
    }

    return resources;
  }

  // 🆕 获取房间占用情况
  async getRoomOccupancy(storeId, roomId, timeSlot, user) {
    await PermissionChecker.requirePermission(user, 'order.view');

    // 🔧 修复：基于账户层级检查数据访问权限
    if (user.account_level === 'store' && user.store_id && user.store_id !== storeId) {
      throw new Error('权限不足：无法访问该门店的房间');
    }
    
    // 公司级用户需要验证门店是否属于其公司
    if (user.account_level === 'company') {
      const storeModel = require('../models/storeModel');
      const store = await storeModel.findById(storeId);
      if (!store || store.company_id !== user.company_id) {
        throw new Error('权限不足：无法访问该门店的房间');
      }
    }

    if (timeSlot.date && timeSlot.start_time && timeSlot.end_time) {
      // 检查特定时间段的占用情况
      return await this.model.checkRoomTimeSlot(
        roomId, 
        timeSlot.date, 
        timeSlot.start_time, 
        timeSlot.end_time
      );
    } else if (timeSlot.date) {
      // 获取整天的占用情况
      return await this.model.getRoomOccupancyByDate(roomId, timeSlot.date);
    } else {
      throw new Error('请提供日期信息');
    }
  }

  // 🆕 检查房间可用性
  async checkRoomAvailability(storeId, roomId, timeSlot, user) {
    await PermissionChecker.requirePermission(user, 'order.view');

    // 🔧 修复：基于账户层级检查数据访问权限
    if (user.account_level === 'store' && user.store_id && user.store_id !== storeId) {
      throw new Error('权限不足：无法访问该门店的房间');
    }
    
    // 公司级用户需要验证门店是否属于其公司
    if (user.account_level === 'company') {
      const storeModel = require('../models/storeModel');
      const store = await storeModel.findById(storeId);
      if (!store || store.company_id !== user.company_id) {
        throw new Error('权限不足：无法访问该门店的房间');
      }
    }

    const { date, start_time, end_time, exclude_order_id } = timeSlot;

    // 检查房间是否存在
    const roomModel = require('../models/roomModel');
    const room = await roomModel.findById(roomId);
    
    if (!room) {
      throw new Error('房间不存在');
    }

    if (room.store_id !== storeId) {
      throw new Error('房间不属于指定门店');
    }

    // 检查时间冲突
    const conflicts = await this.model.checkRoomTimeConflicts(
      roomId, 
      date, 
      start_time, 
      end_time, 
      exclude_order_id
    );

    return {
      room_id: roomId,
      room_name: room.name,
      date: date,
      time_slot: `${start_time} - ${end_time}`,
      is_available: conflicts.length === 0,
      conflicts: conflicts,
      room_status: room.status
    };
  }

  // 上传订单图片
  async uploadImages(orderId, images, user) {
    await PermissionChecker.requirePermission(user, 'order.manage');

    const order = await this.getById(orderId, user);
    if (!order) {
      throw new Error('订单不存在或无权限访问');
    }

    // 验证图片数量
    const currentImages = order.images || [];
    if (currentImages.length + images.length > 10) {
      throw new Error('最多只能上传10张图片');
    }

    // 更新订单图片
    const allImages = [...currentImages, ...images];
    await this.model.update(orderId, { images: allImages });

    return { success: true, images: allImages };
  }

  // 删除订单图片
  async deleteImage(orderId, imageId, user) {
    await PermissionChecker.requirePermission(user, 'order.manage');

    const order = await this.getById(orderId, user);
    if (!order) {
      throw new Error('订单不存在或无权限访问');
    }

    const images = order.images || [];
    const imageIndex = images.findIndex(img => img.id === imageId);
    
    if (imageIndex === -1) {
      throw new Error('图片不存在');
    }

    const imageToDelete = images[imageIndex];
    
    // 从数组中移除图片
    images.splice(imageIndex, 1);
    
    // 更新订单图片
    await this.model.update(orderId, { images: images });

    // 删除文件
    const filename = imageToDelete.image_url.split('/').pop();
    deleteFile(filename, 'order');

    return { success: true, images: images };
  }

  // 验证订单数据
  validateOrderData(data) {
    const { 
      order_type, customer_name, customer_phone, player_count, 
      order_date, start_time, end_time, booking_type, payment_status,
      total_amount, store_id, language, game_host_id, free_pay, payment_method,
      pic_id, pic_payment, promo_quantity
    } = data;
    
    if (!order_type || !['剧本杀', '密室'].includes(order_type)) {
      throw new Error('订单类型必须是剧本杀或密室');
    }
    
    if (!customer_name || customer_name.trim().length === 0) {
      throw new Error('客户姓名不能为空');
    }
    
    // 🆕 客户电话改为非必填，但如果填写则需要验证格式
    if (customer_phone && customer_phone.trim().length > 0) {
      const phonePattern = /^[\d\-\+\(\)\s]+$/;
      if (!phonePattern.test(customer_phone.trim())) {
        throw new Error('客户电话格式不正确');
      }
    }
    
    if (!player_count || isNaN(player_count) || player_count < 1) {
      throw new Error('玩家人数必须大于0');
    }
    
    if (!order_date) {
      throw new Error('订单日期不能为空');
    }
    
    if (!start_time) {
      throw new Error('开始时间不能为空');
    }
    
    if (!end_time) {
      throw new Error('结束时间不能为空');
    }
    
    if (!booking_type) {
      throw new Error('预订类型不能为空');
    }
    
    if (!payment_status) {
      throw new Error('支付状态不能为空');
    }
    
    if (!store_id) {
      throw new Error('门店不能为空');
    }

    // 🆕 验证新增字段
    if (!language) {
      throw new Error('客户语言不能为空');
    }
    
    if (!['CN', 'EN', 'IND'].includes(language)) {
      throw new Error('客户语言必须是CN、EN或IND');
    }
    
    if (!game_host_id) {
      throw new Error('Game Host不能为空');
    }
    
    // 🆕 PIC为选填字段，如果填写则验证是否为有效用户ID
    if (pic_id && (typeof pic_id !== 'string' || pic_id.trim().length === 0)) {
      throw new Error('PIC选择无效');
    }
    
    // 🆕 PIC Payment改为文本字段，选填
    if (pic_payment && (typeof pic_payment !== 'string' || pic_payment.trim().length > 100)) {
      throw new Error('PIC Payment长度不能超过100个字符');
    }
    
    if (!free_pay || !['Free', 'Pay'].includes(free_pay)) {
      throw new Error('Free/Pay必须是Free或Pay');
    }
    
    if (!['FULL', 'Not Yet', 'DP', 'Free'].includes(payment_status)) {
      throw new Error('Payment状态必须是FULL、Not Yet、DP或Free');
    }
    
    if (!['Booking', 'Walk In', 'Traveloka', 'Tiket.com', 'Gamehost/Staff Booking', 'MyValue（Gramedia）', 'Promo', 'Group Booking', 'Online Booking', 'Phone Booking'].includes(booking_type)) {
      throw new Error('预订类型选项无效');
    }
    
    // 🆕 只有付费订单才需要验证付款方式
    if (free_pay === 'Pay' && (!payment_method || !['Bank Transfer', 'QR BCA', 'DEBIT', 'CC'].includes(payment_method))) {
      throw new Error('付款方式必须是Bank Transfer、QR BCA、DEBIT或CC');
    }

    // 🆕 验证Qty Promo字段（选填，但如果填写需要验证）
    if (promo_quantity !== undefined && promo_quantity !== null) {
      if (isNaN(promo_quantity) || promo_quantity < 0) {
        throw new Error('促销数量不能为负数');
      }
      if (promo_quantity > 1000) {
        throw new Error('促销数量不能超过1000');
      }
    }

    // 验证剧本杀专用字段
    if (order_type === '剧本杀') {
      if (!data.script_id) {
        throw new Error('剧本杀订单必须选择剧本');
      }
    }

    // 验证密室专用字段
    if (order_type === '密室') {
      if (!data.escape_room_id) {
        throw new Error('密室订单必须选择密室主题');
      }
    }

    // 验证时间逻辑
    if (start_time && end_time) {
      const startDate = new Date(`2000-01-01T${start_time}`);
      const endDate = new Date(`2000-01-01T${end_time}`);
      
      if (endDate <= startDate) {
        throw new Error('结束时间必须晚于开始时间');
      }
    }

    // 验证金额
    if (total_amount !== undefined && (isNaN(total_amount) || total_amount < 0)) {
      throw new Error('订单金额不能为负数');
    }

    // 🆕 验证金额上限（根据数据库DECIMAL(15,2)限制）
    if (total_amount !== undefined && total_amount >= 10000000000000) {
      throw new Error('订单金额不能超过9,999,999,999,999.99');
    }
  }

  // 🆕 获取可预订项目统一列表（剧本+密室混合）
  async getBookingItems(itemType = 'all', filters = {}, user) {
    try {
      // 权限验证
      await PermissionChecker.requirePermission(user, 'order.view');
      
      // 提取搜索关键词
      const searchKeyword = filters.keyword ? filters.keyword.trim() : null;

      const results = {
        scripts: [],
        escape_rooms: [],
        categories: {
          script_types: [],
          escape_room_horror_levels: []
        }
      };

      // 根据用户权限确定查询范围
      const { companyId, storeIds } = await this.getUserScope(user);

      // 获取剧本杀列表
      if (itemType === 'all' || itemType === 'script') {
        if (user.account_level === ACCOUNT_LEVELS.STORE) {
          // 门店级用户：获取公司的所有启用剧本，然后过滤用户可访问的门店
          const scriptModel = require('../models/scriptModel');
          const searchFilters = { 
            is_active: true, // 🔧 只查询启用的剧本
            ...(searchKeyword ? { keyword: searchKeyword } : {}),
            // 🆕 添加更多筛选条件
            ...(filters.min_players ? { min_players: filters.min_players } : {}),
            ...(filters.max_players ? { max_players: filters.max_players } : {}),
            ...(filters.min_price ? { min_price: filters.min_price } : {}),
            ...(filters.max_price ? { max_price: filters.max_price } : {}),
            ...(filters.script_types && filters.script_types.length > 0 ? { types: filters.script_types } : {})
          };
          // 添加门店筛选
          if (filters.store_id) {
            searchFilters.store_id = filters.store_id;
          }
          const allScripts = await scriptModel.findByCompanyId(companyId, searchFilters);
          
          // 使用Set去重，避免同一个剧本重复出现
          const uniqueScripts = new Map();
          
          for (const script of allScripts) {
            // 获取该剧本的门店配置
            const storeConfigs = await scriptModel.getScriptStoreConfigs(script.id);
            let availableStores = storeConfigs.filter(config => 
              config.is_available && storeIds.includes(config.store_id)
            );
            
            // 如果指定了门店筛选，进一步过滤
            if (filters.store_id) {
              availableStores = availableStores.filter(config => 
                config.store_id === filters.store_id
              );
            }
            
            if (availableStores.length > 0) {
              // 如果已经存在该剧本，合并门店信息
              if (uniqueScripts.has(script.id)) {
                const existingScript = uniqueScripts.get(script.id);
                existingScript.store_count += availableStores.length;
                existingScript.store_names.push(...availableStores.map(s => s.store_name));
              } else {
                // 添加门店统计信息
                script.store_count = availableStores.length;
                script.store_names = availableStores.map(s => s.store_name);
                uniqueScripts.set(script.id, script);
              }
            }
          }
          
          results.scripts = Array.from(uniqueScripts.values());
        } else {
          // 公司级以上用户：获取公司的所有启用剧本
          const scriptModel = require('../models/scriptModel');
          const searchFilters = { 
            is_active: true, // 🔧 只查询启用的剧本
            ...(searchKeyword ? { keyword: searchKeyword } : {}),
            // 🆕 添加更多筛选条件
            ...(filters.min_players ? { min_players: filters.min_players } : {}),
            ...(filters.max_players ? { max_players: filters.max_players } : {}),
            ...(filters.min_price ? { min_price: filters.min_price } : {}),
            ...(filters.max_price ? { max_price: filters.max_price } : {}),
            ...(filters.script_types && filters.script_types.length > 0 ? { types: filters.script_types } : {})
          };
          // 添加门店筛选
          if (filters.store_id) {
            searchFilters.store_id = filters.store_id;
          }
          const scripts = await scriptModel.findByCompanyId(companyId, searchFilters);
          
          // 为每个剧本添加门店统计信息
          for (const script of scripts) {
            const storeConfigs = await scriptModel.getScriptStoreConfigs(script.id);
            let availableStores = storeConfigs.filter(config => config.is_available);
            
            // 如果指定了门店筛选，进一步过滤
            if (filters.store_id) {
              availableStores = availableStores.filter(config => 
                config.store_id === filters.store_id
              );
            }
            
            script.store_count = availableStores.length;
            script.store_names = availableStores.map(s => s.store_name);
          }
          
          results.scripts = scripts || [];
        }

        // 获取剧本类型分类
        results.categories.script_types = await this.getScriptTypes(companyId);
      }

      // 获取密室列表
      if (itemType === 'all' || itemType === 'escape_room') {
        if (user.account_level === ACCOUNT_LEVELS.STORE) {
          // 门店级用户：获取公司的所有启用密室，然后过滤用户可访问的门店
          const escapeRoomModel = require('../models/escapeRoomModel');
          const searchFilters = { 
            is_active: true, // 🔧 只查询启用的密室
            ...(searchKeyword ? { keyword: searchKeyword } : {}),
            // 🆕 添加更多筛选条件
            ...(filters.min_players ? { min_players: filters.min_players } : {}),
            ...(filters.max_players ? { max_players: filters.max_players } : {}),
            ...(filters.min_price ? { min_price: filters.min_price } : {}),
            ...(filters.max_price ? { max_price: filters.max_price } : {}),
            ...(filters.horror_levels && filters.horror_levels.length > 0 ? { horror_levels: filters.horror_levels } : {})
          };
          // 添加门店筛选
          if (filters.store_id) {
            searchFilters.store_id = filters.store_id;
          }
          const allEscapeRooms = await escapeRoomModel.findByCompanyId(companyId, searchFilters);
          
          // 使用Set去重，避免同一个密室重复出现
          const uniqueEscapeRooms = new Map();
          
          for (const escapeRoom of allEscapeRooms) {
            // 获取该密室的门店配置
            const storeConfigs = await escapeRoomModel.getEscapeRoomStoreConfigs(escapeRoom.id);
            let availableStores = storeConfigs.filter(config => 
              config.is_available && storeIds.includes(config.store_id)
            );
            
            // 如果指定了门店筛选，进一步过滤
            if (filters.store_id) {
              availableStores = availableStores.filter(config => 
                config.store_id === filters.store_id
              );
            }
            
            if (availableStores.length > 0) {
              // 如果已经存在该密室，合并门店信息
              if (uniqueEscapeRooms.has(escapeRoom.id)) {
                const existingEscapeRoom = uniqueEscapeRooms.get(escapeRoom.id);
                existingEscapeRoom.store_count += availableStores.length;
                existingEscapeRoom.store_names.push(...availableStores.map(s => s.store_name));
              } else {
                // 添加门店统计信息
                escapeRoom.store_count = availableStores.length;
                escapeRoom.store_names = availableStores.map(s => s.store_name);
                uniqueEscapeRooms.set(escapeRoom.id, escapeRoom);
              }
            }
          }
          
          results.escape_rooms = Array.from(uniqueEscapeRooms.values());
        } else {
          // 公司级以上用户：获取公司的所有启用密室
          const escapeRoomModel = require('../models/escapeRoomModel');
          const searchFilters = { 
            is_active: true, // 🔧 只查询启用的密室
            ...(searchKeyword ? { keyword: searchKeyword } : {}),
            // 🆕 添加更多筛选条件
            ...(filters.min_players ? { min_players: filters.min_players } : {}),
            ...(filters.max_players ? { max_players: filters.max_players } : {}),
            ...(filters.min_price ? { min_price: filters.min_price } : {}),
            ...(filters.max_price ? { max_price: filters.max_price } : {}),
            ...(filters.horror_levels && filters.horror_levels.length > 0 ? { horror_levels: filters.horror_levels } : {})
          };
          // 添加门店筛选
          if (filters.store_id) {
            searchFilters.store_id = filters.store_id;
          }
          const escapeRooms = await escapeRoomModel.findByCompanyId(companyId, searchFilters);
          
          // 为每个密室添加门店统计信息
          for (const escapeRoom of escapeRooms) {
            const storeConfigs = await escapeRoomModel.getEscapeRoomStoreConfigs(escapeRoom.id);
            let availableStores = storeConfigs.filter(config => config.is_available);
            
            // 如果指定了门店筛选，进一步过滤
            if (filters.store_id) {
              availableStores = availableStores.filter(config => 
                config.store_id === filters.store_id
              );
            }
            
            escapeRoom.store_count = availableStores.length;
            escapeRoom.store_names = availableStores.map(s => s.store_name);
          }
          
          results.escape_rooms = escapeRooms || [];
        }

        // 获取恐怖等级分类
        results.categories.escape_room_horror_levels = await this.getEscapeRoomHorrorLevels(companyId);
      }

      // 统一格式化数据
      const formattedItems = [];

      // 格式化剧本杀数据
      results.scripts.forEach(script => {
        formattedItems.push({
          id: script.id,
          type: 'script',
          name: script.name,
          cover_image: script.images && script.images.length > 0 ? script.images[0] : null,
          images: script.images || [],
          min_players: script.min_players,
          max_players: script.max_players,
          duration: script.duration,
          price: script.store_price || script.price,
          category: script.type,
          secondary_category: script.background,
          difficulty: script.difficulty,
          tags: script.tags || [],
          description: script.description,
          props: script.props,
          store_count: script.store_count || 0,
          store_names: script.store_names || []
        });
      });

      // 格式化密室数据
      results.escape_rooms.forEach(escapeRoom => {
        // 处理密室图片数组，确保正确解析
        let coverImages = [];
        if (escapeRoom.cover_images) {
          if (typeof escapeRoom.cover_images === 'string') {
            try {
              coverImages = JSON.parse(escapeRoom.cover_images);
            } catch (e) {
              console.warn('密室图片JSON解析失败:', e);
              coverImages = [];
            }
          } else if (Array.isArray(escapeRoom.cover_images)) {
            coverImages = escapeRoom.cover_images;
          }
        }

        formattedItems.push({
          id: escapeRoom.id,
          type: 'escape_room',
          name: escapeRoom.name,
          cover_image: coverImages.length > 0 ? coverImages[0] : null,
          images: coverImages,
          min_players: escapeRoom.min_players,
          max_players: escapeRoom.max_players,
          duration: escapeRoom.duration,
          price: escapeRoom.store_price || escapeRoom.price,
          category: escapeRoom.horror_level,
          npc_count: escapeRoom.npc_count,
          npc_roles: escapeRoom.npc_roles,
          description: escapeRoom.description,
          props: escapeRoom.props,
          store_count: escapeRoom.store_count || 0,
          store_names: escapeRoom.store_names || []
        });
      });

      return {
        items: formattedItems,
        categories: results.categories,
        total: formattedItems.length
      };
    } catch (error) {
      console.error('获取可预订项目失败:', error);
      throw error;
    }
  }

  // 🆕 获取预订项目详情页数据
  async getBookingItemDetail(itemType, itemId, user) {
    try {
      // 权限验证
      await PermissionChecker.requirePermission(user, 'order.view');

      let itemDetail = null;
      let availableStores = [];

      if (itemType === 'script') {
        const scriptModel = require('../models/scriptModel');
        itemDetail = await scriptModel.findById(itemId);
        if (!itemDetail) {
          throw new Error('剧本不存在');
        }
        
        // 获取门店配置信息
        const storeScripts = await scriptModel.getScriptStoreConfigs(itemId);
        availableStores = storeScripts.filter(config => config.is_available);
      } else if (itemType === 'escape_room') {
        const escapeRoomModel = require('../models/escapeRoomModel');
        itemDetail = await escapeRoomModel.findById(itemId);
        if (!itemDetail) {
          throw new Error('密室不存在');
        }
        
        // 获取门店配置信息
        const storeEscapeRooms = await escapeRoomModel.getEscapeRoomStoreConfigs(itemId);
        availableStores = storeEscapeRooms.filter(config => config.is_available);
      } else {
        throw new Error('无效的项目类型');
      }

      // 根据用户权限过滤门店
      const userStores = await this.getAvailableStores(user);
      const filteredStores = availableStores.filter(store => 
        userStores.some(userStore => userStore.id === store.store_id)
      );

      // 为每个门店获取房间信息
      for (const store of filteredStores) {
        const storeDetail = userStores.find(us => us.id === store.store_id);
        store.store_name = storeDetail?.name;
        store.store_address = storeDetail?.address;
        store.store_status = storeDetail?.is_active ? '正常' : '已停业'; // 添加门店状态
        
        // 获取门店房间列表
        const rooms = await orderModel.getStoreResources(store.store_id);
        store.rooms = rooms.rooms || [];
      }

      // 🆕 智能判断是否需要显示门店选择
      let needStoreSelection = true;
      let autoSelectedStore = null;

      // 情况1：用户只能访问一个门店（门店级用户且只关联一个门店）
      if (userStores.length === 1) {
        needStoreSelection = false;
        autoSelectedStore = filteredStores.find(store => 
          store.store_id === userStores[0].id
        );
      }
      // 情况2：该项目只在一个门店上架
      else if (filteredStores.length === 1) {
        needStoreSelection = false;
        autoSelectedStore = filteredStores[0];
      }
      // 情况3：多个门店但用户是公司级或门店级关联多个门店，需要选择
      else {
        needStoreSelection = true;
      }

      return {
        item: itemDetail,
        available_stores: filteredStores,
        item_type: itemType,
        // 🆕 新增字段
        need_store_selection: needStoreSelection,
        auto_selected_store: autoSelectedStore,
        total_user_stores: userStores.length,
        total_item_stores: filteredStores.length
      };
    } catch (error) {
      console.error('获取项目详情失败:', error);
      throw error;
    }
  }

  // 🆕 获取门店房间时间表
  async getStoreRoomSchedule(storeId, date, options = {}, user) {
    try {
      // 权限验证
      await PermissionChecker.requirePermission(user, 'order.view');
      
      // 验证门店访问权限
      const availableStores = await this.getAvailableStores(user);
      if (!availableStores.some(store => store.id === storeId)) {
        throw new Error('权限不足');
      }

      // 获取门店房间列表（已在getStoreResources中过滤关闭状态的房间）
      const storeResources = await orderModel.getStoreResources(storeId);
      let rooms = storeResources.rooms || [];

      // 根据项目类型过滤房间
      if (options.item_type) {
        if (options.item_type === 'script') {
          // 剧本杀：显示剧本杀房间和混合房间
          rooms = rooms.filter(room => 
            room.room_type === '剧本杀' || room.room_type === '混合'
          );
        } else if (options.item_type === 'escape_room') {
          // 密室：显示密室房间和混合房间
          rooms = rooms.filter(room => 
            room.room_type === '密室' || room.room_type === '混合'
          );
        }
      }

      // 为每个房间获取当天的占用情况
      const schedule = [];
      for (const room of rooms) {
        const occupancy = await orderModel.getRoomOccupancyByDate(room.id, date);
        
        // 生成时间段建议（9:00-23:00，每2小时一个时间段）
        const timeSlots = this.generateTimeSlots(room, occupancy, options);
        
        // 处理房间图片（现在从 room_images 表获取）
        let roomImages = [];
        if (room.images && Array.isArray(room.images)) {
          roomImages = room.images.filter(img => img); // 过滤空值
        }

        // 优先使用主图，如果没有主图则使用第一张图片
        let coverImage = room.primary_image || (roomImages.length > 0 ? roomImages[0] : null);

        schedule.push({
          room_id: room.id,
          room_name: room.name,
          room_type: room.room_type,
          capacity: room.capacity,
          status: room.status,
          images: roomImages,
          cover_image: coverImage,
          current_orders: occupancy,
          available_time_slots: timeSlots
        });
      }

      return {
        store_id: storeId,
        date: date,
        rooms: schedule
      };
    } catch (error) {
      console.error('获取房间时间表失败:', error);
      throw error;
    }
  }

  // 🆕 预检查预订可用性
  async preCheckBooking(bookingData, user) {
    try {
      // 权限验证
      await PermissionChecker.requirePermission(user, 'order.create');
      
      const { store_id, room_id, item_type, item_id, date, start_time, end_time } = bookingData;

      // 检查房间时间冲突
      const conflicts = await orderModel.checkRoomTimeConflicts(
        room_id, date, start_time, end_time
      );

      if (conflicts.length > 0) {
        return {
          is_available: false,
          conflicts: conflicts,
          conflict_details: conflicts.map(conflict => ({
            order_id: conflict.id,
            customer_name: conflict.customer_name,
            order_type: conflict.order_type,
            start_time: conflict.start_time,
            end_time: conflict.end_time,
            status: conflict.status
          })),
          message: '选择的时间段已被占用'
        };
      }

      // 获取项目信息和价格
      let itemInfo = null;
      let finalPrice = 0;

      if (item_type === 'script') {
        const scriptModel = require('../models/scriptModel');
        const storeScripts = await scriptModel.findByStoreId(store_id);
        itemInfo = storeScripts.find(s => s.id === item_id);
        finalPrice = itemInfo?.store_price || itemInfo?.price || 0;
      } else if (item_type === 'escape_room') {
        const escapeRoomModel = require('../models/escapeRoomModel');
        const storeEscapeRooms = await escapeRoomModel.findByStoreId(store_id);
        itemInfo = storeEscapeRooms.find(er => er.id === item_id);
        finalPrice = itemInfo?.store_price || itemInfo?.price || 0;
      }

      if (!itemInfo) {
        throw new Error('选择的项目在该门店不可用');
      }

      return {
        is_available: true,
        item_info: itemInfo,
        final_price: finalPrice,
        booking_info: {
          store_id,
          room_id,
          item_type,
          item_id,
          date,
          start_time,
          end_time
        }
      };
    } catch (error) {
      console.error('预检查失败:', error);
      throw error;
    }
  }

  // 🆕 检查自定义时间段可用性
  async checkCustomTimeSlot(storeId, roomId, date, startTime, endTime, user) {
    try {
      // 权限验证
      await PermissionChecker.requirePermission(user, 'order.view');
      
      // 验证门店访问权限
      const availableStores = await this.getAvailableStores(user);
      if (!availableStores.some(store => store.id === storeId)) {
        throw new Error('权限不足');
      }

      // 检查时间冲突
      const conflicts = await orderModel.checkRoomTimeConflicts(
        roomId, date, startTime, endTime
      );

      return {
        room_id: roomId,
        date: date,
        start_time: startTime,
        end_time: endTime,
        is_available: conflicts.length === 0,
        conflicts: conflicts,
        conflict_details: conflicts.map(conflict => ({
          order_id: conflict.id,
          customer_name: conflict.customer_name,
          order_type: conflict.order_type,
          start_time: conflict.start_time,
          end_time: conflict.end_time,
          status: conflict.status
        }))
      };
    } catch (error) {
      console.error('检查自定义时间段失败:', error);
      throw error;
    }
  }

  // 🆕 辅助方法：生成时间段建议
  generateTimeSlots(room, occupancy, options = {}) {
    const slots = [];
    const startHour = 9;
    const endHour = 23;
    const slotDuration = 2; // 2小时为一个时间段

    // 生成固定时间段
    for (let hour = startHour; hour < endHour; hour += slotDuration) {
      const startTime = `${hour.toString().padStart(2, '0')}:00`;
      const endTime = `${(hour + slotDuration).toString().padStart(2, '0')}:00`;
      
      // 检查这个时间段是否被占用
      const conflictingOrders = occupancy.filter(order => {
        const orderStart = order.start_time;
        const orderEnd = order.end_time;
        return (startTime < orderEnd && endTime > orderStart);
      });

      const isOccupied = conflictingOrders.length > 0;

      slots.push({
        start_time: startTime,
        end_time: endTime,
        is_available: !isOccupied,
        slot_type: 'fixed', // 固定时间段
        occupied_by: isOccupied ? conflictingOrders[0] : null,
        conflicting_orders: conflictingOrders
      });
    }

    // 添加自定义时间段提示
    slots.push({
      start_time: 'custom',
      end_time: 'custom',
      is_available: true,
      slot_type: 'custom', // 自定义时间段
      occupied_by: null,
      conflicting_orders: []
    });

    return slots;
  }

  // 🆕 辅助方法：获取剧本类型列表
  async getScriptTypes(companyId) {
    const query = `
      SELECT DISTINCT type, COUNT(*) as count
      FROM scripts 
      WHERE company_id = $1 AND is_active = true
      GROUP BY type
      ORDER BY count DESC, type ASC
    `;
    
    const result = await pool.query(query, [companyId]);
    return result.rows;
  }

  // 🆕 辅助方法：获取密室恐怖等级列表
  async getEscapeRoomHorrorLevels(companyId) {
    const query = `
      SELECT horror_level, COUNT(*) as count,
        CASE horror_level 
          WHEN '非恐' THEN 1 
          WHEN '微恐' THEN 2 
          WHEN '中恐' THEN 3 
          WHEN '重恐' THEN 4 
          ELSE 5
        END as sort_order
      FROM escape_rooms 
      WHERE company_id = $1 AND is_active = true
      GROUP BY horror_level
      ORDER BY sort_order ASC, count DESC
    `;
    
    const result = await pool.query(query, [companyId]);
    return result.rows;
  }

  // 🆕 辅助方法：获取用户权限范围
  async getUserScope(user) {
    let companyId = null;
    let storeIds = [];

    if (user.account_level === ACCOUNT_LEVELS.PLATFORM) {
      // 平台级用户：可以访问所有数据，但需要指定公司
      companyId = user.company_id; // 可能为null，表示所有公司
    } else if (user.account_level === ACCOUNT_LEVELS.COMPANY) {
      // 公司级用户：只能访问本公司数据
      companyId = user.company_id;
      if (!companyId) {
        throw new Error('公司级用户必须关联公司');
      }
    } else if (user.account_level === ACCOUNT_LEVELS.STORE) {
      // 门店级用户：只能访问关联的门店数据
      companyId = user.company_id;
      if (!companyId) {
        throw new Error('门店级用户必须关联公司');
      }
      
      // 获取用户可访问的门店列表
      const storeModel = require('../models/storeModel');
      const accessibleStores = await storeModel.getAccessibleStores(
        user.user_id, 
        user.account_level, 
        user.company_id
      );
      storeIds = accessibleStores.map(store => store.id);
    }

    return { companyId, storeIds };
  }

  // 🆕 导出订单
  async exportOrders(query, user) {
    // 检查查看权限
    await PermissionChecker.requirePermission(user, 'order.view');

    const { company_id } = user;
    
    // 处理筛选条件
    const processedFilters = {
      store_id: query.store_id,
      order_type: query.order_type,
      status: query.status,
      payment_status: query.payment_status,
      booking_type: query.booking_type,
      language: query.language,
      start_date: query.start_date,
      end_date: query.end_date,
      customer_name: query.customer_name ? query.customer_name.trim() : undefined,
      customer_phone: query.customer_phone ? query.customer_phone.trim() : undefined
    };

    // 移除undefined值
    Object.keys(processedFilters).forEach(key => {
      if (processedFilters[key] === undefined) {
        delete processedFilters[key];
      }
    });

    // 获取所有订单数据（不分页）
    const orders = await this.model.findByCompanyId(company_id, processedFilters);

    // 格式化数据
    const formattedOrders = orders.map(order => {
      const formatted = this.formatTimeFields(order, user.user_timezone);
      // 确保 images 是数组
      if (formatted.images && !Array.isArray(formatted.images)) {
        formatted.images = [];
      }
      return formatted;
    });

    // 生成Excel文件
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('订单列表');

    // 定义列标题
    const columns = [
      { header: '订单编号', key: 'id', width: 30 },
      { header: '订单类型', key: 'order_type', width: 12 },
      { header: '订单日期', key: 'order_date', width: 12 },
      { header: '星期', key: 'weekday', width: 8 },
      { header: '开始时间', key: 'start_time', width: 10 },
      { header: '结束时间', key: 'end_time', width: 10 },
      { header: '时长(分钟)', key: 'duration', width: 12 },
      { header: '客户姓名', key: 'customer_name', width: 15 },
      { header: '客户电话', key: 'customer_phone', width: 15 },
      { header: '玩家人数', key: 'player_count', width: 10 },
      { header: '客户语言', key: 'language', width: 10 },
      { header: '内部补位', key: 'internal_support', width: 10 },
      { header: '门店名称', key: 'store_name', width: 20 },
      { header: '房间名称', key: 'room_name', width: 15 },
      { header: '剧本名称', key: 'script_name', width: 20 },
      { header: '密室名称', key: 'escape_room_name', width: 20 },
      { header: 'Game Host', key: 'game_host_name', width: 15 },
      { header: 'NPC', key: 'npc_name', width: 15 },
      { header: 'PIC负责人', key: 'pic_name', width: 15 },
      { header: 'PIC Payment', key: 'pic_payment', width: 15 },
      { header: '预订类型', key: 'booking_type', width: 20 },
      { header: '是否免费', key: 'is_free', width: 10 },
      { header: '单价', key: 'unit_price', width: 12 },
      { header: '总金额', key: 'total_amount', width: 12 },
      { header: '支付状态', key: 'payment_status', width: 12 },
      { header: '付款方式', key: 'payment_method', width: 15 },
      { header: '付款日期', key: 'payment_date', width: 12 },
      { header: '优惠码', key: 'promo_code', width: 15 },
      { header: '优惠数量', key: 'promo_quantity', width: 10 },
      { header: '优惠折扣', key: 'promo_discount', width: 12 },
      { header: '是否拼团', key: 'is_group_booking', width: 10 },
      { header: '包含拍照', key: 'include_photos', width: 10 },
      { header: '包含监控', key: 'include_cctv', width: 10 },
      { header: '备注', key: 'notes', width: 30 },
      { header: '订单状态', key: 'status', width: 12 },
      { header: '创建时间', key: 'created_at', width: 20 },
      { header: '创建人', key: 'created_by_name', width: 15 },
      { header: '更新时间', key: 'updated_at', width: 20 },
      { header: '更新人', key: 'updated_by_name', width: 15 },
      { header: '付款凭证数量', key: 'image_count', width: 12 }
    ];

    worksheet.columns = columns;

    // 设置表头样式
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6F3FF' }
    };

    // 添加数据
    formattedOrders.forEach(order => {
      const rowData = {
        id: order.id,
        order_type: order.order_type,
        order_date: order.order_date,
        weekday: order.weekday,
        start_time: order.start_time,
        end_time: order.end_time,
        duration: order.duration,
        customer_name: order.customer_name,
        customer_phone: order.customer_phone || '',
        player_count: order.player_count,
        language: this.getLanguageText(order.language),
        internal_support: order.internal_support ? '是' : '否',
        store_name: order.store_name || '',
        room_name: order.room_name || '',
        script_name: order.script_name || '',
        escape_room_name: order.escape_room_name || '',
        game_host_name: order.game_host_name || '',
        npc_name: order.npc_name || '',
        pic_name: order.pic_name || '',
        pic_payment: order.pic_payment || '',
        booking_type: order.booking_type,
        is_free: order.is_free ? '是' : '否',
        unit_price: order.unit_price || 0,
        total_amount: order.total_amount || 0,
        payment_status: order.payment_status,
        payment_method: order.payment_method || '',
        payment_date: order.payment_date || '',
        promo_code: order.promo_code || '',
        promo_quantity: order.promo_quantity || '',
        promo_discount: order.promo_discount || 0,
        is_group_booking: order.is_group_booking ? '是' : '否',
        include_photos: order.include_photos ? '是' : '否',
        include_cctv: order.include_cctv ? '是' : '否',
        notes: order.notes || '',
        status: this.getStatusText(order.status),
        created_at: order.created_at,
        created_by_name: order.created_by_name || '',
        updated_at: order.updated_at || '',
        updated_by_name: order.updated_by_name || '',
        image_count: order.images ? order.images.length : 0
      };

      worksheet.addRow(rowData);
    });

    // 自动调整列宽
    worksheet.columns.forEach(column => {
      if (column.key === 'notes') {
        column.width = 50; // 备注列设置更宽
      }
    });

    // 生成buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  }

  // 辅助方法：获取语言文本
  getLanguageText(language) {
    const languageMap = {
      'CN': '中文',
      'EN': '英语',
      'IND': '印尼语'
    };
    return languageMap[language] || language;
  }

  // 辅助方法：获取状态文本
  getStatusText(status) {
    const texts = {
      'pending': '待确认',
      'confirmed': '已确认',
      'in_progress': '进行中',
      'completed': '已完成',
      'cancelled': '已取消'
    };
    return texts[status] || status;
  }

  // 🆕 计算时长（分钟）
  calculateDuration(startTime, endTime) {
    try {
      // 将时间字符串转换为Date对象进行计算
      const baseDate = '2000-01-01'; // 使用固定日期，只关心时间部分
      const start = new Date(`${baseDate}T${startTime}:00`);
      const end = new Date(`${baseDate}T${endTime}:00`);
      
      // 处理跨天情况（如23:00-01:00）
      if (end < start) {
        end.setDate(end.getDate() + 1);
      }
      
      // 计算时间差（毫秒），转换为分钟
      const diffMs = end.getTime() - start.getTime();
      const diffMinutes = Math.round(diffMs / (1000 * 60));
      
      return diffMinutes;
    } catch (error) {
      console.error('计算时长失败:', error);
      return null;
    }
  }

  // 🆕 清理数据字段，只保留数据库表中存在的字段
  cleanOrderData(data) {
    // 定义数据库表中存在的字段
    const validFields = [
      'company_id', 'store_id', 'room_id', 'order_type', 'order_date', 'weekday', 'language',
      'start_time', 'end_time', 'duration', 'customer_name', 'customer_phone', 'player_count',
      'internal_support', 'script_id', 'script_name', 'game_host_id', 'npc_id',
      'escape_room_id', 'escape_room_name', 'is_group_booking', 'include_photos', 'include_cctv',
      'booking_type', 'is_free', 'unit_price', 'total_amount', 'payment_status', 'payment_date', 'payment_method',
      'promo_code', 'promo_quantity', 'promo_discount', 'pic_id', 'pic_payment', 'notes',
      'status', 'created_by', 'updated_by', 'images',
      // 🆕 新增财务字段
      'original_price', 'discount_price', 'discount_amount', 'prepaid_amount', 'remaining_amount',
      'tax_amount', 'service_fee', 'manual_discount', 'activity_discount', 'member_discount',
      'package_discount', 'refund_amount', 'refund_reason', 'refund_date',
      'actual_start_time', 'actual_end_time'
    ];

    const cleanedData = {};
    validFields.forEach(field => {
      if (data[field] !== undefined) {
        cleanedData[field] = data[field];
      }
    });

    return cleanedData;
  }

  // 🆕 更新订单状态
  async updateStatus(orderId, status, user) {
    await PermissionChecker.requirePermission(user, 'order.manage');

    const order = await this.getById(orderId, user);
    if (!order) {
      throw new Error('订单不存在或无权限访问');
    }

    // 验证状态值
    const validStatuses = [
      'pending', 'confirmed', 'in_progress', 'completed', 'cancelled',
      'refunded', 'partially_refunded', 'no_show', 'rescheduled'
    ];

    if (!validStatuses.includes(status)) {
      throw new Error('无效的订单状态');
    }

    const updateData = {
      status: status,
      updated_by: user.user_id
    };

    const updatedOrder = await this.model.update(orderId, updateData);
    return this.formatTimeFields(updatedOrder, user.user_timezone);
  }

  // 🆕 开始游戏
  async startGame(orderId, user) {
    await PermissionChecker.requirePermission(user, 'order.manage');

    const order = await this.getById(orderId, user);
    if (!order) {
      throw new Error('订单不存在或无权限访问');
    }

    if (order.status !== 'confirmed') {
      throw new Error('只有已确认的订单才能开始游戏');
    }

    const updateData = {
      status: 'in_progress',
      actual_start_time: new Date(),
      updated_by: user.user_id
    };

    const updatedOrder = await this.model.update(orderId, updateData);
    return this.formatTimeFields(updatedOrder, user.user_timezone);
  }

  // 🆕 完成游戏
  async completeGame(orderId, user) {
    await PermissionChecker.requirePermission(user, 'order.manage');

    const order = await this.getById(orderId, user);
    if (!order) {
      throw new Error('订单不存在或无权限访问');
    }

    if (order.status !== 'in_progress') {
      throw new Error('只有进行中的订单才能完成游戏');
    }

    const updateData = {
      status: 'completed',
      actual_end_time: new Date(),
      updated_by: user.user_id
    };

    const updatedOrder = await this.model.update(orderId, updateData);
    return this.formatTimeFields(updatedOrder, user.user_timezone);
  }

  // 🆕 处理退款
  async processRefund(orderId, refundData, user) {
    await PermissionChecker.requirePermission(user, 'order.manage');

    const order = await this.getById(orderId, user);
    if (!order) {
      throw new Error('订单不存在或无权限访问');
    }

    const { refund_amount, refund_reason } = refundData;

    if (!refund_amount || refund_amount <= 0) {
      throw new Error('退款金额必须大于0');
    }

    if (refund_amount > order.total_amount) {
      throw new Error('退款金额不能超过订单总金额');
    }

    // 确定退款状态
    let newStatus = 'refunded';
    if (refund_amount < order.total_amount) {
      newStatus = 'partially_refunded';
    }

    const updateData = {
      status: newStatus,
      refund_amount: refund_amount,
      refund_reason: refund_reason || '用户申请退款',
      refund_date: new Date(),
      updated_by: user.user_id
    };

    const updatedOrder = await this.model.update(orderId, updateData);
    return this.formatTimeFields(updatedOrder, user.user_timezone);
  }
}

module.exports = new OrderService(); 