const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const PermissionChecker = require('./permissions');

// 安全引用，避免文件不存在时报错
let DateTimeUtils, I18nUtils;

try {
  DateTimeUtils = require('./datetime');
  I18nUtils = require('./i18n');
} catch (error) {
  console.warn('⚠️ 时区或多语言模块加载失败，使用默认处理:', error.message);
}

/**
 * 生成JWT Token
 */
const generateToken = async (user) => {
  // 获取用户权限（无权限继承，只获取直接分配的权限）
  const permissions = await PermissionChecker.getUserPermissions(user);
  const dataScope = PermissionChecker.getDataScope(user);
  
  // 🔧 正确处理门店级用户的门店关联
  let primaryStoreId = user.store_id; // 优先使用直接的store_id字段
  
  // 如果store_id为null且用户有门店关联（通过user_stores表），使用主要门店
  if (!primaryStoreId && user.stores && Array.isArray(user.stores) && user.stores.length > 0) {
    // 过滤掉null值的门店
    const validStores = user.stores.filter(store => store && store.id);
    if (validStores.length > 0) {
      // 优先选择标记为primary的门店，否则选择第一个
      const primaryStore = validStores.find(store => store.is_primary) || validStores[0];
      primaryStoreId = primaryStore.id;
    }
  }
  
  const payload = {
    user_id: user.id,
    role_id: user.role_id,
    role_name: user.role_name, // 包含角色名称用于显示
    account_level: user.account_level,
    company_id: user.company_id,
    store_id: primaryStoreId, // 使用处理后的门店ID
    department_id: user.department_id,
    permissions,
    data_scope: dataScope
  };

  // 使用jwt.sign的expiresIn选项，支持字符串格式如'24h', '7d'等
  const expiresIn = process.env.JWT_EXPIRES_IN || '24h';
  
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
};

/**
 * 验证JWT Token
 */
const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

/**
 * 密码加密
 */
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

/**
 * 密码验证
 */
const comparePassword = async (password, hash) => {
  return bcrypt.compare(password, hash);
};

/**
 * JWT认证中间件
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: '未提供认证令牌',
        timestamp: new Date().toISOString()
      });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        error: '无效的认证令牌格式',
        timestamp: new Date().toISOString()
      });
    }

    const decoded = verifyToken(token);
    
    // 检查token是否过期
    if (decoded.exp && decoded.exp < Date.now() / 1000) {
      return res.status(401).json({
        success: false,
        error: '认证令牌已过期',
        timestamp: new Date().toISOString()
      });
    }

    // 将用户信息添加到请求对象
    req.user = {
      id: decoded.user_id,        // 使用id字段保持一致性
      user_id: decoded.user_id,   // 保持向后兼容
      role_id: decoded.role_id,
      role_name: decoded.role_name,
      account_level: decoded.account_level,
      company_id: decoded.company_id,
      store_id: decoded.store_id,
      department_id: decoded.department_id,
      permissions: decoded.permissions,
      data_scope: decoded.data_scope
    };

    next();
  } catch (error) {
    console.error('Token验证失败:', error);
    res.status(401).json({
      success: false,
      error: '无效的认证令牌',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * 权限检查中间件
 */
const checkPermission = (requiredPermission) => {
  return async (req, res, next) => {
    try {
      const hasPermission = await PermissionChecker.hasPermission(req.user, requiredPermission);
      
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          error: '权限不足',
          timestamp: new Date().toISOString()
        });
      }
      
      next();
    } catch (error) {
      console.error('权限检查失败:', error);
      res.status(500).json({
        success: false,
        error: '权限检查失败',
        timestamp: new Date().toISOString()
      });
    }
  };
};

/**
 * 数据权限检查中间件（基于账户层级）
 */
const checkDataScope = (resourceType) => {
  return async (req, res, next) => {
    try {
      const dataScope = PermissionChecker.getDataScope(req.user);
      
      // 根据资源类型和数据范围添加查询条件
      switch (dataScope) {
        case 'all':
          // 可以访问所有数据
          break;
        case 'company':
          req.query.company_id = req.user.company_id;
          break;
        case 'store':
          req.query.store_id = req.user.store_id;
          break;
        case 'department':
          req.query.department_id = req.user.department_id;
          break;
      }
      
      next();
    } catch (error) {
      console.error('数据权限检查失败:', error);
      res.status(500).json({
        success: false,
        error: '数据权限检查失败',
        timestamp: new Date().toISOString()
      });
    }
  };
};

/**
 * 获取当前用户权限
 */
const getCurrentUserPermissions = async (req, res) => {
  try {
    const permissions = await PermissionChecker.getUserPermissions(req.user);
    const dataScope = PermissionChecker.getDataScope(req.user);
    
    res.json({
      success: true,
      data: {
        permissions,
        data_scope: dataScope,
        user: {
          id: req.user.user_id,
          role: req.user.role_name,
          account_level: req.user.account_level,
          company_id: req.user.company_id,
          store_id: req.user.store_id,
          department_id: req.user.department_id
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('获取用户权限失败:', error);
    res.status(500).json({
      success: false,
      error: '获取用户权限失败',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * 刷新权限（重新生成token）
 */
const refreshPermissions = async (req, res) => {
  try {
    // 重新生成token以刷新权限
    const userModel = require('../models/userModel');
    const user = await userModel.findByIdWithCompanyInfo(req.user.user_id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: '用户不存在',
        timestamp: new Date().toISOString()
      });
    }

    const newToken = await generateToken(user);
    
    res.json({
      success: true,
      message: '权限刷新成功',
      data: {
        token: newToken
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('刷新权限失败:', error);
    res.status(500).json({
      success: false,
      error: '刷新权限失败',
      timestamp: new Date().toISOString()
    });
  }
};

module.exports = {
  generateToken,
  verifyToken,
  hashPassword,
  comparePassword,
  authenticateToken,
  checkPermission,
  checkDataScope,
  getCurrentUserPermissions,
  refreshPermissions
};