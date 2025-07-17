const BaseService = require('../core/BaseService');
const companyModel = require('../models/companyModel');
const userModel = require('../models/userModel');
const permissionModel = require('../models/permissionModel');
const { hashPassword } = require('../utils/auth');
const PermissionChecker = require('../utils/permissions');

class CompanyService extends BaseService {
  constructor() {
    super(companyModel, '公司');
  }

  // 创建公司及主账号
  async createCompanyWithAdmin(companyData, user) {
    // 检查权限 - 只有平台管理员可以创建公司
    const hasPermission = await PermissionChecker.hasPermission(user, 'company.create');
    const isPlatformAdmin = PermissionChecker.isPlatformAdmin(user);
    
    // 必须同时具备功能权限和平台级账户层级
    if (!hasPermission || !isPlatformAdmin) {
      throw new Error('权限不足，只有平台管理员可以创建公司');
    }

    const { name, type, contact_name, contact_phone, contact_email, admin_name, admin_email, admin_password } = companyData;

    // 检查邮箱是否已存在
    const emailExists = await userModel.emailExists(admin_email);
    if (emailExists) {
      throw new Error('该邮箱已被使用');
    }

    // 检查手机号是否已存在
    if (contact_phone) {
      const phoneExists = await userModel.phoneExists(contact_phone);
      if (phoneExists) {
        throw new Error('该手机号已被使用');
      }
    }

    // 创建公司
    const company = await this.model.create({
      name,
      type,
      contact_name,
      contact_phone,
      contact_email
    });

    // 创建公司级管理员角色
    const adminRole = await permissionModel.createRole(company.id, {
      name: 'admin',
      display_name: '公司管理员',
      description: '公司级管理员，拥有本公司所有权限',
      role_level: 'company'
    }, user.id);

    // 为管理员角色分配所有权限
    const allPermissions = await permissionModel.getAllPermissionsGrouped();
    const permissionIds = [];
    allPermissions.forEach(module => {
      if (module.permissions) {
        module.permissions.forEach(perm => {
          // 只分配公司级和门店级权限，不分配平台级权限
          if (perm.permission_key !== 'company.create' && 
              perm.permission_key !== 'company.delete' && 
              perm.permission_key !== 'system.manage' &&
              perm.permission_key !== 'system.permission' &&
              perm.permission_key !== 'system.role') {
            permissionIds.push(perm.id);
          }
        });
      }
    });

    if (permissionIds.length > 0) {
      await permissionModel.assignPermissionsToRole(adminRole.id, permissionIds);
    }

    // 创建公司级主账号（admin角色，company账户层级）
    const hashedPassword = await hashPassword(admin_password);
    const mainAccount = await userModel.create({
      company_id: company.id,
      name: admin_name,
      email: admin_email,
      password_hash: hashedPassword,
      role: 'admin',
      role_id: adminRole.id,
      account_level: 'company'  // 确保是公司级账户
    });

    return {
      company: this.formatTimeFields(company),
      mainAccount: this.formatTimeFields(mainAccount)
    };
  }

  // 获取公司列表
  async getCompanyList(user) {
    // 检查权限
    await PermissionChecker.requirePermission(user, 'company.view');
    
    // 如果是平台管理员，返回所有公司
    if (PermissionChecker.isPlatformAdmin(user)) {
      return await this.model.findAllWithStats();
    }
    
    // 否则只返回用户所在的公司
    return await this.model.findByIdWithStats(user.company_id);
  }

  // 获取公司详情
  async getCompanyDetail(companyId, user) {
    // 检查权限
    await PermissionChecker.requirePermission(user, 'company.view');
    
    // 如果是平台管理员，可以查看任何公司
    if (PermissionChecker.isPlatformAdmin(user)) {
      const company = await this.model.findByIdWithStats(companyId);
      if (!company) {
        throw new Error('公司不存在');
      }
      return company;
    }
    
    // 否则只能查看自己的公司
    if (user.company_id !== companyId) {
      throw new Error('权限不足');
    }
    
    return await this.model.findByIdWithStats(companyId);
  }

  // 更新公司信息
  async updateCompany(companyId, updateData, user) {
    // 检查权限
    await PermissionChecker.requirePermission(user, 'company.edit');
    
    // 如果是平台管理员，可以更新任何公司
    if (PermissionChecker.isPlatformAdmin(user)) {
      const company = await this.model.findById(companyId);
      if (!company) {
        throw new Error('公司不存在');
      }
      return await this.model.update(companyId, updateData);
    }
    
    // 否则只能更新自己的公司
    if (user.company_id !== companyId) {
      throw new Error('权限不足');
    }
    
    return await this.model.update(companyId, updateData);
  }

  // 🆕 删除公司
  async deleteCompany(companyId, user) {
    // 检查权限 - 只有平台管理员可以删除公司
    await PermissionChecker.requirePermission(user, 'company.delete');
    
    if (!PermissionChecker.isPlatformAdmin(user)) {
      throw new Error('权限不足，只有平台管理员可以删除公司');
    }

    // 检查公司是否存在
    const exists = await this.model.exists(companyId);
    if (!exists) {
      throw new Error('公司不存在');
    }

    // 执行删除（软删除）
    const result = await this.model.delete(companyId);
    return this.formatTimeFields(result);
  }

  // 🆕 检查用户是否可以访问指定公司
  async checkCompanyAccess(companyId, user) {
    // 平台管理员可以访问所有公司
    if (PermissionChecker.isPlatformAdmin(user)) {
      return true;
    }
    
    // 其他用户只能访问自己的公司
    return user.company_id === companyId;
  }
}

module.exports = new CompanyService(); 