const { body } = require('express-validator');

const createCompanyValidator = [
  body('name')
    .notEmpty()
    .withMessage('公司名称不能为空')
    .isLength({ min: 2, max: 100 })
    .withMessage('公司名称长度为2-100字符'),
  body('type')
    .optional()
    .isIn(['直营', '加盟', 'retail', 'restaurant', 'service', 'other'])
    .withMessage('请选择有效的公司类型'),
  body('contact_name')
    .notEmpty()
    .withMessage('联系人姓名不能为空')
    .isLength({ min: 2, max: 50 })
    .withMessage('联系人姓名长度为2-50字符'),
  body('contact_phone')
    .optional()
    .custom((value) => {
      if (value && !/^(\+62|62|0)?8[1-9][0-9]{6,9}$/.test(value)) {
        throw new Error('请输入有效的印尼手机号');
      }
      return true;
    }),
  body('contact_email')
    .optional()
    .isEmail()
    .withMessage('请输入有效的联系邮箱'),
  body('admin_name')
    .notEmpty()
    .withMessage('管理员姓名不能为空')
    .isLength({ min: 2, max: 50 })
    .withMessage('管理员姓名长度为2-50字符'),
  body('admin_email')
    .notEmpty()
    .withMessage('管理员邮箱不能为空')
    .isEmail()
    .withMessage('请输入有效的管理员邮箱'),
  body('admin_password')
    .notEmpty()
    .withMessage('管理员密码不能为空')
    .isLength({ min: 6 })
    .withMessage('密码长度至少6位')
];

// 更新公司信息的验证器
const validateCompany = [
  body('name')
    .notEmpty()
    .withMessage('公司名称不能为空')
    .isLength({ min: 2, max: 100 })
    .withMessage('公司名称长度为2-100字符'),
  body('contact_name')
    .notEmpty()
    .withMessage('联系人姓名不能为空')
    .isLength({ min: 2, max: 50 })
    .withMessage('联系人姓名长度为2-50字符'),
  body('contact_phone')
    .optional()
    .custom((value) => {
      if (value && !/^(\+62|62|0)?8[1-9][0-9]{6,9}$/.test(value)) {
        throw new Error('请输入有效的印尼手机号');
      }
      return true;
    }),
  body('contact_email')
    .optional()
    .isEmail()
    .withMessage('请输入有效的联系邮箱'),
  body('status')
    .optional()
    .isIn(['active', 'inactive'])
    .withMessage('请选择有效的状态')
];

module.exports = {
  createCompanyValidator,
  validateCompany
}; 