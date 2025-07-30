const BaseService = require('../core/BaseService');
const orderModel = require('../models/orderModel');
const { deleteFile } = require('../utils/upload');
const PermissionChecker = require('../utils/permissions');
const pool = require('../database/connection');
const { ACCOUNT_LEVELS } = require('../config/permissions');
const orderPlayerModel = require('../models/orderPlayerModel');
const orderPaymentModel = require('../models/orderPaymentModel');
const rolePricingTemplateModel = require('../models/rolePricingTemplateModel');

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

    // 格式化时间字段并处理语言显示
    return orders.map(order => {
      const formatted = this.formatTimeFields(order, user.user_timezone);
      // 🆕 处理语言显示：显示剧本/密室支持的语言
      formatted.display_languages = this.getOrderDisplayLanguages(order);
      // 🆕 处理密室NPC角色字段
      formatted.escape_room_npc_roles = this.parseEscapeRoomNpcRoles(order.escape_room_npc_roles);
      // 🆕 处理密室支持语言字段格式
      formatted.escape_room_supported_languages = this.parseJsonField(order.escape_room_supported_languages);
      
      // 🆕 解析角色定价模板JSON字段
      console.log('🔍 Debug selected_role_templates (getList):', {
        orderId: order.id,
        customerName: order.customer_name,
        rawValue: order.selected_role_templates,
        type: typeof order.selected_role_templates,
        isNull: order.selected_role_templates === null,
        isUndefined: order.selected_role_templates === undefined,
        truthyValue: !!order.selected_role_templates
      });
      
      if (order.selected_role_templates !== null && order.selected_role_templates !== undefined) {
        try {
          if (typeof order.selected_role_templates === 'string') {
            formatted.selected_role_templates = JSON.parse(order.selected_role_templates);
          } else {
            formatted.selected_role_templates = order.selected_role_templates;
          }
          if (!Array.isArray(formatted.selected_role_templates)) {
            formatted.selected_role_templates = [];
          }
        } catch (error) {
          console.warn('解析selected_role_templates失败:', error);
          formatted.selected_role_templates = [];
        }
      } else {
        formatted.selected_role_templates = [];
      }
      
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
      payment_status: query.payment_status,
      booking_type: query.booking_type,
      language: query.language,
      start_date: query.start_date,
      end_date: query.end_date,
      customer_name: query.customer_name ? query.customer_name.trim() : undefined,
      customer_phone: query.customer_phone ? query.customer_phone.trim() : undefined,
      // 🆕 新增筛选条件
      enable_multi_payment: query.enable_multi_payment,
      has_role_discount: query.has_role_discount
    };

    // 移除undefined值
    Object.keys(processedFilters).forEach(key => {
      if (processedFilters[key] === undefined) {
        delete processedFilters[key];
      }
    });

    const orders = await this.model.findByStoreId(storeId, processedFilters);
    return orders.map(order => {
      const formatted = this.formatTimeFields(order, user.user_timezone);
      // 🆕 处理语言显示：显示剧本/密室支持的语言
      formatted.display_languages = this.getOrderDisplayLanguages(order);
      // 🆕 处理密室NPC角色字段
      formatted.escape_room_npc_roles = this.parseEscapeRoomNpcRoles(order.escape_room_npc_roles);
      // 🆕 处理密室支持语言字段格式
      formatted.escape_room_supported_languages = this.parseJsonField(order.escape_room_supported_languages);
      
      // 🆕 解析角色定价模板JSON字段
      console.log('🔍 Debug selected_role_templates (getStoreOrders):', {
        orderId: order.id,
        customerName: order.customer_name,
        rawValue: order.selected_role_templates,
        type: typeof order.selected_role_templates,
        isNull: order.selected_role_templates === null,
        isUndefined: order.selected_role_templates === undefined,
        truthyValue: !!order.selected_role_templates
      });
      
      if (order.selected_role_templates !== null && order.selected_role_templates !== undefined) {
        try {
          if (typeof order.selected_role_templates === 'string') {
            formatted.selected_role_templates = JSON.parse(order.selected_role_templates);
          } else {
            formatted.selected_role_templates = order.selected_role_templates;
          }
          if (!Array.isArray(formatted.selected_role_templates)) {
            formatted.selected_role_templates = [];
          }
        } catch (error) {
          console.warn('解析selected_role_templates失败:', error);
          formatted.selected_role_templates = [];
        }
      } else {
        formatted.selected_role_templates = [];
      }
      
      return formatted;
    });
  }

  // 🆕 获取订单显示语言
  getOrderDisplayLanguages(order) {
    let languages = [];
    
    // 根据订单类型获取对应的语言支持
    if (order.order_type === '剧本杀' && order.script_supported_languages) {
      languages = this.parseLanguageField(order.script_supported_languages);
    } else if (order.order_type === '密室' && order.escape_room_supported_languages) {
      languages = this.parseLanguageField(order.escape_room_supported_languages);
    } else if (order.language) {
      // 如果没有剧本/密室语言信息，使用订单的语言字段
      languages = [order.language];
    }
    
    // 如果都没有，默认为印尼语
    if (languages.length === 0) {
      languages = ['IND'];
    }
    
    // 转换为中文显示
    const languageMap = {
      'CN': '中文',
      'EN': '英语', 
      'IND': '印尼语'
    };
    
    return languages.map(lang => languageMap[lang] || lang);
  }

  // 🆕 解析语言字段的辅助方法
  parseLanguageField(languageField) {
    try {
      if (typeof languageField === 'string') {
        // 如果是字符串，尝试解析为 JSON
        if (languageField.startsWith('[') || languageField.startsWith('{')) {
          return JSON.parse(languageField);
        } else {
          // 如果是逗号分隔的字符串
          return languageField.split(',').map(lang => lang.trim());
        }
      } else if (Array.isArray(languageField)) {
        return languageField;
      }
    } catch (e) {
      console.warn('解析语言字段失败:', e);
    }
    
    // 默认返回印尼语
    return ['IND'];
  }

  // 🆕 解析密室NPC角色字段
  parseEscapeRoomNpcRoles(npcRolesField) {
    if (!npcRolesField) return [];
    
    // 如果已经是数组，直接返回
    if (Array.isArray(npcRolesField)) {
      return npcRolesField;
    }
    
    // 如果是字符串，尝试解析
    if (typeof npcRolesField === 'string') {
      try {
        const parsed = JSON.parse(npcRolesField);
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        console.warn('解析密室NPC角色失败:', e);
        return [];
      }
    }
    
    return [];
  }

  // 🆕 通用JSON字段解析方法
  parseJsonField(field) {
    if (!field) return null;
    
    // 如果已经是数组或对象，直接返回
    if (Array.isArray(field) || typeof field === 'object') {
      return field;
    }
    
    // 如果是字符串，尝试解析
    if (typeof field === 'string') {
      try {
        return JSON.parse(field);
      } catch (e) {
        console.warn('解析JSON字段失败:', e);
        return field; // 解析失败时返回原始字符串
      }
    }
    
    return field;
  }

  // 获取订单详情
  async getById(orderId, user) {
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
      return null;
    }

    const formatted = this.formatTimeFields(order, user.user_timezone);
    // 🆕 处理语言显示：显示剧本/密室支持的语言
    formatted.display_languages = this.getOrderDisplayLanguages(order);
    // 🆕 处理密室NPC角色字段
    formatted.escape_room_npc_roles = this.parseEscapeRoomNpcRoles(order.escape_room_npc_roles);
    // 🆕 处理密室支持语言字段格式
    formatted.escape_room_supported_languages = this.parseJsonField(order.escape_room_supported_languages);
    
    // 🆕 解析角色定价模板JSON字段
    console.log('🔍 Debug selected_role_templates (getById):', {
      orderId: order.id,
      customerName: order.customer_name,
      rawValue: order.selected_role_templates,
      type: typeof order.selected_role_templates,
      isNull: order.selected_role_templates === null,
      isUndefined: order.selected_role_templates === undefined,
      truthyValue: !!order.selected_role_templates
    });
    
    if (order.selected_role_templates !== null && order.selected_role_templates !== undefined) {
      try {
        if (typeof order.selected_role_templates === 'string') {
          formatted.selected_role_templates = JSON.parse(order.selected_role_templates);
        } else {
          formatted.selected_role_templates = order.selected_role_templates;
        }
        // 确保是数组格式
        if (!Array.isArray(formatted.selected_role_templates)) {
          formatted.selected_role_templates = [];
        }
      } catch (error) {
        console.warn('解析selected_role_templates失败:', error);
        formatted.selected_role_templates = [];
      }
    } else {
      formatted.selected_role_templates = [];
    }
    
    // 确保 images 是数组
    if (formatted.images && !Array.isArray(formatted.images)) {
      formatted.images = [];
    }
    
    // 🆕 动态计算折扣统计信息，覆盖数据库中可能不准确的值
    if (!formatted.enable_multi_payment) {
      // 只对传统订单动态计算，多笔支付订单使用数据库中的准确值
      const finalAmount = parseFloat(formatted.total_amount || 0);
      const totalDiscountAmount = parseFloat(formatted.discount_amount || 0) + 
                                 parseFloat(formatted.manual_discount || 0) + 
                                 parseFloat(formatted.activity_discount || 0) + 
                                 parseFloat(formatted.member_discount || 0) + 
                                 parseFloat(formatted.package_discount || 0) + 
                                 parseFloat(formatted.promo_discount || 0);
      const originalPrice = finalAmount + totalDiscountAmount;
      const playerCount = formatted.player_count || 1;
      
      // 计算享受折扣的玩家数量
      let playersWithDiscount = 0;
      if (formatted.selected_role_templates && formatted.selected_role_templates.length > 0) {
        // 获取模板详细信息，填充缺失的折扣信息
        for (let i = 0; i < formatted.selected_role_templates.length; i++) {
          const template = formatted.selected_role_templates[i];
          playersWithDiscount += parseInt(template.player_count) || 0;
          
          // 如果模板缺少折扣详细信息，尝试从数据库获取
          if (template.template_id && (!template.discount_type || !template.discount_value)) {
            try {
              const templateDetail = await rolePricingTemplateModel.findById(template.template_id);
              if (templateDetail) {
                formatted.selected_role_templates[i] = {
                  ...template,
                  role_name: template.role_name || templateDetail.role_name,
                  discount_type: template.discount_type || templateDetail.discount_type,
                  discount_value: template.discount_value || templateDetail.discount_value
                };
              }
            } catch (error) {
              console.warn('获取角色模板详情失败:', error);
            }
          }
        }
      } else if (totalDiscountAmount > 0) {
        // 如果没有角色模板但有折扣，假设所有玩家都享受折扣
        playersWithDiscount = playerCount;
      }
      
      // 覆盖数据库中的统计值
      formatted.total_players_with_discount = playersWithDiscount;
      formatted.total_players_without_discount = playerCount - playersWithDiscount;
      formatted.total_original_amount = originalPrice;
      formatted.total_discount_amount = totalDiscountAmount;
      formatted.total_final_amount = finalAmount;
      formatted.total_discount_percentage = originalPrice > 0 ? 
        parseFloat(((totalDiscountAmount / originalPrice) * 100).toFixed(2)) : 0;
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
      unit_price: data.unit_price || data.total_amount || 0, // 🔧 修正：使用前端提交的unit_price
      is_free: data.free_pay === 'Free' ? true : false, // 转换Free/Pay为布尔值
      // 🆕 密室NPC角色处理
      escape_room_npc_roles: data.escape_room_npc_roles ? JSON.stringify(data.escape_room_npc_roles) : null,
      // 🆕 新增财务字段处理
      original_price: data.original_price || data.unit_price || data.total_amount || 0,
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
      actual_end_time: data.actual_end_time || null,
      // 🆕 多笔支付字段
      enable_multi_payment: data.enable_multi_payment || false,
      // 🆕 处理详细价格计算结果
      ...this.processOrderPriceDetail(data)
    };

    // 直接使用Model层创建订单，不需要字段过滤
    return await this.model.create(orderData);
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
      // 🆕 密室NPC角色处理
      escape_room_npc_roles: data.escape_room_npc_roles !== undefined ? 
        (data.escape_room_npc_roles ? JSON.stringify(data.escape_room_npc_roles) : null) : 
        existingOrder.escape_room_npc_roles,
      // 🆕 角色定价模板处理
      selected_role_templates: data.selected_role_templates !== undefined ? 
        data.selected_role_templates : existingOrder.selected_role_templates,
      // 🆕 多笔支付字段处理
      enable_multi_payment: data.enable_multi_payment !== undefined ? 
        data.enable_multi_payment : existingOrder.enable_multi_payment,
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

    // 直接使用Model层更新订单，不需要字段过滤
    const updatedOrder = await this.model.update(orderId, updateData);

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
            ...(filters.script_types && filters.script_types.length > 0 ? { types: filters.script_types } : {}),
            ...(filters.languages && filters.languages.length > 0 ? { languages: filters.languages } : {})
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
            ...(filters.script_types && filters.script_types.length > 0 ? { types: filters.script_types } : {}),
            ...(filters.languages && filters.languages.length > 0 ? { languages: filters.languages } : {})
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
            ...(filters.horror_levels && filters.horror_levels.length > 0 ? { horror_levels: filters.horror_levels } : {}),
            ...(filters.languages && filters.languages.length > 0 ? { languages: filters.languages } : {})
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
            ...(filters.horror_levels && filters.horror_levels.length > 0 ? { horror_levels: filters.horror_levels } : {}),
            ...(filters.languages && filters.languages.length > 0 ? { languages: filters.languages } : {})
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
          store_names: script.store_names || [],
          supported_languages: script.supported_languages || []
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

        // 🔧 处理密室支持语言字段，确保正确解析
        let supportedLanguages = [];
        if (escapeRoom.supported_languages) {
          if (typeof escapeRoom.supported_languages === 'string') {
            try {
              supportedLanguages = JSON.parse(escapeRoom.supported_languages);
            } catch (e) {
              console.warn('密室语言JSON解析失败:', e);
              supportedLanguages = ['IND'];
            }
          } else if (Array.isArray(escapeRoom.supported_languages)) {
            supportedLanguages = escapeRoom.supported_languages;
          }
        }
        
        // 如果没有语言信息，使用默认值
        if (!supportedLanguages || supportedLanguages.length === 0) {
          supportedLanguages = ['IND'];
        }

        // 🔧 处理密室NPC角色字段，确保正确解析
        let npcRoles = [];
        if (escapeRoom.npc_roles) {
          if (typeof escapeRoom.npc_roles === 'string') {
            try {
              npcRoles = JSON.parse(escapeRoom.npc_roles);
            } catch (e) {
              console.warn('密室NPC角色JSON解析失败:', e);
              npcRoles = [];
            }
          } else if (Array.isArray(escapeRoom.npc_roles)) {
            npcRoles = escapeRoom.npc_roles;
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
          npc_roles: npcRoles,
          description: escapeRoom.description,
          props: escapeRoom.props,
          store_count: escapeRoom.store_count || 0,
          store_names: escapeRoom.store_names || [],
          supported_languages: supportedLanguages
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
        const rawScript = storeScripts.find(s => s.id === item_id);
        
        if (rawScript) {
          // 处理剧本的JSON字段，使用与orderModel.getStoreResources相同的逻辑
          // 处理 supported_languages 字段
          let supportedLanguages = [];
          if (rawScript.supported_languages) {
            if (typeof rawScript.supported_languages === 'string') {
              try {
                supportedLanguages = JSON.parse(rawScript.supported_languages);
              } catch (e) {
                console.warn('解析剧本语言失败:', e);
                supportedLanguages = ['IND'];
              }
            } else if (Array.isArray(rawScript.supported_languages)) {
              supportedLanguages = rawScript.supported_languages;
            }
          }
          if (!supportedLanguages || supportedLanguages.length === 0) {
            supportedLanguages = ['IND'];
          }

          // 处理 images 字段
          let images = [];
          if (rawScript.images) {
            if (typeof rawScript.images === 'string') {
              try {
                images = JSON.parse(rawScript.images);
              } catch (e) {
                console.warn('解析剧本图片失败:', e);
                images = [];
              }
            } else if (Array.isArray(rawScript.images)) {
              images = rawScript.images;
            }
          }

          // 处理 tags 字段
          let tags = [];
          if (rawScript.tags) {
            if (typeof rawScript.tags === 'string') {
              try {
                tags = JSON.parse(rawScript.tags);
              } catch (e) {
                console.warn('解析剧本标签失败:', e);
                tags = [];
              }
            } else if (Array.isArray(rawScript.tags)) {
              tags = rawScript.tags;
            }
          }

          itemInfo = {
            ...rawScript,
            supported_languages: supportedLanguages,
            images: images,
            tags: tags
          };
        }
        
        finalPrice = itemInfo?.store_price || itemInfo?.price || 0;
      } else if (item_type === 'escape_room') {
        const escapeRoomModel = require('../models/escapeRoomModel');
        const storeEscapeRooms = await escapeRoomModel.findByStoreId(store_id);
        const rawEscapeRoom = storeEscapeRooms.find(er => er.id === item_id);
        
        if (rawEscapeRoom) {
          // 处理密室的JSON字段，使用与orderModel.getStoreResources相同的逻辑
          // 处理 supported_languages 字段
          let supportedLanguages = [];
          if (rawEscapeRoom.supported_languages) {
            if (typeof rawEscapeRoom.supported_languages === 'string') {
              try {
                supportedLanguages = JSON.parse(rawEscapeRoom.supported_languages);
              } catch (e) {
                console.warn('解析密室语言失败:', e);
                supportedLanguages = ['IND'];
              }
            } else if (Array.isArray(rawEscapeRoom.supported_languages)) {
              supportedLanguages = rawEscapeRoom.supported_languages;
            }
          }
          if (!supportedLanguages || supportedLanguages.length === 0) {
            supportedLanguages = ['IND'];
          }

          // 处理 npc_roles 字段
          let npcRoles = [];
          if (rawEscapeRoom.npc_roles) {
            if (typeof rawEscapeRoom.npc_roles === 'string') {
              try {
                npcRoles = JSON.parse(rawEscapeRoom.npc_roles);
              } catch (e) {
                console.warn('解析密室NPC角色失败:', e);
                npcRoles = [];
              }
            } else if (Array.isArray(rawEscapeRoom.npc_roles)) {
              npcRoles = rawEscapeRoom.npc_roles;
            }
          }

          // 处理 cover_images 字段
          let coverImages = [];
          if (rawEscapeRoom.cover_images) {
            if (typeof rawEscapeRoom.cover_images === 'string') {
              try {
                coverImages = JSON.parse(rawEscapeRoom.cover_images);
              } catch (e) {
                console.warn('解析密室图片失败:', e);
                coverImages = [];
              }
            } else if (Array.isArray(rawEscapeRoom.cover_images)) {
              coverImages = rawEscapeRoom.cover_images;
            }
          }

          itemInfo = {
            ...rawEscapeRoom,
            supported_languages: supportedLanguages,
            npc_roles: npcRoles,
            cover_images: coverImages
          };
        }
        
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
      // 🆕 处理语言显示：显示剧本/密室支持的语言
      formatted.display_languages = this.getOrderDisplayLanguages(order);
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
      { header: '支持语言', key: 'display_languages', width: 15 },
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
      { header: '团体预订', key: 'is_group_booking', width: 10 },
      { header: '包含照片', key: 'include_photos', width: 10 },
      { header: '包含录像', key: 'include_cctv', width: 10 },
      { header: '备注', key: 'notes', width: 30 },
      { header: '状态', key: 'status', width: 10 },
      { header: '创建时间', key: 'created_at', width: 20 },
      { header: '创建人', key: 'created_by_name', width: 15 },
      { header: '更新时间', key: 'updated_at', width: 20 },
      { header: '更新人', key: 'updated_by_name', width: 15 },
      { header: '图片数量', key: 'image_count', width: 10 }
    ];

    worksheet.columns = columns;

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
        display_languages: order.display_languages ? order.display_languages.join(', ') : '',
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

    // 设置样式
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6E6FA' }
    };

    // 生成Buffer
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

  // 🆕 处理订单详细价格计算结果
  processOrderPriceDetail(data) {
    const priceDetail = {};
    
    if (data.price_detail) {
      const detail = data.price_detail;
      
      // 多笔付款统计字段
      if (detail.total_players_with_discount !== undefined) {
        priceDetail.total_players_with_discount = detail.total_players_with_discount;
      }
      if (detail.total_players_without_discount !== undefined) {
        priceDetail.total_players_without_discount = detail.total_players_without_discount;
      }
      if (detail.total_discount_percentage !== undefined) {
        priceDetail.total_discount_percentage = detail.total_discount_percentage;
      }
      if (detail.total_original_amount !== undefined) {
        priceDetail.total_original_amount = detail.total_original_amount;
      }
      if (detail.total_discount_amount !== undefined) {
        priceDetail.total_discount_amount = detail.total_discount_amount;
      }
      if (detail.total_final_amount !== undefined) {
        priceDetail.total_final_amount = detail.total_final_amount;
      }
    }
    
    return priceDetail;
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

  // 🆕 获取可用的角色定价模板（用于订单折扣选择）
  async getAvailableRolePricingTemplates(storeId, options = {}, user) {
    try {
      // 权限验证
      await PermissionChecker.requirePermission(user, 'order.view');
      
      // 验证门店访问权限
      const availableStores = await this.getAvailableStores(user);
      if (!availableStores.some(store => store.id === storeId)) {
        throw new Error('权限不足');
      }

      // 获取角色定价模板服务
      const rolePricingTemplateService = require('./rolePricingTemplateService');
      
      // 获取门店可用的角色定价模板
      const templates = await rolePricingTemplateService.getTemplatesByStore(storeId, user);
      
      // 过滤有效的模板
      const activeTemplates = templates.filter(template => {
        // 检查模板是否启用
        if (!template.is_active) return false;
        
        // 检查有效期
        if (template.end_date && options.date) {
          const endDate = new Date(template.end_date);
          const queryDate = new Date(options.date);
          if (queryDate > endDate) return false;
        }
        
        return true;
      });
      
      return {
        store_id: storeId,
        templates: activeTemplates,
        total_count: activeTemplates.length
      };
    } catch (error) {
      console.error('获取可用角色定价模板失败:', error);
      throw error;
    }
  }

  // 🆕 获取可用的定价日历规则（用于订单折扣选择）
  async getAvailablePricingCalendar(storeId, date, options = {}, user) {
    try {
      // 权限验证
      await PermissionChecker.requirePermission(user, 'order.view');
      
      // 验证门店访问权限
      const availableStores = await this.getAvailableStores(user);
      if (!availableStores.some(store => store.id === storeId)) {
        throw new Error('权限不足');
      }

      // 获取定价日历服务
      const pricingCalendarService = require('./pricingCalendarService');
      
      // 获取指定日期的定价规则 - 修正方法调用参数
      const calendarRule = await pricingCalendarService.getCalendarByDate(date, storeId, user);
      
      // 构建返回结果
      const activeRules = [];
      if (calendarRule && calendarRule.is_active) {
        // 检查门店范围
        if (!calendarRule.store_id || calendarRule.store_id === storeId) {
          activeRules.push(calendarRule);
        }
      }
      
      return {
        store_id: storeId,
        date: date,
        rules: activeRules,
        total_count: activeRules.length
      };
    } catch (error) {
      console.error('获取可用定价日历失败:', error);
      throw error;
    }
  }

  // 🆕 计算订单折扣预览
  async calculateOrderDiscount(discountData, user) {
    try {
      // 权限验证
      await PermissionChecker.requirePermission(user, 'order.view');
      
      const { 
        store_id, 
        item_type, 
        item_id, 
        date, 
        original_amount, 
        player_count,
        role_pricing_template_id,
        pricing_calendar_id 
      } = discountData;
      
      let finalAmount = original_amount;
      let discountAmount = 0;
      let appliedDiscounts = [];
      
      // 获取基础价格
      let itemPrice = original_amount;
      if (item_type && item_id) {
        if (item_type === 'script') {
          const scriptModel = require('../models/scriptModel');
          const script = await scriptModel.findByIdAndStoreId(item_id, store_id);
          if (script) {
            itemPrice = script.store_price || script.price || 0;
          }
        } else if (item_type === 'escape_room') {
          const escapeRoomModel = require('../models/escapeRoomModel');
          const escapeRoom = await escapeRoomModel.findByIdAndStoreId(item_id, store_id);
          if (escapeRoom) {
            itemPrice = escapeRoom.store_price || escapeRoom.price || 0;
          }
        }
      }
      
      // 应用角色定价模板折扣
      if (role_pricing_template_id) {
        const rolePricingTemplateService = require('./rolePricingTemplateService');
        const discountedPrice = await rolePricingTemplateService.calculateRolePrice(
          itemPrice, 
          role_pricing_template_id, 
          user
        );
        
        if (discountedPrice < itemPrice) {
          const roleDiscount = itemPrice - discountedPrice;
          discountAmount += roleDiscount;
          finalAmount -= roleDiscount;
          
          // 获取模板详情
          const template = await rolePricingTemplateService.getTemplateDetail(role_pricing_template_id, user);
          appliedDiscounts.push({
            type: 'role_pricing',
            template_id: role_pricing_template_id,
            template_name: template.role_name,
            discount_type: template.discount_type,
            discount_value: template.discount_value,
            discount_amount: roleDiscount
          });
        }
      }
      
      // 应用定价日历折扣
      if (pricing_calendar_id) {
        const pricingCalendarService = require('./pricingCalendarService');
        const calendarRule = await pricingCalendarService.getCalendarDetail(pricing_calendar_id, user);
        
        if (calendarRule && calendarRule.discount_type !== 'none') {
          let calendarDiscount = 0;
          
          if (calendarRule.discount_type === 'percentage') {
            calendarDiscount = (itemPrice * calendarRule.discount_value) / 100;
          } else if (calendarRule.discount_type === 'fixed_amount') {
            calendarDiscount = calendarRule.discount_value;
          }
          
          if (calendarDiscount > 0) {
            discountAmount += calendarDiscount;
            finalAmount -= calendarDiscount;
            
            appliedDiscounts.push({
              type: 'pricing_calendar',
              calendar_id: pricing_calendar_id,
              calendar_name: calendarRule.name,
              discount_type: calendarRule.discount_type,
              discount_value: calendarRule.discount_value,
              discount_amount: calendarDiscount
            });
          }
        }
      }
      
      // 确保最终金额不为负数
      if (finalAmount < 0) {
        finalAmount = 0;
      }
      
      return {
        original_amount: original_amount,
        item_price: itemPrice,
        discount_amount: discountAmount,
        final_amount: finalAmount,
        player_count: player_count,
        per_player_amount: player_count > 0 ? finalAmount / player_count : 0,
        applied_discounts: appliedDiscounts,
        calculation_details: {
          base_calculation: `${itemPrice} (基础价格)`,
          total_discount: `${discountAmount} (总折扣)`,
          final_calculation: `${itemPrice} - ${discountAmount} = ${finalAmount}`
        }
      };
    } catch (error) {
      console.error('计算订单折扣失败:', error);
      throw error;
    }
  }

  // 🆕 获取订单支付信息汇总（包含玩家和支付记录）
  async getOrderPaymentSummary(orderId, user) {
    try {
      // 权限验证
      await PermissionChecker.requirePermission(user, 'order.view');
      
      // 获取订单基本信息
      const order = await this.getById(orderId, user);
      if (!order) {
        throw new Error('订单不存在');
      }
      
      // 根据订单类型返回不同的数据结构
      if (order.enable_multi_payment) {
        // 多笔支付订单：直接从数据库获取详细数据
        return await this.getMultiPaymentOrderSummary(orderId, order, user);
      } else {
        // 单笔支付订单：从orders表获取数据
        return await this.getSinglePaymentOrderSummary(orderId, order, user);
      }
      
    } catch (error) {
      console.error('获取订单支付信息汇总失败:', error);
      throw error;
    }
  }

  // 🆕 获取多笔支付订单汇总信息
  async getMultiPaymentOrderSummary(orderId, order, user) {
    const orderPlayerService = require('./orderPlayerService');
    const orderPaymentService = require('./orderPaymentService');
    
    // 从数据库获取玩家和支付记录
    const players = await orderPlayerService.getPlayersByOrderId(orderId, true, user);
    const payments = await orderPaymentService.getPaymentsByOrderId(orderId, true, user);
    
    // 计算统计信息（直接基于数据库数据）
    const stats = this.calculateStatsFromData(players, payments);
    
    return {
      order: order,
      players: players,
      payments: payments,
      paymentStats: stats,
      summary: {
        order_id: orderId,
        is_multi_payment: true,
        total_players: players.length,
        total_payments: payments.length,
        ...stats
      }
    };
  }

  // 🆕 获取单笔支付订单汇总信息
  async getSinglePaymentOrderSummary(orderId, order, user) {
    // 单笔支付订单数据直接来源于orders表
    const stats = {
      total_players: order.player_count || 0,
      paid_players: order.payment_status === 'FULL' ? (order.player_count || 0) : 0,
      partial_players: order.payment_status === 'DP' ? (order.player_count || 0) : 0,
      pending_players: order.payment_status === 'Not Yet' ? (order.player_count || 0) : 0,
      total_final_amount: parseFloat(order.total_amount || 0),
      paid_amount: order.payment_status === 'FULL' ? parseFloat(order.total_amount || 0) : 0,
      pending_amount: order.payment_status !== 'FULL' ? parseFloat(order.total_amount || 0) : 0,
      // 折扣统计信息（基于orders表的字段）
      total_original_amount: parseFloat(order.original_price || order.total_amount || 0),
      total_discount_amount: parseFloat(order.discount_amount || 0),
      discount_percentage: parseFloat(order.total_discount_percentage || 0),
      has_discount: parseFloat(order.discount_amount || 0) > 0,
      players_with_discount: parseInt(order.total_players_with_discount || 0),
      players_without_discount: parseInt(order.total_players_without_discount || order.player_count || 0)
    };

    // 生成基础的玩家和支付记录用于显示
    const players = this.generateSinglePaymentPlayers(order);
    const payments = this.generateSinglePaymentRecord(order);

    return {
      order: order,
      players: players,
      payments: payments,
      paymentStats: stats,
      summary: {
        order_id: orderId,
        is_multi_payment: false,
        total_players: order.player_count || 0,
        total_payments: 1,
        ...stats
      }
    };
  }

  // 🆕 基于实际数据计算统计信息
  calculateStatsFromData(players, payments) {
    const totalPlayers = players.length;
    const totalOriginalAmount = players.reduce((sum, p) => sum + parseFloat(p.original_amount || 0), 0);
    const totalDiscountAmount = players.reduce((sum, p) => sum + parseFloat(p.discount_amount || 0), 0);
    const totalFinalAmount = players.reduce((sum, p) => sum + parseFloat(p.final_amount || 0), 0);
    
    const playersWithDiscount = players.filter(p => parseFloat(p.discount_amount || 0) > 0).length;
    const playersWithoutDiscount = totalPlayers - playersWithDiscount;
    
    // 统计支付状态
    const paidPlayers = players.filter(p => p.payment_status === 'paid' || p.payment_status === 'FULL').length;
    const partialPlayers = players.filter(p => p.payment_status === 'partial' || p.payment_status === 'DP').length;
    const pendingPlayers = players.filter(p => p.payment_status === 'pending' || p.payment_status === 'Not Yet').length;
    
    // 统计支付金额
    const totalPaidAmount = payments.reduce((sum, payment) => 
      sum + (payment.payment_status === 'confirmed' || payment.payment_status === 'paid' ? parseFloat(payment.payment_amount || 0) : 0), 0
    );
    const totalPendingAmount = payments.reduce((sum, payment) => 
      sum + (payment.payment_status === 'pending' ? parseFloat(payment.payment_amount || 0) : 0), 0
    );

    return {
      total_players: totalPlayers,
      paid_players: paidPlayers,
      partial_players: partialPlayers,
      pending_players: pendingPlayers,
      total_final_amount: Math.round(totalFinalAmount * 100) / 100,
      paid_amount: Math.round(totalPaidAmount * 100) / 100,
      pending_amount: Math.round(totalPendingAmount * 100) / 100,
      total_original_amount: Math.round(totalOriginalAmount * 100) / 100,
      total_discount_amount: Math.round(totalDiscountAmount * 100) / 100,
      discount_percentage: totalOriginalAmount > 0 ? Math.round((totalDiscountAmount / totalOriginalAmount) * 10000) / 100 : 0,
      has_discount: totalDiscountAmount > 0,
      players_with_discount: playersWithDiscount,
      players_without_discount: playersWithoutDiscount
    };
  }

  // 🆕 为单笔支付订单生成基础玩家记录（用于显示）
  generateSinglePaymentPlayers(order) {
    const players = [];
    const playerCount = order.player_count || 0;
    const unitPrice = parseFloat(order.unit_price || order.total_amount || 0) / playerCount;
    
    for (let i = 1; i <= playerCount; i++) {
      players.push({
        id: `single_player_${i}`,
        player_name: `玩家 ${i}`,
        player_phone: order.customer_phone || '',
        selected_role_name: '标准玩家',
        original_amount: Math.round(unitPrice * 100) / 100,
        discount_amount: 0,
        final_amount: Math.round(unitPrice * 100) / 100,
        payment_status: order.payment_status === 'FULL' ? 'paid' : 
                       order.payment_status === 'DP' ? 'partial' : 'pending',
        discount_type: 'none',
        discount_percentage: 0,
        discount_fixed_amount: 0
      });
    }
    
    return players;
  }

  // 🆕 为单笔支付订单生成基础支付记录（用于显示）
  generateSinglePaymentRecord(order) {
    return [{
      id: 'single_payment',
      payer_name: order.customer_name || '客户',
      payer_phone: order.customer_phone || '',
      payment_amount: parseFloat(order.total_amount || 0),
      payment_method: order.payment_method || 'Bank Transfer',
      payment_date: order.payment_date || order.created_at,
      payment_status: order.payment_status === 'FULL' ? 'confirmed' : 
                     order.payment_status === 'DP' ? 'partial' : 'pending',
      covers_player_count: order.player_count || 0,
      payment_for_roles: ['标准玩家'],
      notes: '单笔支付订单记录'
    }];
  }

  // 🆕 多笔付款订单创建
  async createOrderWithMultiPayment(orderData, user) {
    await PermissionChecker.requirePermission(user, 'order.create');
    
    const pool = require('../database/connection');
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const { 
        // 基础订单信息
        basicOrderData,
        // 多笔付款配置
        paymentItems,
        // 上传的图片
        uploadedImages = []
      } = orderData;
      
      // 1. 创建基础订单
      const orderId = await this.create({
        ...basicOrderData,
        // 🆕 标记为多笔付款模式
        enable_multi_payment: true,
        payment_images: uploadedImages
      }, user);
      
      console.log('🔄 创建订单成功:', orderId);
      
      // 2. 根据付款项创建玩家记录
      const orderPlayerModel = require('../models/orderPlayerModel');
      const players = [];
      let playerOrder = 1;
      
      for (const item of paymentItems) {
        // 为每个付款项创建对应数量的玩家
        for (let i = 0; i < item.players; i++) {
          const player = {
            order_id: orderId,
            player_name: `${item.name} - 第${i + 1}人`,
            player_phone: '', // 前端可以后续补充
            selected_role_name: item.type === 'role_discount' ? item.name : '标准玩家',
            original_amount: parseFloat(item.unitPrice) || 0,
            discount_amount: parseFloat(item.unitPrice) - parseFloat(item.unitPrice),
            final_amount: parseFloat(item.amount / item.players) || 0, // 平均分摊到每个玩家
            payment_status: 'pending',
            player_order: playerOrder++,
            notes: item.description
          };
          
          players.push(player);
        }
      }
      
      // 批量创建玩家记录
      const createdPlayers = await orderPlayerModel.createBatch(players);
      console.log('👥 创建玩家记录:', createdPlayers.length, '个');
      
      // 3. 创建支付记录
      const orderPaymentModel = require('../models/orderPaymentModel');
      const payments = [];
      
      for (const item of paymentItems) {
        // 找到这个付款项对应的玩家IDs
        const itemPlayerIds = createdPlayers
          .filter(player => player.notes === item.description)
          .map(player => player.id.toString());
        
        const payment = {
          order_id: orderId,
          payer_name: item.payer_name || basicOrderData.customer_name || '待填写',
          payer_phone: item.payer_phone || basicOrderData.customer_phone || '',
          payment_amount: parseFloat(item.amount) || 0,
          payment_method: item.payment_method || 'Bank Transfer',
          payment_date: new Date(),
          payment_status: item.payment_status || 'pending',
          covers_player_ids: itemPlayerIds,
          covers_player_count: itemPlayerIds.length,
          payment_for_roles: [item.name],
          original_total_amount: parseFloat(item.amount) || 0,
          discount_total_amount: 0,
          payment_proof_images: [], // 支付凭证可以后续上传
          notes: `${item.name} - ${item.description}`,
          created_by: user.id
        };
        
        payments.push(payment);
      }
      
      // 批量创建支付记录
      const createdPayments = [];
      for (const payment of payments) {
        const createdPayment = await orderPaymentModel.create(payment);
        createdPayments.push(createdPayment);
      }
      
      console.log('💳 创建支付记录:', createdPayments.length, '个');
      
      await client.query('COMMIT');
      
      // 4. 返回完整的订单信息
      const completeOrder = await this.getById(orderId, user);
      
      return {
        order: completeOrder,
        players: this.formatTimeFieldsArray(createdPlayers),
        payments: this.formatTimeFieldsArray(createdPayments),
        summary: {
          total_players: players.length,
          total_payments: payments.length,
          total_amount: paymentItems.reduce((sum, item) => sum + item.amount, 0)
        }
      };
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ 多笔付款订单创建失败:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // 🆕 生成付款项建议（优化版 - 按人数拆分，每人一笔）
  async generatePaymentItemsSuggestion(orderData, user) {
    await PermissionChecker.requirePermission(user, 'order.view');
    
    const { 
      unit_price, 
      player_count, 
      selected_role_templates = [] 
    } = orderData;
    
    console.log('🔧 开始生成付款项建议(按人数拆分):', {
      unit_price,
      player_count,
      selected_role_templates_count: selected_role_templates.length
    });
    
    const unitPriceNum = parseFloat(unit_price) || 0;
    const totalPlayerCount = parseInt(player_count) || 0;
    
    const items = [];
    let playerIndex = 1; // 玩家序号
    let totalOriginalAmount = 0;
    let totalDiscountAmount = 0;
    
    // 1. 处理每个角色模板，按人数拆分为单独的付款项
    for (const roleTemplate of selected_role_templates) {
      const playerCountNum = parseInt(roleTemplate.player_count) || 0;
      
      if (playerCountNum <= 0) continue;
      
      // 获取角色定价模板的详细信息
      let templateDetails = null;
      try {
        if (roleTemplate.template_id) {
          const rolePricingTemplateService = require('./rolePricingTemplateService');
          templateDetails = await rolePricingTemplateService.getTemplateDetail(roleTemplate.template_id, user);
        }
      } catch (error) {
        console.warn('获取角色定价模板详情失败:', error.message);
      }
      
      // 计算单人的折扣信息
      let singlePlayerDiscountAmount = 0;
      let singlePlayerFinalAmount = unitPriceNum;
      let discountPercentage = 0;
      
      if (templateDetails) {
        const { discount_type, discount_value } = templateDetails;
        
        if (discount_type === 'percentage' && discount_value > 0) {
          // 百分比折扣
          const discountValueNum = parseFloat(discount_value);
          singlePlayerDiscountAmount = unitPriceNum * (discountValueNum / 100);
          singlePlayerFinalAmount = unitPriceNum - singlePlayerDiscountAmount;
          discountPercentage = discountValueNum;
        } else if (discount_type === 'fixed' && discount_value > 0) {
          // 固定金额折扣
          const discountValueNum = parseFloat(discount_value);
          singlePlayerDiscountAmount = Math.min(discountValueNum, unitPriceNum);
          singlePlayerFinalAmount = Math.max(0, unitPriceNum - singlePlayerDiscountAmount);
          discountPercentage = unitPriceNum > 0 ? (singlePlayerDiscountAmount / unitPriceNum) * 100 : 0;
        }
        
        console.log(`💰 角色「${templateDetails.role_name}」单人折扣计算:`, {
          单价: unitPriceNum,
          折扣类型: discount_type,
          折扣值: discount_value,
          单人折扣金额: singlePlayerDiscountAmount,
          单人最终金额: singlePlayerFinalAmount,
          折扣百分比: discountPercentage
        });
      }
      
      // 构建折扣显示文本
      let discountDisplay = '';
      if (templateDetails && templateDetails.discount_type) {
        if (templateDetails.discount_type === 'percentage') {
          discountDisplay = `-${templateDetails.discount_value}%`;
        } else if (templateDetails.discount_type === 'fixed') {
          discountDisplay = `-Rp ${templateDetails.discount_value.toLocaleString()}`;
        }
      } else {
        discountDisplay = '角色折扣';
      }
      
      // 为该角色模板的每个玩家创建独立的付款项
      for (let i = 0; i < playerCountNum; i++) {
        items.push({
          id: `player_${playerIndex}`,
          type: 'role_discount',
          name: templateDetails?.role_name || roleTemplate.role_name || '折扣角色',
          description: `玩家${playerIndex} · ${discountDisplay}`,
          amount: parseFloat(singlePlayerFinalAmount.toFixed(2)),
          original_amount: parseFloat(unitPriceNum.toFixed(2)),
          discount_amount: parseFloat(singlePlayerDiscountAmount.toFixed(2)),
          discount_percentage: parseFloat(discountPercentage.toFixed(2)),
          players: 1,
          player_index: playerIndex,
          unitPrice: parseFloat(unitPriceNum.toFixed(2)),
          payment_method: 'Bank Transfer',
          payment_status: 'pending',
          canSplit: false,
          canDelete: false,
          // 折扣详情
          discount_type: templateDetails?.discount_type || 'none',
          discount_value: templateDetails?.discount_value || 0,
          template_id: roleTemplate.template_id,
          template_name: templateDetails?.role_name || roleTemplate.role_name || '未知角色'
        });
        
        totalOriginalAmount += unitPriceNum;
        totalDiscountAmount += singlePlayerDiscountAmount;
        playerIndex++;
      }
    }
    
    // 2. 为无折扣玩家创建付款项（每人一笔）
    const usedPlayers = playerIndex - 1;
    const remainingPlayers = totalPlayerCount - usedPlayers;
    
    for (let i = 0; i < remainingPlayers; i++) {
      items.push({
        id: `player_${playerIndex}`,
        type: 'standard',
        name: '标准定价',
        description: `玩家${playerIndex} · 无折扣`,
        amount: parseFloat(unitPriceNum.toFixed(2)),
        original_amount: parseFloat(unitPriceNum.toFixed(2)),
        discount_amount: 0,
        discount_percentage: 0,
        players: 1,
        player_index: playerIndex,
        unitPrice: parseFloat(unitPriceNum.toFixed(2)),
        payment_method: 'Bank Transfer',
        payment_status: 'pending',
        canSplit: true,
        canDelete: false,
        discount_type: 'none',
        discount_value: 0,
        template_id: null,
        template_name: '标准定价'
      });
      
      totalOriginalAmount += unitPriceNum;
      playerIndex++;
    }
    
    // 计算最终总金额
    const finalTotalAmount = items.reduce((sum, item) => {
      const amount = parseFloat(item.amount) || 0;
      return sum + amount;
    }, 0);
    
    // 计算统计信息
    const playersWithDiscount = items.filter(item => item.discount_amount > 0).length;
    const playersWithoutDiscount = items.filter(item => item.discount_amount === 0).length;
    const averageDiscountPercentage = totalOriginalAmount > 0 ? 
      parseFloat(((totalDiscountAmount / totalOriginalAmount) * 100).toFixed(2)) : 0;
    
    const result = {
      items,
      summary: {
        total_items: items.length,
        total_players: totalPlayerCount,
        // 🎯 完整的价格信息
        total_original_amount: parseFloat(totalOriginalAmount.toFixed(2)),
        total_discount_amount: parseFloat(totalDiscountAmount.toFixed(2)),
        total_amount: parseFloat(finalTotalAmount.toFixed(2)),
        total_savings: parseFloat(totalDiscountAmount.toFixed(2)),
        // 统计信息
        role_discount_items: items.filter(item => item.type === 'role_discount').length,
        standard_items: items.filter(item => item.type === 'standard').length,
        players_with_discount: playersWithDiscount,
        players_without_discount: playersWithoutDiscount,
        average_discount_percentage: averageDiscountPercentage,
        // 详细分组统计
        discount_breakdown: {
          percentage_discounts: items.filter(item => item.discount_type === 'percentage').length,
          fixed_discounts: items.filter(item => item.discount_type === 'fixed').length,
          no_discounts: items.filter(item => item.discount_type === 'none').length
        }
      }
    };
    
    console.log('📦 付款项建议生成完成(按人数拆分):', {
      总人数: result.summary.total_players,
      总付款项: result.summary.total_items,
      原价总额: result.summary.total_original_amount,
      折扣总额: result.summary.total_discount_amount,
      实付总额: result.summary.total_amount,
      平均折扣: `${result.summary.average_discount_percentage}%`,
      享受折扣人数: result.summary.players_with_discount,
      标准价格人数: result.summary.players_without_discount
    });
    
    return result;
  }
}

module.exports = new OrderService(); 