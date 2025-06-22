const { body } = require('express-validator');

const createUserValidator = [
  body('name')
    .notEmpty()
    .withMessage('姓名不能为空')
    .isLength({ min: 2, max: 50 })
    .withMessage('姓名长度为2-50字符'),
  body('email')
    .notEmpty()
    .withMessage('邮箱不能为空')
    .isEmail()
    .withMessage('请输入有效的邮箱地址'),
  body('phone')
    .optional()
    .custom((value) => {
      if (value && !/^(\+62|62|0)?8[1-9][0-9]{6,9}$/.test(value)) {
        throw new Error('请输入有效的印尼手机号');
      }
      return true;
    }),
  body('password')
    .optional()
    .isLength({ min: 6 })
    .withMessage('密码长度至少6位'),
  body('role_id')
    .notEmpty()
    .withMessage('角色不能为空')
    .isUUID()
    .withMessage('角色ID必须是有效的UUID格式'),
  body('company_id')
    .optional()
    .custom((value) => {
      if (value && value.trim() !== '' && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
        throw new Error('公司ID必须是有效的UUID格式');
      }
      return true;
    }),
  body('store_id')
    .optional()
    .custom((value) => {
      // 如果是数组，验证每个元素
      if (Array.isArray(value)) {
        for (const id of value) {
          if (id && typeof id === 'string' && id.trim() !== '' && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
            throw new Error('门店ID必须是有效的UUID格式');
          }
        }
      } else if (value && typeof value === 'string' && value.trim() !== '' && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
        throw new Error('门店ID必须是有效的UUID格式');
      }
      return true;
    })
];

const updateUserValidator = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('姓名长度必须在1-100个字符之间'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('请输入有效的邮箱地址'),
  body('phone')
    .optional()
    .custom((value) => {
      if (value && !/^(\+62|62|0)?8[1-9][0-9]{6,9}$/.test(value)) {
        throw new Error('请输入有效的印尼手机号');
      }
      return true;
    }),
  body('role_id')
    .optional()
    .notEmpty()
    .withMessage('角色不能为空')
    .isUUID()
    .withMessage('角色ID必须是有效的UUID格式'),
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('状态必须是布尔值'),
  body('store_id')
    .optional()
    .custom((value) => {
      if (value && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
        throw new Error('门店ID必须是有效的UUID格式');
      }
      return true;
    }),
  body('company_id')
    .optional()
    .custom((value) => {
      if (value && value.trim() !== '' && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
        throw new Error('公司ID必须是有效的UUID格式');
      }
      return true;
    })
];

module.exports = {
  createUserValidator,
  updateUserValidator
}; 