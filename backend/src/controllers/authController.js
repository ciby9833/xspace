const authService = require('../services/authService');
const { validationResult } = require('express-validator');

class AuthController {
  // 登录
  async login(req, res) {
    try {
      // 检查参数验证结果
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false,
          error: '参数验证失败', 
          details: errors.array(),
          timestamp: new Date().toISOString()
        });
      }

      const { email, password } = req.body;
      const result = await authService.login(email, password);
      
      res.json({
        success: true,
        message: '登录成功',
        ...result,  // 直接展开 result，包含 token 和 user
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('登录错误:', error);
      
      if (error.message === '用户不存在或已被禁用' || error.message === '密码错误') {
        return res.status(401).json({ 
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      res.status(500).json({ 
        success: false,
        error: '登录失败',
        timestamp: new Date().toISOString()
      });
    }
  }

  // 退出登录
  async logout(req, res) {
    try {
      res.json({ 
        success: true,
        message: '退出登录成功',
        data: null,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('退出登录错误:', error);
      res.status(500).json({ 
        success: false,
        error: '退出登录失败',
        timestamp: new Date().toISOString()
      });
    }
  }
}

module.exports = new AuthController(); 