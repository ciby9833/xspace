const express = require('express');
const router = express.Router();
const permissionController = require('../controllers/permissionController');
const { authenticateToken } = require('../utils/auth');
const PermissionChecker = require('../utils/permissions');
const { body, param } = require('express-validator');

// 权限检查中间件
const checkPermission = (permission) => PermissionChecker.requirePermissionMiddleware(permission);

// 角色验证规则
const roleValidationRules = [
  body('name').notEmpty().withMessage('角色名称不能为空'),
  body('display_name').notEmpty().withMessage('显示名称不能为空'),
  body('role_level').isIn(['platform', 'company', 'store']).withMessage('角色层级必须是platform、company或store')
];

// 权限分配验证规则
const permissionAssignValidationRules = [
  body('permission_ids').isArray().withMessage('权限ID列表必须是数组')
];

// 用户角色更新验证规则
const userRoleUpdateValidationRules = [
  body('role_id').isUUID().withMessage('角色ID格式不正确')
];

// 获取权限结构
router.get('/structure', authenticateToken, checkPermission('system.role'), permissionController.getPermissionStructure);

// 获取角色列表
router.get('/roles', authenticateToken, checkPermission('system.role'), permissionController.getCompanyRoles);

// 获取角色详情
router.get('/roles/:roleId', 
  authenticateToken, 
  checkPermission('system.role'),
  param('roleId').isUUID().withMessage('角色ID格式不正确'),
  permissionController.getRoleDetails
);

// 创建角色
router.post('/roles', 
  authenticateToken, 
  checkPermission('system.role'),
  roleValidationRules,
  permissionController.createRole
);

// 更新角色
router.put('/roles/:roleId', 
  authenticateToken, 
  checkPermission('system.role'),
  param('roleId').isUUID().withMessage('角色ID格式不正确'),
  roleValidationRules,
  permissionController.updateRole
);

// 删除角色
router.delete('/roles/:roleId', 
  authenticateToken, 
  checkPermission('system.role'),
  param('roleId').isUUID().withMessage('角色ID格式不正确'),
  permissionController.deleteRole
);

// 分配权限给角色
router.post('/roles/:roleId/permissions', 
  authenticateToken, 
  checkPermission('system.role'),
  param('roleId').isUUID().withMessage('角色ID格式不正确'),
  permissionAssignValidationRules,
  permissionController.assignPermissions
);

// 更新角色权限（PUT方法，与前端API调用一致）
router.put('/roles/:roleId/permissions', 
  authenticateToken, 
  checkPermission('system.role'),
  param('roleId').isUUID().withMessage('角色ID格式不正确'),
  permissionAssignValidationRules,
  permissionController.assignPermissions
);

// 更新用户角色
router.put('/users/:userId/role', 
  authenticateToken, 
  checkPermission('user.manage'),
  param('userId').isUUID().withMessage('用户ID格式不正确'),
  userRoleUpdateValidationRules,
  permissionController.updateUserRole
);

// 获取用户权限
router.get('/users/:userId/permissions', 
  authenticateToken, 
  checkPermission('user.view'),
  param('userId').isUUID().withMessage('用户ID格式不正确'),
  permissionController.getUserPermissions
);

// 获取公司列表（用于角色归属选择）
router.get('/companies/for-role', 
  authenticateToken, 
  checkPermission('system.role'),
  permissionController.getCompaniesForRole
);

// 获取可创建的角色层级
router.get('/role-levels/creatable', 
  authenticateToken, 
  checkPermission('system.role'),
  permissionController.getCreatableRoleLevels
);

// 检查资源访问权限
router.get('/check-access', 
  authenticateToken,
  permissionController.checkResourceAccess
);

// 获取权限统计信息
router.get('/stats', 
  authenticateToken, 
  checkPermission('system.view'),
  permissionController.getPermissionStats
);

module.exports = router; 