const companyService = require('../services/companyService');
const { validationResult } = require('express-validator');

class CompanyController {
  // 获取公司列表
  async getCompanyList(req, res) {
    try {
      const result = await companyService.getCompanyList(req.user);
      
      res.json({
        success: true,
        message: '获取公司列表成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('获取公司列表错误:', error);
      
      if (error.message === '权限不足') {
        return res.status(403).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: '获取公司列表失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 创建公司
  async createCompany(req, res) {
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

      const result = await companyService.createCompanyWithAdmin(req.body, req.user);
      
      res.json({
        success: true,
        message: '创建公司成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('创建公司错误:', error);
      
      if (error.message === '该邮箱已被使用') {
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
        error: '创建公司失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 获取公司详情
  async getCompanyDetail(req, res) {
    try {
      const companyId = req.params.id;
      const result = await companyService.getCompanyDetail(companyId, req.user);
      
      res.json({
        success: true,
        message: '获取公司详情成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('获取公司详情错误:', error);
      
      if (error.message === '权限不足') {
        return res.status(403).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      if (error.message === '公司不存在') {
        return res.status(404).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: '获取公司详情失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 更新公司信息
  async updateCompany(req, res) {
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

      const companyId = req.params.id;
      const result = await companyService.updateCompany(companyId, req.body, req.user);
      
      res.json({
        success: true,
        message: '更新公司信息成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('更新公司信息错误:', error);
      
      if (error.message === '权限不足') {
        return res.status(403).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      if (error.message === '公司不存在') {
        return res.status(404).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: '更新公司信息失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 🆕 删除公司
  async deleteCompany(req, res) {
    try {
      const companyId = req.params.id;
      const result = await companyService.deleteCompany(companyId, req.user);
      
      res.json({
        success: true,
        message: '删除公司成功',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('删除公司错误:', error);
      
      if (error.message.includes('权限不足')) {
        return res.status(403).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      if (error.message === '公司不存在') {
        return res.status(404).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      if (error.message.includes('无法删除')) {
        return res.status(400).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({
        success: false,
        error: '删除公司失败',
        timestamp: new Date().toISOString()
      });
    }
  }
}

module.exports = new CompanyController(); 