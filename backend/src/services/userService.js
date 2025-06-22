const BaseService = require('../core/BaseService');
const userModel = require('../models/userModel');
const { hashPassword } = require('../utils/auth');
const pool = require('../database/connection');
const { ACCOUNT_LEVELS } = require('../config/permissions');

class UserService extends BaseService {
  constructor() {
    super(userModel, '用户');
  }

  // 获取用户详情
  async getUserProfile(userId) {
    const user = await userModel.findByIdWithCompanyInfo(userId);
    
    if (!user) {
      throw new Error('用户不存在');
    }
    
    // 获取用户权限
    const PermissionChecker = require('../utils/permissions');
    const permissions = await PermissionChecker.getUserPermissions(user);
    
    // 格式化时间字段并添加权限信息
    const formattedUser = this.formatTimeFields(user);
    
    return {
      ...formattedUser,
      permissions, // 添加权限列表
      data_scope: PermissionChecker.getDataScope(user) // 添加数据范围
    };
  }

  // 获取用户详情（管理员查看其他用户）
  async getUserDetail(userId, currentUser) {
    const user = await userModel.findByIdWithCompanyInfo(userId);
    
    if (!user) {
      throw new Error('用户不存在');
    }

    // 简化权限检查：只检查层级关系
    if (!this.canAccessUser(currentUser, user)) {
      throw new Error('权限不足');
    }
    
    // 格式化时间字段并移除敏感信息
    const formattedUser = this.formatTimeFields(user);
    delete formattedUser.password_hash;
    
    return formattedUser;
  }

  // 获取用户列表
  async getUserList(user, filters = {}) {
    // 🆕 权限检查 - 必须有用户查看权限
    const PermissionChecker = require('../utils/permissions');
    const hasPermission = await PermissionChecker.hasPermission(user, 'user.view');
    if (!hasPermission) {
      throw new Error('权限不足：无法查看用户信息');
    }

    const accountLevel = user.account_level;
    let users;
    
    // 注释：不再默认设置 is_active = true，让前端用户自己选择筛选条件
    // 如果前端没有传递 is_active 参数，则显示所有用户（包括禁用的）
    
    // 从查询参数中提取 storeId（向后兼容）
    const storeId = filters.store_id;
    
    switch (accountLevel) {
      case ACCOUNT_LEVELS.PLATFORM:
        // 平台级可以查看所有用户
        users = await userModel.findAll(filters);
        break;
      case ACCOUNT_LEVELS.COMPANY:
        // 公司级只能查看本公司用户
        users = await userModel.findByCompanyId(user.company_id, filters);
        break;
      case ACCOUNT_LEVELS.STORE:
        // 门店级只能查看本门店用户
        if (storeId) {
          users = await userModel.findByStoreId(storeId, filters);
        } else {
          // 获取用户关联的所有门店
          const userStores = await userModel.getUserStores(user.user_id);
          const storeIds = userStores.map(store => store.id);
          if (storeIds.length > 0) {
            users = await userModel.findByStoreId(storeIds[0], filters); // 简化：只查第一个门店
          } else {
            users = [];
          }
        }
        break;
      default:
        users = [];
    }
    
    return users.map(user => this.formatTimeFields(user));
  }

  // 创建用户 - 简化版本
  async createUser(userData, currentUser) {
    // 🆕 权限检查 - 必须有用户创建权限
    const PermissionChecker = require('../utils/permissions');
    const hasPermission = await PermissionChecker.hasPermission(currentUser, 'user.create');
    if (!hasPermission) {
      throw new Error('权限不足：无法创建用户');
    }

    const { email, phone, position, role_id, account_level, company_id, store_id } = userData;

    // 基本验证
    const emailExists = await userModel.emailExists(email);
    if (emailExists) {
      throw new Error('该邮箱已被使用');
    }

    if (phone) {
      const phoneExists = await userModel.phoneExists(phone);
      if (phoneExists) {
        throw new Error('该手机号已被使用');
      }
    }

    // 层级权限检查
    if (!this.canCreateUserLevel(currentUser, account_level)) {
      throw new Error(`权限不足：无法创建 ${account_level} 级别的账户`);
    }

    // 确定目标公司ID
    let targetCompanyId = this.determineTargetCompanyId(currentUser, account_level, company_id);
    
    // 确定目标门店ID
    let targetStoreIds = [];
    if (store_id && account_level === ACCOUNT_LEVELS.STORE) {
      targetStoreIds = Array.isArray(store_id) ? store_id : [store_id];
    }

    // 验证角色ID是否有效且可管理
    if (role_id) {
      const permissionModel = require('../models/permissionModel');
      const role = await permissionModel.getRoleById(role_id, currentUser.company_id, currentUser.account_level);
      if (!role) {
        throw new Error('无效的角色或无权限分配该角色');
      }
      
      // 检查角色层级是否匹配账户层级
      if (role.role_level !== account_level) {
        throw new Error(`角色层级(${role.role_level})与账户层级(${account_level})不匹配`);
      }
    }

    // 验证公司和门店的访问权限
    if (targetCompanyId && !this.canAccessCompany(currentUser, targetCompanyId)) {
      throw new Error('权限不足：无法在指定公司创建用户');
    }

    // 使用默认密码
    const password = userData.password || 'temp123456';
    const password_hash = await hashPassword(password);

    // 🔧 数据清理：处理空字符串字段，转换为null
    const cleanedUserData = { ...userData };
    
    // 处理position字段：空字符串转换为null
    if (cleanedUserData.position === '') {
      cleanedUserData.position = null;
    }
    
    // 处理phone字段：空字符串转换为null
    if (cleanedUserData.phone === '') {
      cleanedUserData.phone = null;
    }

    // 创建用户数据
    const newUserData = {
      ...cleanedUserData,
      company_id: targetCompanyId,
      position: cleanedUserData.position,
      account_level: account_level || ACCOUNT_LEVELS.STORE,
      role_id: role_id,
      password_hash,
      timezone: cleanedUserData.timezone || 'Asia/Jakarta',
      stores: targetStoreIds
    };

    const newUser = await userModel.create(newUserData);
    return this.formatTimeFields(newUser);
  }

  // 更新用户
  async updateUser(userId, updateData, currentUser) {
    // 🆕 权限检查 - 必须有用户编辑权限
    const PermissionChecker = require('../utils/permissions');
    const hasPermission = await PermissionChecker.hasPermission(currentUser, 'user.edit');
    if (!hasPermission) {
      throw new Error('权限不足：无法编辑用户');
    }

    // 获取目标用户信息
    const targetUser = await userModel.findByIdWithCompanyInfo(userId);
    if (!targetUser) {
      throw new Error('用户不存在');
    }

    // 检查是否可以编辑该用户
    if (!this.canEditUser(currentUser, targetUser)) {
      throw new Error('权限不足');
    }

    // 🔧 数据清理：处理空字符串字段，转换为null
    const cleanedData = { ...updateData };
    
    // 处理position字段：空字符串转换为null
    if (cleanedData.position === '') {
      cleanedData.position = null;
    }
    
    // 处理phone字段：空字符串转换为null
    if (cleanedData.phone === '') {
      cleanedData.phone = null;
    }
    
    // 处理其他可能的空字符串字段
    const nullableFields = ['department_id', 'timezone'];
    nullableFields.forEach(field => {
      if (cleanedData[field] === '') {
        cleanedData[field] = null;
      }
    });

    // 更新用户信息
    const updatedUser = await userModel.update(userId, cleanedData);
    return this.formatTimeFields(updatedUser);
  }

  // 删除用户（软删除）
  async deleteUser(userId, currentUser) {
    // 🆕 权限检查 - 必须有用户删除权限
    const PermissionChecker = require('../utils/permissions');
    const hasPermission = await PermissionChecker.hasPermission(currentUser, 'user.delete');
    if (!hasPermission) {
      throw new Error('权限不足：无法删除用户');
    }

    // 获取目标用户信息
    const targetUser = await userModel.findByIdWithCompanyInfo(userId);
    if (!targetUser) {
      throw new Error('用户不存在');
    }

    // 检查是否可以删除该用户
    if (!this.canDeleteUser(currentUser, targetUser)) {
      throw new Error('权限不足');
    }

    // 执行软删除
    await userModel.update(userId, { is_active: false });

    return {
      success: true,
      message: '用户删除成功'
    };
  }

  // 重置用户密码
  async resetUserPassword(userId, newPassword, currentUser) {
    // 🆕 权限检查 - 必须有用户编辑权限
    const PermissionChecker = require('../utils/permissions');
    const hasPermission = await PermissionChecker.hasPermission(currentUser, 'user.edit');
    if (!hasPermission) {
      throw new Error('权限不足：无法重置用户密码');
    }

    // 获取目标用户信息
    const targetUser = await userModel.findByIdWithCompanyInfo(userId);
    if (!targetUser) {
      throw new Error('用户不存在');
    }

    // 检查是否可以重置该用户密码
    if (!this.canEditUser(currentUser, targetUser)) {
      throw new Error('权限不足');
    }

    // 加密新密码
    const password_hash = await hashPassword(newPassword || 'temp123456');

    // 更新密码
    await userModel.update(userId, { password_hash });

    return {
      success: true,
      message: '密码重置成功'
    };
  }

  // 获取可管理的角色列表 - 根据目标用户层级获取
  async getManageableRoles(currentUser, targetAccountLevel = null, targetCompanyId = null) {
    try {
      const permissionModel = require('../models/permissionModel');
      
      // 如果没有指定目标层级，使用当前用户的层级（向后兼容）
      if (!targetAccountLevel) {
        targetAccountLevel = currentUser.account_level;
        targetCompanyId = currentUser.company_id;
      }
      
      // 检查当前用户是否有权限管理目标层级的角色
      if (!this.canCreateUserLevel(currentUser, targetAccountLevel)) {
        return [];
      }
      
      // 确定查询的公司ID
      let queryCompanyId = targetCompanyId;
      if (targetAccountLevel === ACCOUNT_LEVELS.PLATFORM) {
        queryCompanyId = null; // 平台级角色不归属任何公司
      } else if (currentUser.account_level !== ACCOUNT_LEVELS.PLATFORM) {
        // 非平台用户只能管理自己公司的角色
        queryCompanyId = currentUser.company_id;
      }
      
      // 获取指定层级的角色
      const roles = await permissionModel.getRolesByCompany(queryCompanyId, targetAccountLevel, currentUser.user_id);
      
      // 过滤出目标层级的角色
      const filteredRoles = roles.filter(role => role.role_level === targetAccountLevel);
      
      return filteredRoles.map(role => ({
        id: role.id,
        name: role.name,
        display_name: role.display_name,
        role_level: role.role_level
      }));
    } catch (error) {
      console.error('获取可管理角色失败:', error);
      return [];
    }
  }

  // 获取可创建的账户层级列表
  async getCreatableAccountLevels(currentUser) {
    const currentLevel = currentUser.account_level;
    let creatableLevels = [];
    
    switch (currentLevel) {
      case ACCOUNT_LEVELS.PLATFORM:
        creatableLevels = [ACCOUNT_LEVELS.PLATFORM, ACCOUNT_LEVELS.COMPANY, ACCOUNT_LEVELS.STORE];
        break;
      case ACCOUNT_LEVELS.COMPANY:
        creatableLevels = [ACCOUNT_LEVELS.COMPANY, ACCOUNT_LEVELS.STORE];
        break;
      case ACCOUNT_LEVELS.STORE:
        creatableLevels = [ACCOUNT_LEVELS.STORE];
        break;
    }
    
    return {
      current_level: currentLevel,
      creatable_levels: creatableLevels,
      level_descriptions: {
        platform: '平台级账户 - 可管理所有数据',
        company: '公司级账户 - 可管理本公司数据', 
        store: '门店级账户 - 可管理本门店数据'
      }
    };
  }

  // 获取可选公司列表
  async getAvailableCompanies(currentUser) {
    if (currentUser.account_level === ACCOUNT_LEVELS.PLATFORM) {
      // 平台管理员可以选择所有公司
      const query = `
        SELECT id, name, type
        FROM company 
        ORDER BY name
      `;
      const result = await pool.query(query);
      return result.rows;
    } else {
      // 其他用户只能选择自己的公司
      const query = `
        SELECT id, name, type
        FROM company 
        WHERE id = $1
      `;
      const result = await pool.query(query, [currentUser.company_id]);
      return result.rows;
    }
  }

  // 获取可选门店列表
  async getAvailableStores(currentUser, companyId = null) {
    // 如果是平台管理员且没有指定公司ID，返回所有门店
    if (currentUser.account_level === ACCOUNT_LEVELS.PLATFORM && !companyId) {
      const query = `
        SELECT s.id, s.name, s.address, c.name as company_name
        FROM store s
        LEFT JOIN company c ON s.company_id = c.id
        ORDER BY c.name, s.name
      `;
      const result = await pool.query(query);
      return result.rows;
    }
    
    const targetCompanyId = companyId || currentUser.company_id;
    
    if (!targetCompanyId) {
      return []; // 如果没有公司ID，返回空数组
    }
    
    if (!this.canAccessCompany(currentUser, targetCompanyId)) {
      throw new Error('权限不足：无法访问指定公司的门店');
    }

    const query = `
      SELECT id, name, address
      FROM store 
      WHERE company_id = $1
      ORDER BY name
    `;
    const result = await pool.query(query, [targetCompanyId]);
    return result.rows;
  }

  // 获取可选岗位列表
  async getAvailablePositions() {
    return [
      { value: 'Store Manager', label: 'Store Manager' },
      { value: 'Customer Support', label: 'Customer Support' },
      { value: 'Game Host', label: 'Game Host' },
      { value: 'Supervisor', label: 'Supervisor' },
      { value: 'Finance', label: 'Finance' },
      { value: 'Finance Manager', label: 'Finance Manager' },
      { value: 'Person in Charge', label: 'Person in Charge' }
    ];
  }

  // ========== 权限检查辅助方法 ==========

  // 检查是否可以访问用户
  canAccessUser(currentUser, targetUser) {
    const currentLevel = currentUser.account_level;
    const targetLevel = targetUser.account_level;

    // 平台级可以访问所有用户
    if (currentLevel === ACCOUNT_LEVELS.PLATFORM) {
      return true;
    }

    // 公司级只能访问本公司用户
    if (currentLevel === ACCOUNT_LEVELS.COMPANY) {
      return currentUser.company_id === targetUser.company_id;
    }

    // 门店级只能访问本门店用户
    if (currentLevel === ACCOUNT_LEVELS.STORE) {
      return currentUser.company_id === targetUser.company_id && 
             targetLevel === ACCOUNT_LEVELS.STORE;
    }

    return false;
  }

  // 检查是否可以创建指定层级的用户
  canCreateUserLevel(currentUser, targetLevel) {
    const currentLevel = currentUser.account_level;

    switch (currentLevel) {
      case ACCOUNT_LEVELS.PLATFORM:
        return [ACCOUNT_LEVELS.PLATFORM, ACCOUNT_LEVELS.COMPANY, ACCOUNT_LEVELS.STORE].includes(targetLevel);
      case ACCOUNT_LEVELS.COMPANY:
        return [ACCOUNT_LEVELS.COMPANY, ACCOUNT_LEVELS.STORE].includes(targetLevel);
      case ACCOUNT_LEVELS.STORE:
        return targetLevel === ACCOUNT_LEVELS.STORE;
      default:
        return false;
    }
  }

  // 检查是否可以编辑用户
  canEditUser(currentUser, targetUser) {
    if (!this.canAccessUser(currentUser, targetUser)) {
      return false;
    }

    // 不能编辑比自己级别高的用户
    const levelHierarchy = { 'store': 1, 'company': 2, 'platform': 3 };
    const currentLevel = levelHierarchy[currentUser.account_level] || 1;
    const targetLevel = levelHierarchy[targetUser.account_level] || 1;

    return currentLevel >= targetLevel;
  }

  // 检查是否可以删除用户
  canDeleteUser(currentUser, targetUser) {
    // 不能删除自己
    if (currentUser.user_id === targetUser.id) {
      return false;
    }

    return this.canEditUser(currentUser, targetUser);
  }

  // 检查是否可以访问公司
  canAccessCompany(currentUser, companyId) {
    if (currentUser.account_level === ACCOUNT_LEVELS.PLATFORM) {
      return true;
    }

    return currentUser.company_id === companyId;
  }

  // 确定目标公司ID
  determineTargetCompanyId(currentUser, targetLevel, providedCompanyId) {
    if (targetLevel === ACCOUNT_LEVELS.PLATFORM) {
      return null; // 平台级用户不归属任何公司
    }

    if (currentUser.account_level === ACCOUNT_LEVELS.PLATFORM) {
      // 平台级用户创建公司/门店级账户时必须指定公司
      if (!providedCompanyId || providedCompanyId.trim() === '') {
        throw new Error('创建公司级或门店级账户时必须选择公司');
      }
      return providedCompanyId;
    } else {
      // 公司级和门店级用户只能在自己的公司下创建用户
      return currentUser.company_id;
    }
  }

  // 🆕 获取门店关联的用户（用于Game Host选择）
  async getUsersByStore(storeId, currentUser) {
    // 权限检查：确保用户可以访问该门店
    const storeModel = require('../models/storeModel');
    const store = await storeModel.findById(storeId);
    
    if (!store) {
      throw new Error('门店不存在');
    }
    
    // 🔧 功能权限检查：检查用户是否有任何需要门店用户信息的功能权限
    const PermissionChecker = require('../utils/permissions');
    
    // 检查用户是否具有任何可能需要门店用户信息的功能权限
    // 这些功能在正常使用过程中需要访问门店用户数据
    const hasGameHostPermission = await PermissionChecker.hasPermission(currentUser, 'game_host.view');
    const hasGameHostManagePermission = await PermissionChecker.hasPermission(currentUser, 'game_host.manage');
    const hasOrderPermission = await PermissionChecker.hasPermission(currentUser, 'order.view');
    const hasOrderManagePermission = await PermissionChecker.hasPermission(currentUser, 'order.manage');
    const hasStoreViewPermission = await PermissionChecker.hasPermission(currentUser, 'store.view');
    const hasUserManagePermission = await PermissionChecker.hasPermission(currentUser, 'user.manage');
    
    // 如果用户有任何一个相关功能权限，允许访问门店用户信息
    // 原则：有功能权限 = 可以完整使用该功能 = 可以访问功能所需的支撑数据
    if (!hasGameHostPermission && !hasGameHostManagePermission && 
        !hasOrderPermission && !hasOrderManagePermission && 
        !hasStoreViewPermission && !hasUserManagePermission) {
      throw new Error('权限不足：无法查看门店用户信息');
    }
    
    // 🔧 数据访问控制：基于账户层级和公司归属
    if (currentUser.account_level === ACCOUNT_LEVELS.PLATFORM) {
      // 平台级用户可以访问所有门店
    } else if (currentUser.account_level === ACCOUNT_LEVELS.COMPANY) {
      // 公司级用户只能访问本公司的门店
      if (currentUser.company_id !== store.company_id) {
        throw new Error('权限不足：无法访问其他公司的门店');
      }
    } else if (currentUser.account_level === ACCOUNT_LEVELS.STORE) {
      // 门店级用户的数据访问控制
      // 1. 必须是同一公司
      if (currentUser.company_id !== store.company_id) {
        throw new Error('权限不足：无法访问其他公司的门店');
      }
      
      // 2. 如果用户有功能权限（如game_host、order等），允许访问本公司门店数据
      // 这是为了支持跨门店的功能操作（如订单处理、Game Host管理等）
      if (hasGameHostPermission || hasOrderPermission) {
        // 允许访问：用户有相关功能权限，可以访问本公司门店数据
      } else {
        // 3. 如果没有特殊功能权限，检查门店关联
        const userStores = await userModel.getUserStores(currentUser.user_id);
        const accessibleStoreIds = userStores.map(s => s.id);
        if (!accessibleStoreIds.includes(parseInt(storeId))) {
          throw new Error('权限不足：无法访问该门店');
        }
      }
    }
    
    // 获取门店关联的用户（只获取激活用户）
    const users = await userModel.findByStoreId(storeId, { is_active: true });
    
    // 修正字段映射
    return users
      .map(user => ({
        user_id: user.id, // 修正：数据库返回的是id，映射为user_id
        username: user.name, // 修正：数据库返回的是name，映射为username
        real_name: user.name, // 修正：使用name作为real_name（如果数据库中没有单独的real_name字段）
        email: user.email,
        phone: user.phone,
        account_level: user.account_level,
        role_name: user.role_name
      }));
  }
}

module.exports = new UserService();