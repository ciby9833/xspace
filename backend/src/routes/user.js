const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken } = require('../utils/auth');
const { createUserValidator, updateUserValidator } = require('../validators/userValidator');

// 获取当前用户信息
router.get('/profile', authenticateToken, userController.getProfile);

// 获取可选公司列表（用于创建用户时选择）
router.get('/available-companies', authenticateToken, userController.getAvailableCompanies);

// 获取可选门店列表（用于创建用户时选择）
router.get('/available-stores', authenticateToken, userController.getAvailableStores);

// 获取可创建的账户层级列表
router.get('/creatable-account-levels', authenticateToken, userController.getCreatableAccountLevels);

// 获取可管理的角色列表
router.get('/manageable-roles', authenticateToken, userController.getManageableRoles);

// 根据账户层级获取可用角色列表
router.get('/roles-by-level', authenticateToken, userController.getRolesByAccountLevel);

// 获取可选岗位列表
router.get('/available-positions', authenticateToken, userController.getAvailablePositions);

// 获取员工列表（基于账户层级自动过滤数据范围）
router.get('/', authenticateToken, userController.getUserList);

// 获取用户详情
router.get('/:userId', authenticateToken, userController.getUserDetail);

// 创建员工
router.post('/', authenticateToken, createUserValidator, userController.createUser);

// 更新用户
router.put('/:userId', authenticateToken, updateUserValidator, userController.updateUser);

// 重置用户密码
router.put('/:userId/reset-password', authenticateToken, userController.resetUserPassword);

// 删除用户
router.delete('/:userId', authenticateToken, userController.deleteUser);

// 🆕 获取门店关联的用户
router.get('/store/:storeId', authenticateToken, userController.getUsersByStore);

module.exports = router; 