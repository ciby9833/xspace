const BaseService = require('../core/BaseService');
const userModel = require('../models/userModel');
const { comparePassword, generateToken } = require('../utils/auth');
const PermissionChecker = require('../utils/permissions');

class AuthService extends BaseService {
  constructor() {
    super(userModel, '认证');
  }

  async login(email, password) {
    console.log(`🔍 尝试登录用户: ${email}`);
    
    // 查询用户信息
    const user = await userModel.findByEmailWithCompanyInfo(email);
    
    console.log(`🔍 查询结果:`, user ? `找到用户 ${user.name}` : '未找到用户');
    
    if (!user) {
      throw new Error('用户不存在或已被禁用');
    }

    // 检查账号是否被禁用
    if (!user.is_active) {
      console.log(`🚫 账号已被禁用: ${user.name} (${user.email})`);
      throw new Error('账号已被禁用，请联系管理员');
    }

    // 验证密码
    console.log(`🔍 验证密码...`);
    const isValidPassword = await comparePassword(password, user.password_hash);
    console.log(`🔍 密码验证结果: ${isValidPassword ? '正确' : '错误'}`);
    
    if (!isValidPassword) {
      throw new Error('密码错误');
    }

    // 使用数据库中存储的账户级别，而不是基于角色推断
    const accountLevel = user.account_level || 'store';
    
    // 获取用户权限（基于账户级别和权限分离）
    let permissions = [];
    try {
      // 获取用户权限（无权限继承，只获取直接分配的权限）
      const userForPermission = {
        user_id: user.id,
        id: user.id, // 添加id字段以兼容不同的权限检查方法
        role: user.role,
        role_id: user.role_id,
        account_level: accountLevel,
        company_id: user.company_id
      };
      
      // 获取用户直接分配的权限
      permissions = await PermissionChecker.getUserPermissions(userForPermission);
      
      console.log(`🔑 用户角色: ${user.role || user.role_name}`);
      console.log(`🔑 账户级别: ${accountLevel} (来自数据库)`);
      console.log(`🔑 账号状态: ${user.is_active ? '激活' : '禁用'}`);
      console.log(`🔑 获取到权限:`, permissions);
    } catch (error) {
      console.error('获取权限失败:', error.message);
      // 获取权限失败不阻断登录，但权限为空
      permissions = [];
    }

    // 更新最后登录时间
    await userModel.updateLastLogin(user.id);

    // 生成JWT Token（包含账户级别信息）
    const token = await generateToken(user);

    // 格式化时间字段
    const formattedUser = this.formatTimeFields(user);

    // 🔧 正确处理门店级用户的门店关联信息
    let primaryStoreId = formattedUser.store_id;
    let primaryStoreName = formattedUser.store_name;
    
    // 如果store_id为null且用户有门店关联（通过user_stores表），使用主要门店
    if (!primaryStoreId && formattedUser.stores && Array.isArray(formattedUser.stores) && formattedUser.stores.length > 0) {
      // 过滤掉null值的门店
      const validStores = formattedUser.stores.filter(store => store && store.id);
      if (validStores.length > 0) {
        // 优先选择标记为primary的门店，否则选择第一个
        const primaryStore = validStores.find(store => store.is_primary) || validStores[0];
        primaryStoreId = primaryStore.id;
        primaryStoreName = primaryStore.name;
      }
    }

    // 根据账户级别返回用户信息
    const userInfo = {
      id: formattedUser.id,
      name: formattedUser.name,
      email: formattedUser.email,
      phone: formattedUser.phone,
      role_id: formattedUser.role_id,
      role_name: formattedUser.role_name,
      role_display_name: formattedUser.role_display_name,
      account_level: accountLevel, // 使用推断的账户级别
      company_id: formattedUser.company_id, // 添加公司ID
      company_name: formattedUser.company_name,
      store_id: primaryStoreId, // 使用处理后的门店ID
      store_name: primaryStoreName, // 使用处理后的门店名称
      stores: formattedUser.stores, // 包含完整的门店列表
      last_login_at: formattedUser.last_login_at,
      is_active: formattedUser.is_active, // 添加账号状态
      permissions, // 返回当前权限列表供前端使用
      data_scope: PermissionChecker.getDataScope({ ...user, account_level: accountLevel }), // 数据范围
    };

    return {
      token,
      user: userInfo
    };
  }


}

module.exports = new AuthService(); 