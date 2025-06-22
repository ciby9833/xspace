const storeModel = require('../models/storeModel');
const companyModel = require('../models/companyModel');
const { ACCOUNT_LEVELS } = require('../config/permissions');
const PermissionChecker = require('../utils/permissions');

class StoreService {
  // 获取门店列表（基于用户权限）
  async getStoreList(user, companyId = null, filters = {}) {
    try {
      // 权限检查：有门店查看权限或订单管理权限的用户都可以查看门店信息
      const hasStorePermission = await PermissionChecker.hasPermission(user, 'store.view');
      const hasOrderPermission = await PermissionChecker.hasPermission(user, 'order.view');
      
      if (!hasStorePermission && !hasOrderPermission) {
        throw new Error('权限不足：无法查看门店信息');
      }

      let stores = [];

      if (user.account_level === ACCOUNT_LEVELS.PLATFORM) {
        // 平台用户可以查看所有门店或指定公司的门店
        if (companyId) {
          stores = await storeModel.findByCompanyId(companyId);
        } else {
          stores = await storeModel.findAllWithCompanyInfo();
        }
      } else if (user.account_level === ACCOUNT_LEVELS.COMPANY) {
        // 公司用户只能查看本公司门店
        stores = await storeModel.findByCompanyId(user.company_id);
      } else {
        // 门店用户只能查看自己关联的门店
        stores = await storeModel.getAccessibleStores(user.id, user.account_level, user.company_id);
      }

      // 应用状态筛选（默认显示所有门店，包括禁用的）
      if (filters.is_active !== undefined) {
        stores = stores.filter(store => store.is_active === filters.is_active);
      }

      return {
        stores,
        total: stores.length,
        user_level: user.account_level
      };
    } catch (error) {
      console.error('获取门店列表失败:', error);
      throw error;
    }
  }

  // 获取门店详情
  async getStoreDetail(storeId, user) {
    try {
      // 权限检查：有门店查看权限或订单管理权限的用户都可以查看门店详情
      const hasStorePermission = await PermissionChecker.hasPermission(user, 'store.view');
      const hasOrderPermission = await PermissionChecker.hasPermission(user, 'order.view');
      
      if (!hasStorePermission && !hasOrderPermission) {
        throw new Error('权限不足：无法查看门店详情');
      }

      let store = null;

      if (user.account_level === ACCOUNT_LEVELS.PLATFORM) {
        // 平台用户可以查看任意门店
        store = await storeModel.findById(storeId);
      } else if (user.account_level === ACCOUNT_LEVELS.COMPANY) {
        // 公司用户只能查看本公司门店
        store = await storeModel.findByIdAndCompany(storeId, user.company_id);
      } else {
        // 门店用户只能查看自己关联的门店
        const accessibleStores = await storeModel.getAccessibleStores(user.id, user.account_level, user.company_id);
        store = accessibleStores.find(s => s.id === storeId) || null;
      }

      if (!store) {
        throw new Error('门店不存在或无权限访问');
      }

      // 获取门店统计信息
      const stats = await storeModel.getStoreStats(storeId);
      
      // 获取门店用户列表（如果有权限）
      let users = [];
      const hasUserViewPermission = await PermissionChecker.hasPermission(user, 'user.view');
      if (hasUserViewPermission) {
        users = await storeModel.getStoreUsers(storeId);
      }

      return {
        ...store,
        stats,
        users
      };
    } catch (error) {
      console.error('获取门店详情失败:', error);
      throw error;
    }
  }

  // 创建门店
  async createStore(storeData, user) {
    try {
      // 权限检查
      const hasPermission = await PermissionChecker.hasPermission(user, 'store.create');
      if (!hasPermission) {
        throw new Error('权限不足：无法创建门店');
      }

      let { company_id, name, address, business_hours, timezone } = storeData;

      // 验证必填字段
      if (!name) {
        throw new Error('门店名称不能为空');
      }

      // 如果没有提供company_id，且用户是公司管理员，使用用户的公司ID
      if (!company_id && user.account_level === ACCOUNT_LEVELS.COMPANY) {
        company_id = user.company_id;
      }

      // 验证company_id
      if (!company_id) {
        throw new Error('公司ID不能为空');
      }

      // 权限检查：只有平台级和公司级用户可以创建门店
      if (user.account_level === ACCOUNT_LEVELS.STORE) {
        throw new Error('权限不足：门店级用户无法创建门店');
      }

      // 公司级用户只能在本公司创建门店
      if (user.account_level === ACCOUNT_LEVELS.COMPANY && user.company_id !== company_id) {
        throw new Error('权限不足：只能在本公司创建门店');
      }

      // 验证公司是否存在
      const company = await companyModel.findById(company_id);
      if (!company) {
        throw new Error('指定的公司不存在');
      }

      // 检查门店名称在公司内是否唯一
      const isNameUnique = await storeModel.checkNameUnique(company_id, name);
      if (!isNameUnique) {
        throw new Error('门店名称在该公司内已存在');
      }

      // 创建门店 - 自动设置默认时区
      const newStore = await storeModel.create({
        company_id,
        name,
        address,
        business_hours,
        timezone: 'Asia/Jakarta' // 统一使用印尼时区
      });

      return {
        store: newStore,
        message: '门店创建成功'
      };
    } catch (error) {
      console.error('创建门店失败:', error);
      throw error;
    }
  }

  // 更新门店信息
  async updateStore(storeId, updateData, user) {
    try {
      // 权限检查
      const hasPermission = await PermissionChecker.hasPermission(user, 'store.edit');
      if (!hasPermission) {
        throw new Error('权限不足：无法编辑门店信息');
      }

      // 获取门店信息进行权限验证
      let store = null;
      if (user.account_level === ACCOUNT_LEVELS.PLATFORM) {
        store = await storeModel.findById(storeId);
      } else if (user.account_level === ACCOUNT_LEVELS.COMPANY) {
        store = await storeModel.findByIdAndCompany(storeId, user.company_id);
      } else {
        // 门店用户只能编辑自己关联的门店
        const accessibleStores = await storeModel.getAccessibleStores(user.id, user.account_level, user.company_id);
        store = accessibleStores.find(s => s.id === storeId) || null;
      }

      if (!store) {
        throw new Error('门店不存在或无权限访问');
      }

      const { name, address, business_hours, is_active } = updateData;

      // 如果更新名称，检查唯一性
      if (name && name !== store.name) {
        const isNameUnique = await storeModel.checkNameUnique(store.company_id, name, storeId);
        if (!isNameUnique) {
          throw new Error('门店名称在该公司内已存在');
        }
      }

      // 更新门店信息
      const updatedStore = await storeModel.update(storeId, {
        name: name || store.name,
        address: address !== undefined ? address : store.address,
        business_hours: business_hours !== undefined ? business_hours : store.business_hours,
        timezone: store.timezone, // 保持原有时区，不允许修改
        is_active: is_active !== undefined ? is_active : store.is_active
      });

      return {
        store: updatedStore,
        message: '门店信息更新成功'
      };
    } catch (error) {
      console.error('更新门店信息失败:', error);
      throw error;
    }
  }

  // 删除门店
  async deleteStore(storeId, user) {
    try {
      // 权限检查
      const hasPermission = await PermissionChecker.hasPermission(user, 'store.delete');
      if (!hasPermission) {
        throw new Error('权限不足：无法删除门店');
      }

      // 获取门店信息进行权限验证
      let store = null;
      if (user.account_level === ACCOUNT_LEVELS.PLATFORM) {
        store = await storeModel.findById(storeId);
      } else if (user.account_level === ACCOUNT_LEVELS.COMPANY) {
        store = await storeModel.findByIdAndCompany(storeId, user.company_id);
      } else {
        throw new Error('权限不足：门店级用户无法删除门店');
      }

      if (!store) {
        throw new Error('门店不存在或无权限访问');
      }

      // 删除门店
      await storeModel.delete(storeId);

      return {
        message: '门店删除成功'
      };
    } catch (error) {
      console.error('删除门店失败:', error);
      throw error;
    }
  }

  // 获取门店用户列表
  async getStoreUsers(storeId, user) {
    try {
      // 权限检查
      const hasPermission = await PermissionChecker.hasPermission(user, 'user.view');
      if (!hasPermission) {
        throw new Error('权限不足：无法查看用户信息');
      }

      // 验证用户是否有权限访问该门店
      let store = null;
      if (user.account_level === ACCOUNT_LEVELS.PLATFORM) {
        store = await storeModel.findById(storeId);
      } else if (user.account_level === ACCOUNT_LEVELS.COMPANY) {
        store = await storeModel.findByIdAndCompany(storeId, user.company_id);
      } else {
        const accessibleStores = await storeModel.getAccessibleStores(user.id, user.account_level, user.company_id);
        store = accessibleStores.find(s => s.id === storeId) || null;
      }

      if (!store) {
        throw new Error('门店不存在或无权限访问');
      }

      const users = await storeModel.getStoreUsers(storeId);
      const stats = await storeModel.getStoreStats(storeId);

      return {
        store_info: {
          id: store.id,
          name: store.name,
          company_name: store.company_name
        },
        users,
        stats
      };
    } catch (error) {
      console.error('获取门店用户列表失败:', error);
      throw error;
    }
  }

  // 获取可选择的公司列表（用于创建门店时选择）
  async getAvailableCompanies(user) {
    try {
      if (user.account_level === ACCOUNT_LEVELS.PLATFORM) {
        // 平台用户可以选择所有公司
        const companies = await companyModel.findAllWithStats();
        return companies.map(company => ({
          id: company.id,
          name: company.name,
          type: company.type,
          store_count: company.store_count || 0
        }));
      } else if (user.account_level === ACCOUNT_LEVELS.COMPANY) {
        // 公司用户只能选择自己的公司
        const company = await companyModel.findById(user.company_id);
        if (!company) {
          throw new Error('用户所属公司不存在');
        }
        return [{
          id: company.id,
          name: company.name,
          type: company.type,
          store_count: 0 // 可以后续优化获取实际数量
        }];
      } else {
        // 门店用户无法创建门店
        return [];
      }
    } catch (error) {
      console.error('获取可选公司列表失败:', error);
      throw error;
    }
  }
}

module.exports = new StoreService(); 