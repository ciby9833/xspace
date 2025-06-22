const permissionService = require('../services/permissionService');
const { validationResult } = require('express-validator');

class PermissionController {
  // 获取权限结构（模块和权限）
  async getPermissionStructure(req, res) {
    try {
      const result = await permissionService.getPermissionStructure();
      
      res.json({
        success: true,
        message: '获取权限结构成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('获取权限结构错误:', error);
      res.status(500).json({
        success: false,
        error: error.message || '获取权限结构失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 获取公司角色列表
  async getCompanyRoles(req, res) {
    try {
      const { company_id } = req.query; // 从查询参数获取公司ID
      const result = await permissionService.getCompanyRoles(company_id, req.user);
      
      res.json({
        success: true,
        message: '获取角色列表成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('获取角色列表错误:', error);
      
      if (error.message === '权限不足' || error.message.includes('权限不足')) {
        return res.status(403).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: error.message || '获取角色列表失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 获取角色详情
  async getRoleDetails(req, res) {
    try {
      const { roleId } = req.params;
      const result = await permissionService.getRoleDetails(roleId, req.user);
      
      res.json({
        success: true,
        message: '获取角色详情成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('获取角色详情错误:', error);
      
      if (error.message === '权限不足') {
        return res.status(403).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      if (error.message === '角色不存在') {
        return res.status(404).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: error.message || '获取角色详情失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 创建角色
  async createRole(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: '参数验证失败',
          details: errors.array(),
          timestamp: new Date().toISOString()
        });
      }

      const result = await permissionService.createRole(req.body, req.user);
      
      res.json({
        success: true,
        message: '创建角色成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('创建角色错误:', error);
      
      if (error.message.includes('权限不足') || error.message.includes('角色名称已存在')) {
        return res.status(400).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: error.message || '创建角色失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 更新角色
  async updateRole(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: '参数验证失败',
          details: errors.array(),
          timestamp: new Date().toISOString()
        });
      }

      const { roleId } = req.params;
      const result = await permissionService.updateRole(roleId, req.body, req.user);
      
      res.json({
        success: true,
        message: '更新角色成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('更新角色错误:', error);
      
      if (error.message.includes('权限不足') || error.message.includes('角色不存在') || error.message.includes('系统角色')) {
        return res.status(400).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: error.message || '更新角色失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 删除角色
  async deleteRole(req, res) {
    try {
      const { roleId } = req.params;
      const result = await permissionService.deleteRole(roleId, req.user);
      
      res.json({
        success: true,
        message: result.message,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('删除角色错误:', error);
      
      if (error.message.includes('权限不足') || 
          error.message.includes('系统角色') || 
          error.message.includes('正在使用中')) {
        return res.status(400).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: error.message || '删除角色失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 分配权限给角色
  async assignPermissions(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: '参数验证失败',
          details: errors.array(),
          timestamp: new Date().toISOString()
        });
      }

      const { roleId } = req.params;
      const { permission_ids } = req.body;
      
      const result = await permissionService.assignPermissions(roleId, permission_ids, req.user);
      
      res.json({
        success: true,
        message: result.message,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('分配权限错误:', error);
      
      if (error.message.includes('权限不足') || 
          error.message.includes('角色不存在') || 
          error.message.includes('无效的权限ID')) {
        return res.status(400).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: error.message || '分配权限失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 更新用户角色
  async updateUserRole(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: '参数验证失败',
          details: errors.array(),
          timestamp: new Date().toISOString()
        });
      }

      const { userId } = req.params;
      const { role_id } = req.body;
      
      const result = await permissionService.updateUserRole(userId, role_id, req.user);
      
      res.json({
        success: true,
        message: '更新用户角色成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('更新用户角色错误:', error);
      
      if (error.message.includes('权限不足') || error.message.includes('角色不存在')) {
        return res.status(400).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: error.message || '更新用户角色失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 获取用户权限
  async getUserPermissions(req, res) {
    try {
      const { userId } = req.params;
      const result = await permissionService.getUserPermissions(userId);
      
      res.json({
        success: true,
        message: '获取用户权限成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('获取用户权限错误:', error);
      res.status(500).json({
        success: false,
        error: error.message || '获取用户权限失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 获取公司列表（用于角色归属选择）
  async getCompaniesForRole(req, res) {
    try {
      const result = await permissionService.getCompaniesForRole(req.user);
      
      res.json({
        success: true,
        message: '获取公司列表成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('获取公司列表错误:', error);
      
      if (error.message === '权限不足' || error.message.includes('权限不足')) {
        return res.status(403).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: error.message || '获取公司列表失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 获取可创建的角色层级
  async getCreatableRoleLevels(req, res) {
    try {
      const result = await permissionService.getCreatableRoleLevels(req.user);
      
      res.json({
        success: true,
        message: '获取可创建角色层级成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('获取可创建角色层级错误:', error);
      res.status(500).json({
        success: false,
        error: error.message || '获取可创建角色层级失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 检查资源访问权限
  async checkResourceAccess(req, res) {
    try {
      const { resource_type, resource_id } = req.query;
      const result = await permissionService.checkResourceAccess(req.user, resource_type, resource_id);
      
      res.json({
        success: true,
        message: '权限检查完成',
        data: { hasAccess: result },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('权限检查错误:', error);
      res.status(500).json({
        success: false,
        error: error.message || '权限检查失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 获取权限统计信息
  async getPermissionStats(req, res) {
    try {
      const result = await permissionService.getPermissionStats(req.user);
      
      res.json({
        success: true,
        message: '获取权限统计成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('获取权限统计错误:', error);
      res.status(500).json({
        success: false,
        error: error.message || '获取权限统计失败',
        timestamp: new Date().toISOString()
      });
    }
  }
}

module.exports = new PermissionController(); 