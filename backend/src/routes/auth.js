const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken, getCurrentUserPermissions, refreshPermissions } = require('../utils/auth');
const { body } = require('express-validator');

// 登录验证规则
const loginValidation = [
  body('email').isEmail().withMessage('请输入有效的邮箱地址'),
  body('password').isLength({ min: 6 }).withMessage('密码至少6位')
];

// 登录
router.post('/login', loginValidation, authController.login);

// 退出登录
router.post('/logout', authenticateToken, authController.logout);

// 获取当前用户权限
router.get('/permissions', authenticateToken, getCurrentUserPermissions);

// 刷新用户权限
router.post('/refresh-permissions', authenticateToken, refreshPermissions);

module.exports = router; 