const { body } = require('express-validator');

const loginValidator = [
  body('email')
    .notEmpty()
    .withMessage('邮箱不能为空')
    .isEmail()
    .withMessage('请输入有效的邮箱地址'),
  body('password')
    .notEmpty()
    .withMessage('密码不能为空')
    .isLength({ min: 6 })
    .withMessage('密码长度至少6位')
];

module.exports = {
  loginValidator
}; 