const { body } = require('express-validator');

// 创建角色验证器
const createRoleValidator = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('角色名称不能为空')
    .isLength({ min: 2, max: 50 })
    .withMessage('角色名称长度必须在2-50个字符之间')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('角色名称只能包含字母、数字和下划线'),
    
  body('display_name')
    .trim()
    .notEmpty()
    .withMessage('显示名称不能为空')
    .isLength({ min: 2, max: 100 })
    .withMessage('显示名称长度必须在2-100个字符之间'),
    
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('描述长度不能超过500个字符')
];

// 更新角色验证器
const updateRoleValidator = [
  body('display_name')
    .trim()
    .notEmpty()
    .withMessage('显示名称不能为空')
    .isLength({ min: 2, max: 100 })
    .withMessage('显示名称长度必须在2-100个字符之间'),
    
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('描述长度不能超过500个字符')
];

// 分配权限验证器
const assignPermissionsValidator = [
  body('permission_ids')
    .isArray()
    .withMessage('权限ID必须是数组')
    .custom((value) => {
      if (value.length === 0) {
        return true; // 允许空数组（清除所有权限）
      }
      
      // 检查是否都是有效的UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      const allValidUuids = value.every(id => uuidRegex.test(id));
      
      if (!allValidUuids) {
        throw new Error('权限ID必须是有效的UUID格式');
      }
      
      return true;
    })
];

// 更新用户角色验证器
const updateUserRoleValidator = [
  body('role_id')
    .notEmpty()
    .withMessage('角色ID不能为空')
    .isUUID()
    .withMessage('角色ID必须是有效的UUID格式')
];

module.exports = {
  createRoleValidator,
  updateRoleValidator,
  assignPermissionsValidator,
  updateUserRoleValidator
}; 