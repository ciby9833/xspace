const { body, param, query } = require('express-validator');

const createScriptValidator = [
  body('name')
    .notEmpty()
    .withMessage('剧本名称不能为空')
    .isLength({ min: 1, max: 255 })
    .withMessage('剧本名称长度为1-255字符'),
    
  body('type')
    .notEmpty()
    .withMessage('剧本类型不能为空')
    .isIn(['欢乐', '惊悚', '推理', '恐怖', '情感', '策略', '血染钟楼', '桌游'])
    .withMessage('剧本类型不合法'),
    
  body('background')
    .optional()
    .isIn(['现代', '中国古代', '欧式', '日式', '架空'])
    .withMessage('剧本背景不合法'),
    
  body('min_players')
    .isInt({ min: 1, max: 20 })
    .withMessage('最少游戏人数为1-20人'),
    
  body('max_players')
    .isInt({ min: 1, max: 20 })
    .withMessage('最多游戏人数为1-20人'),
    
  body('duration')
    .isInt({ min: 30, max: 600 })
    .withMessage('游戏时长为30-600分钟'),
    
  body('difficulty')
    .optional()
    .isIn(['新手', '进阶', '硬核'])
    .withMessage('难度等级不合法'),
    
  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('价格不能为负数'),

  // 🆕 图片数组验证
  body('images')
    .optional()
    .isArray({ max: 10 })
    .withMessage('最多只能上传10张图片'),

  body('images.*')
    .optional()
    .isString()
    .withMessage('图片URL必须是字符串')
];

const updateScriptValidator = [
  param('id').isUUID().withMessage('剧本ID格式不正确'),
  
  body('name')
    .optional()
    .isLength({ min: 1, max: 255 })
    .withMessage('剧本名称长度为1-255字符'),
    
  body('type')
    .optional()
    .isIn(['欢乐', '惊悚', '推理', '恐怖', '情感', '策略', '血染钟楼', '桌游'])
    .withMessage('剧本类型不合法'),
    
  body('background')
    .optional()
    .isIn(['现代', '中国古代', '欧式', '日式', '架空'])
    .withMessage('剧本背景不合法'),
    
  body('difficulty')
    .optional()
    .isIn(['新手', '进阶', '硬核'])
    .withMessage('难度等级不合法'),

  // 🆕 图片数组验证
  body('images')
    .optional()
    .isArray({ max: 10 })
    .withMessage('最多只能上传10张图片'),

  body('images.*')
    .optional()
    .isString()
    .withMessage('图片URL必须是字符串')
];

const configureStoreScriptValidator = [
  param('storeId').isUUID().withMessage('门店ID格式不正确'),
  param('scriptId').isUUID().withMessage('剧本ID格式不正确'),
  
  body('store_price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('门店价格不能为负数'),
    
  body('is_available')
    .optional()
    .isBoolean()
    .withMessage('启用状态必须是布尔值'),
];

module.exports = {
  createScriptValidator,
  updateScriptValidator,
  configureStoreScriptValidator
}; 