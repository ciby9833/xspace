const BaseService = require('../core/BaseService');
const scriptModel = require('../models/scriptModel');
const { deleteFile } = require('../utils/upload');
const PermissionChecker = require('../utils/permissions');

class ScriptService extends BaseService {
  constructor() {
    super(scriptModel, '剧本');
  }

  // 获取剧本列表（公司维度）
  async getList(query, user) {
    // 检查查看权限
    await PermissionChecker.requirePermission(user, 'script.view');

    const { company_id } = user;
    
    // 🆕 优化筛选条件处理
    const processedFilters = {
      // 剧本类型筛选
      type: query.type,
      
      // 🆕 剧本背景筛选
      background: query.background,
      
      // 状态筛选 - 确保正确处理布尔值
      is_active: query.is_active !== undefined ? 
        (query.is_active === 'true' || query.is_active === true) : undefined,
      
      // 人数筛选 - 确保转换为数字
      min_players: query.min_players ? parseInt(query.min_players) : undefined,
      max_players: query.max_players ? parseInt(query.max_players) : undefined,
      
      // 🆕 难度筛选
      difficulty: query.difficulty,
      
      // 🆕 价格范围筛选
      min_price: query.min_price !== undefined && query.min_price !== null ? 
        parseFloat(query.min_price) : undefined,
      max_price: query.max_price !== undefined && query.max_price !== null ? 
        parseFloat(query.max_price) : undefined,
      
      // 🆕 时长筛选
      min_duration: query.min_duration ? parseInt(query.min_duration) : undefined,
      max_duration: query.max_duration ? parseInt(query.max_duration) : undefined,
      
      // 🆕 关键词搜索
      keyword: query.keyword ? query.keyword.trim() : undefined,
      
      // 🆕 标签筛选
      tag: query.tag
    };

    // 移除undefined值，避免传递给数据库
    Object.keys(processedFilters).forEach(key => {
      if (processedFilters[key] === undefined) {
        delete processedFilters[key];
      }
    });

    const scripts = await this.model.findByCompanyId(company_id, processedFilters);

    // 格式化时间字段和处理图片数组
    return scripts.map(script => {
      const formatted = this.formatTimeFields(script, user.user_timezone);
      // 确保 images 是数组
      if (formatted.images && typeof formatted.images === 'string') {
        try {
          formatted.images = JSON.parse(formatted.images);
        } catch (e) {
          formatted.images = [];
        }
      }
      return formatted;
    });
  }

  // 获取所有剧本（门店维度）
  async getStoreScripts(storeId, user) {
    await PermissionChecker.requirePermission(user, 'script.view');
    
    // 🔧 修复：检查门店访问权限 - 使用store.view权限而不是system.manage
    // 因为根据权限分组配置，有script.view权限的用户会自动获得store.view权限
    const hasStoreAccess = await PermissionChecker.hasPermission(user, 'store.view');
    if (!hasStoreAccess) {
      throw new Error('权限不足：无法查看门店剧本信息');
    }
    
    // 基于账户层级的数据访问控制
    if (user.account_level === 'store' && user.store_id && user.store_id !== storeId) {
      throw new Error('权限不足：无法访问其他门店的剧本');
    }

    const scripts = await this.model.findByStoreId(storeId);
    return scripts.map(script => this.formatTimeFields(script, user.user_timezone));
  }

  // 获取剧本详情
  async getById(scriptId, user) {
    // 检查查看权限
    await PermissionChecker.requirePermission(user, 'script.view');

    const { company_id } = user;
    
    // 🔧 修复：基于账户层级的数据访问控制
    // 平台级用户可以查看所有剧本，其他角色只能查看本公司剧本
    const companyId = user.account_level === 'platform' ? null : company_id;
    
    const script = await this.model.findById(scriptId, companyId);
    
    if (!script) {
      throw new Error('剧本不存在或无权限访问');
    }

    const formatted = this.formatTimeFields(script, user.user_timezone);
    // 处理图片数组
    if (formatted.images && typeof formatted.images === 'string') {
      try {
        formatted.images = JSON.parse(formatted.images);
      } catch (e) {
        formatted.images = [];
      }
    }
    return formatted;
  }

  // 创建剧本
  async create(data, user) {
    // 权限检查：只有有管理权限的用户可以创建剧本
    await PermissionChecker.requirePermission(user, 'script.manage');

    const { company_id } = user;

    // 数据验证
    this.validateScriptData(data);

    // 验证图片数量
    if (data.images && data.images.length > 10) {
      throw new Error('最多只能上传10张图片');
    }

    // 🔧 修复：基于账户层级的数据访问控制
    let targetCompanyId;
    
    if (user.account_level === 'platform') {
      // 平台级用户：可以指定公司ID，如果没有指定则使用自己的公司ID
      targetCompanyId = data.company_id || company_id;
    } else {
      // 公司级和门店级用户：必须有公司ID且只能为自己的公司创建
      if (!company_id) {
        throw new Error('用户未关联公司，无法创建剧本');
      }
      targetCompanyId = company_id;
    }

    const scriptData = {
      ...data,
      company_id: targetCompanyId,
      images: data.images || []
    };

    return await this.model.create(scriptData);
  }

  // 更新剧本
  async update(scriptId, data, user) {
    await PermissionChecker.requirePermission(user, 'script.manage');

    // 先获取现有剧本信息
    const existingScript = await this.getById(scriptId, user);
    if (!existingScript) {
      throw new Error('剧本不存在或无权限访问');
    }

    // 数据验证
    this.validateScriptData(data);

    // 验证图片数量
    if (data.images && data.images.length > 10) {
      throw new Error('最多只能上传10张图片');
    }

    const updateData = {
      ...data,
      images: data.images || existingScript.images || []
    };

    const updatedScript = await this.model.update(scriptId, updateData);
    
    // 删除旧图片文件（如果有新图片上传）
    if (data.images && existingScript.images) {
      const oldImages = existingScript.images || [];
      const newImages = data.images || [];
      
      const imagesToDelete = oldImages.filter(img => !newImages.includes(img));
      imagesToDelete.forEach(imageUrl => {
        const filename = imageUrl.split('/').pop();
        deleteFile(filename);
      });
    }

    return this.formatTimeFields(updatedScript, user.user_timezone);
  }

  // 删除剧本
  async delete(scriptId, user) {
    await PermissionChecker.requirePermission(user, 'script.manage');

    const script = await this.getById(scriptId, user);
    if (!script) {
      throw new Error('剧本不存在或无权限访问');
    }

    // 删除剧本记录
    await this.model.delete(scriptId);

    // 删除关联的图片文件
    if (script.images && script.images.length > 0) {
      script.images.forEach(imageUrl => {
        const filename = imageUrl.split('/').pop();
        deleteFile(filename);
      });
    }

    return { success: true, message: '剧本删除成功' };
  }

  // 批量更新状态
  async batchUpdateStatus(scriptIds, isActive, user) {
    await PermissionChecker.requirePermission(user, 'script.manage');

    const { company_id } = user;
    // 🔧 修复：基于账户层级的数据访问控制
    const companyId = user.account_level === 'platform' ? null : company_id;
    return await this.model.batchUpdateStatus(scriptIds, isActive, companyId);
  }

  // 批量删除
  async batchDelete(scriptIds, user) {
    await PermissionChecker.requirePermission(user, 'script.manage');

    // 获取要删除的剧本信息（用于清理图片）
    const scripts = await Promise.all(
      scriptIds.map(id => this.getById(id, user))
    );

    const { company_id } = user;
    // 🔧 修复：基于账户层级的数据访问控制
    const companyId = user.account_level === 'platform' ? null : company_id;
    const result = await this.model.batchDelete(scriptIds, companyId);

    // 删除关联的图片文件
    scripts.forEach(script => {
      if (script && script.images && script.images.length > 0) {
        script.images.forEach(imageUrl => {
          const filename = imageUrl.split('/').pop();
          deleteFile(filename);
        });
      }
    });

    return result;
  }

  // 配置门店剧本
  async configureStoreScript(storeId, scriptId, config, user) {
    // 权限检查：需要有门店管理权限或剧本门店配置权限
    const hasStoreManage = await PermissionChecker.hasPermission(user, 'store.manage');
    const hasScriptConfig = await PermissionChecker.hasPermission(user, 'script.store_config');
    
    if (!hasStoreManage && !hasScriptConfig) {
      throw new Error('权限不足');
    }

    // 🔧 修复：基于账户层级的数据访问控制
    if (user.account_level === 'store' && user.store_id && user.store_id !== storeId) {
      throw new Error('权限不足：无法配置其他门店的剧本');
    }

    // 验证剧本是否存在
    const script = await this.getById(scriptId, user);
    if (!script) {
      throw new Error('剧本不存在');
    }

    return await this.model.configureStoreScript(storeId, scriptId, config);
  }

  // 获取剧本统计
  async getStats(user) {
    await PermissionChecker.requirePermission(user, 'script.view');

    const { company_id } = user;
    // 🔧 修复：基于账户层级的数据访问控制
    const companyId = user.account_level === 'platform' ? null : company_id;
    
    return await this.model.getStats(companyId);
  }

  // 🆕 获取公司门店列表（用于剧本配置）
  async getCompanyStores(user) {
    await PermissionChecker.requirePermission(user, 'script.manage');

    const { company_id } = user;
    // 🔧 修复：基于账户层级的数据访问控制
    if (user.account_level !== 'platform' && !company_id) {
      throw new Error('用户未关联公司，无法获取门店列表');
    }

    return await this.model.getCompanyStores(company_id);
  }

  // 🆕 批量配置门店剧本
  async batchConfigureStores(scriptId, storeConfigs, user) {
    await PermissionChecker.requirePermission(user, 'script.manage');

    // 验证剧本是否存在且有权限访问
    const script = await this.getById(scriptId, user);
    if (!script) {
      throw new Error('剧本不存在或无权限访问');
    }

    // 验证门店配置数据
    if (storeConfigs && storeConfigs.length > 0) {
      for (const config of storeConfigs) {
        if (!config.store_id) {
          throw new Error('门店ID不能为空');
        }
        if (config.store_price && (isNaN(config.store_price) || config.store_price < 0)) {
          throw new Error('门店价格必须是非负数');
        }
      }
    }

    return await this.model.batchConfigureStores(scriptId, storeConfigs);
  }

  // 🆕 获取剧本的门店配置
  async getScriptStoreConfigs(scriptId, user) {
    await PermissionChecker.requirePermission(user, 'script.view');

    // 验证剧本是否存在且有权限访问
    const script = await this.getById(scriptId, user);
    if (!script) {
      throw new Error('剧本不存在或无权限访问');
    }

    return await this.model.getScriptStoreConfigs(scriptId);
  }

  // 验证剧本数据
  validateScriptData(data) {
    const { name, type, duration, min_players, max_players } = data;
    
    if (!name || name.trim().length === 0) {
      throw new Error('剧本名称不能为空');
    }
    
    if (!type) {
      throw new Error('剧本类型不能为空');
    }
    
    if (duration && (isNaN(duration) || duration < 0)) {
      throw new Error('剧本时长必须是正数');
    }
    
    if (min_players && (isNaN(min_players) || min_players < 1)) {
      throw new Error('最少玩家数必须大于0');
    }
    
    if (max_players && (isNaN(max_players) || max_players < 1)) {
      throw new Error('最多玩家数必须大于0');
    }
    
    if (min_players && max_players && min_players > max_players) {
      throw new Error('最少玩家数不能大于最多玩家数');
    }
  }
}

module.exports = new ScriptService(); 