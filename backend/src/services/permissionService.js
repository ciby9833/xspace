const BaseService = require('../core/BaseService');
const PermissionChecker = require('../utils/permissions');

class PermissionService extends BaseService {
  constructor() {
    super();
    this.model = require('../models/permissionModel');
  }

  // 获取权限结构（模块和权限）
  async getPermissionStructure() {
    try {
      // 使用分组查询直接获取完整的权限结构
      const groupedData = await this.model.getAllPermissionsGrouped();
      
      // 将数据转换为前端期望的格式
      const structuredData = groupedData.map(module => ({
        id: module.module_id,
        name: module.module_name,
        display_name: module.module_display_name,
        description: module.module_description,
        sort_order: module.module_sort_order,
        is_active: true,
        permissions: module.permissions.filter(p => p.id !== null) // 过滤掉空权限
      }));
      
      return structuredData;
    } catch (error) {
      console.error('获取权限结构失败:', error);
      throw error;
    }
  }

  // 获取公司角色列表（基于层级控制数据范围）
  async getCompanyRoles(companyId, user) {
    try {
      // 检查角色管理权限
      const hasRolePermission = await PermissionChecker.hasPermission(user, 'system.role');
      if (!hasRolePermission) {
        throw new Error('权限不足：无法访问角色管理');
      }

      const userAccountLevel = PermissionChecker.getAccountLevel(user);
      
      // 根据用户层级确定查询范围
      let targetCompanyId = companyId;
      
      if (userAccountLevel === 'platform') {
        // 平台级用户可以查看所有角色
        targetCompanyId = companyId; // 如果指定了公司ID就查该公司，否则查平台级角色
      } else if (userAccountLevel === 'company') {
        // 公司级用户只能查看本公司角色
        targetCompanyId = user.company_id;
      } else {
        // 门店级用户只能查看本公司角色
        targetCompanyId = user.company_id;
      }

      const roles = await this.model.getRolesByCompany(targetCompanyId, userAccountLevel, user.user_id);
      
      return roles.map(role => this.formatTimeFields(role));
    } catch (error) {
      console.error('获取角色列表失败:', error);
      throw error;
    }
  }

  // 获取角色详情和权限
  async getRoleDetails(roleId, user) {
    try {
      // 检查角色管理权限
      const hasRolePermission = await PermissionChecker.hasPermission(user, 'system.role');
      if (!hasRolePermission) {
        throw new Error('权限不足：无法访问角色管理');
      }

      const userAccountLevel = PermissionChecker.getAccountLevel(user);
      
      // 根据用户账户层级获取角色
      const role = await this.model.getRoleById(roleId, user.company_id, userAccountLevel);
      if (!role) {
        throw new Error('角色不存在或无权访问');
      }

      const permissions = await this.model.getRolePermissions(roleId);
      
      return {
        ...this.formatTimeFields(role),
        permissions
      };
    } catch (error) {
      console.error('获取角色详情失败:', error);
      throw error;
    }
  }

  // 创建角色
  async createRole(roleData, user) {
    try {
      // 检查角色管理权限
      const hasRolePermission = await PermissionChecker.hasPermission(user, 'system.role');
      if (!hasRolePermission) {
        throw new Error('权限不足：无法创建角色');
      }

      const userAccountLevel = PermissionChecker.getAccountLevel(user);
      const targetRoleLevel = roleData.role_level || 'store';
      
      // 检查是否可以创建指定层级的角色（基于层级控制）
      if (userAccountLevel === 'store' && targetRoleLevel !== 'store') {
        throw new Error('门店级用户只能创建门店级角色');
      }
      
      if (userAccountLevel === 'company' && targetRoleLevel === 'platform') {
        throw new Error('公司级用户不能创建平台级角色');
      }

      // 确定目标公司ID
      let targetCompanyId;
      
      if (targetRoleLevel === 'platform') {
        // 平台级角色不归属任何公司
        targetCompanyId = null;
      } else {
        // 公司级和门店级角色必须归属到具体公司
        if (userAccountLevel === 'platform') {
          // 平台级用户可以为任意公司创建角色
          targetCompanyId = roleData.company_id || user.company_id;
          if (!targetCompanyId) {
            throw new Error('创建公司级或门店级角色时必须指定归属公司');
          }
        } else {
          // 公司级和门店级用户只能为自己的公司创建角色
          targetCompanyId = user.company_id;
        }
      }

      // 验证角色名称唯一性
      const existingRoles = await this.model.getRolesByCompany(targetCompanyId, userAccountLevel);
      const nameExists = existingRoles.some(role => 
        role.role_level === targetRoleLevel && 
        role.company_id === targetCompanyId &&
        (role.name === roleData.name || role.display_name === roleData.display_name)
      );
      
      if (nameExists) {
        throw new Error('角色名称在该层级和公司内已存在');
      }

      const role = await this.model.createRole(targetCompanyId, {
        ...roleData,
        role_level: targetRoleLevel
      }, user.user_id);
      
      return this.formatTimeFields(role);
    } catch (error) {
      console.error('创建角色失败:', error);
      throw error;
    }
  }

  // 更新角色
  async updateRole(roleId, roleData, user) {
    try {
      // 检查角色管理权限
      const hasRolePermission = await PermissionChecker.hasPermission(user, 'system.role');
      if (!hasRolePermission) {
        throw new Error('权限不足：无法更新角色');
      }

      const userAccountLevel = PermissionChecker.getAccountLevel(user);
      
      // 检查角色是否存在且有权访问
      const existingRole = await this.model.getRoleById(roleId, user.company_id, userAccountLevel);
      if (!existingRole) {
        throw new Error('角色不存在或无权访问');
      }

      // 检查数据访问权限
      if (!PermissionChecker.canAccessData(user, existingRole)) {
        throw new Error('权限不足：无法修改该角色');
      }

      // 保护超级管理员角色
      if (existingRole.name === 'superadmin' && existingRole.is_system_role) {
        throw new Error('超级管理员角色不能修改');
      }

      const updatedRole = await this.model.updateRole(roleId, roleData);
      if (!updatedRole) {
        throw new Error('更新角色失败');
      }
      
      return this.formatTimeFields(updatedRole);
    } catch (error) {
      console.error('更新角色失败:', error);
      throw error;
    }
  }

  // 删除角色
  async deleteRole(roleId, user) {
    try {
      // 检查角色管理权限
      const hasRolePermission = await PermissionChecker.hasPermission(user, 'system.role');
      if (!hasRolePermission) {
        throw new Error('权限不足：无法删除角色');
      }

      const userAccountLevel = PermissionChecker.getAccountLevel(user);
      
      // 检查角色是否存在且有权访问
      const existingRole = await this.model.getRoleById(roleId, user.company_id, userAccountLevel);
      if (!existingRole) {
        throw new Error('角色不存在或无权访问');
      }

      // 检查数据访问权限
      if (!PermissionChecker.canAccessData(user, existingRole)) {
        throw new Error('权限不足：无法删除该角色');
      }

      // 保护超级管理员角色
      if (existingRole.name === 'superadmin' && existingRole.is_system_role) {
        throw new Error('超级管理员角色不能删除');
      }

      await this.model.deleteRole(roleId, existingRole.company_id);
      
      return { success: true, message: '角色删除成功' };
    } catch (error) {
      console.error('删除角色失败:', error);
      throw error;
    }
  }

  // 分配权限给角色
  async assignPermissions(roleId, permissionIds, user) {
    try {
      // 检查角色管理权限
      const hasRolePermission = await PermissionChecker.hasPermission(user, 'system.role');
      if (!hasRolePermission) {
        throw new Error('权限不足：无法分配权限');
      }

      const userAccountLevel = PermissionChecker.getAccountLevel(user);
      
      // 检查角色是否存在且有权访问
      const existingRole = await this.model.getRoleById(roleId, user.company_id, userAccountLevel);
      if (!existingRole) {
        throw new Error('角色不存在或无权访问');
      }

      // 检查数据访问权限
      if (!PermissionChecker.canAccessData(user, existingRole)) {
        throw new Error('权限不足：无法修改该角色权限');
      }

      // 保护超级管理员角色
      if (existingRole.name === 'superadmin' && existingRole.is_system_role) {
        throw new Error('超级管理员角色权限不能修改');
      }

      // 验证权限ID有效性
      if (permissionIds && permissionIds.length > 0) {
        for (const permissionId of permissionIds) {
          const permission = await this.model.getPermissionById(permissionId);
          if (!permission) {
            throw new Error(`无效的权限ID: ${permissionId}`);
          }
        }
      }

      await this.model.assignPermissionsToRole(roleId, permissionIds);
      
      return { success: true, message: '权限分配成功' };
    } catch (error) {
      console.error('分配权限失败:', error);
      throw error;
    }
  }

  // 更新用户角色
  async updateUserRole(userId, roleId, user) {
    try {
      // 检查用户管理权限
      const hasUserPermission = await PermissionChecker.hasPermission(user, 'user.manage');
      if (!hasUserPermission) {
        throw new Error('权限不足：无法修改用户角色');
      }

      const userAccountLevel = PermissionChecker.getAccountLevel(user);
      
      // 检查目标角色是否存在且有权访问
      const targetRole = await this.model.getRoleById(roleId, user.company_id, userAccountLevel);
      if (!targetRole) {
        throw new Error('角色不存在或无权访问');
      }

      // 检查数据访问权限
      if (!PermissionChecker.canAccessData(user, targetRole)) {
        throw new Error('权限不足：无法分配该角色');
      }

      const result = await this.model.updateUserRole(userId, roleId);
      
      return { success: true, data: result, message: '用户角色更新成功' };
    } catch (error) {
      console.error('更新用户角色失败:', error);
      throw error;
    }
  }

  // 获取用户权限列表（纯功能权限）
  async getUserPermissions(userId) {
    try {
      // 直接从角色配置获取权限，不再依赖数据库
      const userModel = require('../models/userModel');
      const user = await userModel.findByIdWithCompanyInfo(userId);
      
      if (!user) {
        throw new Error('用户不存在');
      }

      // 返回纯功能权限（无继承）
      return await PermissionChecker.getUserPermissions(user);
    } catch (error) {
      console.error('获取用户权限失败:', error);
      throw error;
    }
  }

  // 检查用户是否有特定权限
  async checkUserPermission(userId, permissionKey) {
    try {
      const userModel = require('../models/userModel');
      const user = await userModel.findByIdWithCompanyInfo(userId);
      
      if (!user) {
        throw new Error('用户不存在');
      }

      return await PermissionChecker.hasPermission(user, permissionKey);
    } catch (error) {
      console.error('检查用户权限失败:', error);
      throw error;
    }
  }

  // 获取公司列表（用于角色归属选择）
  async getCompaniesForRole(user) {
    try {
      // 检查角色管理权限
      const hasRolePermission = await PermissionChecker.hasPermission(user, 'system.role');
      if (!hasRolePermission) {
        throw new Error('权限不足：无法访问角色管理');
      }

      const userAccountLevel = PermissionChecker.getAccountLevel(user);
      const pool = require('../database/connection');
      
      if (userAccountLevel === 'platform') {
        // 平台级用户可以看到所有公司
        const query = `
          SELECT id, name, type, created_at
          FROM company 
          ORDER BY name
        `;
        const result = await pool.query(query);
        return result.rows;
      } else if (userAccountLevel === 'company') {
        // 公司级用户只能看到自己的公司
        const query = `
          SELECT id, name, type, created_at
          FROM company 
          WHERE id = $1
        `;
        const result = await pool.query(query, [user.company_id]);
        return result.rows;
      } else {
        // 门店级用户只能看到自己的公司
        const query = `
          SELECT id, name, type, created_at
          FROM company 
          WHERE id = $1
        `;
        const result = await pool.query(query, [user.company_id]);
        return result.rows;
      }
    } catch (error) {
      console.error('获取公司列表失败:', error);
      throw error;
    }
  }

  // 获取可创建的角色层级
  async getCreatableRoleLevels(user) {
    try {
      const userAccountLevel = PermissionChecker.getAccountLevel(user);
      let creatableLevels = [];
      
      switch (userAccountLevel) {
        case 'platform':
          creatableLevels = ['platform', 'company', 'store'];
          break;
        case 'company':
          creatableLevels = ['company', 'store'];
          break;
        case 'store':
          creatableLevels = ['store'];
          break;
      }
      
      return {
        current_level: userAccountLevel,
        creatable_levels: creatableLevels,
        level_descriptions: {
          platform: '平台级角色 - 可管理所有数据',
          company: '公司级角色 - 可管理本公司数据', 
          store: '门店级角色 - 可管理本门店数据'
        }
      };
    } catch (error) {
      console.error('获取可创建角色层级失败:', error);
      throw error;
    }
  }

  // 检查资源访问权限
  async checkResourceAccess(user, resourceType, resourceId) {
    try {
      // 根据资源类型检查不同的权限
      switch (resourceType) {
        case 'company':
          return PermissionChecker.canAccessCompany(user, resourceId);
        case 'store':
          return PermissionChecker.canAccessStore(user, resourceId);
        default:
          return false;
      }
    } catch (error) {
      console.error('检查资源访问权限失败:', error);
      throw error;
    }
  }

  // 获取权限统计信息
  async getPermissionStats(user) {
    try {
      const userAccountLevel = PermissionChecker.getAccountLevel(user);
      
      if (userAccountLevel === 'platform') {
        // 平台级用户获取全平台统计
        return await this.model.getUserStatsByCompany(null);
      } else {
        // 其他用户获取本公司统计
        return await this.model.getUserStatsByCompany(user.company_id);
      }
    } catch (error) {
      console.error('获取权限统计失败:', error);
      throw error;
    }
  }
}

module.exports = new PermissionService(); 