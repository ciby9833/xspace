/**
 * 权限检查工具类 V4
 * 基于 USER_STORE_PERMISSION_FIX_SUMMARY.md 设计理念
 * 
 * 核心原则：
 * 1. 层级只控制数据范围（平台>公司>门店）
 * 2. 权限只控制功能访问，无继承关系
 * 3. 功能入口权限检查 + 功能内部免检查
 * 4. 用户有功能权限就能完整使用该功能
 */
const { ACCOUNT_LEVELS, DATA_SCOPES, LEVEL_DATA_SCOPE_MAP } = require('../config/permissions');

class PermissionChecker {
  
  /**
   * 获取用户账户层级（只影响数据范围）
   * @param {Object} user - 用户对象
   * @returns {string} 账户层级
   */
  static getAccountLevel(user) {
    return user.account_level || ACCOUNT_LEVELS.STORE;
  }

  /**
   * 获取用户数据权限范围（基于账户层级自动确定）
   * @param {Object} user - 用户对象
   * @returns {string} 数据权限范围
   */
  static getDataScope(user) {
    const accountLevel = this.getAccountLevel(user);
    return LEVEL_DATA_SCOPE_MAP[accountLevel] || DATA_SCOPES.STORE;
  }

  /**
   * 检查数据访问权限（基于账户层级，与功能权限无关）
   * @param {Object} user - 用户对象
   * @param {Object} targetData - 目标数据对象
   * @returns {Promise<boolean>} 是否可以访问目标数据
   */
  static async canAccessData(user, targetData) {
    const accountLevel = this.getAccountLevel(user);
    
    switch (accountLevel) {
      case ACCOUNT_LEVELS.PLATFORM:
        return true; // 平台级可访问所有数据
      case ACCOUNT_LEVELS.COMPANY:
        return targetData.company_id === user.company_id; // 公司级只能访问本公司数据
      case ACCOUNT_LEVELS.STORE:
        // 门店级只能访问本门店数据
        if (targetData.store_id) {
          return targetData.store_id === user.store_id;
        }
        // 如果目标数据没有store_id，检查company_id
        return targetData.company_id === user.company_id;
      default:
        return false;
    }
  }

  /**
   * 检查功能权限（纯功能权限检查，无继承）
   * @param {Object} user - 用户对象
   * @param {string} permission - 权限
   * @returns {Promise<boolean>} 是否具有指定权限
   */
  static async hasPermission(user, permission) {
    try {
      // 超级管理员拥有所有权限
      if (user.role === 'superadmin' || (user.role_name && user.role_name === 'superadmin')) {
        return true;
      }

      // 从数据库获取用户的直接权限（不扩展，不继承）
      const userPermissions = await this.getUserPermissions(user);
      
      // 直接检查权限，不做任何扩展或继承
      return userPermissions.includes(permission);
    } catch (error) {
      console.error('权限检查失败:', error);
      return false;
    }
  }

  /**
   * 获取用户的功能权限列表（从数据库获取直接权限，无继承）
   * @param {Object} user - 用户对象
   * @returns {Promise<Array>} 权限列表
   */
  static async getUserPermissions(user) {
    try {
      // 从数据库获取直接分配的权限，不做任何扩展
      const permissionModel = require('../models/permissionModel');
      return await permissionModel.getUserPermissions(user.user_id || user.id);
    } catch (error) {
      console.error('获取用户权限失败:', error);
      return [];
    }
  }

  /**
   * 检查权限并抛出错误（用于中间件）
   * @param {Object} user - 用户对象
   * @param {string} permission - 权限
   */
  static async requirePermission(user, permission) {
    const hasPermission = await this.hasPermission(user, permission);
    if (!hasPermission) {
      throw new Error('权限不足');
    }
    return true;
  }

  /**
   * 检查数据访问权限并抛出错误
   * @param {Object} user - 用户对象
   * @param {Object} targetData - 目标数据对象
   */
  static async requireDataAccess(user, targetData) {
    const canAccess = await this.canAccessData(user, targetData);
    if (!canAccess) {
      throw new Error('无权访问该数据');
    }
    return true;
  }

  /**
   * 生成权限检查中间件（功能入口权限检查）
   * @param {string} requiredPermission - 必需的权限
   * @returns {Function} 中间件函数
   */
  static requirePermissionMiddleware(requiredPermission) {
    return async (req, res, next) => {
      try {
        await this.requirePermission(req.user, requiredPermission);
        next();
      } catch (error) {
        res.status(403).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    };
  }

  /**
   * 生成多权限检查中间件（任意一个权限满足即可）
   * @param {Array} permissions - 权限列表
   * @returns {Function} 中间件函数
   */
  static requireAnyPermissionMiddleware(permissions) {
    return async (req, res, next) => {
      try {
        let hasAnyPermission = false;
        for (const permission of permissions) {
          if (await this.hasPermission(req.user, permission)) {
            hasAnyPermission = true;
            break;
          }
        }
        
        if (!hasAnyPermission) {
          throw new Error('权限不足');
        }
        
        next();
      } catch (error) {
        res.status(403).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    };
  }

  /**
   * 检查是否可以访问指定公司数据（基于账户层级）
   * @param {Object} user - 用户对象
   * @param {string} companyId - 公司ID
   * @returns {boolean}
   */
  static canAccessCompany(user, companyId) {
    const accountLevel = this.getAccountLevel(user);
    return accountLevel === ACCOUNT_LEVELS.PLATFORM || user.company_id === companyId;
  }

  /**
   * 检查是否可以访问指定门店数据（基于账户层级）
   * @param {Object} user - 用户对象
   * @param {string} storeId - 门店ID
   * @returns {boolean}
   */
  static canAccessStore(user, storeId) {
    const accountLevel = this.getAccountLevel(user);
    
    if (accountLevel === ACCOUNT_LEVELS.PLATFORM) {
      return true; // 平台级可访问所有门店
    }
    
    if (accountLevel === ACCOUNT_LEVELS.COMPANY) {
      // 公司级需要检查门店是否属于该公司
      // 这里需要查询数据库，暂时返回true，实际使用时需要实现
      return true;
    }
    
    // 门店级只能访问自己的门店
    return user.store_id === storeId;
  }

  /**
   * 检查是否为平台管理员
   * @param {Object} user - 用户对象
   * @returns {boolean}
   */
  static isPlatformAdmin(user) {
    return user.account_level === ACCOUNT_LEVELS.PLATFORM;
  }

  /**
   * 检查是否为公司管理员
   * @param {Object} user - 用户对象
   * @returns {boolean}
   */
  static isCompanyAdmin(user) {
    return user.account_level === ACCOUNT_LEVELS.COMPANY;
  }

  /**
   * 检查是否为门店用户
   * @param {Object} user - 用户对象
   * @returns {boolean}
   */
  static isStoreUser(user) {
    return user.account_level === ACCOUNT_LEVELS.STORE;
  }
}

module.exports = PermissionChecker; 