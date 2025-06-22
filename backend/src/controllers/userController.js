const userService = require('../services/userService');
const { validationResult } = require('express-validator');

class UserController {
  // 获取当前用户信息
  async getProfile(req, res) {
    try {
      const { user_id } = req.user;
      const result = await userService.getUserProfile(user_id);
      
      res.json({
        success: true,
        message: '获取用户信息成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('获取用户信息错误:', error);
      
      if (error.message === '用户不存在') {
        return res.status(404).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: '获取用户信息失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 获取用户详情
  async getUserDetail(req, res) {
    try {
      const { userId } = req.params;
      const result = await userService.getUserDetail(userId, req.user);
      
      res.json({
        success: true,
        message: '获取用户详情成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('获取用户详情错误:', error);
      
      if (error.message === '用户不存在' || error.message === '权限不足') {
        return res.status(error.message === '用户不存在' ? 404 : 403).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: '获取用户详情失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 获取员工列表
  async getUserList(req, res) {
    try {
      const filters = {};
      
      // 提取查询参数
      if (req.query.name) filters.name = req.query.name;
      if (req.query.email) filters.email = req.query.email;
      if (req.query.position) filters.position = req.query.position;
      if (req.query.role_id) filters.role_id = req.query.role_id;
      if (req.query.store_id) filters.store_id = req.query.store_id;
      if (req.query.is_active !== undefined) {
        filters.is_active = req.query.is_active === 'true';
      }
      
      const result = await userService.getUserList(req.user, filters);
      
      res.json({
        success: true,
        message: '获取员工列表成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('获取员工列表错误:', error);
      console.error('错误堆栈:', error.stack);
      
      res.status(500).json({
        success: false,
        error: '获取员工列表失败',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  // 创建员工
  async createUser(req, res) {
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

      const result = await userService.createUser(req.body, req.user);
      
      res.json({
        success: true,
        message: '创建员工成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('创建员工错误:', error);
      
      if (error.message === '该邮箱已被使用' || error.message === '该手机号已被使用') {
        return res.status(400).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      if (error.message.includes('权限不足')) {
        return res.status(403).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: '创建员工失败',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  // 更新用户
  async updateUser(req, res) {
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
      const result = await userService.updateUser(userId, req.body, req.user);
      
      res.json({
        success: true,
        message: '更新用户成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('更新用户错误:', error);
      
      if (error.message === '用户不存在') {
        return res.status(404).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      if (error.message.includes('权限不足')) {
        return res.status(403).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: '更新用户失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 删除用户
  async deleteUser(req, res) {
    try {
      const { userId } = req.params;
      const result = await userService.deleteUser(userId, req.user);
      
      res.json({
        success: true,
        message: '删除用户成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('删除用户错误:', error);
      
      if (error.message === '用户不存在') {
        return res.status(404).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      if (error.message.includes('权限不足')) {
        return res.status(403).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: '删除用户失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 重置用户密码
  async resetUserPassword(req, res) {
    try {
      const { userId } = req.params;
      const { password } = req.body;
      
      const result = await userService.resetUserPassword(userId, password, req.user);
      
      res.json({
        success: true,
        message: '密码重置成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('重置密码错误:', error);
      
      if (error.message === '用户不存在') {
        return res.status(404).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      if (error.message.includes('权限不足')) {
        return res.status(403).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: '重置密码失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 获取可选公司列表（用于创建用户时选择）
  async getAvailableCompanies(req, res) {
    try {
      const result = await userService.getAvailableCompanies(req.user);
      
      res.json({
        success: true,
        message: '获取可选公司列表成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('获取可选公司列表错误:', error);
      
      res.status(500).json({
        success: false,
        error: '获取可选公司列表失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 获取可选门店列表（用于创建用户时选择）
  async getAvailableStores(req, res) {
    try {
      const { company_id } = req.query;
      const result = await userService.getAvailableStores(req.user, company_id);
      
      res.json({
        success: true,
        message: '获取可选门店列表成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('获取可选门店列表错误:', error);
      
      if (error.message.includes('权限不足')) {
        return res.status(403).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: '获取可选门店列表失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 获取可创建的账户层级列表
  async getCreatableAccountLevels(req, res) {
    try {
      const result = await userService.getCreatableAccountLevels(req.user);
      
      res.json({
        success: true,
        message: '获取可创建账户层级成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('获取可创建账户层级错误:', error);
      
      res.status(500).json({
        success: false,
        error: '获取可创建账户层级失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 获取可管理的角色列表
  async getManageableRoles(req, res) {
    try {
      const result = await userService.getManageableRoles(req.user);
      
      res.json({
        success: true,
        message: '获取可管理角色列表成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('获取可管理角色列表错误:', error);
      
      res.status(500).json({
        success: false,
        error: '获取可管理角色列表失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 根据账户层级获取可用角色列表
  async getRolesByAccountLevel(req, res) {
    try {
      const { account_level, company_id } = req.query;
      
      if (!account_level) {
        return res.status(400).json({
          success: false,
          error: '账户层级参数不能为空',
          timestamp: new Date().toISOString()
        });
      }

      const result = await userService.getManageableRoles(req.user, account_level, company_id);
      
      res.json({
        success: true,
        message: '获取角色列表成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('获取角色列表错误:', error);
      
      res.status(500).json({
        success: false,
        error: '获取角色列表失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 🆕 获取门店关联的用户（用于Game Host选择）
  async getUsersByStore(req, res) {
    try {
      const { storeId } = req.params;
      const result = await userService.getUsersByStore(storeId, req.user);
      
      res.json({
        success: true,
        message: '获取门店用户成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('获取门店用户错误:', error);
      
      if (error.message.includes('权限不足')) {
        return res.status(403).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      if (error.message === '门店不存在') {
        return res.status(404).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: '获取门店用户失败',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  // 🆕 获取可选岗位列表
  async getAvailablePositions(req, res) {
    try {
      const result = await userService.getAvailablePositions();
      
      res.json({
        success: true,
        message: '获取可选岗位列表成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('获取可选岗位列表错误:', error);
      
      res.status(500).json({
        success: false,
        error: '获取可选岗位列表失败',
        timestamp: new Date().toISOString()
      });
    }
  }
}

module.exports = new UserController(); 